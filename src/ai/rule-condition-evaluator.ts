import type { Condition, ConditionGroup } from '../types/skill.js';
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

    default:
      return false;
  }
}

export function evaluateConditionGroups(
  groups: ConditionGroup[] | undefined,
  evaluator: Character,
  combatState: CombatState
): boolean {
  if (!groups || groups.length === 0) {
    return true;
  }
  
  return groups.some((group) => {
    if (group.conditions.length === 0) {
      return true;
    }
    return group.conditions.every((condition) =>
      evaluateCondition(condition, evaluator, combatState)
    );
  });
}
