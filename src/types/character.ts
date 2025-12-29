import type { Skill } from './skill.js';
import type { Action } from './combat.js';
import type { GridPosition } from '../targeting/grid-position.js';

/**
 * Status effect applied to a character
 * Tracks type, duration, and optional value (for shields, poison damage, etc.)
 */
export interface StatusEffect {
  /** Type of status effect */
  type: string;
  /** Ticks remaining (-1 = permanent until removed) */
  duration: number;
  /** Optional numeric value (shield HP, poison damage per tick, enrage bonus, etc.) */
  value?: number;
}

/**
 * Character representation (player or enemy)
 */
export interface Character {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Maximum health points */
  maxHp: number;
  /** Current health points (0 = knocked out) */
  currentHp: number;
  /** Equipped skills */
  skills: Skill[];
  /** Active status effects */
  statusEffects: StatusEffect[];
  /** Currently queued action in progress */
  currentAction: Action | null;
  /** Player vs enemy distinction */
  isPlayer: boolean;
  /** Grid position for distance-based targeting (optional for backward compatibility) */
  position?: GridPosition;
}
