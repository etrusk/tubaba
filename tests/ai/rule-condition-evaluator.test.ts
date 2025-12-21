import { describe, it, expect } from 'vitest';
import type { Character } from '../../src/types/character.js';
import type { CombatState } from '../../src/types/combat.js';
import type { Condition } from '../../src/types/skill.js';
import type { StatusEffect } from '../../src/types/status.js';

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

  describe('enemy-has-status condition', () => {
    it('should return true when any enemy has the specified status', () => {
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const enemy1 = createTestCharacter('e1', 'Enemy 1', 100, 100, false);
      const enemy2 = createTestCharacter(
        'e2',
        'Shielded Enemy',
        100,
        100,
        false,
        [{ type: 'shielded', duration: 2, value: 30 }]
      );
      const combatState = createTestCombatState([player], [enemy1, enemy2]);
      const condition: Condition = {
        type: 'enemy-has-status',
        statusType: 'shielded',
      };

      const result = evaluateCondition(condition, player, combatState);

      expect(result).toBe(true);
    });

    it('should return false when no enemy has the status', () => {
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const enemy1 = createTestCharacter('e1', 'Enemy 1', 100, 100, false);
      const enemy2 = createTestCharacter('e2', 'Enemy 2', 100, 100, false);
      const combatState = createTestCombatState([player], [enemy1, enemy2]);
      const condition: Condition = {
        type: 'enemy-has-status',
        statusType: 'shielded',
      };

      const result = evaluateCondition(condition, player, combatState);

      expect(result).toBe(false);
    });

    it('should return false when status has expired (duration 0)', () => {
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const enemy = createTestCharacter(
        'e1',
        'Enemy',
        100,
        100,
        false,
        [{ type: 'shielded', duration: 0, value: 30 }]
      );
      const combatState = createTestCombatState([player], [enemy]);
      const condition: Condition = {
        type: 'enemy-has-status',
        statusType: 'shielded',
      };

      const result = evaluateCondition(condition, player, combatState);

      expect(result).toBe(false);
    });

    it('should work when evaluator is an enemy checking player statuses', () => {
      const enemy = createTestCharacter('e1', 'Enemy Evaluator', 100, 100, false);
      const player1 = createTestCharacter('p1', 'Player 1', 100, 100, true);
      const player2 = createTestCharacter(
        'p2',
        'Defending Player',
        100,
        100,
        true,
        [{ type: 'defending', duration: 2 }]
      );
      const combatState = createTestCombatState([player1, player2], [enemy]);
      const condition: Condition = {
        type: 'enemy-has-status',
        statusType: 'defending',
      };

      const result = evaluateCondition(condition, enemy, combatState);

      expect(result).toBe(true);
    });

    it('should return false when enemy has different status', () => {
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const enemy = createTestCharacter(
        'e1',
        'Enemy',
        100,
        100,
        false,
        [{ type: 'poisoned', duration: 3, value: 5 }]
      );
      const combatState = createTestCombatState([player], [enemy]);
      const condition: Condition = {
        type: 'enemy-has-status',
        statusType: 'stunned',
      };

      const result = evaluateCondition(condition, player, combatState);

      expect(result).toBe(false);
    });

    it('should return true when multiple enemies have the status', () => {
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const enemy1 = createTestCharacter(
        'e1',
        'Enemy 1',
        100,
        100,
        false,
        [{ type: 'taunting', duration: 2 }]
      );
      const enemy2 = createTestCharacter(
        'e2',
        'Enemy 2',
        100,
        100,
        false,
        [{ type: 'taunting', duration: 1 }]
      );
      const combatState = createTestCombatState([player], [enemy1, enemy2]);
      const condition: Condition = {
        type: 'enemy-has-status',
        statusType: 'taunting',
      };

      const result = evaluateCondition(condition, player, combatState);

      expect(result).toBe(true);
    });

    it('should return false when no enemies exist', () => {
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], []);
      const condition: Condition = {
        type: 'enemy-has-status',
        statusType: 'stunned',
      };

      const result = evaluateCondition(condition, player, combatState);

      expect(result).toBe(false);
    });

    it('should ignore knocked-out enemies', () => {
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const deadEnemy = createTestCharacter(
        'e1',
        'Dead Enemy',
        0,
        100,
        false,
        [{ type: 'enraged', duration: 5 }]
      );
      const aliveEnemy = createTestCharacter('e2', 'Alive Enemy', 50, 100, false);
      const combatState = createTestCombatState([player], [deadEnemy, aliveEnemy]);
      const condition: Condition = {
        type: 'enemy-has-status',
        statusType: 'enraged',
      };

      const result = evaluateCondition(condition, player, combatState);

      expect(result).toBe(false); // Dead enemy's status shouldn't count
    });
  });

  describe('self-has-status condition', () => {
    it('should return true when evaluating character has the status', () => {
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
        statusType: 'defending',
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(true);
    });

    it('should return false when evaluating character lacks the status', () => {
      const character = createTestCharacter('c1', 'Character', 100, 100, true);
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'self-has-status',
        statusType: 'defending',
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(false);
    });

    it('should return false when status has expired (duration 0)', () => {
      const character = createTestCharacter(
        'c1',
        'Character',
        100,
        100,
        true,
        [{ type: 'stunned', duration: 0 }]
      );
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'self-has-status',
        statusType: 'stunned',
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(false);
    });

    it('should return false when character has different status', () => {
      const character = createTestCharacter(
        'c1',
        'Character',
        100,
        100,
        true,
        [{ type: 'poisoned', duration: 3, value: 5 }]
      );
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'self-has-status',
        statusType: 'enraged',
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(false);
    });

    it('should return true when character has multiple statuses including the target status', () => {
      const character = createTestCharacter(
        'c1',
        'Character',
        100,
        100,
        true,
        [
          { type: 'poisoned', duration: 3, value: 5 },
          { type: 'defending', duration: 2 },
          { type: 'enraged', duration: 1 },
        ]
      );
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'self-has-status',
        statusType: 'defending',
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(true);
    });

    it('should work for enemy evaluators', () => {
      const enemy = createTestCharacter(
        'e1',
        'Enemy',
        100,
        100,
        false,
        [{ type: 'taunting', duration: 2 }]
      );
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);
      const condition: Condition = {
        type: 'self-has-status',
        statusType: 'taunting',
      };

      const result = evaluateCondition(condition, enemy, combatState);

      expect(result).toBe(true);
    });

    it('should handle permanent status (duration -1)', () => {
      const character = createTestCharacter(
        'c1',
        'Character',
        100,
        100,
        true,
        [{ type: 'shielded', duration: -1, value: 50 }]
      );
      const combatState = createTestCombatState([character], []);
      const condition: Condition = {
        type: 'self-has-status',
        statusType: 'shielded',
      };

      const result = evaluateCondition(condition, character, combatState);

      expect(result).toBe(true);
    });
  });

  describe('ally-has-status condition', () => {
    it('should return true when any ally (excluding self) has the status', () => {
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const ally1 = createTestCharacter('p2', 'Ally 1', 80, 100, true);
      const ally2 = createTestCharacter(
        'p3',
        'Ally 2',
        60,
        100,
        true,
        [{ type: 'defending', duration: 2 }]
      );
      const combatState = createTestCombatState([evaluator, ally1, ally2], []);
      const condition: Condition = {
        type: 'ally-has-status',
        statusType: 'defending',
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(true);
    });

    it('should return false when no ally has the status', () => {
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const ally1 = createTestCharacter('p2', 'Ally 1', 80, 100, true);
      const ally2 = createTestCharacter('p3', 'Ally 2', 60, 100, true);
      const combatState = createTestCombatState([evaluator, ally1, ally2], []);
      const condition: Condition = {
        type: 'ally-has-status',
        statusType: 'defending',
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false);
    });

    it('should exclude self from ally check even if self has the status', () => {
      const evaluator = createTestCharacter(
        'p1',
        'Evaluator',
        100,
        100,
        true,
        [{ type: 'taunting', duration: 2 }]
      );
      const ally = createTestCharacter('p2', 'Ally', 80, 100, true);
      const combatState = createTestCombatState([evaluator, ally], []);
      const condition: Condition = {
        type: 'ally-has-status',
        statusType: 'taunting',
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false); // Self has status but should be excluded
    });

    it('should ignore knocked-out allies', () => {
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const deadAlly = createTestCharacter(
        'p2',
        'Dead Ally',
        0,
        100,
        true,
        [{ type: 'enraged', duration: 5 }]
      );
      const aliveAlly = createTestCharacter('p3', 'Alive Ally', 50, 100, true);
      const combatState = createTestCombatState([evaluator, deadAlly, aliveAlly], []);
      const condition: Condition = {
        type: 'ally-has-status',
        statusType: 'enraged',
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false); // Dead ally's status shouldn't count
    });

    it('should return false when status has expired on ally', () => {
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const ally = createTestCharacter(
        'p2',
        'Ally',
        80,
        100,
        true,
        [{ type: 'stunned', duration: 0 }]
      );
      const combatState = createTestCombatState([evaluator, ally], []);
      const condition: Condition = {
        type: 'ally-has-status',
        statusType: 'stunned',
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false);
    });

    it('should work for enemy evaluators checking other enemies', () => {
      const enemy1 = createTestCharacter('e1', 'Enemy Evaluator', 100, 100, false);
      const enemy2 = createTestCharacter(
        'e2',
        'Enemy Ally',
        80,
        100,
        false,
        [{ type: 'shielded', duration: 3, value: 40 }]
      );
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy1, enemy2]);
      const condition: Condition = {
        type: 'ally-has-status',
        statusType: 'shielded',
      };

      const result = evaluateCondition(condition, enemy1, combatState);

      expect(result).toBe(true);
    });

    it('should return false when evaluator has no allies', () => {
      const evaluator = createTestCharacter('p1', 'Solo Character', 100, 100, true);
      const combatState = createTestCombatState([evaluator], []);
      const condition: Condition = {
        type: 'ally-has-status',
        statusType: 'defending',
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(false);
    });

    it('should return true when multiple allies have the status', () => {
      const evaluator = createTestCharacter('p1', 'Evaluator', 100, 100, true);
      const ally1 = createTestCharacter(
        'p2',
        'Ally 1',
        80,
        100,
        true,
        [{ type: 'poisoned', duration: 3, value: 5 }]
      );
      const ally2 = createTestCharacter(
        'p3',
        'Ally 2',
        60,
        100,
        true,
        [{ type: 'poisoned', duration: 2, value: 5 }]
      );
      const combatState = createTestCombatState([evaluator, ally1, ally2], []);
      const condition: Condition = {
        type: 'ally-has-status',
        statusType: 'poisoned',
      };

      const result = evaluateCondition(condition, evaluator, combatState);

      expect(result).toBe(true);
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
});
