import type { CombatState, TickResult, CombatEvent, Character, Action } from '../types/index.js';
import type {
  TickResultWithDebug,
  DebugInfo as _DebugInfo,
  RuleEvaluation,
  RuleCheckResult as _RuleCheckResult,
  ConditionCheckResult,
  TargetingDecision,
  TargetFilterResult,
  ResolutionSubstep,
  SubstepDetail,
  ConditionType,
} from '../types/index.js';
import type { CharacterInstructions } from '../types/instructions.js';
import { ActionResolver } from './action-resolver.js';
import { StatusEffectProcessor } from './status-effect-processor.js';
import { selectAction } from '../ai/enemy-brain.js';
import { evaluateCondition } from '../ai/rule-condition-evaluator.js';
import { selectTargets } from '../targeting/target-selector.js';
import _TargetFilter from '../targeting/target-filter.js';
import { SkillLibrary } from './skill-library.js';

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
  const targetingDecisions: TargetingDecision[] = [];
  const resolutionSubsteps: ResolutionSubstep[] = [];
  
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
      
      // Sort by priority (descending)
      ruleSkillPairs.sort((a, b) => b.rule.priority - a.rule.priority);
      
      // Evaluate each rule
      let foundMatch = false;
      for (const { ruleIndex, rule, skill, skillId } of ruleSkillPairs) {
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
        
        // Build reason string
        let reason = '';
        if (allConditionsMet) {
          reason = 'all conditions met';
        } else {
          const failedConditions = conditionResults.filter(c => !c.passed);
          reason = `condition failed: ${failedConditions.map(c => c.type).join(', ')}`;
        }
        
        evaluation.rulesChecked.push({
          ruleIndex,
          priority: rule.priority,
          conditions: conditionResults,
          matched: allConditionsMet && !foundMatch,
          reason,
        });
        
        // If this rule matches and we haven't found a match yet, select it
        if (allConditionsMet && !foundMatch) {
          foundMatch = true;
          
          // Select targets
          const targetingMode = rule.targetingOverride ?? skill.targeting;
          
          // Get initial candidates
          const candidates = character.isPlayer
            ? selectTargets(targetingMode, character, currentState.players, currentState.enemies)
            : selectTargets(targetingMode, character, currentState.enemies, currentState.players);
          
          // Apply filters and track them
          const filtersApplied: TargetFilterResult[] = [];
          const candidateIds = candidates.map(c => c.id);
          
          // Dead exclusion filter
          const aliveCandidates = candidates.filter(c => c.currentHp > 0);
          const deadRemoved = candidates.filter(c => c.currentHp <= 0).map(c => c.id);
          if (deadRemoved.length > 0) {
            filtersApplied.push({
              filterType: 'dead-exclusion',
              removed: deadRemoved,
            });
          }
          
          // Taunt filter (only for enemy attackers targeting players)
          let finalTargets = aliveCandidates;
          if (!character.isPlayer) {
            const allPlayers = currentState.players;
            const taunter = allPlayers.find(p => 
              p.currentHp > 0 && p.statusEffects.some(s => s.type === 'taunting' && s.duration > 0)
            );
            if (taunter) {
              const nonTaunters = aliveCandidates.filter(c => c.id !== taunter.id).map(c => c.id);
              if (nonTaunters.length > 0) {
                filtersApplied.push({
                  filterType: 'taunt',
                  removed: nonTaunters,
                });
              }
              finalTargets = [taunter];
            }
          }
          
          // Self-exclusion filter (for ally targeting)
          if (targetingMode === 'ally-lowest-hp' || targetingMode === 'all-allies') {
            const selfRemoved = finalTargets.find(t => t.id === character.id);
            if (selfRemoved) {
              filtersApplied.push({
                filterType: 'self-exclusion',
                removed: [character.id],
              });
              finalTargets = finalTargets.filter(t => t.id !== character.id);
            }
          }
          
          const finalTargetIds = finalTargets.map(t => t.id);
          
          // Check for tie-breaker situation
          let tieBreaker: string | undefined = undefined;
          if (targetingMode === 'single-enemy-lowest-hp' || targetingMode === 'ally-lowest-hp') {
            const lowestHp = finalTargets.length > 0 ? finalTargets[0]?.currentHp : 0;
            const tieCandidates = aliveCandidates.filter(c => c.currentHp === lowestHp);
            if (tieCandidates.length > 1) {
              tieBreaker = 'leftmost (first in array order)';
            }
          }
          
          // Record targeting decision
          targetingDecisions.push({
            casterId: character.id,
            skillId: skillId,
            targetingMode: targetingMode as any,
            candidates: candidateIds,
            filtersApplied,
            finalTargets: finalTargetIds,
            tieBreaker,
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
    
    // Capture targeting decisions for resolving actions
    for (const action of sortedActions) {
      const skill = SkillLibrary.getSkill(action.skillId);
      const caster = [...workingPlayers, ...workingEnemies].find(c => c.id === action.casterId);
      
      if (caster) {
        // Get all potential candidates (before any filtering/selection)
        const allCandidates = caster.isPlayer
          ? (skill.targeting.includes('enemy') ? workingEnemies : (skill.targeting === 'self' ? [caster] : workingPlayers))
          : (skill.targeting.includes('enemy') ? workingPlayers : (skill.targeting === 'self' ? [caster] : workingEnemies));
        
        const candidateIds = allCandidates.map(c => c.id);
        const filtersApplied: TargetFilterResult[] = [];
        
        // Track dead exclusion
        const deadRemoved = allCandidates.filter(c => c.currentHp <= 0).map(c => c.id);
        if (deadRemoved.length > 0) {
          filtersApplied.push({
            filterType: 'dead-exclusion',
            removed: deadRemoved,
          });
        }
        
        // Track taunt (applies when targeting enemy team)
        if (skill.targeting.includes('enemy')) {
          const targetTeam = caster.isPlayer ? workingEnemies : workingPlayers;
          const taunter = targetTeam.find(t =>
            t.currentHp > 0 && t.statusEffects.some(s => s.type === 'taunting' && s.duration > 0)
          );
          if (taunter) {
            const aliveCandidates = allCandidates.filter(c => c.currentHp > 0);
            const nonTaunters = aliveCandidates.filter(c => c.id !== taunter.id).map(c => c.id);
            if (nonTaunters.length > 0) {
              filtersApplied.push({
                filterType: 'taunt',
                removed: nonTaunters,
              });
            }
          }
        }
        
        // Check for tie-breaker
        let tieBreaker: string | undefined = undefined;
        if (skill.targeting === 'single-enemy-lowest-hp' || skill.targeting === 'ally-lowest-hp' ||
            skill.targeting === 'single-enemy-highest-hp') {
          const aliveCandidates = allCandidates.filter(c => c.currentHp > 0);
          if (aliveCandidates.length > 1 && action.targets.length > 0) {
            const selectedTarget = aliveCandidates.find(c => c.id === action.targets[0]);
            if (selectedTarget) {
              const tieCandidates = aliveCandidates.filter(c => c.currentHp === selectedTarget.currentHp);
              if (tieCandidates.length > 1) {
                tieBreaker = 'leftmost (first in array order)';
              }
            }
          }
        }
        
        targetingDecisions.push({
          casterId: action.casterId,
          skillId: action.skillId,
          targetingMode: skill.targeting as any,
          candidates: candidateIds,
          filtersApplied,
          finalTargets: action.targets,
          tieBreaker,
        });
      }
    }
    
    // Resolve with substep tracking
    const resolverResult = resolveActionsWithDebug(
      sortedActions,
      workingPlayers,
      workingEnemies,
      newTickNumber,
      resolutionSubsteps
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
      targetingDecisions,
      resolutionSubsteps,
    },
  };
}

/**
 * Debug-instrumented action resolution
 * Captures substep details for damage calculation, healing, shields, health updates, status application, and cancellation
 */
function resolveActionsWithDebug(
  actions: Action[],
  players: Character[],
  enemies: Character[],
  tickNumber: number,
  resolutionSubsteps: ResolutionSubstep[]
): { updatedPlayers: Character[]; updatedEnemies: Character[]; events: any[] } {
  // Substep detail collectors
  const damageCalcDetails: SubstepDetail[] = [];
  const healingCalcDetails: SubstepDetail[] = [];
  const shieldAbsorptionDetails: SubstepDetail[] = [];
  const healthUpdateDetails: SubstepDetail[] = [];
  const statusApplicationDetails: SubstepDetail[] = [];
  const actionCancelDetails: SubstepDetail[] = [];
  
  // Create immutable copies
  const workingPlayers = players.map(p => ({ 
    ...p, 
    statusEffects: [...p.statusEffects.map(s => ({ ...s }))]
  }));
  const workingEnemies = enemies.map(e => ({ 
    ...e, 
    statusEffects: [...e.statusEffects.map(s => ({ ...s }))]
  }));
  
  const events: any[] = [];
  const cancelledActions: Action[] = [];
  
  const findChar = (id: string): Character | undefined => {
    return workingPlayers.find(c => c.id === id) || workingEnemies.find(c => c.id === id);
  };
  
  interface DamageInstance {
    action: Action;
    targetId: string;
    baseDamage: number;
    finalDamage: number;
  }
  
  const damageInstances: DamageInstance[] = [];
  const healingMap = new Map<string, number>();
  const statusesToApply: Array<{ targetId: string; status: any; actorId: string }> = [];
  const cancellationTargets = new Set<string>();
  
  const initialHpMap = new Map<string, number>();
  [...workingPlayers, ...workingEnemies].forEach(c => initialHpMap.set(c.id, c.currentHp));
  
  // SUBSTEP 1: Damage Calculation
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    const caster = findChar(action.casterId);
    if (!caster) continue;
    
    const damageEffect = skill.effects.find(e => e.type === 'damage');
    if (damageEffect && damageEffect.value !== undefined) {
      const baseDamage = damageEffect.value;
      const enragedStatus = caster.statusEffects.find(s => s.type === 'enraged');
      const enragedBonus = enragedStatus?.value ?? 0;
      
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        if (!target) continue;
        
        let damage = baseDamage + enragedBonus;
        const isDefending = target.statusEffects.some(s => s.type === 'defending');
        if (isDefending) {
          damage = Math.floor(damage * 0.5);
        }
        
        damageInstances.push({
          action,
          targetId,
          baseDamage: damage,
          finalDamage: damage,
        });
        
        damageCalcDetails.push({
          actorId: action.casterId,
          targetId,
          skillId: action.skillId,
          value: damage,
          description: `Calculated ${damage} damage to ${target.name}`,
        });
      }
    }
  }
  
  // SUBSTEP 2: Healing Calculation
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    
    const healEffect = skill.effects.find(e => e.type === 'heal');
    if (healEffect && healEffect.value !== undefined) {
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        if (!target) continue;
        
        if (target.currentHp === 0) continue;
        
        const currentHealing = healingMap.get(targetId) ?? 0;
        healingMap.set(targetId, currentHealing + healEffect.value);
        
        healingCalcDetails.push({
          actorId: action.casterId,
          targetId,
          skillId: action.skillId,
          value: healEffect.value,
          description: `Calculated ${healEffect.value} healing to ${target.name}`,
        });
      }
    }
    
    const reviveEffect = skill.effects.find(e => e.type === 'revive');
    if (reviveEffect && reviveEffect.value !== undefined) {
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        if (!target) continue;
        
        if (target.currentHp === 0) {
          healingMap.set(targetId, reviveEffect.value);
          
          healingCalcDetails.push({
            actorId: action.casterId,
            targetId,
            skillId: action.skillId,
            value: reviveEffect.value,
            description: `Calculated ${reviveEffect.value} revive healing to ${target.name}`,
          });
        } else {
          events.push({
            tick: tickNumber,
            type: 'target-lost',
            actorId: action.casterId,
            targetId,
            message: `Revive failed: ${target.name} is not knocked out`,
          });
        }
      }
    }
  }
  
  // SUBSTEP 3: Shield Absorption
  damageInstances.sort((a, b) => {
    const charA = findChar(a.action.casterId);
    const charB = findChar(b.action.casterId);
    if (!charA || !charB) return 0;
    
    if (charA.isPlayer && !charB.isPlayer) return -1;
    if (!charA.isPlayer && charB.isPlayer) return 1;
    
    return a.action.casterId.localeCompare(b.action.casterId);
  });
  
  for (const instance of damageInstances) {
    const target = findChar(instance.targetId);
    if (!target) continue;
    
    const shieldStatus = target.statusEffects.find(s => s.type === 'shielded');
    if (shieldStatus && shieldStatus.value !== undefined && shieldStatus.value > 0) {
      const shieldValue = shieldStatus.value;
      
      if (shieldValue >= instance.finalDamage) {
        shieldAbsorptionDetails.push({
          actorId: instance.action.casterId,
          targetId: instance.targetId,
          skillId: instance.action.skillId,
          value: instance.finalDamage,
          description: `shield absorbed ${instance.finalDamage} damage for ${target.name}`,
        });
        
        shieldStatus.value = shieldValue - instance.finalDamage;
        instance.finalDamage = 0;
      } else {
        shieldAbsorptionDetails.push({
          actorId: instance.action.casterId,
          targetId: instance.targetId,
          skillId: instance.action.skillId,
          value: shieldValue,
          description: `shield absorbed ${shieldValue} damage, ${instance.finalDamage - shieldValue} overflow to ${target.name}`,
        });
        
        instance.finalDamage = instance.finalDamage - shieldValue;
        shieldStatus.value = 0;
      }
    }
  }
  
  // SUBSTEP 4: Health Updates
  const damageMap = new Map<string, number>();
  for (const instance of damageInstances) {
    const current = damageMap.get(instance.targetId) ?? 0;
    damageMap.set(instance.targetId, current + instance.finalDamage);
  }
  
  for (const char of [...workingPlayers, ...workingEnemies]) {
    const damage = damageMap.get(char.id) ?? 0;
    const healing = healingMap.get(char.id) ?? 0;
    
    if (damage > 0 || healing > 0) {
      const oldHp = char.currentHp;
      let newHp = char.currentHp - damage + healing;
      newHp = Math.min(newHp, char.maxHp);
      newHp = Math.max(newHp, 0);
      char.currentHp = newHp;
      
      healthUpdateDetails.push({
        actorId: char.id,
        targetId: char.id,
        skillId: '', // Health update is a result, not from a specific skill
        value: newHp - oldHp,
        description: `${char.name} HP: ${oldHp} → ${newHp} (damage: ${damage}, healing: ${healing})`,
      });
    }
  }
  
  // SUBSTEP 5: Status Application
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    
    for (const effect of skill.effects) {
      if (effect.type === 'status' && effect.statusType && effect.duration !== undefined) {
        for (const targetId of action.targets) {
          const target = findChar(targetId);
          if (!target) continue;
          
          statusesToApply.push({
            targetId,
            status: {
              type: effect.statusType,
              duration: effect.duration,
              value: effect.statusType === 'poisoned' ? 5 : undefined,
            },
            actorId: action.casterId,
          });
          
          statusApplicationDetails.push({
            actorId: action.casterId,
            targetId,
            skillId: action.skillId,
            description: `Applied status ${effect.statusType} to ${target.name}`,
          });
        }
      }
      
      if (effect.type === 'shield' && effect.value !== undefined) {
        for (const targetId of action.targets) {
          const target = findChar(targetId);
          if (!target) continue;
          
          statusesToApply.push({
            targetId,
            status: {
              type: 'shielded',
              duration: 4,
              value: effect.value,
            },
            actorId: action.casterId,
          });
          
          statusApplicationDetails.push({
            actorId: action.casterId,
            targetId,
            skillId: action.skillId,
            value: effect.value,
            description: `Applied shield (${effect.value}) to ${target.name}`,
          });
        }
      }
    }
  }
  
  for (const { targetId, status } of statusesToApply) {
    const char = findChar(targetId);
    if (!char) continue;
    
    const updated = StatusEffectProcessor.applyStatus(char, status);
    Object.assign(char, updated);
  }
  
  // SUBSTEP 6: Action Cancellation
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    
    const hasCancelEffect = skill.effects.some(e => e.type === 'cancel');
    const hasStunEffect = skill.effects.some(e => e.type === 'status' && e.statusType === 'stunned');
    
    if (hasCancelEffect || hasStunEffect) {
      for (const targetId of action.targets) {
        cancellationTargets.add(targetId);
      }
    }
  }
  
  for (const targetId of cancellationTargets) {
    const char = findChar(targetId);
    if (char?.currentAction) {
      const cancelledAction = char.currentAction;
      cancelledActions.push(cancelledAction);
      char.currentAction = null;
      
      actionCancelDetails.push({
        actorId: targetId,
        targetId,
        skillId: cancelledAction.skillId,
        description: `cancelled action for ${char.name}`,
      });
    }
  }
  
  // Generate Events
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    const caster = findChar(action.casterId);
    
    events.push({
      tick: tickNumber,
      type: 'action-resolved',
      actorId: action.casterId,
      skillName: skill.name,
      message: `${caster?.name ?? action.casterId} used ${skill.name}`,
    });
    
    for (const instance of damageInstances) {
      if (instance.action === action) {
        const target = findChar(instance.targetId);
        events.push({
          tick: tickNumber,
          type: 'damage',
          actorId: action.casterId,
          targetId: instance.targetId,
          value: instance.baseDamage,
          message: `${target?.name ?? instance.targetId} takes ${instance.baseDamage} damage`,
        });
      }
    }
    
    const healEffect = skill.effects.find(e => e.type === 'heal');
    const reviveEffect = skill.effects.find(e => e.type === 'revive');
    
    if (healEffect && healEffect.value !== undefined) {
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        const healing = healEffect.value;
        
        events.push({
          tick: tickNumber,
          type: 'healing',
          actorId: action.casterId,
          targetId,
          value: healing,
          message: `${target?.name ?? targetId} healed for ${healing}`,
        });
      }
    }
    
    if (reviveEffect && reviveEffect.value !== undefined) {
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        const healing = reviveEffect.value;
        
        events.push({
          tick: tickNumber,
          type: 'healing',
          actorId: action.casterId,
          targetId,
          value: healing,
          message: `${target?.name ?? targetId} revived for ${healing}`,
        });
      }
    }
  }
  
  for (const { targetId, status, actorId } of statusesToApply) {
    const target = findChar(targetId);
    events.push({
      tick: tickNumber,
      type: 'status-applied',
      actorId,
      targetId,
      statusType: status.type,
      message: `${status.type} applied to ${target?.name ?? targetId}`,
    });
  }
  
  for (const char of [...workingPlayers, ...workingEnemies]) {
    const wasAlive = (initialHpMap.get(char.id) ?? 0) > 0;
    const isKnockedOut = char.currentHp === 0;
    
    if (wasAlive && isKnockedOut) {
      char.statusEffects = [];
      
      events.push({
        tick: tickNumber,
        type: 'knockout',
        targetId: char.id,
        message: `${char.name} was knocked out`,
      });
    }
  }
  
  // Add substeps to debug info
  if (damageCalcDetails.length > 0) {
    resolutionSubsteps.push({ substep: 'damage-calc', details: damageCalcDetails });
  }
  if (healingCalcDetails.length > 0) {
    resolutionSubsteps.push({ substep: 'healing-calc', details: healingCalcDetails });
  }
  if (shieldAbsorptionDetails.length > 0) {
    resolutionSubsteps.push({ substep: 'shield-absorption', details: shieldAbsorptionDetails });
  }
  if (healthUpdateDetails.length > 0) {
    resolutionSubsteps.push({ substep: 'health-update', details: healthUpdateDetails });
  }
  if (statusApplicationDetails.length > 0) {
    resolutionSubsteps.push({ substep: 'status-application', details: statusApplicationDetails });
  }
  if (actionCancelDetails.length > 0) {
    resolutionSubsteps.push({ substep: 'action-cancel', details: actionCancelDetails });
  }
  
  return {
    updatedPlayers: workingPlayers,
    updatedEnemies: workingEnemies,
    events,
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
