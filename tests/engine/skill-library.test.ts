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

    it('should target single enemy with lowest HP', () => {
      strike = SkillLibrary.getSkill('strike');
      expect(strike.targeting).toBe('single-enemy-lowest-hp');
    });
  });

  describe('Heavy Strike', () => {
    let heavyStrike: Skill;

    it('should exist in skill library', () => {
      heavyStrike = SkillLibrary.getSkill('heavy-strike');
      expect(heavyStrike).toBeDefined();
      expect(heavyStrike.name).toBe('Heavy Strike');
    });

    it('should deal 35 damage to single enemy', () => {
      heavyStrike = SkillLibrary.getSkill('heavy-strike');
      expect(heavyStrike.effects).toHaveLength(1);
      expect(heavyStrike.effects[0]!.type).toBe('damage');
      expect(heavyStrike.effects[0]!.value).toBe(35);
    });

    it('should have 4 tick duration (channeling)', () => {
      heavyStrike = SkillLibrary.getSkill('heavy-strike');
      expect(heavyStrike.baseDuration).toBe(4);
    });

    it('should target single enemy with lowest HP', () => {
      heavyStrike = SkillLibrary.getSkill('heavy-strike');
      expect(heavyStrike.targeting).toBe('single-enemy-lowest-hp');
    });
  });

  describe('Fireball', () => {
    let fireball: Skill;

    it('should exist in skill library', () => {
      fireball = SkillLibrary.getSkill('fireball');
      expect(fireball).toBeDefined();
      expect(fireball.name).toBe('Fireball');
    });

    it('should deal 20 damage to each enemy', () => {
      fireball = SkillLibrary.getSkill('fireball');
      expect(fireball.effects).toHaveLength(1);
      expect(fireball.effects[0]!.type).toBe('damage');
      expect(fireball.effects[0]!.value).toBe(20);
    });

    it('should have 4 tick duration (channeling)', () => {
      fireball = SkillLibrary.getSkill('fireball');
      expect(fireball.baseDuration).toBe(4);
    });

    it('should target all enemies', () => {
      fireball = SkillLibrary.getSkill('fireball');
      expect(fireball.targeting).toBe('all-enemies');
    });
  });

  describe('Execute', () => {
    let execute: Skill;

    it('should exist in skill library', () => {
      execute = SkillLibrary.getSkill('execute');
      expect(execute).toBeDefined();
      expect(execute.name).toBe('Execute');
    });

    it('should deal 50 damage to single enemy', () => {
      execute = SkillLibrary.getSkill('execute');
      expect(execute.effects).toHaveLength(1);
      expect(execute.effects[0]!.type).toBe('damage');
      expect(execute.effects[0]!.value).toBe(50);
    });

    it('should have 3 tick duration', () => {
      execute = SkillLibrary.getSkill('execute');
      expect(execute.baseDuration).toBe(3);
    });

    it('should target single enemy with lowest HP', () => {
      execute = SkillLibrary.getSkill('execute');
      expect(execute.targeting).toBe('single-enemy-lowest-hp');
    });

    it('should have rule requiring target below 25% HP', () => {
      execute = SkillLibrary.getSkill('execute');
      expect(execute.rules).toBeDefined();
      expect(execute.rules!.length).toBeGreaterThan(0);
      
      // Check for hp-below condition
      const rule = execute.rules![0]!;
      expect(rule.conditions).toBeDefined();
      const hpCondition = rule.conditions.find(c => c.type === 'hp-below');
      expect(hpCondition).toBeDefined();
      expect(hpCondition!.threshold).toBe(25);
    });
  });

  describe('Poison', () => {
    let poison: Skill;

    it('should exist in skill library', () => {
      poison = SkillLibrary.getSkill('poison');
      expect(poison).toBeDefined();
      expect(poison.name).toBe('Poison');
    });

    it('should apply poisoned status for 6 ticks', () => {
      poison = SkillLibrary.getSkill('poison');
      expect(poison.effects).toHaveLength(1);
      expect(poison.effects[0]!.type).toBe('status');
      expect(poison.effects[0]!.statusType).toBe('poisoned');
      expect(poison.effects[0]!.duration).toBe(6);
    });

    it('should have 2 tick duration', () => {
      poison = SkillLibrary.getSkill('poison');
      expect(poison.baseDuration).toBe(2);
    });

    it('should target single enemy with lowest HP', () => {
      poison = SkillLibrary.getSkill('poison');
      expect(poison.targeting).toBe('single-enemy-lowest-hp');
    });
  });

  describe('Heal', () => {
    let heal: Skill;

    it('should exist in skill library', () => {
      heal = SkillLibrary.getSkill('heal');
      expect(heal).toBeDefined();
      expect(heal.name).toBe('Heal');
    });

    it('should restore 30 HP', () => {
      heal = SkillLibrary.getSkill('heal');
      expect(heal.effects).toHaveLength(1);
      expect(heal.effects[0]!.type).toBe('heal');
      expect(heal.effects[0]!.value).toBe(30);
    });

    it('should have 3 tick duration', () => {
      heal = SkillLibrary.getSkill('heal');
      expect(heal.baseDuration).toBe(3);
    });

    it('should target ally with lowest HP (damaged only)', () => {
      heal = SkillLibrary.getSkill('heal');
      expect(heal.targeting).toBe('ally-lowest-hp-damaged');
    });

    it('should be capped at max HP (tested in ActionResolver)', () => {
      // Edge case: Healing capped at max HP is validated in ActionResolver tests
      // This test documents the expected behavior
      heal = SkillLibrary.getSkill('heal');
      expect(heal.effects[0]!.type).toBe('heal');
      // Actual capping logic is implementation concern, not skill definition
    });
  });

  describe('Shield', () => {
    let shield: Skill;

    it('should exist in skill library', () => {
      shield = SkillLibrary.getSkill('shield');
      expect(shield).toBeDefined();
      expect(shield.name).toBe('Shield');
    });

    it('should apply shielded status with 30 absorb', () => {
      shield = SkillLibrary.getSkill('shield');
      expect(shield.effects).toHaveLength(1);
      expect(shield.effects[0]!.type).toBe('shield');
      expect(shield.effects[0]!.value).toBe(30);
    });

    it('should have 2 tick duration', () => {
      shield = SkillLibrary.getSkill('shield');
      expect(shield.baseDuration).toBe(2);
    });

    it('should target ally with lowest HP', () => {
      shield = SkillLibrary.getSkill('shield');
      expect(shield.targeting).toBe('ally-lowest-hp');
    });

    it('should not stack (replacement tested in ActionResolver)', () => {
      // Edge case: Shield replacement logic is in ActionResolver
      // This test documents the expected behavior
      shield = SkillLibrary.getSkill('shield');
      expect(shield.effects[0]!.type).toBe('shield');
      // Actual replacement logic is implementation concern
    });
  });

  describe('Defend', () => {
    let defend: Skill;

    it('should exist in skill library', () => {
      defend = SkillLibrary.getSkill('defend');
      expect(defend).toBeDefined();
      expect(defend.name).toBe('Defend');
    });

    it('should apply defending status for 3 ticks', () => {
      defend = SkillLibrary.getSkill('defend');
      expect(defend.effects).toHaveLength(1);
      expect(defend.effects[0]!.type).toBe('status');
      expect(defend.effects[0]!.statusType).toBe('defending');
      expect(defend.effects[0]!.duration).toBe(3);
    });

    it('should have 1 tick duration', () => {
      defend = SkillLibrary.getSkill('defend');
      expect(defend.baseDuration).toBe(1);
    });

    it('should target self', () => {
      defend = SkillLibrary.getSkill('defend');
      expect(defend.targeting).toBe('self');
    });
  });

  describe('Revive', () => {
    let revive: Skill;

    it('should exist in skill library', () => {
      revive = SkillLibrary.getSkill('revive');
      expect(revive).toBeDefined();
      expect(revive.name).toBe('Revive');
    });

    it('should restore 40 HP to knocked out ally', () => {
      revive = SkillLibrary.getSkill('revive');
      expect(revive.effects).toHaveLength(1);
      expect(revive.effects[0]!.type).toBe('revive');
      expect(revive.effects[0]!.value).toBe(40);
    });

    it('should have 4 tick duration (channeling)', () => {
      revive = SkillLibrary.getSkill('revive');
      expect(revive.baseDuration).toBe(4);
    });

    it('should target dead ally', () => {
      revive = SkillLibrary.getSkill('revive');
      expect(revive.targeting).toBe('ally-dead');
    });

    it('should only work on knocked out targets (0 HP)', () => {
      // Edge case: Targeting 'ally-dead' ensures only KO targets selected
      // Actual validation is in TargetSelector
      revive = SkillLibrary.getSkill('revive');
      expect(revive.targeting).toBe('ally-dead');
    });
  });

  describe('Taunt', () => {
    let taunt: Skill;

    it('should exist in skill library', () => {
      taunt = SkillLibrary.getSkill('taunt');
      expect(taunt).toBeDefined();
      expect(taunt.name).toBe('Taunt');
    });

    it('should apply taunting status for 4 ticks', () => {
      taunt = SkillLibrary.getSkill('taunt');
      expect(taunt.effects).toHaveLength(1);
      expect(taunt.effects[0]!.type).toBe('status');
      expect(taunt.effects[0]!.statusType).toBe('taunting');
      expect(taunt.effects[0]!.duration).toBe(4);
    });

    it('should have 2 tick duration', () => {
      taunt = SkillLibrary.getSkill('taunt');
      expect(taunt.baseDuration).toBe(2);
    });

    it('should target self', () => {
      taunt = SkillLibrary.getSkill('taunt');
      expect(taunt.targeting).toBe('self');
    });
  });

  describe('Bash', () => {
    let bash: Skill;

    it('should exist in skill library', () => {
      bash = SkillLibrary.getSkill('bash');
      expect(bash).toBeDefined();
      expect(bash.name).toBe('Bash');
    });

    it('should deal 10 damage and apply stunned for 2 ticks', () => {
      bash = SkillLibrary.getSkill('bash');
      expect(bash.effects).toHaveLength(2);
      
      // Check for damage effect
      const damageEffect = bash.effects.find(e => e.type === 'damage');
      expect(damageEffect).toBeDefined();
      expect(damageEffect!.value).toBe(10);
      
      // Check for stunned status effect
      const statusEffect = bash.effects.find(e => e.type === 'status');
      expect(statusEffect).toBeDefined();
      expect(statusEffect!.statusType).toBe('stunned');
      expect(statusEffect!.duration).toBe(2);
    });

    it('should have 3 tick duration', () => {
      bash = SkillLibrary.getSkill('bash');
      expect(bash.baseDuration).toBe(3);
    });

    it('should target single enemy with lowest HP', () => {
      bash = SkillLibrary.getSkill('bash');
      expect(bash.targeting).toBe('single-enemy-lowest-hp');
    });
  });

  describe('Interrupt', () => {
    let interrupt: Skill;

    it('should exist in skill library', () => {
      interrupt = SkillLibrary.getSkill('interrupt');
      expect(interrupt).toBeDefined();
      expect(interrupt.name).toBe('Interrupt');
    });

    it('should deal 5 damage and cancel target action', () => {
      interrupt = SkillLibrary.getSkill('interrupt');
      expect(interrupt.effects.length).toBeGreaterThanOrEqual(2);
      
      // Check for damage effect
      const damageEffect = interrupt.effects.find(e => e.type === 'damage');
      expect(damageEffect).toBeDefined();
      expect(damageEffect!.value).toBe(5);
      
      // Check for cancel effect
      const cancelEffect = interrupt.effects.find(e => e.type === 'cancel');
      expect(cancelEffect).toBeDefined();
    });

    it('should have 1 tick duration', () => {
      interrupt = SkillLibrary.getSkill('interrupt');
      expect(interrupt.baseDuration).toBe(1);
    });

    it('should target single enemy with highest HP', () => {
      interrupt = SkillLibrary.getSkill('interrupt');
      expect(interrupt.targeting).toBe('single-enemy-highest-hp');
    });

    it('should only cancel if target is channeling', () => {
      // Edge case: Cancel effect only works if target has queued action
      // Actual validation is in ActionResolver
      interrupt = SkillLibrary.getSkill('interrupt');
      const cancelEffect = interrupt.effects.find(e => e.type === 'cancel');
      expect(cancelEffect).toBeDefined();
      // Conditional cancel logic is implementation concern
    });
  });

  describe('SkillLibrary API', () => {
    it('should return all 12 skills', () => {
      const allSkills = SkillLibrary.getAllSkills();
      expect(allSkills).toHaveLength(12);
    });

    it('should have unique skill IDs', () => {
      const allSkills = SkillLibrary.getAllSkills();
      const ids = allSkills.map((s: Skill) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(12);
    });

    it('should throw error for non-existent skill', () => {
      expect(() => SkillLibrary.getSkill('non-existent')).toThrow();
    });
  });
});
