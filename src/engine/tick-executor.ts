import type { CombatState, TickResult, CombatEvent } from '../types/index.js';
import { ActionResolver } from './action-resolver.js';
import { StatusEffectProcessor } from './status-effect-processor.js';

/**
 * TickExecutor - Orchestrates the 5-phase tick cycle
 * 
 * Phase 1: Rule Evaluation (idle units check rules and queue actions)
 * Phase 2: Action Progress (decrement ticksRemaining)
 * Phase 3: Action Resolution (resolve actions at 0 ticks)
 * Phase 4: Status Effects (process per-tick effects, durations)
 * Phase 5: Cleanup (knockouts, victory/defeat detection)
 */

function executeTick(state: CombatState): TickResult {
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
  let allEvents: CombatEvent[] = [];
  
  // PHASE 1: Rule Evaluation
  // For idle units (no currentAction, not knocked out, not stunned)
  // evaluate their rules and queue new actions
  // NOTE: RuleEvaluator not yet implemented - placeholder for future
  // Tests verify we skip stunned/KO'd/busy units
  
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
  runBattle,
};
