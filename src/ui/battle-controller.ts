import type { CombatState } from '../types/index.js';
import { TickExecutor } from '../engine/tick-executor.js';
import { produce, freeze } from 'immer';

/**
 * Time provider interface for dependency injection (testing)
 */
export interface TimeProvider {
  setTimeout(callback: () => void, ms: number): any;
  clearTimeout(id: any): void;
}

/**
 * Default time provider using native setTimeout/clearTimeout
 */
const defaultTimeProvider: TimeProvider = {
  setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
  clearTimeout: (id: any) => clearTimeout(id),
};

/**
 * BattleController - Manages battle playback, step controls, and history
 *
 * Provides controls for stepping through battle ticks, playing/pausing auto-stepping,
 * speed control, and navigating through battle history.
 */
export class BattleController {
  private readonly MAX_HISTORY = 50;
  private initialState: CombatState;
  private currentState: CombatState;
  private history: CombatState[];
  private currentHistoryIndex: number;
  private playbackTimer: any;
  private speed: number;
  private playing: boolean;
  private timeProvider: TimeProvider;

  constructor(initialState: CombatState, timeProvider: TimeProvider = defaultTimeProvider) {
    // Freeze the initial state to ensure immutability
    this.initialState = freeze(initialState, true);
    this.currentState = this.initialState;
    this.history = [this.initialState];
    this.currentHistoryIndex = 0;
    this.playbackTimer = null;
    this.speed = 1.0;
    this.playing = false;
    this.timeProvider = timeProvider;
  }

  /**
   * Get current combat state (safe to return directly - immutable via Immer)
   */
  getCurrentState(): CombatState {
    return this.currentState;
  }

  /**
   * Get full history of combat states (safe to return directly - immutable via Immer)
   */
  getHistory(): CombatState[] {
    return this.history;
  }

  /**
   * Get current tick number
   */
  getCurrentTick(): number {
    return this.currentState.tickNumber;
  }

  /**
   * Advance one tick forward
   * Uses TickExecutor to compute next state and saves to history
   * No-op if battle has already ended
   */
  step(): void {
    // No-op if battle has ended
    if (this.currentState.battleStatus !== 'ongoing') {
      return;
    }

    // Execute tick using Immer's produce for structural sharing
    const nextState = produce(this.currentState, draft => {
      const result = TickExecutor.executeTick(draft);
      Object.assign(draft, result.updatedState);
    });

    this.currentState = nextState;

    // Append to history
    this.history.push(nextState);

    // Prune old history if exceeding limit
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift(); // Remove oldest entry
    }

    // Update index to point to current state
    this.currentHistoryIndex = this.history.length - 1;

    // Auto-stop playback if battle just ended
    if (this.currentState.battleStatus !== 'ongoing') {
      this.playing = false;
    }
  }

  /**
   * Step back one tick in history
   * No-op if already at initial state
   */
  stepBack(): void {
    // No-op if at initial state
    if (this.currentHistoryIndex <= 0) {
      return;
    }

    // Move back one in history (safe to assign directly - immutable via Immer)
    this.currentHistoryIndex--;
    this.currentState = this.history[this.currentHistoryIndex]!;
  }

  /**
   * Start auto-stepping (playback)
   * No-op if already playing
   */
  play(): void {
    // No-op if already playing
    if (this.playing) {
      return;
    }

    this.playing = true;
    this.scheduleNextTick();
  }

  /**
   * Schedule the next tick based on current speed
   */
  private scheduleNextTick(): void {
    if (!this.playing) return;

    const interval = 1000 / this.speed;

    this.playbackTimer = this.timeProvider.setTimeout(() => {
      if (!this.playing) return;

      this.step();

      // Continue scheduling if still playing (step() sets playing=false when battle ends)
      if (this.playing) {
        this.scheduleNextTick();
      }
    }, interval);
  }

  /**
   * Stop auto-stepping
   * No-op if not playing
   */
  pause(): void {
    this.playing = false;
    if (this.playbackTimer) {
      this.timeProvider.clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  /**
   * Check if currently auto-stepping
   */
  isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Set playback speed multiplier
   * 1.0 = 1000ms per tick (default)
   * 2.0 = 500ms per tick (2x speed)
   * 0.5 = 2000ms per tick (0.5x speed)
   * 
   * Can be changed during playback
   */
  setSpeed(multiplier: number): void {
    const wasPlaying = this.playing;
    
    // If playing, restart with new speed
    if (wasPlaying) {
      this.pause();
    }
    
    this.speed = multiplier;
    
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Get current speed multiplier
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * Reset to initial state
   * Clears history and stops playback
   */
  reset(): void {
    // Stop playback
    this.pause();

    // Reset to initial state (safe to assign directly - frozen by Immer)
    this.currentState = this.initialState;
    this.history = [this.initialState];
    this.currentHistoryIndex = 0;
  }
}
