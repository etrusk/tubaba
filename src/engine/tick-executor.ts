import type { CombatState, TickResult, CombatEvent, Action } from '../types/index.js';
import type {
  TickResultWithDebug,
  DebugInfo as _DebugInfo,
  RuleEvaluation,
  RuleCheckResult as _RuleCheckResult,
  ConditionCheckResult,
  ConditionType,
} from '../types/index.js';
import type { CharacterInstructions } from '../types/instructions.js';
import { ActionResolver } from './action-resolver.js';
import { StatusEffectProcessor } from './status-effect-processor.js';
import { selectAction } from '../ai/enemy-brain.js';
import { evaluateCondition } from '../ai/rule-condition-evaluator.js';
import { selectTargets } from '../targeting/target-selector.js';

/**
 * TickExecutor - Orchestrates the 5-phase tick cycle
 *
 * Phase 1: Rule Evaluation (idle units check rules and queue actions)
 * Phase 2: Action Progress (decrement ticksRemaining)
 * Phase 3: Action Resolution (resolve actions at 0 ticks)
 * Phase 4: Status Effects (process per-tick effects, durations)
 * Phase 5: Cleanup (knockouts, victory/defeat detection)
 */

function executeTick(
  state: CombatState,
  instructions?: Map<string, CharacterInstructions>
): TickResult {
  // Increment tick counter
  const newTickNumber = state.tickNumber + 1;
  
  // Create working copies (immutable)
  let workingPlayers = state.players.map(p => ({ 
    ...p, 
    statusEffects: [...p.statusEffects.map(s => ({ ...s }))],
    currentAction: p.currentAction ? { ...p.currentAction } : null,
    skills: [...p.skills],
  }));
  let workingEnemies = state.enemies.map(e => ({ 
    ...e, 
    statusEffects: [...e.statusEffects.map(s => ({ ...s }))],
    currentAction: e.currentAction ? { ...e.currentAction } : null,
    skills: [...e.skills],
  }));
  let workingActionQueue = state.actionQueue.map(a => ({ ...a }));
  const allEvents: CombatEvent[] = [];
  
  // PHASE 1: Rule Evaluation
  // For idle units (no currentAction, not knocked out, not stunned)
  // evaluate their rules and queue new actions
  const allCharacters = [...workingPlayers, ...workingEnemies];
  const currentState: CombatState = {
    players: workingPlayers,
    enemies: workingEnemies,
    tickNumber: state.tickNumber,
    actionQueue: workingActionQueue,
    eventLog: state.eventLog,
    battleStatus: state.battleStatus,
  };
  
  for (const character of allCharacters) {
    // Check if character is idle (can evaluate rules)
    const isKnockedOut = character.currentHp <= 0;
    const isStunned = character.statusEffects.some(s => s.type === 'stunned' && s.duration > 0);
    const hasPendingAction = character.currentAction !== null;
    
    const isIdle = !isKnockedOut && !isStunned && !hasPendingAction;
    
    if (!isIdle) {
      continue;
    }
    
    // For player characters, swap arrays when calling selectAction
    // selectAction expects enemies perspective: enemies array = allies, players array = enemies
    const adjustedState = character.isPlayer
      ? {
          ...currentState,
          players: currentState.enemies,  // Player's enemies become the "players" param
          enemies: currentState.players,  // Player's allies become the "enemies" param
        }
      : currentState;
    
    // Get character instructions if available
    const characterInstructions = instructions?.get(character.id);
    
    // Use selectAction to get skill and targets
    const selection = selectAction(character, adjustedState, characterInstructions);
    
    if (selection) {
      const skill = selection.skill;
      const targetIds = selection.targets.map(t => t.id);
      
      // Create action and set on character
      const action: Action = {
        casterId: character.id,
        skillId: skill.id,
        targets: targetIds,
        ticksRemaining: skill.baseDuration,
      };
      
      character.currentAction = action;
      workingActionQueue.push(action);
    }
  }
  
  // PHASE 2: Action Progress
  // Collect actions that are ALREADY at 0 before decrement (will resolve this tick)
  const actionsToResolve = workingActionQueue.filter(a => a.ticksRemaining === 0);
  
  // Decrement ticksRemaining for all queued actions (except those at 0)
  workingActionQueue = workingActionQueue.map(action => {
    if (action.ticksRemaining > 0) {
      return { ...action, ticksRemaining: action.ticksRemaining - 1 };
    }
    return action;
  });
  
  // Sync decremented ticksRemaining back to characters' currentAction
  for (const action of workingActionQueue) {
    const character = [...workingPlayers, ...workingEnemies].find(c => c.id === action.casterId);
    if (character?.currentAction) {
      character.currentAction.ticksRemaining = action.ticksRemaining;
    }
  }
  
  // PHASE 3: Action Resolution
  // Resolve actions that were at 0 BEFORE decrement
  // (Actions that reach 0 during decrement will resolve next tick)
  if (actionsToResolve.length > 0) {
    // Sort actions to ensure consistent ordering:
    // Players before enemies, within group by character ID (left-to-right)
    const sortedActions = [...actionsToResolve].sort((a, b) => {
      const charA = [...workingPlayers, ...workingEnemies].find(c => c.id === a.casterId);
      const charB = [...workingPlayers, ...workingEnemies].find(c => c.id === b.casterId);
      
      if (!charA || !charB) return 0;
      
      // Players before enemies
      if (charA.isPlayer && !charB.isPlayer) return -1;
      if (!charA.isPlayer && charB.isPlayer) return 1;
      
      // Within same group, sort by caster ID
      return a.casterId.localeCompare(b.casterId);
    });
    
    const resolverResult = ActionResolver.resolveActions(
      sortedActions,
      workingPlayers,
      workingEnemies,
      newTickNumber
    );
    
    workingPlayers = resolverResult.updatedPlayers;
    workingEnemies = resolverResult.updatedEnemies;
    allEvents.push(...resolverResult.events);
    
    // Clear currentAction for characters whose actions resolved
    const resolvedCasterIds = new Set(actionsToResolve.map(a => a.casterId));
    for (const player of workingPlayers) {
      if (resolvedCasterIds.has(player.id)) {
        player.currentAction = null;
      }
    }
    for (const enemy of workingEnemies) {
      if (resolvedCasterIds.has(enemy.id)) {
        enemy.currentAction = null;
      }
    }
    
    // Remove resolved actions from queue
    workingActionQueue = workingActionQueue.filter(a => a.ticksRemaining !== 0);
  }
  
  // PHASE 4: Status Effects
  // Process status effects for all characters (poison damage, duration decrement, expiration)
  const updatedPlayers = [];
  for (const player of workingPlayers) {
    const result = StatusEffectProcessor.processStatusEffects(player);
    updatedPlayers.push(result.updatedCharacter);
    // Update tick numbers on events (StatusEffectProcessor sets tick to 0)
    const eventsWithTick = result.events.map(e => ({ ...e, tick: newTickNumber }));
    allEvents.push(...eventsWithTick);
  }
  workingPlayers = updatedPlayers;
  
  const updatedEnemies = [];
  for (const enemy of workingEnemies) {
    const result = StatusEffectProcessor.processStatusEffects(enemy);
    updatedEnemies.push(result.updatedCharacter);
    // Update tick numbers on events
    const eventsWithTick = result.events.map(e => ({ ...e, tick: newTickNumber }));
    allEvents.push(...eventsWithTick);
  }
  workingEnemies = updatedEnemies;
  
  // PHASE 5: Cleanup
  // Remove actions from knocked out characters (HP <= 0)
  const knockedOutCharacters = new Set<string>();
  for (const char of [...workingPlayers, ...workingEnemies]) {
    if (char.currentHp <= 0) {
      knockedOutCharacters.add(char.id);
      // Clear all status effects on knockout (AC23)
      char.statusEffects = [];
    }
  }
  
  workingActionQueue = workingActionQueue.filter(
    action => !knockedOutCharacters.has(action.casterId)
  );
  
  // Check victory/defeat conditions
  let battleStatus: 'ongoing' | 'victory' | 'defeat' = state.battleStatus;
  
  if (battleStatus === 'ongoing') {
    const allEnemiesKnockedOut = workingEnemies.every(e => e.currentHp <= 0);
    const allPlayersKnockedOut = workingPlayers.every(p => p.currentHp <= 0);
    
    // Simultaneous KO: player wins (check victory first per spec)
    if (allEnemiesKnockedOut) {
      battleStatus = 'victory';
      allEvents.push({
        tick: newTickNumber,
        type: 'victory',
        message: 'Victory!',
      });
    } else if (allPlayersKnockedOut) {
      battleStatus = 'defeat';
      allEvents.push({
        tick: newTickNumber,
        type: 'defeat',
        message: 'Defeat!',
      });
    }
  }
  
  // Build updated state
  const updatedState: CombatState = {
    players: workingPlayers,
    enemies: workingEnemies,
    tickNumber: newTickNumber,
    actionQueue: workingActionQueue,
    eventLog: [...state.eventLog, ...allEvents],
    battleStatus,
  };
  
  return {
    updatedState,
    events: allEvents,
    battleEnded: battleStatus !== 'ongoing',
  };
}

/**
 * Execute a tick with debug instrumentation
 * Captures detailed debug information about rule evaluations, targeting decisions, and resolution substeps
 */
function executeTickWithDebug(
  state: CombatState,
  instructions?: Map<string, CharacterInstructions>
): TickResultWithDebug {
  // Debug info collectors
  const ruleEvaluations: RuleEvaluation[] = [];
  
  // Increment tick counter
  const newTickNumber = state.tickNumber + 1;
  
  // Create working copies (immutable)
  let workingPlayers = state.players.map(p => ({ 
    ...p, 
    statusEffects: [...p.statusEffects.map(s => ({ ...s }))],
    currentAction: p.currentAction ? { ...p.currentAction } : null,
    skills: [...p.skills],
  }));
  let workingEnemies = state.enemies.map(e => ({ 
    ...e, 
    statusEffects: [...e.statusEffects.map(s => ({ ...s }))],
    currentAction: e.currentAction ? { ...e.currentAction } : null,
    skills: [...e.skills],
  }));
  let workingActionQueue = state.actionQueue.map(a => ({ ...a }));
  const allEvents: CombatEvent[] = [];
  
  // PHASE 1: Rule Evaluation (with debug instrumentation)
  const allCharacters = [...workingPlayers, ...workingEnemies];
  const currentState: CombatState = {
    players: workingPlayers,
    enemies: workingEnemies,
    tickNumber: state.tickNumber,
    actionQueue: workingActionQueue,
    eventLog: state.eventLog,
    battleStatus: state.battleStatus,
  };
  
  for (const character of allCharacters) {
    // Check if character is idle (can evaluate rules)
    const isKnockedOut = character.currentHp <= 0;
    const isStunned = character.statusEffects.some(s => s.type === 'stunned' && s.duration > 0);
    const hasPendingAction = character.currentAction !== null;
    
    const isIdle = !isKnockedOut && !isStunned && !hasPendingAction;
    
    if (!isIdle) {
      // Still capture evaluation entry for stunned characters with empty rules
      if (isStunned) {
        ruleEvaluations.push({
          characterId: character.id,
          characterName: character.name,
          rulesChecked: [],
          selectedRule: null,
          selectedSkill: null,
          selectedTargets: [],
        });
      }
      continue;
    }
    
    // Capture rule evaluation debug info
    const evaluation: RuleEvaluation = {
      characterId: character.id,
      characterName: character.name,
      rulesChecked: [],
      selectedRule: null,
      selectedSkill: null,
      selectedTargets: [],
    };
    
    // Get character instructions if available
    const characterInstructions = instructions?.get(character.id);
    
    // Evaluate all rules for this character
    if (character.skills && character.skills.length > 0) {
      // Collect all rule-skill pairs
      interface RuleSkillPair {
        ruleIndex: number;
        rule: any;
        skill: any;
        skillId: string;
      }
      
      const ruleSkillPairs: RuleSkillPair[] = [];
      let globalRuleIndex = 0;
      
      // If instructions provided, use them instead of skill.rules
      if (characterInstructions && characterInstructions.controlMode === 'ai') {
        for (const skillInstruction of characterInstructions.skillInstructions) {
          // Skip disabled instructions
          if (!skillInstruction.enabled) {
            continue;
          }
          
          // Find the matching skill
          const skill = character.skills.find(s => s.id === skillInstruction.skillId);
          if (!skill) {
            continue;
          }
          
          // Create rule from instruction
          const rule: any = {
            priority: skillInstruction.priority,
            conditions: skillInstruction.conditions,
            targetingOverride: skillInstruction.targetingOverride
          };
          
          ruleSkillPairs.push({
            ruleIndex: globalRuleIndex++,
            rule,
            skill,
            skillId: skill.id,
          });
        }
      } else {
        // Fall back to skill.rules (legacy behavior)
        for (const skill of character.skills) {
          if (skill.rules && skill.rules.length > 0) {
            for (const rule of skill.rules) {
              ruleSkillPairs.push({
                ruleIndex: globalRuleIndex++,
                rule,
                skill,
                skillId: skill.id,
              });
            }
          }
        }
      }
      
      // Sort by priority (descending)
      ruleSkillPairs.sort((a, b) => b.rule.priority - a.rule.priority);
      
      // Evaluate each rule
      let foundMatch = false;
      for (const { ruleIndex, rule, skill, skillId } of ruleSkillPairs) {
        // If already found match, mark remaining as not-reached
        if (foundMatch) {
          evaluation.rulesChecked.push({
            ruleIndex,
            skillId,
            skillName: skill.name,
            priority: rule.priority,
            conditions: [],
            status: 'not-reached',
            reason: 'Higher priority action already selected',
          });
          continue;
        }
        
        const conditionResults: ConditionCheckResult[] = [];
        let allConditionsMet = true;
        
        // Evaluate each condition
        for (const condition of rule.conditions || []) {
          const passed = evaluateCondition(condition, character, currentState);
          
          // Build debug info for condition
          let expected = '';
          let actual = '';
          
          if (condition.type === 'hp-below') {
            expected = `< ${condition.threshold}%`;
            const hpPercent = (character.currentHp / character.maxHp) * 100;
            actual = `${hpPercent.toFixed(1)}%`;
          } else if (condition.type === 'ally-count') {
            expected = `> ${condition.threshold}`;
            const allies = character.isPlayer ? currentState.players : currentState.enemies;
            const allyCount = allies.filter(c => c.id !== character.id && c.currentHp > 0).length;
            actual = `${allyCount}`;
          } else if (condition.type === 'enemy-has-status') {
            expected = `enemy has ${condition.statusType}`;
            const enemies = character.isPlayer ? currentState.enemies : currentState.players;
            const hasStatus = enemies.some(e =>
              e.currentHp > 0 && e.statusEffects.some(s => s.type === condition.statusType && s.duration > 0)
            );
            actual = hasStatus ? 'yes' : 'no';
          } else if (condition.type === 'self-has-status') {
            expected = `self has ${condition.statusType}`;
            const hasStatus = character.statusEffects.some(s => s.type === condition.statusType && s.duration > 0);
            actual = hasStatus ? 'yes' : 'no';
          } else if (condition.type === 'ally-has-status') {
            expected = `ally has ${condition.statusType}`;
            const allies = character.isPlayer ? currentState.players : currentState.enemies;
            const hasStatus = allies.some(a =>
              a.id !== character.id && a.currentHp > 0 && a.statusEffects.some(s => s.type === condition.statusType && s.duration > 0)
            );
            actual = hasStatus ? 'yes' : 'no';
          }
          
          conditionResults.push({
            type: condition.type as ConditionType,
            expected,
            actual,
            passed,
          });
          
          if (!passed) {
            allConditionsMet = false;
          }
        }
        
        // If conditions failed
        if (!allConditionsMet) {
          const failedConditions = conditionResults.filter(c => !c.passed);
          evaluation.rulesChecked.push({
            ruleIndex,
            skillId,
            skillName: skill.name,
            priority: rule.priority,
            conditions: conditionResults,
            status: 'failed',
            reason: `Condition failed: ${failedConditions.map(c => c.type).join(', ')}`,
          });
          continue;
        }
        
        // Conditions passed - try to select targets
        const targetingMode = rule.targetingOverride ?? skill.targeting;
        
        // Get initial candidates
        const candidates = character.isPlayer
          ? selectTargets(targetingMode, character, currentState.players, currentState.enemies)
          : selectTargets(targetingMode, character, currentState.enemies, currentState.players);
        
        // Apply filters
        const aliveCandidates = candidates.filter(c => c.currentHp > 0);
        
        // Taunt filter (only for enemy attackers targeting players)
        let finalTargets = aliveCandidates;
        if (!character.isPlayer) {
          const allPlayers = currentState.players;
          const taunter = allPlayers.find(p =>
            p.currentHp > 0 && p.statusEffects.some(s => s.type === 'taunting' && s.duration > 0)
          );
          if (taunter) {
            finalTargets = [taunter];
          }
        }
        
        // Self-exclusion filter (for ally targeting)
        if (targetingMode === 'ally-lowest-hp' || targetingMode === 'all-allies') {
          finalTargets = finalTargets.filter(t => t.id !== character.id);
        }
        
        // Build candidate list for debug
        const candidateList = candidates.map(c => `${c.name} (${c.currentHp}/${c.maxHp})`);
        
        // No valid targets - skipped
        if (finalTargets.length === 0) {
          // Build specific reason based on targeting mode
          let reason: string;
          if (candidates.length === 0) {
            // No initial candidates - provide specific reason based on targeting mode
            if (targetingMode === 'single-enemy-lowest-hp' || targetingMode === 'single-enemy-highest-hp' || targetingMode === 'all-enemies') {
              reason = 'No enemies alive';
            } else if (targetingMode === 'ally-lowest-hp' || targetingMode === 'all-allies') {
              reason = 'No allies available (excluding self)';
            } else if (targetingMode === 'ally-dead') {
              reason = 'No dead allies to revive';
            } else if (targetingMode === 'self') {
              reason = 'Character is dead';
            } else {
              reason = 'No valid targets available';
            }
          } else {
            // Candidates filtered out
            reason = `All ${candidates.length} candidates filtered out`;
          }
          
          evaluation.rulesChecked.push({
            ruleIndex,
            skillId,
            skillName: skill.name,
            priority: rule.priority,
            conditions: conditionResults,
            status: 'skipped',
            reason,
            candidatesConsidered: candidateList.length > 0 ? candidateList : undefined,
          });
          continue;
        }
        
        // Valid targets - SELECTED
        foundMatch = true;
        const chosen = finalTargets[0];
        
        // Build target choice reasoning inline
        let targetReason: string;
        if (targetingMode === 'self') {
          targetReason = 'self';
        } else if (targetingMode === 'all-enemies') {
          targetReason = `All ${finalTargets.length} enemies`;
        } else if (targetingMode === 'all-allies') {
          targetReason = `All ${finalTargets.length} allies`;
        } else if (chosen) {
          // Single target modes (chosen is guaranteed to exist here)
          if (targetingMode === 'ally-dead') {
            targetReason = `${chosen.name} - dead ally`;
          } else {
            targetReason = `${chosen.name}`;
            if (targetingMode === 'single-enemy-lowest-hp') {
              targetReason += ` - lowest HP (${chosen.currentHp}/${chosen.maxHp})`;
              // Check for tie-breaker
              const tieCandidates = aliveCandidates.filter(c => c.currentHp === chosen.currentHp);
              if (tieCandidates.length > 1) {
                targetReason += ` (${tieCandidates.length} tied, chose first)`;
              }
            } else if (targetingMode === 'single-enemy-highest-hp') {
              targetReason += ` - highest HP (${chosen.currentHp}/${chosen.maxHp})`;
              // Check for tie-breaker
              const tieCandidates = aliveCandidates.filter(c => c.currentHp === chosen.currentHp);
              if (tieCandidates.length > 1) {
                targetReason += ` (${tieCandidates.length} tied, chose first)`;
              }
            } else if (targetingMode === 'ally-lowest-hp') {
              targetReason += ` - ally lowest HP (${chosen.currentHp}/${chosen.maxHp})`;
              // Check for tie-breaker
              const tieCandidates = aliveCandidates.filter(c => c.currentHp === chosen.currentHp);
              if (tieCandidates.length > 1) {
                targetReason += ` (${tieCandidates.length} tied, chose first)`;
              }
            }
          }
        } else {
          // Fallback if chosen is undefined (shouldn't happen)
          targetReason = 'Unknown target';
        }
        
        const finalTargetIds = finalTargets.map(t => t.id);
        
        evaluation.rulesChecked.push({
          ruleIndex,
          skillId,
          skillName: skill.name,
          priority: rule.priority,
          conditions: conditionResults,
          status: 'selected',
          reason: 'All conditions met',
          candidatesConsidered: candidateList,
          targetChosen: targetReason,
        });
        
        evaluation.selectedRule = `rule-${ruleIndex}`;
        evaluation.selectedSkill = skillId;
        evaluation.selectedTargets = finalTargetIds;
        
        // Actually queue the action (not just capture debug info)
        const action: Action = {
          casterId: character.id,
          skillId: skillId,
          targets: finalTargetIds,
          ticksRemaining: skill.baseDuration,
        };
        
        character.currentAction = action;
        workingActionQueue.push(action);
      }
    }
    
    ruleEvaluations.push(evaluation);
  }
  
  // PHASE 2: Action Progress
  const actionsToResolve = workingActionQueue.filter(a => a.ticksRemaining === 0);
  
  workingActionQueue = workingActionQueue.map(action => {
    if (action.ticksRemaining > 0) {
      return { ...action, ticksRemaining: action.ticksRemaining - 1 };
    }
    return action;
  });
  
  // Sync decremented ticksRemaining back to characters' currentAction
  for (const action of workingActionQueue) {
    const character = [...workingPlayers, ...workingEnemies].find(c => c.id === action.casterId);
    if (character?.currentAction) {
      character.currentAction.ticksRemaining = action.ticksRemaining;
    }
  }
  
  // PHASE 3: Action Resolution (with debug instrumentation)
  if (actionsToResolve.length > 0) {
    const sortedActions = [...actionsToResolve].sort((a, b) => {
      const charA = [...workingPlayers, ...workingEnemies].find(c => c.id === a.casterId);
      const charB = [...workingPlayers, ...workingEnemies].find(c => c.id === b.casterId);
      
      if (!charA || !charB) return 0;
      
      if (charA.isPlayer && !charB.isPlayer) return -1;
      if (!charA.isPlayer && charB.isPlayer) return 1;
      
      return a.casterId.localeCompare(b.casterId);
    });
    
    // Resolve actions
    const resolverResult = ActionResolver.resolveActions(
      sortedActions,
      workingPlayers,
      workingEnemies,
      newTickNumber
    );
    
    workingPlayers = resolverResult.updatedPlayers;
    workingEnemies = resolverResult.updatedEnemies;
    allEvents.push(...resolverResult.events);
    
    const resolvedCasterIds = new Set(actionsToResolve.map(a => a.casterId));
    for (const player of workingPlayers) {
      if (resolvedCasterIds.has(player.id)) {
        player.currentAction = null;
      }
    }
    for (const enemy of workingEnemies) {
      if (resolvedCasterIds.has(enemy.id)) {
        enemy.currentAction = null;
      }
    }
    
    workingActionQueue = workingActionQueue.filter(a => a.ticksRemaining !== 0);
  }
  
  // PHASE 4: Status Effects
  const updatedPlayers = [];
  for (const player of workingPlayers) {
    const result = StatusEffectProcessor.processStatusEffects(player);
    updatedPlayers.push(result.updatedCharacter);
    const eventsWithTick = result.events.map(e => ({ ...e, tick: newTickNumber }));
    allEvents.push(...eventsWithTick);
  }
  workingPlayers = updatedPlayers;
  
  const updatedEnemies = [];
  for (const enemy of workingEnemies) {
    const result = StatusEffectProcessor.processStatusEffects(enemy);
    updatedEnemies.push(result.updatedCharacter);
    const eventsWithTick = result.events.map(e => ({ ...e, tick: newTickNumber }));
    allEvents.push(...eventsWithTick);
  }
  workingEnemies = updatedEnemies;
  
  // PHASE 5: Cleanup
  const knockedOutCharacters = new Set<string>();
  for (const char of [...workingPlayers, ...workingEnemies]) {
    if (char.currentHp <= 0) {
      knockedOutCharacters.add(char.id);
      char.statusEffects = [];
    }
  }
  
  workingActionQueue = workingActionQueue.filter(
    action => !knockedOutCharacters.has(action.casterId)
  );
  
  let battleStatus: 'ongoing' | 'victory' | 'defeat' = state.battleStatus;
  
  if (battleStatus === 'ongoing') {
    const allEnemiesKnockedOut = workingEnemies.every(e => e.currentHp <= 0);
    const allPlayersKnockedOut = workingPlayers.every(p => p.currentHp <= 0);
    
    if (allEnemiesKnockedOut) {
      battleStatus = 'victory';
      allEvents.push({
        tick: newTickNumber,
        type: 'victory',
        message: 'Victory!',
      });
    } else if (allPlayersKnockedOut) {
      battleStatus = 'defeat';
      allEvents.push({
        tick: newTickNumber,
        type: 'defeat',
        message: 'Defeat!',
      });
    }
  }
  
  const updatedState: CombatState = {
    players: workingPlayers,
    enemies: workingEnemies,
    tickNumber: newTickNumber,
    actionQueue: workingActionQueue,
    eventLog: [...state.eventLog, ...allEvents],
    battleStatus,
  };
  
  return {
    updatedState,
    events: allEvents,
    battleEnded: battleStatus !== 'ongoing',
    debugInfo: {
      ruleEvaluations,
    },
  };
}

function runBattle(initialState: CombatState): CombatState {
  let currentState = initialState;
  const maxTicks = 999; // Prevent infinite loops (stops before 1000)
  
  while (currentState.battleStatus === 'ongoing' && currentState.tickNumber < maxTicks) {
    const result = executeTick(currentState);
    currentState = result.updatedState;
  }
  
  return currentState;
}

export const TickExecutor = {
  executeTick,
  executeTickWithDebug,
  runBattle,
};
