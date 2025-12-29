import { describe, it, expect } from 'vitest';
import type { Action, Character, CombatState, TickResult, StatusEffect } from '../../src/types/index.js';

/**
 * TickExecutor Test Suite (TDD - Tests First)
 *
 * Tests the 5-phase tick cycle orchestration before implementation:
 * 1. Rule Evaluation: Idle units evaluate rules and queue actions
 * 2. Action Progress: Decrement ticksRemaining for all queued actions
 * 3. Action Resolution: Resolve actions reaching 0 ticks (uses ActionResolver)
 * 4. Status Effects: Apply per-tick effects, decrement durations (uses StatusEffectProcessor)
 * 5. Cleanup: Detect knockouts, check victory/defeat conditions
 *
 * Implementation: src/engine/tick-executor.ts (Task 9)
 */

// Mock TickExecutor interface (will be implemented in Task 9)
interface TickExecutorType {
  executeTick(state: CombatState): TickResult;
  runBattle(initialState: CombatState): CombatState;
}

// Import actual implementation (will fail until implemented)
import { TickExecutor } from '../../src/engine/tick-executor.js';

// Use real implementation
const executor: TickExecutorType = TickExecutor;

// Test helpers
function createTestCharacter(
  id: string,
  currentHp: number = 100,
  maxHp: number = 100,
  statusEffects: StatusEffect[] = [],
  isPlayer: boolean = true,
  currentAction: Action | null = null
): Character {
  return {
    id,
    name: `Character ${id}`,
    maxHp,
    currentHp,
    skills: [],
    statusEffects,
    currentAction,
    isPlayer,
  };
}

function createAction(
  skillId: string,
  casterId: string,
  targets: string[],
  ticksRemaining: number = 0
): Action {
  return {
    skillId,
    casterId,
    targets,
    ticksRemaining,
  };
}

function createStatus(
  type: 'poisoned' | 'stunned' | 'shielded' | 'taunting' | 'defending' | 'enraged',
  duration: number,
  value?: number
): StatusEffect {
  return { type, duration, value };
}

function createCombatState(
  players: Character[],
  enemies: Character[],
  tickNumber: number = 0,
  actionQueue: Action[] = [],
  battleStatus: 'ongoing' | 'victory' | 'defeat' = 'ongoing'
): CombatState {
  return {
    players,
    enemies,
    tickNumber,
    actionQueue,
    eventLog: [],
    battleStatus,
  };
}

describe('TickExecutor - AC1: 5-Phase Tick Execution', () => {
  it('should execute all 5 phases in order with queued actions', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = executor.executeTick(state);

    // Phase 1: Rule evaluation (idle units only - both have actions or no rules)
    // Phase 2: Action progress (action at 0 ticks doesn't decrement)
    // Phase 3: Action resolution (Strike resolves, enemy takes 15 damage)
    expect(result.updatedState.enemies[0]!.currentHp).toBe(85);
    
    // Phase 4: Status effects (none to process)
    // Phase 5: Cleanup (no knockouts, battle ongoing)
    expect(result.updatedState.battleStatus).toBe('ongoing');
    expect(result.battleEnded).toBe(false);
    
    // Should have events from resolution phase
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('should generate events from all applicable phases', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = executor.executeTick(state);

    // Should have events from Phase 3: Action resolution
    expect(result.events.length).toBeGreaterThan(0);
    
    // Events should be appended to state's event log
    expect(result.updatedState.eventLog.length).toBe(result.events.length);
  });
});

describe('TickExecutor - AC2: Rule Evaluation Only for Idle Units', () => {
  it('should evaluate rules only for idle units', () => {
    // This test will need RuleEvaluator to be implemented
    // For now, we test that units with currentAction are skipped
    const idlePlayer = createTestCharacter('player-1', 100, 100, [], true, null);
    const busyPlayer = createTestCharacter('player-2', 100, 100, [], true, 
      createAction('strike', 'player-2', ['enemy-1'], 2)
    );
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([idlePlayer, busyPlayer], [enemy], 1);

    const result = executor.executeTick(state);

    // Only idle player should evaluate rules (if they have rules with skills)
    // Busy player should not queue new action
    // Since we don't have skills/rules defined in test, just verify no errors
    expect(result.updatedState).toBeDefined();
  });

  it('should skip rule evaluation for stunned idle unit', () => {
    const stunnedPlayer = createTestCharacter('player-1', 100, 100, [
      createStatus('stunned', 2),
    ], true, null);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([stunnedPlayer], [enemy], 1);

    const result = executor.executeTick(state);

    // Stunned player should not queue any action even if idle
    // Player's currentAction should remain null
    expect(result.updatedState.players[0]!.currentAction).toBeNull();
  });

  it('should evaluate rules for idle units without queued actions', () => {
    const idlePlayer = createTestCharacter('player-1', 100, 100, [], true, null);
    const idleEnemy = createTestCharacter('enemy-1', 100, 100, [], false, null);
    
    const state = createCombatState([idlePlayer], [idleEnemy], 1);

    const result = executor.executeTick(state);

    // Both units are idle and should evaluate rules
    // Without skills, no actions will be queued
    expect(result.updatedState).toBeDefined();
  });
});

describe('TickExecutor - AC3: Action Progress Countdown', () => {
  it('should decrement action ticksRemaining by 1', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('heavy-strike', 'player-1', ['enemy-1'], 3);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = executor.executeTick(state);

    // Phase 2: Action progress countdown
    // Action should go from 3 ticks to 2 ticks
    const updatedAction = result.updatedState.actionQueue.find(a => a.skillId === 'heavy-strike');
    expect(updatedAction?.ticksRemaining).toBe(2);
  });

  it('should decrement multiple actions simultaneously', () => {
    const player1 = createTestCharacter('player-1', 100, 100, [], true);
    const player2 = createTestCharacter('player-2', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const actions = [
      createAction('strike', 'player-1', ['enemy-1'], 2),
      createAction('heal', 'player-2', ['player-1'], 3),
    ];
    
    const state = createCombatState([player1, player2], [enemy], 1, actions);

    const result = executor.executeTick(state);

    // Both actions should decrement
    expect(result.updatedState.actionQueue[0]!.ticksRemaining).toBe(1);
    expect(result.updatedState.actionQueue[1]!.ticksRemaining).toBe(2);
  });

  it('should not decrement actions at 0 ticks (they resolve instead)', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = executor.executeTick(state);

    // Action at 0 ticks should be removed from queue (resolved in Phase 3)
    const remainingAction = result.updatedState.actionQueue.find(a => a.skillId === 'strike');
    expect(remainingAction).toBeUndefined();
  });
});

describe('TickExecutor - AC4: Simultaneous Resolution', () => {
  it('should resolve multiple actions reaching 0 ticks simultaneously', () => {
    const player1 = createTestCharacter('player-1', 100, 100, [], true);
    const player2 = createTestCharacter('player-2', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const actions = [
      createAction('strike', 'player-1', ['enemy-1'], 0), // 15 damage
      createAction('strike', 'player-2', ['enemy-1'], 0), // 15 damage
    ];
    
    const state = createCombatState([player1, player2], [enemy], 1, actions);

    const result = executor.executeTick(state);

    // Both strikes should resolve, enemy takes 30 total damage
    expect(result.updatedState.enemies[0]!.currentHp).toBe(70);
  });

  it('should resolve player actions before enemy actions in ties', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const actions = [
      createAction('strike', 'player-1', ['enemy-1'], 0),
      createAction('strike', 'enemy-1', ['player-1'], 0),
    ];
    
    const state = createCombatState([player], [enemy], 1, actions);

    const result = executor.executeTick(state);

    // Both should resolve simultaneously (mutual damage)
    expect(result.updatedState.players[0]!.currentHp).toBe(85);
    expect(result.updatedState.enemies[0]!.currentHp).toBe(85);
    
    // Events should show player action first
    const actionEvents = result.events.filter(e => e.type === 'action-resolved');
    if (actionEvents.length === 2) {
      expect(actionEvents[0]!.actorId).toBe('player-1');
      expect(actionEvents[1]!.actorId).toBe('enemy-1');
    }
  });

  it('should process actions left-to-right for players', () => {
    const player1 = createTestCharacter('player-1', 100, 100, [], true);
    const player2 = createTestCharacter('player-2', 100, 100, [], true);
    const player3 = createTestCharacter('player-3', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const actions = [
      createAction('strike', 'player-3', ['enemy-1'], 0),
      createAction('strike', 'player-1', ['enemy-1'], 0),
      createAction('strike', 'player-2', ['enemy-1'], 0),
    ];
    
    const state = createCombatState([player1, player2, player3], [enemy], 1, actions);

    const result = executor.executeTick(state);

    // All should resolve
    expect(result.updatedState.enemies[0]!.currentHp).toBe(55); // 100 - 45
    
    // Events should be in player order (player-1, player-2, player-3)
    const actionEvents = result.events.filter(e => e.type === 'action-resolved');
    if (actionEvents.length === 3) {
      expect(actionEvents[0]!.actorId).toBe('player-1');
      expect(actionEvents[1]!.actorId).toBe('player-2');
      expect(actionEvents[2]!.actorId).toBe('player-3');
    }
  });
});

describe('TickExecutor - AC6: Cleanup Phase Knockout Detection', () => {
  it('should detect knockout when HP reaches 0', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 15, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = executor.executeTick(state);

    // Enemy should be knocked out (HP = 0)
    expect(result.updatedState.enemies[0]!.currentHp).toBe(0);
    
    // Should have knockout event
    const knockoutEvent = result.events.find(e => e.type === 'knockout');
    expect(knockoutEvent).toBeDefined();
    expect(knockoutEvent?.targetId).toBe('enemy-1');
  });

  it('should detect all knockouts before victory check', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 15, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 15, 100, [], false);
    
    const actions = [
      createAction('strike', 'player-1', ['enemy-1'], 0),
      createAction('strike', 'player-1', ['enemy-2'], 0),
    ];
    
    const state = createCombatState([player], [enemy1, enemy2], 1, actions);

    const result = executor.executeTick(state);

    // Both enemies should be knocked out
    expect(result.updatedState.enemies[0]!.currentHp).toBe(0);
    expect(result.updatedState.enemies[1]!.currentHp).toBe(0);
    
    // Should have 2 knockout events
    const knockoutEvents = result.events.filter(e => e.type === 'knockout');
    expect(knockoutEvents.length).toBe(2);
    
    // Victory should be detected after all knockouts
    expect(result.updatedState.battleStatus).toBe('victory');
  });

});

describe('TickExecutor - AC7: Victory Condition', () => {
  it('should set battleStatus to victory when all enemies knocked out', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 15, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = executor.executeTick(state);

    // All enemies knocked out
    expect(result.updatedState.enemies[0]!.currentHp).toBe(0);
    
    // Battle status should be victory
    expect(result.updatedState.battleStatus).toBe('victory');
    expect(result.battleEnded).toBe(true);
    
    // Should have victory event
    const victoryEvent = result.events.find(e => e.type === 'victory');
    expect(victoryEvent).toBeDefined();
  });

  it('should trigger victory with multiple enemies all knocked out', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 0, 100, [], false); // Already KO
    const enemy2 = createTestCharacter('enemy-2', 15, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-2'], 0);
    const state = createCombatState([player], [enemy1, enemy2], 1, [action]);

    const result = executor.executeTick(state);

    expect(result.updatedState.battleStatus).toBe('victory');
    expect(result.battleEnded).toBe(true);
  });

  it('should handle simultaneous player/enemy knockout as victory', () => {
    const player = createTestCharacter('player-1', 15, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 15, 100, [], false);
    
    const actions = [
      createAction('strike', 'player-1', ['enemy-1'], 0),
      createAction('strike', 'enemy-1', ['player-1'], 0),
    ];
    
    const state = createCombatState([player], [enemy], 1, actions);

    const result = executor.executeTick(state);

    // Both knocked out
    expect(result.updatedState.players[0]!.currentHp).toBe(0);
    expect(result.updatedState.enemies[0]!.currentHp).toBe(0);
    
    // Player wins in simultaneous knockout (per spec: victory checked first)
    expect(result.updatedState.battleStatus).toBe('victory');
    expect(result.battleEnded).toBe(true);
  });
});

describe('TickExecutor - AC8: Defeat Condition', () => {
  it('should set battleStatus to defeat when all players knocked out', () => {
    const player = createTestCharacter('player-1', 15, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'enemy-1', ['player-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = executor.executeTick(state);

    // All players knocked out
    expect(result.updatedState.players[0]!.currentHp).toBe(0);
    
    // Battle status should be defeat
    expect(result.updatedState.battleStatus).toBe('defeat');
    expect(result.battleEnded).toBe(true);
    
    // Should have defeat event
    const defeatEvent = result.events.find(e => e.type === 'defeat');
    expect(defeatEvent).toBeDefined();
  });

  it('should trigger defeat when last player is knocked out', () => {
    const player1 = createTestCharacter('player-1', 0, 100, [], true); // Already KO
    const player2 = createTestCharacter('player-2', 15, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'enemy-1', ['player-2'], 0);
    const state = createCombatState([player1, player2], [enemy], 1, [action]);

    const result = executor.executeTick(state);

    expect(result.updatedState.battleStatus).toBe('defeat');
    expect(result.battleEnded).toBe(true);
  });

});

describe('TickExecutor - Tick Counter', () => {
  it('should increment tick counter by 1', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 5);

    const result = executor.executeTick(state);

    // Tick number should increment from 5 to 6
    expect(result.updatedState.tickNumber).toBe(6);
  });

  it('should include correct tick number in events', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 3, [action]);

    const result = executor.executeTick(state);

    // All events should have tick number 4 (after increment)
    result.events.forEach(event => {
      expect(event.tick).toBe(4);
    });
  });
});

describe('TickExecutor - Event Log Accumulation', () => {
  it('should append events to existing event log', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);
    
    // Add existing event to log
    state.eventLog.push({
      tick: 0,
      type: 'action-queued',
      actorId: 'player-1',
      message: 'Previous event',
    });

    const result = executor.executeTick(state);

    // Event log should contain old + new events
    expect(result.updatedState.eventLog.length).toBeGreaterThan(1);
    expect(result.updatedState.eventLog[0]!.message).toBe('Previous event');
  });

});

describe('TickExecutor - Battle Status', () => {
  it('should keep battleStatus as ongoing when both sides have alive units', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = executor.executeTick(state);

    // Battle should continue
    expect(result.updatedState.battleStatus).toBe('ongoing');
    expect(result.battleEnded).toBe(false);
  });

  it('should not change battleStatus if already victory', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 0, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1, [], 'victory');

    const result = executor.executeTick(state);

    // Should remain victory
    expect(result.updatedState.battleStatus).toBe('victory');
    expect(result.battleEnded).toBe(true);
  });

  it('should not change battleStatus if already defeat', () => {
    const player = createTestCharacter('player-1', 0, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1, [], 'defeat');

    const result = executor.executeTick(state);

    // Should remain defeat
    expect(result.updatedState.battleStatus).toBe('defeat');
    expect(result.battleEnded).toBe(true);
  });
});

describe('TickExecutor - Knocked Out Characters', () => {
  it('should not queue actions for knocked out characters', () => {
    const knockedOutPlayer = createTestCharacter('player-1', 0, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([knockedOutPlayer], [enemy], 1);

    const result = executor.executeTick(state);

    // Knocked out player should not evaluate rules or queue actions
    expect(result.updatedState.players[0]!.currentAction).toBeNull();
  });

  it('should remove actions from knocked out characters', () => {
    const player = createTestCharacter('player-1', 15, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    // Player has an action queued
    const playerAction = createAction('strike', 'player-1', ['enemy-1'], 2);
    const enemyAction = createAction('strike', 'enemy-1', ['player-1'], 0);
    
    const state = createCombatState([player], [enemy], 1, [playerAction, enemyAction]);

    const result = executor.executeTick(state);

    // Player gets knocked out by Strike
    expect(result.updatedState.players[0]!.currentHp).toBe(0);
    
    // Player's queued action should be removed
    const remainingPlayerAction = result.updatedState.actionQueue.find(a => a.casterId === 'player-1');
    expect(remainingPlayerAction).toBeUndefined();
  });
});

describe('TickExecutor - Complex Integration Scenarios', () => {
});

describe('TickExecutor - runBattle Helper', () => {
  it('should run battle until victory or defeat', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 15, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 0, [action]);

    const finalState = executor.runBattle(state);

    // Battle should end with victory
    expect(finalState.battleStatus).toBe('victory');
  });

  it('should prevent infinite loops with max tick limit', () => {
    const player = createTestCharacter('player-1', 1000, 1000, [], true);
    const enemy = createTestCharacter('enemy-1', 1000, 1000, [], false);
    
    const state = createCombatState([player], [enemy], 0, []);

    const finalState = executor.runBattle(state);

    // Should eventually end (either from max ticks or battle end)
    // This test ensures we don't have infinite loops
    expect(finalState.tickNumber).toBeLessThan(1000);
  });
});

describe('TickExecutor - Immutability', () => {
  it('should not mutate input CombatState', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);
    
    const originalTickNumber = state.tickNumber;
    const originalEventLogLength = state.eventLog.length;

    executor.executeTick(state);

    // Original state should not be modified
    expect(state.tickNumber).toBe(originalTickNumber);
    expect(state.eventLog.length).toBe(originalEventLogLength);
  });

  it('should return new CombatState object', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1);

    const result = executor.executeTick(state);

    // Should be a new object
    expect(result.updatedState).not.toBe(state);
  });
});
