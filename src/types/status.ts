/**
 * Status effect types that can be applied to characters
 * - poisoned: Deals damage over time
 * - stunned: Prevents action queueing
 * - shielded: Absorbs damage before HP
 * - taunting: Forces enemies to target this character
 * - defending: Reduces incoming damage by 50%
 * - enraged: Doubles outgoing damage
 */
export type StatusType = 'poisoned' | 'stunned' | 'shielded' | 'taunting' | 'defending' | 'enraged';

/**
 * Active status effect on a character
 */
export interface StatusEffect {
  /** Type of status effect */
  type: StatusType;
  /** Ticks remaining (-1 = permanent until removed) */
  duration: number;
  /** Numeric value for Shielded (shield amount) or Poisoned (damage per tick) */
  value?: number;
}
