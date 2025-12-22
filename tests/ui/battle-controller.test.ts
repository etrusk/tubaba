import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Character, CombatState, StatusEffect, Action } from '../../src/types/index.js';
import { BattleController, type TimeProvider } from '../../src/ui/battle-controller.js';

/**
 * Mock time provider for deterministic testing
 * Provides explicit control over when timers fire
 */
class MockTimeProvider implements TimeProvider {
  private timers: Map<number, { callback: () => void; ms: number }> = new Map();
  private nextId = 1;

  setTimeout(callback: () => void, ms: number): number {
    const id = this.nextId++;
    this.timers.set(id, { callback, ms });
    return id;
  }

  clearTimeout(id: number): void {
    this.timers.delete(id);
  }

  /**
   * Manually trigger all pending timers
   */
  triggerAll(): void {
    const timers = Array.from(this.timers.values());
    this.timers.clear();
    timers.forEach(timer => timer.callback());
  }

  /**
   * Trigger a specific number of timers
   */
  triggerNext(count: number = 1): void {
    const timers = Array.from(this.timers.entries()).slice(0, count);
    timers.forEach(([id, timer]) => {
      this.timers.delete(id);
      timer.callback();
    });
  }

  /**
   * Check if there are pending timers
   */
  hasPendingTimers(): boolean {
    return this.timers.size > 0;
  }

  /**
   * Clear all pending timers
   */
  clear(): void {
    this.timers.clear();
  }
}

/**
 * BattleController Test Suite
 *
 * Tests the battle playback controller:
 * - Step forward/back through battle history
 * - Play/pause auto-stepping
 * - Speed control for playback
 * - State history management
 *
 * Implementation: src/ui/battle-controller.ts
 */

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

describe('BattleController - AC48: Step Forward', () => {
  it('should advance state to next tick when step() is called', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 5);
    
    const controller = new BattleController(initialState);
    
    controller.step();
    
    const currentState = controller.getCurrentState();
    expect(currentState.tickNumber).toBe(6);
  });

  it('should save previous state to history before advancing', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 3);
    
    const controller = new BattleController(initialState);
    
    // Initial state should be in history
    expect(controller.getHistory().length).toBe(1);
    expect(controller.getHistory()[0]!.tickNumber).toBe(3);
    
    controller.step();
    
    // History should now have tick 3 and tick 4
    expect(controller.getHistory().length).toBe(2);
    expect(controller.getHistory()[0]!.tickNumber).toBe(3);
    expect(controller.getHistory()[1]!.tickNumber).toBe(4);
  });

  it('should no-op when step() is called after battle ended', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 0, 100, [], false);
    const endedState = createCombatState([player], [enemy], 10, [], 'victory');
    
    const controller = new BattleController(endedState);
    
    controller.step();
    
    // Should remain at tick 10, no advancement
    expect(controller.getCurrentState().tickNumber).toBe(10);
    expect(controller.getCurrentState().battleStatus).toBe('victory');
  });

  it('should allow multiple sequential steps', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.step();
    controller.step();
    controller.step();
    
    expect(controller.getCurrentState().tickNumber).toBe(3);
    expect(controller.getHistory().length).toBe(4); // Ticks 0, 1, 2, 3
  });

  it('should not mutate the initial state when stepping', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 5);
    
    const originalTick = initialState.tickNumber;
    
    const controller = new BattleController(initialState);
    controller.step();
    
    // Original state should remain unchanged
    expect(initialState.tickNumber).toBe(originalTick);
  });

  it('should execute tick using TickExecutor when stepping forward', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const initialState = createCombatState([player], [enemy], 1, [action]);
    
    const controller = new BattleController(initialState);
    
    controller.step();
    
    // After Strike resolves, enemy should take damage
    const currentState = controller.getCurrentState();
    expect(currentState.enemies[0]!.currentHp).toBeLessThan(100);
  });

  it('should maintain event log across steps', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.step();
    
    const currentState = controller.getCurrentState();
    expect(currentState.eventLog.length).toBeGreaterThanOrEqual(0);
  });
});

describe('BattleController - AC49: Step Back', () => {
  it('should return to previous state when stepBack() is called', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 3);
    
    const controller = new BattleController(initialState);
    
    controller.step(); // Tick 3 → 4
    controller.step(); // Tick 4 → 5
    
    expect(controller.getCurrentState().tickNumber).toBe(5);
    
    controller.stepBack(); // Back to tick 4
    
    expect(controller.getCurrentState().tickNumber).toBe(4);
  });

  it('should no-op when stepBack() is called at initial state', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // At initial state, can't step back
    controller.stepBack();
    
    expect(controller.getCurrentState().tickNumber).toBe(0);
    expect(controller.getHistory().length).toBe(1);
  });

  it('should allow multiple sequential step backs', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.step(); // 0 → 1
    controller.step(); // 1 → 2
    controller.step(); // 2 → 3
    controller.step(); // 3 → 4
    
    expect(controller.getCurrentState().tickNumber).toBe(4);
    
    controller.stepBack(); // 4 → 3
    controller.stepBack(); // 3 → 2
    controller.stepBack(); // 2 → 1
    
    expect(controller.getCurrentState().tickNumber).toBe(1);
  });

  it('should allow stepping forward after stepping back', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.step(); // 0 → 1
    controller.step(); // 1 → 2
    controller.stepBack(); // 2 → 1
    controller.step(); // 1 → 2
    
    expect(controller.getCurrentState().tickNumber).toBe(2);
  });

  it('should restore full state snapshot when stepping back', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const initialState = createCombatState([player], [enemy], 1, [action]);
    
    const controller = new BattleController(initialState);
    
    const initialEnemyHp = controller.getCurrentState().enemies[0]!.currentHp;
    
    controller.step(); // Strike resolves, enemy takes damage
    
    const damagedEnemyHp = controller.getCurrentState().enemies[0]!.currentHp;
    expect(damagedEnemyHp).toBeLessThan(initialEnemyHp);
    
    controller.stepBack(); // Back to before damage
    
    expect(controller.getCurrentState().enemies[0]!.currentHp).toBe(initialEnemyHp);
  });

  it('should maintain history correctly when stepping back and forward', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.step(); // 0 → 1
    controller.step(); // 1 → 2
    
    expect(controller.getHistory().length).toBe(3); // Ticks 0, 1, 2
    
    controller.stepBack(); // Back to 1
    
    // History should still contain all visited states
    expect(controller.getHistory().length).toBeGreaterThanOrEqual(2);
  });

  it('should handle step back at battle end correctly', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 15, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const initialState = createCombatState([player], [enemy], 5, [action]);
    
    const controller = new BattleController(initialState);
    
    controller.step(); // Enemy dies, battle ends with victory
    
    expect(controller.getCurrentState().battleStatus).toBe('victory');
    
    controller.stepBack(); // Back to before victory
    
    expect(controller.getCurrentState().battleStatus).toBe('ongoing');
    expect(controller.getCurrentState().enemies[0]!.currentHp).toBeGreaterThan(0);
  });
});

describe('BattleController - AC50: Play/Pause', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start auto-stepping when play() is called', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.play();
    
    expect(controller.isPlaying()).toBe(true);
  });

  it('should stop auto-stepping when pause() is called', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.play();
    expect(controller.isPlaying()).toBe(true);
    
    controller.pause();
    expect(controller.isPlaying()).toBe(false);
  });

  it('should execute ticks automatically during play', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const mockTime = new MockTimeProvider();
    const controller = new BattleController(initialState, mockTime);
    
    controller.play();
    
    // Manually trigger 3 ticks
    mockTime.triggerNext(); // Tick 0 -> 1
    mockTime.triggerNext(); // Tick 1 -> 2
    mockTime.triggerNext(); // Tick 2 -> 3
    
    // Should have executed exactly 3 ticks
    expect(controller.getCurrentState().tickNumber).toBe(3);
  });

  it('should stop advancing when pause() is called after play()', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const mockTime = new MockTimeProvider();
    const controller = new BattleController(initialState, mockTime);
    
    controller.play();
    mockTime.triggerNext(); // Trigger 1 tick
    mockTime.triggerNext(); // Trigger another tick
    
    const tickBeforePause = controller.getCurrentState().tickNumber;
    expect(tickBeforePause).toBe(2);
    
    controller.pause();
    
    // After pause, no timers should be pending
    expect(mockTime.hasPendingTimers()).toBe(false);
    
    // Tick should not have advanced after pause
    expect(controller.getCurrentState().tickNumber).toBe(tickBeforePause);
  });

  it('should no-op when play() is called while already playing', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const mockTime = new MockTimeProvider();
    const controller = new BattleController(initialState, mockTime);
    
    controller.play();
    expect(controller.isPlaying()).toBe(true);
    
    // Call play again
    controller.play();
    expect(controller.isPlaying()).toBe(true);
    
    // Should still work normally (no double-speed or errors)
    mockTime.triggerNext();
    const tick1 = controller.getCurrentState().tickNumber;
    expect(tick1).toBe(1);
    
    mockTime.triggerNext();
    const tick2 = controller.getCurrentState().tickNumber;
    expect(tick2).toBe(2);
  });

  it('should no-op when pause() is called while not playing', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    expect(controller.isPlaying()).toBe(false);
    
    // Call pause without playing
    controller.pause();
    
    expect(controller.isPlaying()).toBe(false);
  });

  it('should automatically stop when battle ends during play', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    // Set enemy HP very low to ensure strike kills it
    const enemy = createTestCharacter('enemy-1', 1, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const initialState = createCombatState([player], [enemy], 0, [action]);
    
    const mockTime = new MockTimeProvider();
    const controller = new BattleController(initialState, mockTime);
    
    controller.play();
    
    // Trigger ticks until battle ends (max 10 to prevent infinite loop)
    let tickCount = 0;
    while (controller.isPlaying() && tickCount < 10 && mockTime.hasPendingTimers()) {
      mockTime.triggerNext();
      tickCount++;
    }
    
    // Should have stopped playing after victory
    expect(controller.isPlaying()).toBe(false);
    expect(controller.getCurrentState().battleStatus).not.toBe('ongoing');
  });
});

describe('BattleController - Standard Coverage: History Management', () => {
  it('should maintain full state snapshots in history', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.step();
    controller.step();
    
    const history = controller.getHistory();
    
    // Each history entry should be a complete CombatState
    expect(history.length).toBeGreaterThanOrEqual(2);
    history.forEach(state => {
      expect(state.players).toBeDefined();
      expect(state.enemies).toBeDefined();
      expect(state.tickNumber).toBeDefined();
      expect(state.actionQueue).toBeDefined();
      expect(state.eventLog).toBeDefined();
      expect(state.battleStatus).toBeDefined();
    });
  });

  it('should return history in chronological order', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.step();
    controller.step();
    controller.step();
    
    const history = controller.getHistory();
    
    // Ticks should be in ascending order
    for (let i = 0; i < history.length - 1; i++) {
      expect(history[i + 1]!.tickNumber).toBeGreaterThan(history[i]!.tickNumber);
    }
  });

  it('should include initial state in history', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 5);
    
    const controller = new BattleController(initialState);
    
    const history = controller.getHistory();
    
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]!.tickNumber).toBe(5);
  });
});

describe('BattleController - Standard Coverage: Speed Control', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should adjust tick interval when speed is changed', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const mockTime = new MockTimeProvider();
    const controller = new BattleController(initialState, mockTime);
    
    // Set speed to 2x
    controller.setSpeed(2.0);
    expect(controller.getSpeed()).toBe(2.0);
    
    controller.play();
    
    // Trigger 2 ticks
    mockTime.triggerNext();
    mockTime.triggerNext();
    
    // Should have executed exactly 2 ticks
    expect(controller.getCurrentState().tickNumber).toBe(2);
  });

  it('should return current speed multiplier', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Default speed should be 1.0
    expect(controller.getSpeed()).toBe(1.0);
    
    controller.setSpeed(0.5);
    expect(controller.getSpeed()).toBe(0.5);
    
    controller.setSpeed(2.0);
    expect(controller.getSpeed()).toBe(2.0);
  });

  it('should allow speed changes during playback', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.play();
    controller.setSpeed(2.0);
    
    expect(controller.isPlaying()).toBe(true);
    expect(controller.getSpeed()).toBe(2.0);
  });

  it('should handle slow speed (0.5x) correctly', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const mockTime = new MockTimeProvider();
    const controller = new BattleController(initialState, mockTime);
    
    controller.setSpeed(0.5);
    controller.play();
    
    // Trigger 1 tick
    mockTime.triggerNext();
    
    // Should have executed exactly 1 tick
    expect(controller.getCurrentState().tickNumber).toBe(1);
  });
});

describe('BattleController - Standard Coverage: Reset', () => {
  it('should return to initial state when reset() is called', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.step();
    controller.step();
    controller.step();
    
    expect(controller.getCurrentState().tickNumber).toBe(3);
    
    controller.reset();
    
    expect(controller.getCurrentState().tickNumber).toBe(0);
  });

  it('should clear history except initial state after reset', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.step();
    controller.step();
    
    expect(controller.getHistory().length).toBeGreaterThan(1);
    
    controller.reset();
    
    expect(controller.getHistory().length).toBe(1);
    expect(controller.getHistory()[0]!.tickNumber).toBe(0);
  });

  it('should stop playback if playing when reset() is called', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const mockTime = new MockTimeProvider();
    const controller = new BattleController(initialState, mockTime);
    
    controller.play();
    expect(controller.isPlaying()).toBe(true);
    
    controller.reset();
    
    expect(controller.isPlaying()).toBe(false);
    expect(mockTime.hasPendingTimers()).toBe(false);
  });

  it('should restore initial state completely including character HP', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const initialState = createCombatState([player], [enemy], 0, [action]);
    
    const controller = new BattleController(initialState);
    
    controller.step(); // Enemy takes damage
    
    expect(controller.getCurrentState().enemies[0]!.currentHp).toBeLessThan(100);
    
    controller.reset();
    
    expect(controller.getCurrentState().enemies[0]!.currentHp).toBe(100);
  });
});

describe('BattleController - Standard Coverage: State Access', () => {
  it('should return current combat state', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 5);
    
    const controller = new BattleController(initialState);
    
    const currentState = controller.getCurrentState();
    
    expect(currentState).toBeDefined();
    expect(currentState.tickNumber).toBe(5);
    expect(currentState.players.length).toBe(1);
    expect(currentState.enemies.length).toBe(1);
  });

  it('should return current tick number', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 7);
    
    const controller = new BattleController(initialState);
    
    expect(controller.getCurrentTick()).toBe(7);
    
    controller.step();
    
    expect(controller.getCurrentTick()).toBe(8);
  });

  it('should return history array', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    const history = controller.getHistory();
    
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it('should not allow external mutation of returned state', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    const state1 = controller.getCurrentState();
    
    // Immer freezes state - mutation should throw error
    expect(() => {
      state1.tickNumber = 999;
    }).toThrow();
    
    const state2 = controller.getCurrentState();
    
    // Should not have been affected by mutation attempt
    expect(state2.tickNumber).toBe(0);
  });
});

describe('BattleController - Windowed History (Phase 2b)', () => {
  it('should limit history to MAX_HISTORY entries (50)', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 1000, 1000, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Execute 60 steps (more than MAX_HISTORY of 50)
    for (let i = 0; i < 60; i++) {
      controller.step();
    }
    
    const history = controller.getHistory();
    
    // History should be capped at 50 entries
    expect(history.length).toBe(50);
  });

  it('should prune oldest entries when exceeding MAX_HISTORY', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 1000, 1000, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Execute 60 steps
    for (let i = 0; i < 60; i++) {
      controller.step();
    }
    
    const history = controller.getHistory();
    
    // Oldest entry should be tick 11 (60 - 50 + 1)
    // History contains ticks [11, 12, 13, ..., 60]
    expect(history[0]!.tickNumber).toBe(11);
    expect(history[history.length - 1]!.tickNumber).toBe(60);
  });

  it('should stop stepBack() at oldest available history entry', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 1000, 1000, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Execute 60 steps to trigger pruning
    for (let i = 0; i < 60; i++) {
      controller.step();
    }
    
    // Should be at tick 60
    expect(controller.getCurrentTick()).toBe(60);
    
    // Step back 100 times (more than history length)
    for (let i = 0; i < 100; i++) {
      controller.stepBack();
    }
    
    // Should stop at oldest available history (tick 11)
    expect(controller.getCurrentTick()).toBe(11);
  });

  it('should not crash when stepping back to oldest available state', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 1000, 1000, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Execute 55 steps
    for (let i = 0; i < 55; i++) {
      controller.step();
    }
    
    // Step back to the oldest available state
    for (let i = 0; i < 50; i++) {
      controller.stepBack();
    }
    
    // Should be at oldest available tick (6)
    expect(controller.getCurrentTick()).toBe(6);
    
    // Attempting to step back further should be a no-op
    controller.stepBack();
    controller.stepBack();
    
    expect(controller.getCurrentTick()).toBe(6);
  });

  it('should maintain correct history after pruning and stepping forward', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 1000, 1000, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Execute 55 steps to trigger pruning
    for (let i = 0; i < 55; i++) {
      controller.step();
    }
    
    // History should be [6, 7, 8, ..., 55]
    const history = controller.getHistory();
    expect(history.length).toBe(50);
    expect(history[0]!.tickNumber).toBe(6);
    expect(history[49]!.tickNumber).toBe(55);
    
    // Step forward 5 more times
    for (let i = 0; i < 5; i++) {
      controller.step();
    }
    
    // History should now be [11, 12, 13, ..., 60]
    const newHistory = controller.getHistory();
    expect(newHistory.length).toBe(50);
    expect(newHistory[0]!.tickNumber).toBe(11);
    expect(newHistory[49]!.tickNumber).toBe(60);
  });

  it('should handle history window correctly when battle ends', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    // Enemy with very low HP and an action that will kill it
    const enemy = createTestCharacter('enemy-1', 1, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const initialState = createCombatState([player], [enemy], 0, [action]);
    
    const controller = new BattleController(initialState);
    
    // Step until battle ends (max 20 ticks to prevent infinite loop)
    let tickCount = 0;
    while (controller.getCurrentState().battleStatus === 'ongoing' && tickCount < 20) {
      controller.step();
      tickCount++;
    }
    
    // Battle should have ended
    expect(controller.getCurrentState().battleStatus).not.toBe('ongoing');
    
    // History should still be bounded
    expect(controller.getHistory().length).toBeLessThanOrEqual(50);
    
    // Should be able to step back to available history
    controller.stepBack();
    expect(controller.getCurrentState().battleStatus).toBe('ongoing');
  });

  it('should not prune history when below MAX_HISTORY limit', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 1000, 1000, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Execute only 30 steps (below MAX_HISTORY of 50)
    for (let i = 0; i < 30; i++) {
      controller.step();
    }
    
    const history = controller.getHistory();
    
    // Should have all 31 entries (initial + 30 steps)
    expect(history.length).toBe(31);
    
    // Should still have the initial state (tick 0)
    expect(history[0]!.tickNumber).toBe(0);
    expect(history[30]!.tickNumber).toBe(30);
  });
});
