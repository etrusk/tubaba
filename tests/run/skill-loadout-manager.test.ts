import { describe, it, expect } from 'vitest';
import type { Character, RunState } from '../../src/types/index.js';
import {
  distributeSkill,
  unequipSkill,
  canReceiveSkill,
} from '../../src/run/skill-loadout-manager.js';
import { SkillLibrary } from '../../src/engine/skill-library.js';

/**
 * SkillLoadoutManager Test Suite
 *
 * Tests the skill inventory system prototype:
 * - Distributing skills from pool to characters
 * - Unequipping skills back to pool
 * - 4-skill cap enforcement
 * - All skills can be unequipped (no innate skill protection)
 */

// Test helper: Create character with skills
function createTestCharacter(
  id: string,
  name: string = `Character ${id}`,
  skillIds: string[] = []
): Character {
  const skills = skillIds.map(skillId => SkillLibrary.getSkill(skillId));
  
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

// Test helper: Create RunState with pool
function createTestRunState(
  playerParty: Character[],
  skillPool: string[] = []
): RunState {
  return {
    runId: 'test-run',
    currentEncounterIndex: 0,
    encounters: [],
    playerParty,
    runStatus: 'in-progress',
    encountersCleared: 0,
    skillsUnlockedThisRun: [],
    skillPool,
  };
}

describe('SkillLoadoutManager - distributeSkill()', () => {
  it('should move skill from pool to character', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike']);
    const runState = createTestRunState([character], ['heavy-strike']);

    const updated = distributeSkill(runState, 'heavy-strike', 'player-1');

    // Skill removed from pool
    expect(updated.skillPool).toEqual([]);
    
    // Skill added to character
    const updatedCharacter = updated.playerParty[0]!;
    expect(updatedCharacter.skills.length).toBe(2);
    expect(updatedCharacter.skills.map(s => s.id)).toContain('heavy-strike');
  });

  it('should throw if skill not in pool', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike']);
    const runState = createTestRunState([character], ['fireball']);

    expect(() => {
      distributeSkill(runState, 'heavy-strike', 'player-1');
    }).toThrow('Skill heavy-strike not found in skill pool');
  });

  it('should throw if character not found', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike']);
    const runState = createTestRunState([character], ['heavy-strike']);

    expect(() => {
      distributeSkill(runState, 'heavy-strike', 'player-99');
    }).toThrow('Character player-99 not found in party');
  });

  it('should throw if character already has 4 skills', () => {
    const character = createTestCharacter('player-1', 'Warrior', [
      'strike',
      'heavy-strike',
      'bash',
      'defend',
    ]);
    const runState = createTestRunState([character], ['fireball']);

    expect(() => {
      distributeSkill(runState, 'fireball', 'player-1');
    }).toThrow('Character player-1 already has 4 skills');
  });

  it('should throw if character already has the skill', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike']);
    const runState = createTestRunState([character], ['strike']);

    expect(() => {
      distributeSkill(runState, 'strike', 'player-1');
    }).toThrow('Character player-1 already has skill strike');
  });

  it('should work with multiple characters', () => {
    const warrior = createTestCharacter('player-1', 'Warrior', ['strike']);
    const mage = createTestCharacter('player-2', 'Mage', ['fireball']);
    const runState = createTestRunState([warrior, mage], ['heal']);

    const updated = distributeSkill(runState, 'heal', 'player-2');

    // Skill added to mage, not warrior
    const updatedWarrior = updated.playerParty[0]!;
    const updatedMage = updated.playerParty[1]!;
    
    expect(updatedWarrior.skills.map(s => s.id)).toEqual(['strike']);
    expect(updatedMage.skills.map(s => s.id)).toContain('heal');
  });
});

describe('SkillLoadoutManager - unequipSkill()', () => {
  it('should move skill from character back to pool', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike', 'heavy-strike']);
    const runState = createTestRunState([character], []);

    const updated = unequipSkill(runState, 'heavy-strike', 'player-1');

    // Skill added back to pool
    expect(updated.skillPool).toContain('heavy-strike');
    
    // Skill removed from character
    const updatedCharacter = updated.playerParty[0]!;
    expect(updatedCharacter.skills.length).toBe(1);
    expect(updatedCharacter.skills.map(s => s.id)).toEqual(['strike']);
  });

  it('should allow unequipping ANY skill (no innate protection)', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike', 'heavy-strike']);
    const runState = createTestRunState([character], []);

    // Can now unequip first skill (was previously "innate")
    const updated = unequipSkill(runState, 'strike', 'player-1');
    
    expect(updated.skillPool).toContain('strike');
    const updatedCharacter = updated.playerParty[0]!;
    expect(updatedCharacter.skills.length).toBe(1);
    expect(updatedCharacter.skills.map(s => s.id)).toEqual(['heavy-strike']);
  });

  it('should throw if character does not have the skill', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike']);
    const runState = createTestRunState([character], []);

    expect(() => {
      unequipSkill(runState, 'fireball', 'player-1');
    }).toThrow('Character player-1 does not have skill fireball');
  });

  it('should throw if character not found', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike']);
    const runState = createTestRunState([character], []);

    expect(() => {
      unequipSkill(runState, 'strike', 'player-99');
    }).toThrow('Character player-99 not found in party');
  });

  it('should allow unequipping all skills from a character', () => {
    const character = createTestCharacter('player-1', 'Warrior', [
      'strike',
      'heavy-strike',
      'bash',
    ]);
    const runState = createTestRunState([character], []);

    // Unequip all three skills
    let updated = unequipSkill(runState, 'heavy-strike', 'player-1');
    expect(updated.skillPool).toContain('heavy-strike');
    
    updated = unequipSkill(updated, 'bash', 'player-1');
    expect(updated.skillPool).toContain('bash');
    
    updated = unequipSkill(updated, 'strike', 'player-1');
    expect(updated.skillPool).toContain('strike');
    
    // Character has no skills
    const updatedCharacter = updated.playerParty[0]!;
    expect(updatedCharacter.skills.length).toBe(0);
  });
});

describe('SkillLoadoutManager - canReceiveSkill()', () => {
  it('should return true if character has less than 4 skills', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike']);
    
    expect(canReceiveSkill(character)).toBe(true);
  });

  it('should return false if character has 4 skills', () => {
    const character = createTestCharacter('player-1', 'Warrior', [
      'strike',
      'heavy-strike',
      'bash',
      'defend',
    ]);
    
    expect(canReceiveSkill(character)).toBe(false);
  });

  it('should return true if character has 0 skills', () => {
    const character = createTestCharacter('player-1', 'Warrior', []);
    
    expect(canReceiveSkill(character)).toBe(true);
  });

  it('should return true if character has 3 skills', () => {
    const character = createTestCharacter('player-1', 'Warrior', [
      'strike',
      'heavy-strike',
      'bash',
    ]);
    
    expect(canReceiveSkill(character)).toBe(true);
  });
});

describe('SkillLoadoutManager - Integration Flow', () => {
  it('should handle complete distribute-unequip cycle', () => {
    const character = createTestCharacter('player-1', 'Warrior', ['strike']);
    let runState = createTestRunState([character], ['heavy-strike', 'fireball']);

    // Distribute heavy-strike
    runState = distributeSkill(runState, 'heavy-strike', 'player-1');
    expect(runState.skillPool).toEqual(['fireball']);
    expect(runState.playerParty[0]!.skills.length).toBe(2);

    // Unequip heavy-strike back to pool
    runState = unequipSkill(runState, 'heavy-strike', 'player-1');
    expect(runState.skillPool).toContain('heavy-strike');
    expect(runState.playerParty[0]!.skills.length).toBe(1);
  });

  it('should demonstrate full skill management workflow', () => {
    const warrior = createTestCharacter('player-1', 'Warrior', ['strike']);
    const mage = createTestCharacter('player-2', 'Mage', ['fireball']);
    
    let runState = createTestRunState(
      [warrior, mage],
      ['heavy-strike', 'heal', 'shield']
    );

    // Distribute heavy-strike to warrior
    runState = distributeSkill(runState, 'heavy-strike', 'player-1');
    
    // Distribute heal to mage
    runState = distributeSkill(runState, 'heal', 'player-2');
    
    // Pool should only have shield left
    expect(runState.skillPool).toEqual(['shield']);
    
    // Warriors has 2 skills
    expect(runState.playerParty[0]!.skills.length).toBe(2);
    
    // Mage has 2 skills
    expect(runState.playerParty[1]!.skills.length).toBe(2);
    
    // Unequip heal from mage
    runState = unequipSkill(runState, 'heal', 'player-2');
    
    // Pool should have shield and heal
    expect(runState.skillPool.sort()).toEqual(['heal', 'shield']);
    
    // Mage back to 1 skill
    expect(runState.playerParty[1]!.skills.length).toBe(1);
  });
});
