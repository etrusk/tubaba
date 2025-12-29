import type { Character } from './character.js';
import type { GridPosition } from '../targeting/grid-position.js';

/**
 * Targeting mode for skill execution (re-exported from skill.ts for convenience)
 * - nearest-enemy: First living enemy in array (preparation for grid-based distance)
 */
export type TargetingMode = 'nearest-enemy';

/**
 * Queued action in progress
 */
export interface Action {
  /** Which skill is being executed */
  skillId: string;
  /** Who is casting */
  casterId: string;
  /** Target character IDs */
  targets: string[];
  /** Countdown to resolution */
  ticksRemaining: number;
}

/**
 * Complete combat state
 */
export interface CombatState {
  /** Player party (max 3) */
  players: Character[];
  /** Enemy units */
  enemies: Character[];
  /** Current tick count */
  tickNumber: number;
  /** All queued actions */
  actionQueue: Action[];
  /** History of combat events */
  eventLog: CombatEvent[];
  /** Current battle status */
  battleStatus: 'ongoing' | 'victory' | 'defeat';
}

/**
 * Result of a single tick execution
 */
export interface TickResult {
  /** New state after tick */
  updatedState: CombatState;
  /** Events that occurred this tick */
  events: CombatEvent[];
  /** True if victory or defeat */
  battleEnded: boolean;
}

/**
 * Combat event for logging
 */
export interface CombatEvent {
  /** When it occurred */
  tick: number;
  /** Type of event */
  type:
    | 'action-queued'
    | 'action-resolved'
    | 'damage'
    | 'healing'
    | 'status-applied'
    | 'status-expired'
    | 'knockout'
    | 'victory'
    | 'defeat'
    | 'target-lost'
    | 'movement';
  /** Who performed the action */
  actorId?: string;
  /** Who was affected */
  targetId?: string;
  /** Damage/healing amount */
  value?: number;
  /** Skill used */
  skillName?: string;
  /** Status applied/expired */
  statusType?: string;
  /** Human-readable description */
  message: string;
  /** Old position before movement */
  oldPosition?: GridPosition;
  /** New position after movement */
  newPosition?: GridPosition;
}
