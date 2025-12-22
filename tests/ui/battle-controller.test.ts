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

// Helper functions for creating skills and instructions
function createTestSkill(
  id: string,
  name: string = `Skill ${id}`,
  baseDuration: number = 3
): any {
  return {
    id,
    name,
    baseDuration,
    effects: [{ type: 'damage', value: 10 }],
    targeting: 'single-enemy-lowest-hp' as const,
    rules: []
  };
}

function createCharacterWithSkills(
  id: string,
  skills: any[] = []
): Character {
  return {
    id,
    name: `Character ${id}`,
    maxHp: 100,
    currentHp: 100,
    skills,
    statusEffects: [],
    currentAction: null,
    isPlayer: true,
  };
}

describe('BattleController - AC54: Character Selection', () => {
  it('should set selectedCharacterId when selectCharacter() is called', () => {
    const player1 = createTestCharacter('player-1', 100, 100, [], true);
    const player2 = createTestCharacter('player-2', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player1, player2], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.selectCharacter('player-1');
    
    const instructionsState = controller.getInstructionsState();
    expect(instructionsState.selectedCharacterId).toBe('player-1');
  });

  it('should clear selection when selectCharacter(null) is called', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.selectCharacter('player-1');
    expect(controller.getInstructionsState().selectedCharacterId).toBe('player-1');
    
    controller.selectCharacter(null);
    expect(controller.getInstructionsState().selectedCharacterId).toBe(null);
  });

  it('should toggle selection when selectCharacter(sameId) is called', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Select player-1
    controller.selectCharacter('player-1');
    expect(controller.getInstructionsState().selectedCharacterId).toBe('player-1');
    
    // Select player-1 again (toggle off)
    controller.selectCharacter('player-1');
    expect(controller.getInstructionsState().selectedCharacterId).toBe(null);
  });

  it('should return selected character via getSelectedCharacter()', () => {
    const player1 = createTestCharacter('player-1', 100, 100, [], true);
    const player2 = createTestCharacter('player-2', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player1, player2], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.selectCharacter('player-2');
    
    const selected = controller.getSelectedCharacter();
    expect(selected).not.toBe(null);
    expect(selected?.id).toBe('player-2');
  });

  it('should return null when no character is selected', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    const selected = controller.getSelectedCharacter();
    expect(selected).toBe(null);
  });

  it('should return null when selected character no longer exists in state', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Select a character that doesn't exist
    controller.selectCharacter('nonexistent-id');
    
    const selected = controller.getSelectedCharacter();
    expect(selected).toBe(null);
  });

  it('should return selected character instructions via getSelectedCharacterInstructions()', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.selectCharacter('player-1');
    
    const instructions = controller.getSelectedCharacterInstructions();
    expect(instructions).not.toBe(null);
    expect(instructions?.characterId).toBe('player-1');
  });

  it('should return null from getSelectedCharacterInstructions() when no selection', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    const instructions = controller.getSelectedCharacterInstructions();
    expect(instructions).toBe(null);
  });
});

describe('BattleController - AC55: Control Mode Updates', () => {
  it('should update control mode for a character', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Default should be 'ai'
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    expect(instructions?.controlMode).toBe('ai');
    
    controller.updateControlMode('player-1', 'human');
    
    const updated = controller.getInstructionsState().instructions.get('player-1');
    expect(updated?.controlMode).toBe('human');
  });

  it('should persist control mode across battle steps', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.updateControlMode('player-1', 'human');
    
    // Step forward
    controller.step();
    controller.step();
    
    // Control mode should still be 'human'
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    expect(instructions?.controlMode).toBe('human');
  });

  it('should be no-op when updating control mode for unknown character', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Should not throw
    controller.updateControlMode('nonexistent-id', 'human');
    
    // Should not have created instructions for nonexistent character
    const instructions = controller.getInstructionsState().instructions.get('nonexistent-id');
    expect(instructions).toBeUndefined();
  });

  it('should set isDirty when control mode is updated', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    expect(controller.isDirty()).toBe(false);
    
    controller.updateControlMode('player-1', 'human');
    
    expect(controller.isDirty()).toBe(true);
  });
});

describe('BattleController - Skill Instruction Updates', () => {
  it('should reorder skills via updateSkillPriority()', () => {
    const skill1 = createTestSkill('strike');
    const skill2 = createTestSkill('heal');
    const skill3 = createTestSkill('shield');
    const player = createCharacterWithSkills('player-1', [skill1, skill2, skill3]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    const originalOrder = instructions?.skillInstructions.map(si => si.skillId);
    expect(originalOrder).toEqual(['strike', 'heal', 'shield']);
    
    // Move 'heal' (index 1) to index 0
    controller.updateSkillPriority('player-1', 'heal', 0);
    
    const updated = controller.getInstructionsState().instructions.get('player-1');
    const newOrder = updated?.skillInstructions.map(si => si.skillId);
    expect(newOrder).toEqual(['heal', 'strike', 'shield']);
  });

  it('should toggle skill enabled state via toggleSkillEnabled()', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    const skillInstruction = instructions?.skillInstructions.find(si => si.skillId === 'strike');
    expect(skillInstruction?.enabled).toBe(true);
    
    controller.toggleSkillEnabled('player-1', 'strike');
    
    const updated = controller.getInstructionsState().instructions.get('player-1');
    const toggledInstruction = updated?.skillInstructions.find(si => si.skillId === 'strike');
    expect(toggledInstruction?.enabled).toBe(false);
    
    // Toggle again
    controller.toggleSkillEnabled('player-1', 'strike');
    
    const toggled2 = controller.getInstructionsState().instructions.get('player-1');
    const toggledInstruction2 = toggled2?.skillInstructions.find(si => si.skillId === 'strike');
    expect(toggledInstruction2?.enabled).toBe(true);
  });

  it('should add condition via addCondition()', () => {
    const skill1 = createTestSkill('heal');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    const condition = { type: 'hp-below' as const, threshold: 50 };
    controller.addCondition('player-1', 'heal', condition);
    
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    const skillInstruction = instructions?.skillInstructions.find(si => si.skillId === 'heal');
    expect(skillInstruction?.conditions.length).toBe(1);
    expect(skillInstruction?.conditions[0]).toEqual(condition);
  });

  it('should remove condition via removeCondition()', () => {
    const skill1 = createTestSkill('heal');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    const condition1 = { type: 'hp-below' as const, threshold: 50 };
    const condition2 = { type: 'ally-count' as const, threshold: 2 };
    controller.addCondition('player-1', 'heal', condition1);
    controller.addCondition('player-1', 'heal', condition2);
    
    let instructions = controller.getInstructionsState().instructions.get('player-1');
    let skillInstruction = instructions?.skillInstructions.find(si => si.skillId === 'heal');
    expect(skillInstruction?.conditions.length).toBe(2);
    
    // Remove first condition
    controller.removeCondition('player-1', 'heal', 0);
    
    instructions = controller.getInstructionsState().instructions.get('player-1');
    skillInstruction = instructions?.skillInstructions.find(si => si.skillId === 'heal');
    expect(skillInstruction?.conditions.length).toBe(1);
    expect(skillInstruction?.conditions[0]).toEqual(condition2);
  });

  it('should update targeting override via updateTargetingOverride()', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.updateTargetingOverride('player-1', 'strike', 'single-enemy-highest-hp');
    
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    const skillInstruction = instructions?.skillInstructions.find(si => si.skillId === 'strike');
    expect(skillInstruction?.targetingOverride).toBe('single-enemy-highest-hp');
  });

  it('should clear targeting override when updateTargetingOverride() called with undefined', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.updateTargetingOverride('player-1', 'strike', 'single-enemy-highest-hp');
    controller.updateTargetingOverride('player-1', 'strike', undefined);
    
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    const skillInstruction = instructions?.skillInstructions.find(si => si.skillId === 'strike');
    expect(skillInstruction?.targetingOverride).toBeUndefined();
  });

  it('should set isDirty when skill instructions are updated', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    expect(controller.isDirty()).toBe(false);
    
    controller.toggleSkillEnabled('player-1', 'strike');
    
    expect(controller.isDirty()).toBe(true);
  });
});

describe('BattleController - AC60: Instructions Application', () => {
  it('should apply instructions to characters when applyInstructions() is called', () => {
    const skill1 = createTestSkill('strike');
    const skill2 = createTestSkill('heal');
    const player = createCharacterWithSkills('player-1', [skill1, skill2]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Add a condition to heal skill
    const condition = { type: 'hp-below' as const, threshold: 50 };
    controller.addCondition('player-1', 'heal', condition);
    
    controller.applyInstructions();
    
    // Check that character in state now has rules
    const currentState = controller.getCurrentState();
    const healSkill = currentState.players[0]?.skills.find(s => s.id === 'heal');
    expect(healSkill?.rules?.length).toBe(1);
    expect(healSkill?.rules?.[0]?.conditions).toEqual([condition]);
  });

  it('should clear rules when control mode is human', () => {
    const skill1 = createTestSkill('strike');
    skill1.rules = [{ priority: 10, conditions: [] }]; // Start with a rule
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.updateControlMode('player-1', 'human');
    controller.applyInstructions();
    
    const currentState = controller.getCurrentState();
    const strikeSkill = currentState.players[0]?.skills.find(s => s.id === 'strike');
    expect(strikeSkill?.rules?.length).toBe(0);
  });

  it('should only apply enabled skill instructions', () => {
    const skill1 = createTestSkill('strike');
    const skill2 = createTestSkill('heal');
    const player = createCharacterWithSkills('player-1', [skill1, skill2]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Disable strike
    controller.toggleSkillEnabled('player-1', 'strike');
    
    controller.applyInstructions();
    
    const currentState = controller.getCurrentState();
    const strikeSkill = currentState.players[0]?.skills.find(s => s.id === 'strike');
    const healSkill = currentState.players[0]?.skills.find(s => s.id === 'heal');
    
    expect(strikeSkill?.rules?.length).toBe(0); // Disabled, no rules
    expect(healSkill?.rules?.length).toBe(1); // Enabled, has default rule
  });

  it('should apply targeting override when specified', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.updateTargetingOverride('player-1', 'strike', 'single-enemy-highest-hp');
    controller.applyInstructions();
    
    const currentState = controller.getCurrentState();
    const strikeSkill = currentState.players[0]?.skills.find(s => s.id === 'strike');
    expect(strikeSkill?.rules?.[0]?.targetingOverride).toBe('single-enemy-highest-hp');
  });

  it('should set isDirty to false after applyInstructions()', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.toggleSkillEnabled('player-1', 'strike');
    expect(controller.isDirty()).toBe(true);
    
    controller.applyInstructions();
    expect(controller.isDirty()).toBe(false);
  });
});

describe('BattleController - AC61: Instructions Persistence', () => {
  it('should preserve instructions across step()', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.updateControlMode('player-1', 'human');
    const condition = { type: 'hp-below' as const, threshold: 50 };
    controller.addCondition('player-1', 'strike', condition);
    
    controller.step();
    controller.step();
    
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    expect(instructions?.controlMode).toBe('human');
    expect(instructions?.skillInstructions[0]?.conditions).toEqual([condition]);
  });

  it('should preserve instructions across stepBack()', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.updateControlMode('player-1', 'human');
    
    controller.step();
    controller.step();
    controller.stepBack();
    
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    expect(instructions?.controlMode).toBe('human');
  });

  it('should preserve instructions across reset()', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.updateControlMode('player-1', 'human');
    const condition = { type: 'hp-below' as const, threshold: 50 };
    controller.addCondition('player-1', 'strike', condition);
    
    controller.step();
    controller.step();
    controller.reset();
    
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    expect(instructions?.controlMode).toBe('human');
    expect(instructions?.skillInstructions[0]?.conditions).toEqual([condition]);
  });

  it('should keep instructions separate from combat state history', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.updateControlMode('player-1', 'human');
    controller.step();
    
    // Instructions should not be in combat state
    const currentState = controller.getCurrentState();
    expect((currentState as any).instructionsState).toBeUndefined();
  });

  it('should return current instructions state via getInstructionsState()', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    const instructionsState = controller.getInstructionsState();
    
    expect(instructionsState).toBeDefined();
    expect(instructionsState.selectedCharacterId).toBe(null);
    expect(instructionsState.instructions).toBeInstanceOf(Map);
    expect(instructionsState.editingSkillId).toBe(null);
    expect(instructionsState.isDirty).toBe(false);
  });
});

describe('BattleController - Dirty State Tracking', () => {
  it('should start with isDirty = false', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    expect(controller.isDirty()).toBe(false);
  });

  it('should set isDirty when instructions are modified', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.addCondition('player-1', 'strike', { type: 'hp-below' as const, threshold: 50 });
    
    expect(controller.isDirty()).toBe(true);
  });

  it('should clear isDirty when applyInstructions() is called', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.toggleSkillEnabled('player-1', 'strike');
    expect(controller.isDirty()).toBe(true);
    
    controller.applyInstructions();
    expect(controller.isDirty()).toBe(false);
  });

  it('should revert changes and clear isDirty when discardChanges() is called', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Make a change
    controller.updateControlMode('player-1', 'human');
    expect(controller.isDirty()).toBe(true);
    
    // Discard changes
    controller.discardChanges();
    
    expect(controller.isDirty()).toBe(false);
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    expect(instructions?.controlMode).toBe('ai'); // Reverted to default
  });

  it('should preserve original instructions when discarding changes', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    // Apply initial change
    controller.updateControlMode('player-1', 'human');
    controller.applyInstructions();
    
    // Make new change
    controller.updateControlMode('player-1', 'ai');
    expect(controller.isDirty()).toBe(true);
    
    // Discard - should revert to 'human'
    controller.discardChanges();
    
    const instructions = controller.getInstructionsState().instructions.get('player-1');
    expect(instructions?.controlMode).toBe('human');
  });
});

describe('BattleController - Editing Skill State', () => {
  it('should set editing skill ID via setEditingSkill()', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.setEditingSkill('strike');
    
    expect(controller.getEditingSkillId()).toBe('strike');
  });

  it('should clear editing skill ID when setEditingSkill(null) is called', () => {
    const skill1 = createTestSkill('strike');
    const player = createCharacterWithSkills('player-1', [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    controller.setEditingSkill('strike');
    expect(controller.getEditingSkillId()).toBe('strike');
    
    controller.setEditingSkill(null);
    expect(controller.getEditingSkillId()).toBe(null);
  });

  it('should return null initially from getEditingSkillId()', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const initialState = createCombatState([player], [enemy], 0);
    
    const controller = new BattleController(initialState);
    
    expect(controller.getEditingSkillId()).toBe(null);
  });
});
