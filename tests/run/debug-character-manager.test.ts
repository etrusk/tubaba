import { describe, it, expect } from 'vitest';
import {
  debugDistributeSkill,
  debugUnequipSkill,
  debugAddCharacter,
  debugRemoveCharacter,
} from '../../src/run/debug-character-manager.js';
import type { DebugBattleState } from '../../src/types/debug.js';
import type { Character } from '../../src/types/character.js';
import { SkillLibrary } from '../../src/engine/skill-library.js';

describe('Debug Character Manager', () => {
  const createTestCharacter = (id: string, isPlayer: boolean, skillIds: string[] = []): Character => {
    const strike = SkillLibrary.getSkill('strike');
    const defend = SkillLibrary.getSkill('defend');
    const additionalSkills = skillIds.map(id => SkillLibrary.getSkill(id));

    return {
      id,
      name: isPlayer ? `Player ${id}` : `Enemy ${id}`,
      maxHp: 100,
      currentHp: 100,
      skills: [strike, defend, ...additionalSkills],
      statusEffects: [],
      currentAction: null,
      isPlayer,
    };
  };

  const createTestState = (): DebugBattleState => ({
    characters: [
      createTestCharacter('player1', true),
      createTestCharacter('enemy1', false),
    ],
    skillPool: ['heal', 'shield', 'poison'],
  });

  describe('debugDistributeSkill', () => {
    it('should distribute skill to player character', () => {
      const state = createTestState();
      const result = debugDistributeSkill(state, 'heal', 'player1');

      expect(result.skillPool).toEqual(['shield', 'poison']);
      expect(result.characters[0]!.skills.map(s => s.id)).toContain('heal');
      expect(result.characters[0]!.isPlayer).toBe(true);
    });

    it('should distribute skill to enemy character', () => {
      const state = createTestState();
      const result = debugDistributeSkill(state, 'heal', 'enemy1');

      expect(result.skillPool).toEqual(['shield', 'poison']);
      expect(result.characters[1]!.skills.map(s => s.id)).toContain('heal');
      expect(result.characters[1]!.isPlayer).toBe(false);
    });

    it('should throw if skill not in pool', () => {
      const state = createTestState();
      expect(() => debugDistributeSkill(state, 'unknown', 'player1')).toThrow('not found in skill pool');
    });

    it('should throw if character not found', () => {
      const state = createTestState();
      expect(() => debugDistributeSkill(state, 'heal', 'unknown')).toThrow('not found');
    });

    it('should throw if character already has skill', () => {
      const state = createTestState();
      const stateWithSkill = debugDistributeSkill(state, 'heal', 'player1');
      // Add heal back to pool to test duplicate skill check (not pool availability check)
      const stateWithHealInPool = { ...stateWithSkill, skillPool: [...stateWithSkill.skillPool, 'heal'] };
      expect(() => debugDistributeSkill(stateWithHealInPool, 'heal', 'player1')).toThrow('already has skill');
    });

    it('should throw if character at 4-skill cap (excluding innate)', () => {
      const state = createTestState();
      // Add 4 skills (strike and defend are innate, plus 4 more = 6 total)
      let stateWithSkills = debugDistributeSkill(state, 'heal', 'player1');
      stateWithSkills = debugDistributeSkill(stateWithSkills, 'shield', 'player1');
      stateWithSkills = debugDistributeSkill(stateWithSkills, 'poison', 'player1');
      
      // Add one more skill to pool for the 4th slot
      stateWithSkills = { ...stateWithSkills, skillPool: ['fireball'] };
      stateWithSkills = debugDistributeSkill(stateWithSkills, 'fireball', 'player1');
      
      // Now character has 6 skills total (2 innate + 4 equipped)
      // Adding a 5th should fail
      stateWithSkills = { ...stateWithSkills, skillPool: ['lightning'] };
      expect(() => debugDistributeSkill(stateWithSkills, 'lightning', 'player1')).toThrow('already has 4 skills');
    });
  });

  describe('debugUnequipSkill', () => {
    it('should unequip skill from player character', () => {
      const state = createTestState();
      const stateWithSkill = debugDistributeSkill(state, 'heal', 'player1');
      const result = debugUnequipSkill(stateWithSkill, 'heal', 'player1');

      expect(result.skillPool).toContain('heal');
      expect(result.characters[0]!.skills.map(s => s.id)).not.toContain('heal');
      expect(result.characters[0]!.isPlayer).toBe(true);
    });

    it('should unequip skill from enemy character', () => {
      const state = createTestState();
      const stateWithSkill = debugDistributeSkill(state, 'heal', 'enemy1');
      const result = debugUnequipSkill(stateWithSkill, 'heal', 'enemy1');

      expect(result.skillPool).toContain('heal');
      expect(result.characters[1]!.skills.map(s => s.id)).not.toContain('heal');
      expect(result.characters[1]!.isPlayer).toBe(false);
    });

    it('should throw if trying to unequip innate skill (strike)', () => {
      const state = createTestState();
      expect(() => debugUnequipSkill(state, 'strike', 'player1')).toThrow('innate skill');
    });

    it('should throw if trying to unequip innate skill (defend)', () => {
      const state = createTestState();
      expect(() => debugUnequipSkill(state, 'defend', 'enemy1')).toThrow('innate skill');
    });

    it('should throw if character not found', () => {
      const state = createTestState();
      expect(() => debugUnequipSkill(state, 'heal', 'unknown')).toThrow('not found');
    });

    it('should throw if character does not have skill', () => {
      const state = createTestState();
      expect(() => debugUnequipSkill(state, 'heal', 'player1')).toThrow('does not have skill');
    });
  });

  describe('debugAddCharacter', () => {
    it('should add new player character', () => {
      const state = createTestState();
      const newCharacter = createTestCharacter('player2', true);
      const result = debugAddCharacter(state, newCharacter);

      expect(result.characters).toHaveLength(3);
      expect(result.characters[2]!.id).toBe('player2');
      expect(result.characters[2]!.isPlayer).toBe(true);
    });

    it('should add new enemy character', () => {
      const state = createTestState();
      const newCharacter = createTestCharacter('enemy2', false);
      const result = debugAddCharacter(state, newCharacter);

      expect(result.characters).toHaveLength(3);
      expect(result.characters[2]!.id).toBe('enemy2');
      expect(result.characters[2]!.isPlayer).toBe(false);
    });

    it('should throw if character ID already exists', () => {
      const state = createTestState();
      const duplicateCharacter = createTestCharacter('player1', true);
      expect(() => debugAddCharacter(state, duplicateCharacter)).toThrow('already exists');
    });

    it('should preserve isPlayer flag when adding character', () => {
      const state = createTestState();
      const newEnemy = createTestCharacter('enemy2', false);
      const result = debugAddCharacter(state, newEnemy);

      expect(result.characters[2]!.isPlayer).toBe(false);
    });
  });

  describe('debugRemoveCharacter', () => {
    it('should remove player character and return skills to pool', () => {
      const state = createTestState();
      const stateWithSkills = debugDistributeSkill(state, 'heal', 'player1');
      const result = debugRemoveCharacter(stateWithSkills, 'player1');

      expect(result.characters).toHaveLength(1);
      expect(result.characters[0]!.id).toBe('enemy1');
      expect(result.skillPool).toContain('heal');
    });

    it('should remove enemy character and return skills to pool', () => {
      const state = createTestState();
      const stateWithSkills = debugDistributeSkill(state, 'shield', 'enemy1');
      const result = debugRemoveCharacter(stateWithSkills, 'enemy1');

      expect(result.characters).toHaveLength(1);
      expect(result.characters[0]!.id).toBe('player1');
      expect(result.skillPool).toContain('shield');
    });

    it('should return multiple skills to pool when removing character', () => {
      const state = createTestState();
      let stateWithSkills = debugDistributeSkill(state, 'heal', 'player1');
      stateWithSkills = debugDistributeSkill(stateWithSkills, 'shield', 'player1');
      const result = debugRemoveCharacter(stateWithSkills, 'player1');

      expect(result.skillPool).toContain('heal');
      expect(result.skillPool).toContain('shield');
      expect(result.skillPool).toContain('poison');
    });

    it('should not return innate skills to pool', () => {
      const state = createTestState();
      const result = debugRemoveCharacter(state, 'player1');

      expect(result.skillPool).not.toContain('strike');
      expect(result.skillPool).not.toContain('defend');
      expect(result.skillPool).toEqual(['heal', 'shield', 'poison']);
    });

    it('should throw if character not found', () => {
      const state = createTestState();
      expect(() => debugRemoveCharacter(state, 'unknown')).toThrow('not found');
    });

    it('should allow removing last character', () => {
      const state: DebugBattleState = {
        characters: [createTestCharacter('solo', true)],
        skillPool: [],
      };
      const result = debugRemoveCharacter(state, 'solo');

      expect(result.characters).toHaveLength(0);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex skill distribution workflow', () => {
      let state = createTestState();

      // Distribute skills to both players and enemies
      state = debugDistributeSkill(state, 'heal', 'player1');
      state = debugDistributeSkill(state, 'shield', 'enemy1');

      expect(state.characters[0]!.skills.map(s => s.id)).toContain('heal');
      expect(state.characters[1]!.skills.map(s => s.id)).toContain('shield');
      expect(state.skillPool).toEqual(['poison']);

      // Unequip and redistribute
      state = debugUnequipSkill(state, 'heal', 'player1');
      state = debugDistributeSkill(state, 'heal', 'enemy1');

      expect(state.characters[0]!.skills.map(s => s.id)).not.toContain('heal');
      expect(state.characters[1]!.skills.map(s => s.id)).toContain('heal');
    });

    it('should handle add and remove character workflow', () => {
      let state = createTestState();

      // Add new character
      const newCharacter = createTestCharacter('player2', true);
      state = debugAddCharacter(state, newCharacter);
      expect(state.characters).toHaveLength(3);

      // Give them a skill
      state = debugDistributeSkill(state, 'heal', 'player2');
      expect(state.characters[2]!.skills.map(s => s.id)).toContain('heal');

      // Remove character - skill should return to pool
      state = debugRemoveCharacter(state, 'player2');
      expect(state.characters).toHaveLength(2);
      expect(state.skillPool).toContain('heal');
    });
  });
});
