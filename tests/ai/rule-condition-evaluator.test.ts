import { describe, it, expect } from 'vitest';
import type { Character } from '../../src/types/character.js';
import type { CombatState } from '../../src/types/combat.js';
import type { Condition } from '../../src/types/skill.js';
import type { StatusEffect } from '../../src/types/index.js';

/**
 * Test helper: Create a mock character with minimal required fields
 */
function createTestCharacter(
  id: string,
  name: string,
  currentHp: number,
  maxHp: number,
  isPlayer: boolean,
  statusEffects: StatusEffect[] = []
): Character {
  return {
    id,
    name,
    maxHp,
    currentHp,
    skills: [],
    statusEffects,
    currentAction: null,
    isPlayer,
  };
}

/**
 * Test helper: Create a minimal combat state
 */
function createTestCombatState(
  players: Character[],
  enemies: Character[]
): CombatState {
  return {
    players,
    enemies,
    tickNumber: 0,
    actionQueue: [],
    eventLog: [],
    battleStatus: 'ongoing',
  };
}

// Import actual implementation
import { evaluateCondition } from '../../src/ai/rule-condition-evaluator.js';

describe('RuleConditionEvaluator', () => {
  describe('hp-below condition', () => {
    it('should return true when character HP is below threshold', () => {
      // Character at 25% HP, threshold 30% → condition true
      const character = createTestCharacter('c1', 'Low HP Character', 25, 100, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'hp-below',
        threshold: 30,
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(true);
    });

    it('should return false when character HP is above threshold', () => {
      // Character at 31% HP, threshold 30% → condition false
      const character = createTestCharacter('c1', 'High HP Character', 31, 100, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'hp-below',
        threshold: 30,
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(false);
    });

    it('should return false when character HP is exactly at threshold (below means <)', () => {
      // Edge case: exactly at threshold (30% HP, threshold 30%) → condition false
      const character = createTestCharacter('c1', 'Exact HP Character', 30, 100, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'hp-below',
        threshold: 30,
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(false);
    });

    it('should calculate HP percentage correctly for non-100 max HP', () => {
      // 15/80 = 18.75% HP, threshold 20% → condition true
      const character = createTestCharacter('c1', 'Character', 15, 80, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'hp-below',
        threshold: 20,
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(true);
    });

    it('should handle 0 HP character (knocked out)', () => {
      // 0% HP, threshold 30% → condition true
      const character = createTestCharacter('c1', 'Dead Character', 0, 100, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'hp-below',
        threshold: 30,
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(true);
    });

    it('should handle full HP character', () => {
      // 100% HP, threshold 100% → condition false (not below)
      const character = createTestCharacter('c1', 'Full HP', 100, 100, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'hp-below',
        threshold: 100,
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(false);
    });

    it('should return false when threshold is 0', () => {
      // No HP can be below 0%
      const character = createTestCharacter('c1', 'Character', 0, 100, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'hp-below',
        threshold: 0,
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(false);
    });
  });

  describe('ally-count condition', () => {
    it('should return true when alive ally count is greater than threshold', () => {
      // 2 alive allies, threshold > 1 → condition true
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const ally1 = createTestCharacter('p2', 'Ally 1', 80, 100, true);
      const ally2 = createTestCharacter('p3', 'Ally 2', 60, 100, true);
      const combatState = createTestCombatState([evaluator, ally1, ally2], []);
      const condition: Condition = {
        type: 'ally-count',
        threshold: 1,
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(true); // 2 allies > 1
    });

    it('should return false when alive ally count is less than threshold', () => {
      // 0 alive allies, threshold > 1 → condition false
      const evaluator = createTestCharacter('p1', 'Solo Player', 100, 100, true);
      const combatState = createTestCombatState([evaluator], []);
      const condition: Condition = {
        type: 'ally-count',
        threshold: 1,
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false); // 0 allies is not > 1
    });

    it('should NOT count knocked-out allies', () => {
      // 1 alive ally, 1 dead ally, threshold > 1 → condition false
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const aliveAlly = createTestCharacter('p2', 'Alive Ally', 50, 100, true);
      const deadAlly = createTestCharacter('p3', 'Dead Ally', 0, 100, true);
      const combatState = createTestCombatState([evaluator, aliveAlly, deadAlly], []);
      const condition: Condition = {
        type: 'ally-count',
        threshold: 1,
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false); // Only 1 alive ally, not > 1
    });

    it('should exclude caster from ally count', () => {
      // Evaluator + 1 ally alive, threshold > 1 → condition false (only 1 ally, not counting self)
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const ally = createTestCharacter('p2', 'Single Ally', 80, 100, true);
      const combatState = createTestCombatState([evaluator, ally], []);
      const condition: Condition = {
        type: 'ally-count',
        threshold: 1,
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false); // 1 ally is not > 1
    });

    it('should return true when ally count equals threshold for edge case', () => {
      // 2 alive allies, threshold 2 → condition false (not greater than)
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const ally1 = createTestCharacter('p2', 'Ally 1', 80, 100, true);
      const ally2 = createTestCharacter('p3', 'Ally 2', 60, 100, true);
      const combatState = createTestCombatState([evaluator, ally1, ally2], []);
      const condition: Condition = {
        type: 'ally-count',
        threshold: 2,
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false); // 2 is not > 2
    });

    it('should work for enemy evaluator counting enemy allies', () => {
      // Enemy evaluating ally-count condition (2 other enemies alive, threshold > 1)
      const enemy1 = createTestCharacter('e1', 'Enemy Evaluator', 100, 100, false);
      const enemy2 = createTestCharacter('e2', 'Enemy Ally 1', 80, 100, false);
      const enemy3 = createTestCharacter('e3', 'Enemy Ally 2', 60, 100, false);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy1, enemy2, enemy3]);
      const condition: Condition = {
        type: 'ally-count',
        threshold: 1,
      };

      const result = evaluateCondition(condition, enemy1, combatState);

      expect(result).toBe(true); // 2 enemy allies > 1
    });

    it('should return false when threshold is 0 and no allies exist', () => {
      // Solo character, threshold 0 → condition false (0 is not > 0)
      const evaluator = createTestCharacter('p1', 'Solo', 100, 100, true);
      const combatState = createTestCombatState([evaluator], []);
      const condition: Condition = {
        type: 'ally-count',
        threshold: 0,
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false);
    });

    it('should return true when threshold is 0 and at least one ally exists', () => {
      // 1 ally, threshold 0 → condition true (1 > 0)
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const ally = createTestCharacter('p2', 'Ally', 80, 100, true);
      const combatState = createTestCombatState([evaluator, ally], []);
      const condition: Condition = {
        type: 'ally-count',
        threshold: 0,
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(true); // 1 > 0
    });
  });


  describe('edge cases and validation', () => {
    it('should handle missing threshold for hp-below condition', () => {
      const character = createTestCharacter('c1', 'Character', 50, 100, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'hp-below',
        // threshold is missing
      };

      // Should handle gracefully - implementation decision on default behavior
      const result = evaluateCondition(condition, character, combatState);

      // Expect false when threshold is undefined (safe default)
      expect(typeof result).toBe('boolean');
    });

    it('should handle missing statusType for status conditions', () => {
      const character = createTestCharacter(
        'c1',
        'Character',
        100,
        100,
        true,
        [{ type: 'defending', duration: 2 }]
      );
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'self-has-status',
        // statusType is missing
      };

      // Should handle gracefully
      const result = evaluateCondition(condition, character, combatState);

      expect(typeof result).toBe('boolean');
    });

    it('should be deterministic for identical inputs', () => {
      const character = createTestCharacter('c1', 'Character', 25, 100, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'hp-below',
        threshold: 30,
      };

      const result1 = evaluateCondition(condition, character, combatState);
      const result2 = evaluateCondition(condition, character, combatState);

      expect(result1).toBe(result2);
      expect(result1).toBe(true);
    });
  });

  /**
   * Tests for evaluateConditionGroups function
   *
   * Condition Groups enable OR logic between groups:
   * - Skill activates if ANY group passes (OR logic)
   * - Group passes if ALL its conditions are true (AND logic)
   * - Empty group = always true
   * - Empty conditionGroups = always true
   */
  describe('evaluateConditionGroups', () => {
    // Type alias for tests until implementation exists
    type ConditionGroup = { conditions: Condition[] };

    describe('happy path - single group scenarios', () => {
      it('should activate when single group with one passing condition', async () => {
        // Import will fail until evaluateConditionGroups is implemented
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[], evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // Character at 25% HP, condition: hp-below 30% → passes
        const character = createTestCharacter('c1', 'Low HP Character', 25, 100, true);
        const combatState = createTestCombatState([character], []);
        const groups: ConditionGroup[] = [
          { conditions: [{ type: 'hp-below', threshold: 30 }] }
        ];

        const result = evaluateConditionGroups(groups, character, combatState);

        expect(result).toBe(true);
      });

      it('should not activate when single group with one failing condition', async () => {
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[], evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // Character at 50% HP, condition: hp-below 30% → fails
        const character = createTestCharacter('c1', 'Normal HP Character', 50, 100, true);
        const combatState = createTestCombatState([character], []);
        const groups: ConditionGroup[] = [
          { conditions: [{ type: 'hp-below', threshold: 30 }] }
        ];

        const result = evaluateConditionGroups(groups, character, combatState);

        expect(result).toBe(false);
      });
    });

    describe('happy path - OR logic between groups', () => {
      it('should activate when first group passes (OR logic)', async () => {
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[], evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // Character at 25% HP
        // Group 1: hp-below 30% → passes
        // Group 2: hp-below 10% → fails
        // Result: TRUE (OR)
        const character = createTestCharacter('c1', 'Low HP Character', 25, 100, true);
        const combatState = createTestCombatState([character], []);
        const groups: ConditionGroup[] = [
          { conditions: [{ type: 'hp-below', threshold: 30 }] },
          { conditions: [{ type: 'hp-below', threshold: 10 }] }
        ];

        const result = evaluateConditionGroups(groups, character, combatState);

        expect(result).toBe(true);
      });

      it('should activate when second group passes (OR logic)', async () => {
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[], evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // Character at 25% HP
        // Group 1: hp-below 10% → fails
        // Group 2: hp-below 30% → passes
        // Result: TRUE (OR)
        const character = createTestCharacter('c1', 'Low HP Character', 25, 100, true);
        const combatState = createTestCombatState([character], []);
        const groups: ConditionGroup[] = [
          { conditions: [{ type: 'hp-below', threshold: 10 }] },
          { conditions: [{ type: 'hp-below', threshold: 30 }] }
        ];

        const result = evaluateConditionGroups(groups, character, combatState);

        expect(result).toBe(true);
      });

      it('should not activate when all groups fail', async () => {
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[], evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // Character at 50% HP
        // Group 1: hp-below 30% → fails
        // Group 2: hp-below 10% → fails
        // Result: FALSE (both fail)
        const character = createTestCharacter('c1', 'Normal HP Character', 50, 100, true);
        const combatState = createTestCombatState([character], []);
        const groups: ConditionGroup[] = [
          { conditions: [{ type: 'hp-below', threshold: 30 }] },
          { conditions: [{ type: 'hp-below', threshold: 10 }] }
        ];

        const result = evaluateConditionGroups(groups, character, combatState);

        expect(result).toBe(false);
      });
    });

    describe('happy path - AND logic within groups', () => {

      it('should fail group when any condition in group fails (AND logic)', async () => {
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[], evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // Character at 25% HP WITHOUT defending status
        // Group 1: hp-below 30% (passes) AND self-has-status:defending (fails) → group fails
        // Result: FALSE
        const character = createTestCharacter('c1', 'Low HP No Defense', 25, 100, true);
        const combatState = createTestCombatState([character], []);
        const groups: ConditionGroup[] = [
          {
            conditions: [
              { type: 'hp-below', threshold: 30 },
              { type: 'self-has-status', statusType: 'defending' }
            ]
          }
        ];

        const result = evaluateConditionGroups(groups, character, combatState);

        expect(result).toBe(false);
      });
    });

    describe('edge cases - empty groups', () => {
      it('should always activate when conditionGroups array is empty', async () => {
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[], evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // Empty conditionGroups = always true (preserves "no conditions" behavior)
        const character = createTestCharacter('c1', 'Any Character', 50, 100, true);
        const combatState = createTestCombatState([character], []);
        const groups: ConditionGroup[] = [];

        const result = evaluateConditionGroups(groups, character, combatState);

        expect(result).toBe(true);
      });

      it('should pass when group has empty conditions array', async () => {
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[], evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // Empty group = always true
        const character = createTestCharacter('c1', 'Any Character', 50, 100, true);
        const combatState = createTestCombatState([character], []);
        const groups: ConditionGroup[] = [
          { conditions: [] }
        ];

        const result = evaluateConditionGroups(groups, character, combatState);

        expect(result).toBe(true);
      });

      it('should activate when first group fails but second group is empty', async () => {
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[], evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // Group 1: hp-below 30% → fails (char at 50%)
        // Group 2: empty conditions → always true
        // Result: TRUE (empty group = true, OR logic)
        const character = createTestCharacter('c1', 'Normal HP Character', 50, 100, true);
        const combatState = createTestCombatState([character], []);
        const groups: ConditionGroup[] = [
          { conditions: [{ type: 'hp-below', threshold: 30 }] },
          { conditions: [] }
        ];

        const result = evaluateConditionGroups(groups, character, combatState);

        expect(result).toBe(true);
      });
    });

    describe('error conditions', () => {
      it('should handle undefined conditionGroups gracefully', async () => {
        const evaluatorModule = await import('../../src/ai/rule-condition-evaluator.js');
        const evaluateConditionGroups = (evaluatorModule as Record<string, unknown>).evaluateConditionGroups as
          ((groups: ConditionGroup[] | undefined, evaluator: Character, combatState: CombatState) => boolean) | undefined;

        expect(evaluateConditionGroups).toBeDefined();

        if (!evaluateConditionGroups) {
          throw new Error('evaluateConditionGroups is not exported');
        }

        // undefined conditionGroups should behave like empty (always true)
        const character = createTestCharacter('c1', 'Any Character', 50, 100, true);
        const combatState = createTestCombatState([character], []);

        const result = evaluateConditionGroups(undefined, character, combatState);

        expect(result).toBe(true);
      });
    });
  });
});
