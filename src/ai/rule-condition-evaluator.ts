import type { Condition } from '../types/skill.js';
import type { Character } from '../types/character.js';
import type { CombatState } from '../types/combat.js';

/**
 * Evaluate a rule condition against current combat state
 * 
 * @param condition - The condition to evaluate
 * @param evaluator - The character evaluating the condition
 * @param combatState - Current combat state
 * @returns true if condition is met, false otherwise
 */
export function evaluateCondition(
  condition: Condition,
  evaluator: Character,
  combatState: CombatState
): boolean {
  switch (condition.type) {
    case 'hp-below': {
      // Safe default if threshold is undefined
      if (condition.threshold === undefined) {
        return false;
      }
      const hpPercentage = (evaluator.currentHp / evaluator.maxHp) * 100;
      return hpPercentage < condition.threshold;
    }

    case 'ally-count': {
      // Safe default if threshold is undefined
      if (condition.threshold === undefined) {
        return false;
      }
      
      // Determine which array to check based on evaluator's team
      const allies = evaluator.isPlayer ? combatState.players : combatState.enemies;
      
      // Count living allies excluding self
      const allyCount = allies.filter(
        (char) => char.id !== evaluator.id && char.currentHp > 0
      ).length;
      
      return allyCount > condition.threshold;
    }

    case 'enemy-has-status': {
      // Safe default if statusType is undefined
      if (!condition.statusType) {
        return false;
      }
      
      // Determine which array contains enemies
      const enemies = evaluator.isPlayer ? combatState.enemies : combatState.players;
      
      // Check if any living enemy has the status
      return enemies.some((enemy) => {
        if (enemy.currentHp <= 0) return false;
        
        return enemy.statusEffects.some(
          (status) =>
            status.type === condition.statusType &&
            (status.duration > 0 || status.duration === -1)
        );
      });
    }

    case 'self-has-status': {
      // Safe default if statusType is undefined
      if (!condition.statusType) {
        return false;
      }
      
      return evaluator.statusEffects.some(
        (status) =>
          status.type === condition.statusType &&
          (status.duration > 0 || status.duration === -1)
      );
    }

    case 'ally-has-status': {
      // Safe default if statusType is undefined
      if (!condition.statusType) {
        return false;
      }
      
      // Determine which array contains allies
      const allies = evaluator.isPlayer ? combatState.players : combatState.enemies;
      
      // Check if any living ally (excluding self) has the status
      return allies.some((ally) => {
        if (ally.id === evaluator.id) return false;
        if (ally.currentHp <= 0) return false;
        
        return ally.statusEffects.some(
          (status) =>
            status.type === condition.statusType &&
            (status.duration > 0 || status.duration === -1)
        );
      });
    }

    default:
      return false;
  }
}
