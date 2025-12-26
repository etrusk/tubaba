import { describe, it, expect } from 'vitest';
import type { Character } from '../../src/types/character.js';
import type { CombatState } from '../../src/types/combat.js';
import type { Skill, Rule, Condition } from '../../src/types/skill.js';
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
  skills: Skill[] = [],
  statusEffects: StatusEffect[] = []
): Character {
  return {
    id,
    name,
    maxHp,
    currentHp,
    skills,
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

/**
 * Test helper: Create a basic skill
 */
function createTestSkill(
  id: string,
  name: string,
  targeting: Skill['targeting'],
  rules?: Rule[]
): Skill {
  return {
    id,
    name,
    baseDuration: 3,
    effects: [{ type: 'damage', value: 10 }],
    targeting,
    rules,
  };
}

// Import actual implementation
import { selectAction } from '../../src/ai/action-selector.js';

describe('EnemyBrain', () => {
  describe('selectAction - rule priority ordering', () => {
    it('should select higher priority rule when both conditions are met', () => {
      // Enemy at 20% HP with 2 rules: priority 10 and priority 5
      const highPriorityRule: Rule = {
        priority: 10,
        conditions: [{ type: 'hp-below', threshold: 30 }],
      };
      const lowPriorityRule: Rule = {
        priority: 5,
        conditions: [{ type: 'hp-below', threshold: 50 }],
      };
      
      const healSkill = createTestSkill('heal', 'Heal', 'self', [highPriorityRule]);
      const attackSkill = createTestSkill('attack', 'Attack', 'single-enemy-lowest-hp', [lowPriorityRule]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 20, 100, false, [healSkill, attackSkill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('heal'); // Higher priority rule wins
      expect(result?.skill.name).toBe('Heal');
    });

    it('should select lower priority rule when only its condition is met', () => {
      // Enemy at 40% HP - only low priority rule matches
      const highPriorityRule: Rule = {
        priority: 10,
        conditions: [{ type: 'hp-below', threshold: 30 }],
      };
      const lowPriorityRule: Rule = {
        priority: 5,
        conditions: [{ type: 'hp-below', threshold: 50 }],
      };
      
      const healSkill = createTestSkill('heal', 'Heal', 'self', [highPriorityRule]);
      const attackSkill = createTestSkill('attack', 'Attack', 'single-enemy-lowest-hp', [lowPriorityRule]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 40, 100, false, [healSkill, attackSkill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('attack'); // Low priority rule is the only match
    });

    it('should evaluate rules across all skills by priority', () => {
      // Multiple skills with different priority rules
      const skill1 = createTestSkill('skill1', 'Skill 1', 'self', [
        { priority: 3, conditions: [{ type: 'hp-below', threshold: 100 }] }
      ]);
      const skill2 = createTestSkill('skill2', 'Skill 2', 'all-enemies', [
        { priority: 7, conditions: [{ type: 'hp-below', threshold: 100 }] }
      ]);
      const skill3 = createTestSkill('skill3', 'Skill 3', 'single-enemy-highest-hp', [
        { priority: 5, conditions: [{ type: 'hp-below', threshold: 100 }] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 50, 100, false, [skill1, skill2, skill3]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('skill2'); // Priority 7 is highest
    });
  });

  describe('selectAction - skill selection', () => {
    it('should select first skill with matching rule when same priority', () => {
      // Both skills have priority 5 rules that match
      const skill1 = createTestSkill('first', 'First Skill', 'self', [
        { priority: 5, conditions: [{ type: 'hp-below', threshold: 100 }] }
      ]);
      const skill2 = createTestSkill('second', 'Second Skill', 'all-enemies', [
        { priority: 5, conditions: [{ type: 'hp-below', threshold: 100 }] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 50, 100, false, [skill1, skill2]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('first'); // First in array wins at same priority
    });

    it('should select skill with multiple rules based on highest matching priority', () => {
      const skill = createTestSkill('multi-rule', 'Multi Rule Skill', 'self', [
        { priority: 3, conditions: [{ type: 'hp-below', threshold: 100 }] },
        { priority: 8, conditions: [{ type: 'hp-below', threshold: 50 }] },
        { priority: 5, conditions: [{ type: 'hp-below', threshold: 75 }] },
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 40, 100, false, [skill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('multi-rule');
      // Priority 8 rule matches (HP below 50%), highest priority
    });
  });

  describe('selectAction - targeting', () => {
    it('should use skill default targeting mode', () => {
      const skill = createTestSkill('attack', 'Attack', 'single-enemy-lowest-hp', [
        { priority: 5, conditions: [] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 100, 100, false, [skill]);
      const player1 = createTestCharacter('p1', 'Player 1', 30, 100, true);
      const player2 = createTestCharacter('p2', 'Player 2', 80, 100, true);
      const combatState = createTestCombatState([player1, player2], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.targets).toHaveLength(1);
      expect(result?.targets[0].id).toBe('p1'); // Lowest HP player
    });

    it('should use rule targetingOverride when specified', () => {
      const skill = createTestSkill('attack', 'Attack', 'single-enemy-lowest-hp', [
        { 
          priority: 5, 
          conditions: [],
          targetingOverride: 'all-enemies' // Override to target all enemies
        }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 100, 100, false, [skill]);
      const player1 = createTestCharacter('p1', 'Player 1', 30, 100, true);
      const player2 = createTestCharacter('p2', 'Player 2', 80, 100, true);
      const combatState = createTestCombatState([player1, player2], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.targets).toHaveLength(2); // All players targeted
      expect(result?.targets.map((t: Character) => t.id).sort()).toEqual(['p1', 'p2']);
    });

    it('should apply taunt forcing through TargetFilter', () => {
      const skill = createTestSkill('attack', 'Attack', 'single-enemy-highest-hp', [
        { priority: 5, conditions: [] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 100, 100, false, [skill]);
      const player1 = createTestCharacter('p1', 'Player 1', 100, 100, true); // Highest HP
      const player2 = createTestCharacter('p2', 'Player 2', 50, 100, true, [], [
        { type: 'taunting', duration: 2 }
      ]);
      const combatState = createTestCombatState([player1, player2], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.targets).toHaveLength(1);
      expect(result?.targets[0].id).toBe('p2'); // Forced to target taunting player
    });

    it('should handle self-targeting', () => {
      const skill = createTestSkill('heal', 'Heal Self', 'self', [
        { priority: 5, conditions: [] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 50, 100, false, [skill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.targets).toHaveLength(1);
      expect(result?.targets[0].id).toBe('e1'); // Targets self
    });

    it('should handle ally targeting for enemies', () => {
      const skill = createTestSkill('buff-ally', 'Buff Ally', 'ally-lowest-hp', [
        { priority: 5, conditions: [] }
      ]);
      
      const enemy1 = createTestCharacter('e1', 'Enemy 1', 100, 100, false, [skill]);
      const enemy2 = createTestCharacter('e2', 'Enemy 2', 30, 100, false);
      const enemy3 = createTestCharacter('e3', 'Enemy 3', 70, 100, false);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy1, enemy2, enemy3]);

      const result = selectAction(enemy1, combatState);

      expect(result).not.toBeNull();
      expect(result?.targets).toHaveLength(1);
      expect(result?.targets[0].id).toBe('e2'); // Lowest HP enemy ally
    });
  });

  describe('selectAction - no matching rules', () => {
    it('should return null when no rules match', () => {
      // Rule condition doesn't match (HP not below 30%)
      const skill = createTestSkill('emergency-heal', 'Emergency Heal', 'self', [
        { priority: 10, conditions: [{ type: 'hp-below', threshold: 30 }] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 80, 100, false, [skill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).toBeNull(); // No action queued, enemy waits idle
    });

    it('should return null when all rules fail conditions', () => {
      const skill1 = createTestSkill('skill1', 'Skill 1', 'self', [
        { priority: 10, conditions: [{ type: 'hp-below', threshold: 20 }] }
      ]);
      const skill2 = createTestSkill('skill2', 'Skill 2', 'all-enemies', [
        { priority: 5, conditions: [{ type: 'ally-count', threshold: 2 }] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 80, 100, false, [skill1, skill2]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).toBeNull(); // HP not below 20%, no allies
    });
  });

  describe('selectAction - rules without conditions', () => {
    it('should always match rule with empty conditions array', () => {
      const skill = createTestSkill('basic-attack', 'Basic Attack', 'single-enemy-lowest-hp', [
        { priority: 1, conditions: [] } // Empty conditions = always match
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 100, 100, false, [skill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('basic-attack');
    });

    it('should use empty-condition rule as fallback when higher priority rules fail', () => {
      const skill1 = createTestSkill('special', 'Special Attack', 'all-enemies', [
        { priority: 10, conditions: [{ type: 'hp-below', threshold: 30 }] }
      ]);
      const skill2 = createTestSkill('basic', 'Basic Attack', 'single-enemy-lowest-hp', [
        { priority: 1, conditions: [] } // Fallback
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 90, 100, false, [skill1, skill2]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('basic'); // Falls back to unconditional rule
    });
  });

  describe('selectAction - AND logic for conditions', () => {
    it('should require all conditions to be true for rule to match', () => {
      const skill = createTestSkill('conditional-skill', 'Conditional Skill', 'all-enemies', [
        {
          priority: 5,
          conditions: [
            { type: 'hp-below', threshold: 50 },
            { type: 'ally-count', threshold: 0 }
          ]
        }
      ]);
      
      const enemy1 = createTestCharacter('e1', 'Enemy 1', 30, 100, false, [skill]);
      const enemy2 = createTestCharacter('e2', 'Enemy 2', 80, 100, false);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy1, enemy2]);

      const result = selectAction(enemy1, combatState);

      expect(result).not.toBeNull(); // Both conditions true: HP < 50% AND ally count > 0
      expect(result?.skill.id).toBe('conditional-skill');
    });

    it('should not match when one condition is false', () => {
      const skill = createTestSkill('conditional-skill', 'Conditional Skill', 'all-enemies', [
        {
          priority: 5,
          conditions: [
            { type: 'hp-below', threshold: 50 },
            { type: 'ally-count', threshold: 2 } // This will be false
          ]
        }
      ]);
      
      const enemy1 = createTestCharacter('e1', 'Enemy 1', 30, 100, false, [skill]);
      const enemy2 = createTestCharacter('e2', 'Enemy 2', 80, 100, false);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy1, enemy2]);

      const result = selectAction(enemy1, combatState);

      expect(result).toBeNull(); // HP < 50% is true but ally count (1) is not > 2
    });

    it('should handle three conditions with AND logic', () => {
      const skill = createTestSkill('triple-condition', 'Triple Condition', 'self', [
        {
          priority: 5,
          conditions: [
            { type: 'hp-below', threshold: 80 },
            { type: 'ally-count', threshold: 0 },
            { type: 'enemy-has-status', statusType: 'defending' }
          ]
        }
      ]);
      
      const enemy1 = createTestCharacter('e1', 'Enemy 1', 70, 100, false, [skill]);
      const enemy2 = createTestCharacter('e2', 'Enemy 2', 90, 100, false);
      const player = createTestCharacter('p1', 'Player', 100, 100, true, [], [
        { type: 'defending', duration: 2 }
      ]);
      const combatState = createTestCombatState([player], [enemy1, enemy2]);

      const result = selectAction(enemy1, combatState);

      expect(result).not.toBeNull(); // All three conditions met
      expect(result?.skill.id).toBe('triple-condition');
    });
  });

  describe('selectAction - edge cases', () => {
    it('should return null when enemy has no skills', () => {
      const enemy = createTestCharacter('e1', 'Unskilled Enemy', 100, 100, false, []); // No skills
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).toBeNull();
    });

    it('should match skill with no rules (default behavior)', () => {
      const skill = createTestSkill('unrestricted', 'Unrestricted Skill', 'single-enemy-lowest-hp');
      // No rules property set
      
      const enemy = createTestCharacter('e1', 'Enemy', 100, 100, false, [skill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('unrestricted'); // Matches by default
    });

    it('should match skill with empty rules array', () => {
      const skill = createTestSkill('no-rules', 'No Rules Skill', 'all-enemies', []);
      
      const enemy = createTestCharacter('e1', 'Enemy', 100, 100, false, [skill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('no-rules'); // Matches by default
    });

    it('should return null when no valid targets exist', () => {
      const skill = createTestSkill('attack', 'Attack', 'single-enemy-lowest-hp', [
        { priority: 5, conditions: [] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 100, 100, false, [skill]);
      const combatState = createTestCombatState([], [enemy]); // No players to target

      const result = selectAction(enemy, combatState);

      expect(result).toBeNull(); // No valid targets available
    });

    it('should return null when enemy is knocked out (HP 0)', () => {
      const skill = createTestSkill('attack', 'Attack', 'single-enemy-lowest-hp', [
        { priority: 5, conditions: [] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Dead Enemy', 0, 100, false, [skill]); // Knocked out
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).toBeNull(); // Dead enemies can't act
    });

    it('should return null when targets would be dead allies for ally-dead targeting', () => {
      const skill = createTestSkill('revive', 'Revive', 'ally-dead', [
        { priority: 10, conditions: [] }
      ]);
      
      const enemy1 = createTestCharacter('e1', 'Enemy 1', 100, 100, false, [skill]);
      const enemy2 = createTestCharacter('e2', 'Enemy 2', 80, 100, false); // Alive ally
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy1, enemy2]);

      const result = selectAction(enemy1, combatState);

      expect(result).toBeNull(); // No dead allies to revive
    });

    it('should handle multiple knocked-out players when targeting', () => {
      const skill = createTestSkill('attack', 'Attack', 'single-enemy-lowest-hp', [
        { priority: 5, conditions: [] }
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 100, 100, false, [skill]);
      const deadPlayer1 = createTestCharacter('p1', 'Dead Player 1', 0, 100, true);
      const deadPlayer2 = createTestCharacter('p2', 'Dead Player 2', 0, 100, true);
      const alivePlayer = createTestCharacter('p3', 'Alive Player', 50, 100, true);
      const combatState = createTestCombatState([deadPlayer1, deadPlayer2, alivePlayer], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.targets).toHaveLength(1);
      expect(result?.targets[0].id).toBe('p3'); // Only alive player targeted
    });
  });

  describe('selectAction - complex scenarios', () => {
    it('should handle priority ties with rule order within skill', () => {
      const skill = createTestSkill('multi-option', 'Multi Option', 'self', [
        { priority: 5, conditions: [{ type: 'hp-below', threshold: 100 }], targetingOverride: 'self' },
        { priority: 5, conditions: [{ type: 'hp-below', threshold: 100 }], targetingOverride: 'all-enemies' },
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 50, 100, false, [skill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      // First matching rule at priority 5 should be selected
      expect(result?.targets[0].id).toBe('e1'); // Self targeting from first rule
    });

    it('should handle skill with mixed rule priorities and conditions', () => {
      const healSkill = createTestSkill('heal', 'Heal', 'self', [
        { priority: 10, conditions: [{ type: 'hp-below', threshold: 20 }] }, // Emergency
        { priority: 5, conditions: [{ type: 'hp-below', threshold: 50 }] }, // Normal heal
      ]);
      const attackSkill = createTestSkill('attack', 'Attack', 'all-enemies', [
        { priority: 3, conditions: [] }, // Default action
      ]);
      
      const enemy = createTestCharacter('e1', 'Enemy', 40, 100, false, [healSkill, attackSkill]);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy]);

      const result = selectAction(enemy, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('heal'); // Priority 5 heal rule matches (HP < 50%)
    });

    it('should correctly evaluate across all skills and all rules', () => {
      const skill1 = createTestSkill('s1', 'Skill 1', 'self', [
        { priority: 2, conditions: [{ type: 'hp-below', threshold: 30 }] }
      ]);
      const skill2 = createTestSkill('s2', 'Skill 2', 'all-enemies', [
        { priority: 8, conditions: [{ type: 'ally-count', threshold: 0 }] }
      ]);
      const skill3 = createTestSkill('s3', 'Skill 3', 'single-enemy-highest-hp', [
        { priority: 5, conditions: [] }
      ]);
      
      const enemy1 = createTestCharacter('e1', 'Enemy 1', 70, 100, false, [skill1, skill2, skill3]);
      const enemy2 = createTestCharacter('e2', 'Enemy 2', 80, 100, false);
      const player = createTestCharacter('p1', 'Player', 100, 100, true);
      const combatState = createTestCombatState([player], [enemy1, enemy2]);

      const result = selectAction(enemy1, combatState);

      expect(result).not.toBeNull();
      expect(result?.skill.id).toBe('s2'); // Priority 8, has ally (enemy2)
    });
  });
});
