import { describe, it, expect } from 'vitest';
import type { Skill } from '../../src/types/skill.js';
import { SkillLibrary } from '../../src/engine/skill-library.js';

describe('SkillLibrary', () => {
  describe('Strike', () => {
    let strike: Skill;

    it('should exist in skill library', () => {
      strike = SkillLibrary.getSkill('strike');
      expect(strike).toBeDefined();
      expect(strike.name).toBe('Strike');
    });

    it('should deal 15 damage to single enemy', () => {
      strike = SkillLibrary.getSkill('strike');
      expect(strike.effects).toHaveLength(1);
      expect(strike.effects[0]!.type).toBe('damage');
      expect(strike.effects[0]!.value).toBe(15);
    });

    it('should have 2 tick duration', () => {
      strike = SkillLibrary.getSkill('strike');
      expect(strike.baseDuration).toBe(2);
    });

    it('should target nearest enemy', () => {
      strike = SkillLibrary.getSkill('strike');
      expect(strike.targeting).toBe('nearest-enemy');
    });
  });

  describe('SkillLibrary API', () => {
    it('should return all skills', () => {
      const allSkills = SkillLibrary.getAllSkills();
      expect(allSkills).toHaveLength(1);
    });

    it('should have unique skill IDs', () => {
      const allSkills = SkillLibrary.getAllSkills();
      const ids = allSkills.map((s: Skill) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(1);
    });

    it('should throw error for non-existent skill', () => {
      expect(() => SkillLibrary.getSkill('non-existent')).toThrow();
    });
  });
});
