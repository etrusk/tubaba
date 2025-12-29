import { describe, it, expect } from 'vitest';
import type { Character } from '../../src/types/character.js';
import type { CharacterInstructions, SkillInstruction } from '../../src/types/instructions.js';
import type { Skill } from '../../src/types/skill.js';
import {
  applyInstructionsToCharacter,
  skillInstructionToRule,
  createDefaultInstructions,
} from '../../src/ui/instructions-converter.js';

// Helper: Create a basic character for testing
function createTestCharacter(): Character {
  return {
    id: 'char1',
    name: 'Test Character',
    maxHp: 100,
    currentHp: 100,
    skills: [
      {
        id: 'skill1',
        name: 'Attack',
        baseDuration: 10,
        effects: [{ type: 'damage', value: 10 }],
        targeting: 'nearest-enemy',
        rules: [{ priority: 1, conditions: [] }], // Existing rule
      },
      {
        id: 'skill2',
        name: 'Heal',
        baseDuration: 15,
        effects: [{ type: 'heal', value: 20 }],
        targeting: 'self',
        rules: [{ priority: 2, conditions: [{ type: 'hp-below', threshold: 50 }] }], // Existing rule
      },
      {
        id: 'skill3',
        name: 'Buff',
        baseDuration: 5,
        effects: [{ type: 'status', statusType: 'enraged', duration: 3 }],
        targeting: 'self',
      },
    ],
    statusEffects: [],
    currentAction: null,
    isPlayer: true,
  };
}

describe('instructions-converter', () => {
  describe('applyInstructionsToCharacter', () => {
    describe('human mode conversion', () => {
      it('clears all rules from character skills', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'human',
          skillInstructions: [], // Ignored in human mode
        };

        const result = applyInstructionsToCharacter(character, instructions);

        // All skills should have empty rules arrays
        expect(result.skills[0].rules).toEqual([]);
        expect(result.skills[1].rules).toEqual([]);
        expect(result.skills[2].rules).toEqual([]);
      });

      it('returns new character without mutating original', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'human',
          skillInstructions: [],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        // Original should be unchanged
        expect(character.skills[0].rules).toHaveLength(1);
        expect(character.skills[1].rules).toHaveLength(1);
        
        // Result should have empty rules
        expect(result.skills[0].rules).toEqual([]);
        expect(result.skills[1].rules).toEqual([]);
      });
    });

    describe('AI mode conversion', () => {
      it('converts SkillInstruction[] to proper Rule[] arrays on skills', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [
            {
              skillId: 'skill1',
              priority: 10,
              conditions: [{ type: 'hp-below', threshold: 30 }],
              enabled: true,
            },
            {
              skillId: 'skill2',
              priority: 20,
              conditions: [{ type: 'ally-count', threshold: 2 }],
              targetingOverride: 'self',
              enabled: true,
            },
          ],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        // skill1 should have one rule
        expect(result.skills[0].rules).toHaveLength(1);
        expect(result.skills[0].rules![0]).toEqual({
          priority: 10,
          conditions: [{ type: 'hp-below', threshold: 30 }],
          targetingOverride: undefined,
        });

        // skill2 should have one rule
        expect(result.skills[1].rules).toHaveLength(1);
        expect(result.skills[1].rules![0]).toEqual({
          priority: 20,
          conditions: [{ type: 'ally-count', threshold: 2 }],
          targetingOverride: 'self',
        });

        // skill3 has no instruction, should have empty rules
        expect(result.skills[2].rules).toEqual([]);
      });

      it('maps priority correctly', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [
            {
              skillId: 'skill1',
              priority: 99,
              conditions: [],
              enabled: true,
            },
          ],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        expect(result.skills[0].rules![0].priority).toBe(99);
      });

      it('passes conditions through correctly', () => {
        const character = createTestCharacter();
        const conditions = [
          { type: 'hp-below' as const, threshold: 25 },
          { type: 'enemy-has-status' as const, statusType: 'poisoned' as const },
        ];
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [
            {
              skillId: 'skill1',
              priority: 10,
              conditions,
              enabled: true,
            },
          ],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        expect(result.skills[0].rules![0].conditions).toEqual(conditions);
      });

      it('passes targeting override through correctly', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [
            {
              skillId: 'skill1',
              priority: 10,
              conditions: [],
              targetingOverride: 'nearest-enemy',
              enabled: true,
            },
          ],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        expect(result.skills[0].rules![0].targetingOverride).toBe('nearest-enemy');
      });
    });

    describe('enabled/disabled handling', () => {
      it('does not apply rules for disabled skills', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [
            {
              skillId: 'skill1',
              priority: 10,
              conditions: [],
              enabled: false, // Disabled
            },
            {
              skillId: 'skill2',
              priority: 20,
              conditions: [],
              enabled: true, // Enabled
            },
          ],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        // skill1 disabled - should have empty rules
        expect(result.skills[0].rules).toEqual([]);

        // skill2 enabled - should have rule
        expect(result.skills[1].rules).toHaveLength(1);
        expect(result.skills[1].rules![0].priority).toBe(20);
      });

      it('only enabled skills get their rules generated', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [
            {
              skillId: 'skill1',
              priority: 10,
              conditions: [],
              enabled: true,
            },
            {
              skillId: 'skill2',
              priority: 20,
              conditions: [],
              enabled: false,
            },
            {
              skillId: 'skill3',
              priority: 30,
              conditions: [],
              enabled: true,
            },
          ],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        expect(result.skills[0].rules).toHaveLength(1); // skill1: enabled
        expect(result.skills[1].rules).toEqual([]);     // skill2: disabled
        expect(result.skills[2].rules).toHaveLength(1); // skill3: enabled
      });
    });

    describe('edge cases', () => {
      it('handles character with no skill instructions', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [], // No instructions
        };

        const result = applyInstructionsToCharacter(character, instructions);

        // All skills should have empty rules
        expect(result.skills[0].rules).toEqual([]);
        expect(result.skills[1].rules).toEqual([]);
        expect(result.skills[2].rules).toEqual([]);
      });

      it('ignores skill instruction for skill not in character loadout', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [
            {
              skillId: 'nonexistent-skill',
              priority: 50,
              conditions: [],
              enabled: true,
            },
            {
              skillId: 'skill1',
              priority: 10,
              conditions: [],
              enabled: true,
            },
          ],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        // Should not throw, just ignore the nonexistent skill
        expect(result.skills[0].rules).toHaveLength(1);
        expect(result.skills[0].rules![0].priority).toBe(10);
      });

      it('handles empty conditions array as always-matching rule', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [
            {
              skillId: 'skill1',
              priority: 10,
              conditions: [], // Empty = always matches
              enabled: true,
            },
          ],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        expect(result.skills[0].rules![0].conditions).toEqual([]);
      });

      it('preserves other character properties', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        expect(result.id).toBe(character.id);
        expect(result.name).toBe(character.name);
        expect(result.maxHp).toBe(character.maxHp);
        expect(result.currentHp).toBe(character.currentHp);
        expect(result.statusEffects).toBe(character.statusEffects);
        expect(result.currentAction).toBe(character.currentAction);
        expect(result.isPlayer).toBe(character.isPlayer);
      });

      it('preserves skill properties other than rules', () => {
        const character = createTestCharacter();
        const instructions: CharacterInstructions = {
          characterId: 'char1',
          controlMode: 'ai',
          skillInstructions: [
            {
              skillId: 'skill1',
              priority: 10,
              conditions: [],
              enabled: true,
            },
          ],
        };

        const result = applyInstructionsToCharacter(character, instructions);

        const resultSkill = result.skills[0];
        const originalSkill = character.skills[0]!;

        expect(resultSkill.id).toBe(originalSkill.id);
        expect(resultSkill.name).toBe(originalSkill.name);
        expect(resultSkill.baseDuration).toBe(originalSkill.baseDuration);
        expect(resultSkill.effects).toBe(originalSkill.effects);
        expect(resultSkill.targeting).toBe(originalSkill.targeting);
      });
    });
  });

  describe('skillInstructionToRule', () => {
    it('converts basic SkillInstruction to Rule', () => {
      const instruction: SkillInstruction = {
        skillId: 'skill1',
        priority: 10,
        conditions: [],
        enabled: true,
      };

      const rule = skillInstructionToRule(instruction);

      expect(rule).toEqual({
        priority: 10,
        conditions: [],
        targetingOverride: undefined,
      });
    });

    it('includes targetingOverride when present', () => {
      const instruction: SkillInstruction = {
        skillId: 'skill1',
        priority: 20,
        conditions: [],
        targetingOverride: 'nearest-enemy',
        enabled: true,
      };

      const rule = skillInstructionToRule(instruction);

      expect(rule.targetingOverride).toBe('nearest-enemy');
    });

    it('preserves conditions array', () => {
      const conditions = [
        { type: 'hp-below' as const, threshold: 50 },
        { type: 'ally-count' as const, threshold: 3 },
      ];
      const instruction: SkillInstruction = {
        skillId: 'skill1',
        priority: 15,
        conditions,
        enabled: true,
      };

      const rule = skillInstructionToRule(instruction);

      expect(rule.conditions).toEqual(conditions);
    });
  });

  describe('createDefaultInstructions', () => {
    it('creates default instructions with all skills enabled', () => {
      const character = createTestCharacter();

      const instructions = createDefaultInstructions(character);

      expect(instructions.characterId).toBe(character.id);
      expect(instructions.controlMode).toBe('ai');
      expect(instructions.skillInstructions).toHaveLength(3); // Character's equipped skills
    });

    it('creates instructions for each skill in character loadout', () => {
      const character = createTestCharacter();

      const instructions = createDefaultInstructions(character);

      // Should have skills from character's loadout
      const skillIds = instructions.skillInstructions.map((si: SkillInstruction) => si.skillId);
      expect(skillIds).toContain('skill1');
      expect(skillIds).toContain('skill2');
      expect(skillIds).toContain('skill3');
      expect(skillIds).toHaveLength(3);
    });

    it('sets all skills to enabled by default', () => {
      const character = createTestCharacter();

      const instructions = createDefaultInstructions(character);

      for (const skillInstruction of instructions.skillInstructions) {
        expect(skillInstruction.enabled).toBe(true);
      }
    });

    it('sets default priority of 10 for all skills', () => {
      const character = createTestCharacter();

      const instructions = createDefaultInstructions(character);

      for (const skillInstruction of instructions.skillInstructions) {
        expect(skillInstruction.priority).toBe(10);
      }
    });

    it('sets empty conditions for all skills', () => {
      const character = createTestCharacter();

      const instructions = createDefaultInstructions(character);

      for (const skillInstruction of instructions.skillInstructions) {
        expect(skillInstruction.conditions).toEqual([]);
      }
    });

    it('does not set targeting override by default', () => {
      const character = createTestCharacter();

      const instructions = createDefaultInstructions(character);

      for (const skillInstruction of instructions.skillInstructions) {
        expect(skillInstruction.targetingOverride).toBeUndefined();
      }
    });

    it('handles character with no skills', () => {
      const character: Character = {
        id: 'empty',
        name: 'Empty Character',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      const instructions = createDefaultInstructions(character);

      // Characters with no skills get no instructions
      expect(instructions.skillInstructions).toHaveLength(0);
    });
  });
});
