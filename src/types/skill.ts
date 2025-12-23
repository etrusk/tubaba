import type { StatusType } from './status.js';

/**
 * Targeting modes for skill execution
 * - self: Targets the caster
 * - single-enemy-lowest-hp: Single enemy with lowest HP (tie-break: leftmost)
 * - single-enemy-highest-hp: Single enemy with highest HP
 * - all-enemies: All living enemies
 * - ally-lowest-hp: Ally with lowest HP (excluding caster)
 * - ally-lowest-hp-damaged: Ally with lowest HP who is damaged (currentHp < maxHp)
 * - ally-dead: Dead ally (for Revive)
 * - all-allies: All living allies
 */
export type TargetingMode =
  | 'self'
  | 'single-enemy-lowest-hp'
  | 'single-enemy-highest-hp'
  | 'all-enemies'
  | 'ally-lowest-hp'
  | 'ally-lowest-hp-damaged'
  | 'ally-dead'
  | 'all-allies';

/**
 * Effect applied when a skill resolves
 */
export interface SkillEffect {
  /** Type of effect */
  type: 'damage' | 'heal' | 'status' | 'shield' | 'revive' | 'cancel';
  /** Numeric value for damage/healing/shield amount */
  value?: number;
  /** Status type to apply (for status effects) */
  statusType?: StatusType;
  /** Duration in ticks (for status effects) */
  duration?: number;
}

/**
 * Condition for rule evaluation (AI decision-making)
 */
export interface Condition {
  /** Type of condition to check */
  type: 'hp-below' | 'ally-count' | 'enemy-has-status' | 'self-has-status' | 'ally-has-status';
  /** Threshold value for hp-below (percentage 0-100) or ally-count */
  threshold?: number;
  /** Status type to check for status-based conditions */
  statusType?: StatusType;
}

/**
 * Rule for AI decision-making
 * Multiple conditions are AND-ed together (all must be true)
 */
export interface Rule {
  /** Priority for evaluation (higher = evaluated first) */
  priority: number;
  /** All conditions must be true for rule to trigger */
  conditions: Condition[];
  /** Optional override for targeting mode */
  targetingOverride?: TargetingMode;
}

/**
 * Skill definition
 */
export interface Skill {
  /** Unique skill identifier */
  id: string;
  /** Display name */
  name: string;
  /** Number of ticks to execute */
  baseDuration: number;
  /** Effects applied when skill resolves */
  effects: SkillEffect[];
  /** How targets are selected */
  targeting: TargetingMode;
  /** Optional AI rules for when to use this skill */
  rules?: Rule[];
}
