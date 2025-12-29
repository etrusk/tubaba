import type { Skill } from './skill.js';
import type { StatusEffect } from './status.js';
import type { Action } from './combat.js';
import type { GridPosition } from '../targeting/grid-position.js';

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
