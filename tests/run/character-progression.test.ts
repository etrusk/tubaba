import { describe, it, expect } from 'vitest';
import type { Character, Skill, SkillUnlockChoice } from '../../src/types/index.js';

/**
 * CharacterProgression Test Suite (TDD - Tests First)
 *
 * Tests the character progression system that manages skill unlocks and loadout:
 * - AC41: Skill unlock from rewards (skill added to character's pool)
 * - AC42: Loadout enforcement (max 3 active skills for battle)
 * - AC43: Skill unlock validation (must be in rewards, not already unlocked)
 * - AC44: Skill persistence across encounters
 *
 * Implementation: src/run/character-progression.ts (Task 23)
 */

// Mock CharacterProgression interface (will be implemented in Task 23)
interface CharacterProgressionType {
  unlockSkill(
    character: Character,
    skillId: string,
    availableRewards: string[]
  ): Character;

  setActiveLoadout(character: Character, activeSkillIds: string[]): Character;

  getUnlockedSkills(character: Character): Skill[];

  getActiveLoadout(character: Character): Skill[];

  canUnlockSkill(
    character: Character,
    skillId: string,
    availableRewards: string[]
  ): boolean;

  validateLoadout(character: Character): boolean;
}

// Import actual implementation (will fail until implemented)
import { CharacterProgression } from '../../src/run/character-progression.js';

// Use real implementation
const progression: CharacterProgressionType = CharacterProgression;

// Test helpers
function createTestSkill(id: string, name: string): Skill {
  return {
    id,
    name,
    baseDuration: 2,
    effects: [{ type: 'damage', value: 10 }],
    targeting: 'single-enemy-lowest-hp',
  };
}

function createTestCharacter(
  id: string,
  name: string = `Character ${id}`,
  skills: Skill[] = []
): Character {
  return {
    id,
    name,
    maxHp: 100,
    currentHp: 100,
    skills,
    statusEffects: [],
    currentAction: null,
    isPlayer: true,
  };
}

describe('CharacterProgression - AC41: Skill Unlock from Rewards', () => {
  it('should unlock skill from encounter rewards and add to character skills', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
    ]);
    const availableRewards = ['heavy-strike', 'fireball'];

    const updatedCharacter = progression.unlockSkill(
      character,
      'heavy-strike',
      availableRewards
    );

    const unlockedSkills = progression.getUnlockedSkills(updatedCharacter);
    const skillIds = unlockedSkills.map((s) => s.id);
    expect(skillIds).toContain('heavy-strike');
  });

  it('should add unlocked skill to character skill pool', () => {
    const character = createTestCharacter('char-1', 'Mage', [
      createTestSkill('strike', 'Strike'),
    ]);
    const availableRewards = ['fireball'];

    const updatedCharacter = progression.unlockSkill(character, 'fireball', availableRewards);

    const unlockedSkills = progression.getUnlockedSkills(updatedCharacter);
    expect(unlockedSkills.length).toBeGreaterThan(1);
    expect(unlockedSkills.some((s) => s.id === 'fireball')).toBe(true);
  });

  it('should throw validation error if skill already unlocked', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
      createTestSkill('heavy-strike', 'Heavy Strike'),
    ]);
    const availableRewards = ['heavy-strike', 'fireball'];

    expect(() => {
      progression.unlockSkill(character, 'heavy-strike', availableRewards);
    }).toThrow();
  });

  it('should retrieve skill definition from SkillLibrary when unlocking', () => {
    const character = createTestCharacter('char-1', 'Warrior', []);
    const availableRewards = ['heal'];

    const updatedCharacter = progression.unlockSkill(character, 'heal', availableRewards);

    const unlockedSkills = progression.getUnlockedSkills(updatedCharacter);
    const healSkill = unlockedSkills.find((s) => s.id === 'heal');
    expect(healSkill).toBeDefined();
    expect(healSkill!.name).toBe('Heal');
    expect(healSkill!.baseDuration).toBe(3);
  });

  it('should handle unlocking first skill for new character', () => {
    const character = createTestCharacter('char-1', 'Novice', []); // No skills
    const availableRewards = ['strike'];

    const updatedCharacter = progression.unlockSkill(character, 'strike', availableRewards);

    const unlockedSkills = progression.getUnlockedSkills(updatedCharacter);
    expect(unlockedSkills.length).toBe(1);
    expect(unlockedSkills[0]!.id).toBe('strike');
  });

  it('should unlock multiple skills sequentially', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.unlockSkill(character, 'shield', ['shield']);

    const unlockedSkills = progression.getUnlockedSkills(character);
    expect(unlockedSkills.length).toBe(3);
    expect(unlockedSkills.map((s) => s.id).sort()).toEqual(['heal', 'shield', 'strike']);
  });
});

describe('CharacterProgression - AC42: Loadout Enforcement (3 Active Skills)', () => {
  it('should enforce maximum 3 active skills for battle', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
      createTestSkill('heavy-strike', 'Heavy Strike'),
      createTestSkill('fireball', 'Fireball'),
      createTestSkill('heal', 'Heal'),
    ]);

    const activeLoadout = progression.getActiveLoadout(character);

    expect(activeLoadout.length).toBeLessThanOrEqual(3);
  });

  it('should allow selecting which 3 skills are active', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);
    
    // Unlock 4 skills
    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.unlockSkill(character, 'shield', ['shield']);
    character = progression.unlockSkill(character, 'fireball', ['fireball']);

    // Set active loadout to specific 3
    const updatedCharacter = progression.setActiveLoadout(character, [
      'strike',
      'heal',
      'fireball',
    ]);

    const activeLoadout = progression.getActiveLoadout(updatedCharacter);
    expect(activeLoadout.length).toBe(3);
    expect(activeLoadout.map((s) => s.id).sort()).toEqual(['fireball', 'heal', 'strike']);
  });

  it('should validate loadout contains only unlocked skills', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
    ]);

    expect(() => {
      progression.setActiveLoadout(character, ['strike', 'heavy-strike', 'fireball']);
    }).toThrow();
  });

  it('should throw error if setting more than 3 active skills', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
      createTestSkill('heal', 'Heal'),
      createTestSkill('shield', 'Shield'),
      createTestSkill('fireball', 'Fireball'),
    ]);

    expect(() => {
      progression.setActiveLoadout(character, ['strike', 'heal', 'shield', 'fireball']);
    }).toThrow();
  });

  it('should allow setting less than 3 active skills', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
      createTestSkill('heal', 'Heal'),
    ]);

    const updatedCharacter = progression.setActiveLoadout(character, ['strike', 'heal']);

    const activeLoadout = progression.getActiveLoadout(updatedCharacter);
    expect(activeLoadout.length).toBe(2);
  });

  it('should maintain active loadout separate from unlocked skill pool', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);
    
    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.unlockSkill(character, 'shield', ['shield']);
    character = progression.unlockSkill(character, 'fireball', ['fireball']);

    character = progression.setActiveLoadout(character, ['strike', 'heal', 'shield']);

    const unlockedSkills = progression.getUnlockedSkills(character);
    const activeLoadout = progression.getActiveLoadout(character);

    expect(unlockedSkills.length).toBe(4); // All unlocked
    expect(activeLoadout.length).toBe(3); // Only 3 active
  });

  it('should update active loadout when changed between battles', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);
    
    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.unlockSkill(character, 'shield', ['shield']);
    character = progression.unlockSkill(character, 'fireball', ['fireball']);

    // Set initial loadout
    character = progression.setActiveLoadout(character, ['strike', 'heal', 'shield']);
    let activeLoadout = progression.getActiveLoadout(character);
    expect(activeLoadout.map((s) => s.id).sort()).toEqual(['heal', 'shield', 'strike']);

    // Change loadout
    character = progression.setActiveLoadout(character, ['strike', 'fireball', 'shield']);
    activeLoadout = progression.getActiveLoadout(character);
    expect(activeLoadout.map((s) => s.id).sort()).toEqual(['fireball', 'shield', 'strike']);
  });
});

describe('CharacterProgression - AC43: Skill Unlock Validation', () => {
  it('should throw error when attempting to unlock skill not in rewards', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
    ]);
    const availableRewards = ['heavy-strike', 'fireball'];

    expect(() => {
      progression.unlockSkill(character, 'execute', availableRewards);
    }).toThrow();
  });

  it('should validate skill exists in SkillLibrary', () => {
    const character = createTestCharacter('char-1', 'Warrior', []);
    const availableRewards = ['non-existent-skill'];

    expect(() => {
      progression.unlockSkill(character, 'non-existent-skill', availableRewards);
    }).toThrow();
  });

  it('should prevent unlocking arbitrary skills outside rewards', () => {
    const character = createTestCharacter('char-1', 'Warrior', []);
    const availableRewards = ['strike'];

    // Attempt to unlock skill not in rewards list
    expect(() => {
      progression.unlockSkill(character, 'fireball', availableRewards);
    }).toThrow();

    // Should only allow unlocking from rewards
    const updatedCharacter = progression.unlockSkill(character, 'strike', availableRewards);
    const unlockedSkills = progression.getUnlockedSkills(updatedCharacter);
    expect(unlockedSkills.map((s) => s.id)).toEqual(['strike']);
  });

  it('should check if skill can be unlocked before attempting', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
    ]);
    const availableRewards = ['heavy-strike', 'fireball'];

    expect(progression.canUnlockSkill(character, 'heavy-strike', availableRewards)).toBe(true);
    expect(progression.canUnlockSkill(character, 'strike', availableRewards)).toBe(false); // Already unlocked
    expect(progression.canUnlockSkill(character, 'execute', availableRewards)).toBe(false); // Not in rewards
  });

  it('should throw error if unlocking same skill twice', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);
    const availableRewards = ['strike', 'heal'];

    character = progression.unlockSkill(character, 'strike', availableRewards);

    expect(() => {
      progression.unlockSkill(character, 'strike', availableRewards);
    }).toThrow();
  });

  it('should validate skill ID case-sensitivity', () => {
    const character = createTestCharacter('char-1', 'Warrior', []);
    const availableRewards = ['heavy-strike'];

    // Exact match should work
    const updatedCharacter = progression.unlockSkill(
      character,
      'heavy-strike',
      availableRewards
    );
    expect(progression.getUnlockedSkills(updatedCharacter).some((s) => s.id === 'heavy-strike')).toBe(true);

    // Case mismatch should fail
    const character2 = createTestCharacter('char-2', 'Warrior', []);
    expect(() => {
      progression.unlockSkill(character2, 'Heavy-Strike', availableRewards);
    }).toThrow();
  });
});

describe('CharacterProgression - AC44: Skill Persistence Across Encounters', () => {
  it('should maintain unlocked skills across encounters', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    // Unlock skill in encounter 1
    character = progression.unlockSkill(character, 'strike', ['strike']);
    const afterEncounter1 = progression.getUnlockedSkills(character);
    expect(afterEncounter1.map((s) => s.id)).toContain('strike');

    // Unlock another skill in encounter 2
    character = progression.unlockSkill(character, 'heal', ['heal']);
    const afterEncounter2 = progression.getUnlockedSkills(character);
    expect(afterEncounter2.map((s) => s.id).sort()).toEqual(['heal', 'strike']);

    // Unlock third skill in encounter 3
    character = progression.unlockSkill(character, 'shield', ['shield']);
    const afterEncounter3 = progression.getUnlockedSkills(character);
    expect(afterEncounter3.map((s) => s.id).sort()).toEqual(['heal', 'shield', 'strike']);
  });

  it('should preserve active loadout across encounters', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.unlockSkill(character, 'shield', ['shield']);

    character = progression.setActiveLoadout(character, ['strike', 'heal', 'shield']);

    // Simulate moving to next encounter
    const loadoutBeforeNextEncounter = progression.getActiveLoadout(character);
    expect(loadoutBeforeNextEncounter.map((s) => s.id).sort()).toEqual([
      'heal',
      'shield',
      'strike',
    ]);
  });

  it('should allow adding to loadout after unlocking in later encounter', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    // Encounter 1: Unlock 2 skills
    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.setActiveLoadout(character, ['strike', 'heal']);

    // Encounter 2: Unlock 3rd skill and update loadout
    character = progression.unlockSkill(character, 'shield', ['shield']);
    character = progression.setActiveLoadout(character, ['strike', 'heal', 'shield']);

    const finalLoadout = progression.getActiveLoadout(character);
    expect(finalLoadout.length).toBe(3);
    expect(finalLoadout.map((s) => s.id).sort()).toEqual(['heal', 'shield', 'strike']);
  });

  it('should maintain skill pool when swapping active loadout', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.unlockSkill(character, 'shield', ['shield']);
    character = progression.unlockSkill(character, 'fireball', ['fireball']);

    // Set initial loadout
    character = progression.setActiveLoadout(character, ['strike', 'heal', 'shield']);

    // Swap loadout before next encounter
    character = progression.setActiveLoadout(character, ['strike', 'fireball', 'shield']);

    // All 4 skills should still be in unlocked pool
    const unlockedSkills = progression.getUnlockedSkills(character);
    expect(unlockedSkills.length).toBe(4);
    expect(unlockedSkills.map((s) => s.id).sort()).toEqual([
      'fireball',
      'heal',
      'shield',
      'strike',
    ]);
  });

  it('should handle progression through full run with skill accumulation', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    // Encounter 1
    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.setActiveLoadout(character, ['strike']);

    // Encounter 2
    character = progression.unlockSkill(character, 'heavy-strike', ['heavy-strike']);
    character = progression.setActiveLoadout(character, ['strike', 'heavy-strike']);

    // Encounter 3
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.setActiveLoadout(character, ['strike', 'heavy-strike', 'heal']);

    // Encounter 4
    character = progression.unlockSkill(character, 'shield', ['shield']);
    // Now has 4 unlocked, choose best 3
    character = progression.setActiveLoadout(character, ['heavy-strike', 'heal', 'shield']);

    // Encounter 5
    character = progression.unlockSkill(character, 'fireball', ['fireball']);
    character = progression.setActiveLoadout(character, ['heavy-strike', 'fireball', 'shield']);

    const finalUnlocked = progression.getUnlockedSkills(character);
    const finalLoadout = progression.getActiveLoadout(character);

    expect(finalUnlocked.length).toBe(5);
    expect(finalLoadout.length).toBe(3);
    expect(finalLoadout.map((s) => s.id).sort()).toEqual([
      'fireball',
      'heavy-strike',
      'shield',
    ]);
  });
});

describe('CharacterProgression - Standard Coverage: Unlocked Skills Pool', () => {
  it('should track all unlocked skills throughout run', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);

    const unlockedSkills = progression.getUnlockedSkills(character);
    expect(unlockedSkills.length).toBe(2);
  });

  it('should return empty array for character with no unlocked skills', () => {
    const character = createTestCharacter('char-1', 'Novice', []);

    const unlockedSkills = progression.getUnlockedSkills(character);
    expect(unlockedSkills).toEqual([]);
  });

  it('should preserve unlocked skills order', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'shield', ['shield']);

    const unlockedSkills = progression.getUnlockedSkills(character);
    expect(unlockedSkills.map((s) => s.id)).toEqual(['heal', 'strike', 'shield']);
  });

  it('should not mutate original character when unlocking skills', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
    ]);
    const originalSkillCount = character.skills.length;

    progression.unlockSkill(character, 'heal', ['heal']);

    expect(character.skills.length).toBe(originalSkillCount);
  });
});

describe('CharacterProgression - Standard Coverage: Loadout Changes', () => {
  it('should apply loadout changes to character for next battle', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.setActiveLoadout(character, ['strike', 'heal']);

    const activeLoadout = progression.getActiveLoadout(character);
    expect(activeLoadout.map((s) => s.id).sort()).toEqual(['heal', 'strike']);
  });

  it('should validate loadout before applying', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
      createTestSkill('heal', 'Heal'),
      createTestSkill('shield', 'Shield'),
    ]);

    const isValid = progression.validateLoadout(character);
    expect(isValid).toBe(true);
  });

  it('should reject invalid loadout with more than 3 skills', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
      createTestSkill('heal', 'Heal'),
      createTestSkill('shield', 'Shield'),
      createTestSkill('fireball', 'Fireball'),
    ]);

    expect(() => {
      progression.setActiveLoadout(character, ['strike', 'heal', 'shield', 'fireball']);
    }).toThrow();
  });

  it('should handle empty loadout', () => {
    const character = createTestCharacter('char-1', 'Novice', []);

    const updatedCharacter = progression.setActiveLoadout(character, []);
    const activeLoadout = progression.getActiveLoadout(updatedCharacter);

    expect(activeLoadout).toEqual([]);
  });
});

describe('CharacterProgression - Standard Coverage: Skill Unlock Recording', () => {
  it('should not duplicate skills in unlocked pool', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    character = progression.unlockSkill(character, 'strike', ['strike']);

    expect(() => {
      progression.unlockSkill(character, 'strike', ['strike']);
    }).toThrow();
  });

  it('should retrieve full skill definition from SkillLibrary', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    character = progression.unlockSkill(character, 'bash', ['bash']);

    const unlockedSkills = progression.getUnlockedSkills(character);
    const bashSkill = unlockedSkills.find((s) => s.id === 'bash');

    expect(bashSkill).toBeDefined();
    expect(bashSkill!.name).toBe('Bash');
    expect(bashSkill!.baseDuration).toBe(3);
    expect(bashSkill!.effects.length).toBeGreaterThan(0);
  });

  it('should handle unlocking all 12 skills from library', () => {
    let character = createTestCharacter('char-1', 'Master', []);

    const allSkillIds = [
      'strike',
      'heavy-strike',
      'fireball',
      'execute',
      'poison',
      'heal',
      'shield',
      'defend',
      'revive',
      'taunt',
      'bash',
      'interrupt',
    ];

    for (const skillId of allSkillIds) {
      character = progression.unlockSkill(character, skillId, [skillId]);
    }

    const unlockedSkills = progression.getUnlockedSkills(character);
    expect(unlockedSkills.length).toBe(12);
  });
});

describe('CharacterProgression - Edge Cases', () => {
  it('should handle character starting with pre-equipped skills', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
      createTestSkill('defend', 'Defend'),
    ]);

    const unlockedSkills = progression.getUnlockedSkills(character);
    expect(unlockedSkills.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle multiple characters progressing independently', () => {
    let char1 = createTestCharacter('char-1', 'Warrior', []);
    let char2 = createTestCharacter('char-2', 'Mage', []);

    char1 = progression.unlockSkill(char1, 'strike', ['strike']);
    char2 = progression.unlockSkill(char2, 'fireball', ['fireball']);

    const char1Skills = progression.getUnlockedSkills(char1);
    const char2Skills = progression.getUnlockedSkills(char2);

    expect(char1Skills.some((s) => s.id === 'strike')).toBe(true);
    expect(char1Skills.some((s) => s.id === 'fireball')).toBe(false);
    expect(char2Skills.some((s) => s.id === 'fireball')).toBe(true);
    expect(char2Skills.some((s) => s.id === 'strike')).toBe(false);
  });

  it('should handle loadout with duplicate skill IDs', () => {
    const character = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
    ]);

    expect(() => {
      progression.setActiveLoadout(character, ['strike', 'strike', 'strike']);
    }).toThrow();
  });

  it('should handle unlocking skill with empty rewards list', () => {
    const character = createTestCharacter('char-1', 'Warrior', []);
    const emptyRewards: string[] = [];

    expect(() => {
      progression.unlockSkill(character, 'strike', emptyRewards);
    }).toThrow();
  });

  it('should validate skill ID before looking up in SkillLibrary', () => {
    const character = createTestCharacter('char-1', 'Warrior', []);

    expect(() => {
      progression.unlockSkill(character, '', ['']);
    }).toThrow();
  });

  it('should handle setting loadout to subset of unlocked skills', () => {
    let character = createTestCharacter('char-1', 'Warrior', []);

    character = progression.unlockSkill(character, 'strike', ['strike']);
    character = progression.unlockSkill(character, 'heal', ['heal']);
    character = progression.unlockSkill(character, 'shield', ['shield']);
    character = progression.unlockSkill(character, 'fireball', ['fireball']);
    character = progression.unlockSkill(character, 'bash', ['bash']);

    // Select only 2 of 5 unlocked skills
    character = progression.setActiveLoadout(character, ['strike', 'heal']);

    const activeLoadout = progression.getActiveLoadout(character);
    expect(activeLoadout.length).toBe(2);
  });

  it('should not allow setting active loadout with skills from different character', () => {
    const char1 = createTestCharacter('char-1', 'Warrior', [
      createTestSkill('strike', 'Strike'),
    ]);

    expect(() => {
      progression.setActiveLoadout(char1, ['fireball']); // Not unlocked by char1
    }).toThrow();
  });
});
