import type { Character, StatusEffect, StatusType, CombatEvent } from '../types/index.js';

/**
 * StatusEffectProcessor - Handles all status effect processing
 * 
 * Processes status effects each tick:
 * - Poisoned: 5 damage per tick, 6 tick duration
 * - Stunned: Blocks actions, 2 tick duration
 * - Shielded: Absorbs damage, 4 tick duration
 * - Taunting: Forces targeting, 4 tick duration
 * - Defending: 50% damage reduction, 3 tick duration
 * - Enraged: Permanent until consumed, +15 damage per target
 */
export const StatusEffectProcessor = {
  /**
   * Process all status effects for a character (per-tick effects, duration decrement, expiration)
   */
  processStatusEffects(character: Character): {
    updatedCharacter: Character;
    events: CombatEvent[];
  } {
    const events: CombatEvent[] = [];
    let currentHp = character.currentHp;
    
    // Step 1: Apply per-tick effects (only poison deals damage)
    const poisonStatus = character.statusEffects.find(s => s.type === 'poisoned');
    if (poisonStatus && poisonStatus.value) {
      const damage = poisonStatus.value;
      currentHp = Math.max(0, currentHp - damage);
      
      events.push({
        tick: 0, // Tick number will be set by TickExecutor
        type: 'damage',
        targetId: character.id,
        value: damage,
        message: `${character.name} takes ${damage} poison damage`,
      });
      
      // Check for knockout
      if (currentHp === 0) {
        events.push({
          tick: 0,
          type: 'knockout',
          targetId: character.id,
          message: `${character.name} was knocked out`,
        });
      }
    }
    
    // Step 2: Decrement durations and filter expired statuses
    const updatedStatuses: StatusEffect[] = [];
    
    for (const status of character.statusEffects) {
      // Permanent statuses (duration -1) don't decrement
      if (status.duration === -1) {
        updatedStatuses.push({ ...status });
        continue;
      }
      
      // Decrement duration
      const newDuration = status.duration - 1;
      
      // Remove if expired (duration reaches 0)
      if (newDuration === 0) {
        events.push({
          tick: 0,
          type: 'status-expired',
          targetId: character.id,
          statusType: status.type,
          message: `${status.type} expired on ${character.name}`,
        });
      } else {
        // Keep with decremented duration
        updatedStatuses.push({
          ...status,
          duration: newDuration,
        });
      }
    }
    
    // Step 3: Return updated character (immutable)
    return {
      updatedCharacter: {
        ...character,
        currentHp,
        statusEffects: updatedStatuses,
      },
      events,
    };
  },

  /**
   * Check if character has a specific status
   */
  hasStatus(character: Character, statusType: StatusType): boolean {
    return character.statusEffects.some(s => s.type === statusType);
  },

  /**
   * Get remaining duration of a status (-1 if not present)
   */
  getStatusDuration(character: Character, statusType: StatusType): number {
    const status = character.statusEffects.find(s => s.type === statusType);
    return status ? status.duration : -1;
  },

  /**
   * Apply a new status to a character (handles stacking rules)
   * 
   * Reapply behavior:
   * - Poisoned: Refresh to 6 ticks
   * - Stunned: Refresh to 2 ticks
   * - Shielded: Reset pool to 30, refresh to 4 ticks
   * - Taunting: Refresh to 4 ticks
   * - Defending: Refresh to 3 ticks
   * - Enraged: No effect (can't stack, duration -1)
   */
  applyStatus(character: Character, status: StatusEffect): Character {
    // Check if character already has this status type
    const existingIndex = character.statusEffects.findIndex(s => s.type === status.type);
    
    let updatedStatuses: StatusEffect[];
    
    if (existingIndex !== -1) {
      // Replace existing status (refresh duration/value)
      updatedStatuses = [...character.statusEffects];
      updatedStatuses[existingIndex] = { ...status };
    } else {
      // Add new status
      updatedStatuses = [...character.statusEffects, { ...status }];
    }
    
    return {
      ...character,
      statusEffects: updatedStatuses,
    };
  },

  /**
   * Remove a specific status from a character
   */
  removeStatus(character: Character, statusType: StatusType): Character {
    return {
      ...character,
      statusEffects: character.statusEffects.filter(s => s.type !== statusType),
    };
  },
};
