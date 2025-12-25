/**
 * Tests for ViewModelFactory
 * 
 * Critical path: Verify transformation logic from domain → view models
 */

import { describe, it, expect } from 'vitest';
import { ViewModelFactory } from '../../src/ui/view-model-factory.js';
import { SkillLibrary } from '../../src/engine/skill-library.js';
import type { Character } from '../../src/types/character.js';
import type { CombatState } from '../../src/types/combat.js';

describe('ViewModelFactory', () => {
  describe('createCharacterViewModel', () => {
    it('should include all 12 skills even when character has only 3 equipped', () => {
      // Given: Character with only 3 skills
      const character: Character = {
        id: 'hero',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [
          SkillLibrary.getSkill('strike'),
          SkillLibrary.getSkill('heal'),
          SkillLibrary.getSkill('defend'),
        ],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      // When: Transform to view model
      const viewModel = ViewModelFactory.createCharacterViewModel(character);

      // Then: View model should have all 12 skills from library
      expect(viewModel.skills).toHaveLength(12);
      
      // Verify it's the full library
      const allSkills = SkillLibrary.getAllSkills();
      expect(viewModel.skills).toHaveLength(allSkills.length);
      
      // Verify all skill IDs match
      const viewModelSkillIds = viewModel.skills.map(s => s.id).sort();
      const librarySkillIds = allSkills.map(s => s.id).sort();
      expect(viewModelSkillIds).toEqual(librarySkillIds);
    });

    it('should return same color for same character ID on multiple calls', () => {
      // Given: Same character
      const character: Character = {
        id: 'hero',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      // When: Create view model multiple times
      const viewModel1 = ViewModelFactory.createCharacterViewModel(character);
      const viewModel2 = ViewModelFactory.createCharacterViewModel(character);
      const viewModel3 = ViewModelFactory.createCharacterViewModel(character);

      // Then: Color should be consistent
      expect(viewModel1.color).toBe(viewModel2.color);
      expect(viewModel2.color).toBe(viewModel3.color);
      
      // Color should be a valid hex color
      expect(viewModel1.color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should calculate HP percentage correctly', () => {
      // Given: Character with 25/100 HP
      const character: Character = {
        id: 'hero',
        name: 'Hero',
        maxHp: 100,
        currentHp: 25,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      // When: Transform to view model
      const viewModel = ViewModelFactory.createCharacterViewModel(character);

      // Then: HP percent should be 25
      expect(viewModel.hpPercent).toBe(25);
    });

    it('should handle HP percentage edge cases', () => {
      // Test 0 HP
      const knocked: Character = {
        id: 'hero',
        name: 'Hero',
        maxHp: 100,
        currentHp: 0,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };
      const knockedVM = ViewModelFactory.createCharacterViewModel(knocked);
      expect(knockedVM.hpPercent).toBe(0);
      expect(knockedVM.isKO).toBe(true);

      // Test full HP
      const full: Character = {
        id: 'hero',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };
      const fullVM = ViewModelFactory.createCharacterViewModel(full);
      expect(fullVM.hpPercent).toBe(100);
      expect(fullVM.isKO).toBe(false);

      // Test HP > maxHp (edge case)
      const overheal: Character = {
        id: 'hero',
        name: 'Hero',
        maxHp: 100,
        currentHp: 120,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };
      const overhealVM = ViewModelFactory.createCharacterViewModel(overheal);
      expect(overhealVM.hpPercent).toBe(120);
    });

    it('should include formatted name with color styling', () => {
      // Given: Character
      const character: Character = {
        id: 'hero',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      // When: Transform to view model
      const viewModel = ViewModelFactory.createCharacterViewModel(character);

      // Then: formattedName should contain HTML with color
      expect(viewModel.formattedName).toContain('<span');
      expect(viewModel.formattedName).toContain('style="color:');
      expect(viewModel.formattedName).toContain('Hero');
      expect(viewModel.formattedName).toContain('</span>');
    });
  });

  describe('createBattleViewModel', () => {
    it('should include all characters in allCharacters array', () => {
      // Given: Combat state with 2 players and 2 enemies
      const state: CombatState = {
        tickNumber: 0,
        battleStatus: 'ongoing',
        actionQueue: [],
        eventLog: [],
        players: [
          {
            id: 'hero',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
          {
            id: 'mage',
            name: 'Mage',
            maxHp: 80,
            currentHp: 80,
            skills: [],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'goblin',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
          {
            id: 'orc',
            name: 'Orc',
            maxHp: 70,
            currentHp: 70,
            skills: [],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
      };

      // When: Create battle view model
      const viewModel = ViewModelFactory.createBattleViewModel(state);

      // Then: All characters should be in respective arrays
      expect(viewModel.players).toHaveLength(2);
      expect(viewModel.enemies).toHaveLength(2);
      expect(viewModel.allCharacters).toHaveLength(4);

      // Verify IDs
      const allIds = viewModel.allCharacters.map(c => c.id).sort();
      expect(allIds).toEqual(['goblin', 'hero', 'mage', 'orc']);
    });

    it('should build character color map with all characters', () => {
      // Given: Combat state
      const state: CombatState = {
        tickNumber: 0,
        battleStatus: 'ongoing',
        actionQueue: [],
        eventLog: [],
        players: [
          {
            id: 'hero',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'goblin',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
      };

      // When: Create battle view model
      const viewModel = ViewModelFactory.createBattleViewModel(state);

      // Then: Color map should contain both characters
      expect(viewModel.characterColorMap.size).toBe(2);
      expect(viewModel.characterColorMap.has('hero')).toBe(true);
      expect(viewModel.characterColorMap.has('goblin')).toBe(true);

      // Colors should match character view models
      const heroVM = viewModel.players.find(p => p.id === 'hero');
      const goblinVM = viewModel.enemies.find(e => e.id === 'goblin');
      expect(viewModel.characterColorMap.get('hero')).toBe(heroVM?.color);
      expect(viewModel.characterColorMap.get('goblin')).toBe(goblinVM?.color);
    });

    it('should preserve combat state data', () => {
      // Given: Combat state with specific values
      const state: CombatState = {
        tickNumber: 42,
        battleStatus: 'victory',
        actionQueue: [],
        eventLog: [],
        players: [],
        enemies: [],
      };

      // When: Create battle view model
      const viewModel = ViewModelFactory.createBattleViewModel(state);

      // Then: View model should preserve state values
      expect(viewModel.tick).toBe(42);
      expect(viewModel.battleStatus).toBe('victory');
    });
  });

  describe('createSkillViewModel', () => {
    it('should format duration text correctly', () => {
      // Given: Skills with different durations
      const strike = SkillLibrary.getSkill('strike'); // 2 ticks
      const defend = SkillLibrary.getSkill('defend'); // 1 tick

      // When: Create skill view models
      const strikeVM = ViewModelFactory.createSkillViewModel(strike);
      const defendVM = ViewModelFactory.createSkillViewModel(defend);

      // Then: Duration should be formatted
      expect(strikeVM.formattedDuration).toBe('2 ticks');
      expect(defendVM.formattedDuration).toBe('1 tick'); // Singular
    });

    it('should assign colors based on skill effect type', () => {
      // Given: Skills with different effect types
      const strike = SkillLibrary.getSkill('strike'); // damage
      const heal = SkillLibrary.getSkill('heal'); // heal
      const shield = SkillLibrary.getSkill('shield'); // shield

      // When: Create skill view models
      const strikeVM = ViewModelFactory.createSkillViewModel(strike);
      const healVM = ViewModelFactory.createSkillViewModel(heal);
      const shieldVM = ViewModelFactory.createSkillViewModel(shield);

      // Then: Each should have a valid color
      expect(strikeVM.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(healVM.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(shieldVM.color).toMatch(/^#[0-9a-f]{6}$/i);

      // Colors should differ based on effect type
      expect(strikeVM.color).not.toBe(healVM.color);
      expect(healVM.color).not.toBe(shieldVM.color);
    });
    it('should populate effectsSummary with formatted effects', () => {
      // Given: Skills with different effect types
      const strike = SkillLibrary.getSkill('strike'); // damage
      const heal = SkillLibrary.getSkill('heal'); // heal
      const poison = SkillLibrary.getSkill('poison'); // status

      // When: Create skill view models
      const strikeVM = ViewModelFactory.createSkillViewModel(strike);
      const healVM = ViewModelFactory.createSkillViewModel(heal);
      const poisonVM = ViewModelFactory.createSkillViewModel(poison);

      // Then: Effects should be formatted
      expect(strikeVM.effectsSummary).toBe('Deals 15 damage');
      expect(healVM.effectsSummary).toBe('Heals 30 HP');
      expect(poisonVM.effectsSummary).toContain('Applies Poisoned for');
    });
    
    it('should populate targetingDescription with human-readable text', () => {
      // Given: Skills with different targeting modes
      const strike = SkillLibrary.getSkill('strike'); // single-enemy-lowest-hp
      const heal = SkillLibrary.getSkill('heal'); // ally-lowest-hp-damaged
      const defend = SkillLibrary.getSkill('defend'); // self

      // When: Create skill view models
      const strikeVM = ViewModelFactory.createSkillViewModel(strike);
      const healVM = ViewModelFactory.createSkillViewModel(heal);
      const defendVM = ViewModelFactory.createSkillViewModel(defend);

      // Then: Targeting should be described
      expect(strikeVM.targetingDescription).toBe('Targets lowest HP enemy');
      expect(healVM.targetingDescription).toBe('Targets lowest HP damaged ally');
      expect(defendVM.targetingDescription).toBe('Targets self');
    });
  });
  
  describe('effect formatting', () => {
    it('should format damage effects', () => {
      // Given: Damage skill
      const strike = SkillLibrary.getSkill('strike');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(strike);
      
      // Then: Effect should be formatted
      expect(viewModel.effectsSummary).toBe('Deals 15 damage');
    });
    
    it('should format heal effects', () => {
      // Given: Heal skill
      const heal = SkillLibrary.getSkill('heal');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(heal);
      
      // Then: Effect should be formatted
      expect(viewModel.effectsSummary).toBe('Heals 30 HP');
    });
    
    it('should format shield effects', () => {
      // Given: Shield skill
      const shield = SkillLibrary.getSkill('shield');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(shield);
      
      // Then: Effect should be formatted (shield grants 30)
      expect(viewModel.effectsSummary).toBe('Grants 30 Shield');
    });
    
    it('should format status effects with duration', () => {
      // Given: Status effect skill
      const poison = SkillLibrary.getSkill('poison');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(poison);
      
      // Then: Effect should include status type and duration
      expect(viewModel.effectsSummary).toContain('Applies Poisoned for');
      expect(viewModel.effectsSummary).toContain('ticks');
    });
    
    it('should include status effect descriptions (Phase 2)', () => {
      // Given: Taunting status skill
      const taunt = SkillLibrary.getSkill('taunt');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(taunt);
      
      // Then: Effect should include description
      expect(viewModel.effectsSummary).toContain('Applies Taunting for');
      expect(viewModel.effectsSummary).toContain('ticks');
      expect(viewModel.effectsSummary).toContain('→ Forces enemies to target this character');
    });
    
    it('should format poisoned status with description', () => {
      // Given: Poison skill
      const poison = SkillLibrary.getSkill('poison');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(poison);
      
      // Then: Effect should include description
      expect(viewModel.effectsSummary).toContain('Applies Poisoned for');
      expect(viewModel.effectsSummary).toContain('→ Deals damage over time');
    });
    
    it('should format stunned status with description', () => {
      // Given: Bash skill (applies stunned status)
      const bash = SkillLibrary.getSkill('bash');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(bash);
      
      // Then: Effect should include description
      expect(viewModel.effectsSummary).toContain('Applies Stunned for');
      expect(viewModel.effectsSummary).toContain('→ Prevents action queueing');
    });
    
    it('should format shielded status with description', () => {
      // Given: Shield skill (applies shielded status)
      const shield = SkillLibrary.getSkill('shield');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(shield);
      
      // Then: Should contain shield grant (not status effect for this skill)
      // Shield skill grants shield points, not shielded status
      expect(viewModel.effectsSummary).toBe('Grants 30 Shield');
    });
    
    it('should format defending status with description', () => {
      // Given: Defend skill
      const defend = SkillLibrary.getSkill('defend');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(defend);
      
      // Then: Effect should include description
      expect(viewModel.effectsSummary).toContain('Applies Defending for');
      expect(viewModel.effectsSummary).toContain('→ Reduces incoming damage by 50%');
    });
    
    
    it('should format revive effects', () => {
      // Given: Revive skill
      const revive = SkillLibrary.getSkill('revive');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(revive);
      
      // Then: Effect should be formatted (revive gives 40% HP)
      expect(viewModel.effectsSummary).toBe('Revives with 40% HP');
    });
    
    it('should format cancel effects', () => {
      // Given: Cancel skill (interrupt has damage + cancel)
      const interrupt = SkillLibrary.getSkill('interrupt');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(interrupt);
      
      // Then: Effect should be formatted (interrupt has both damage and cancel)
      expect(viewModel.effectsSummary).toContain("Interrupts target's action");
      expect(viewModel.effectsSummary).toContain('Deals');
    });
    
    it('should format multi-effect skills with comma separation', () => {
      // Given: Multi-effect skill (interrupt has damage + cancel)
      const interrupt = SkillLibrary.getSkill('interrupt');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(interrupt);
      
      // Then: Effects should be comma-separated
      expect(viewModel.effectsSummary).toContain(',');
      expect(viewModel.effectsSummary).toContain('Deals');
      expect(viewModel.effectsSummary).toContain('Interrupts');
    });
  });
  
  describe('targeting descriptions', () => {
    it('should describe self targeting', () => {
      // Given: Self-targeting skill
      const defend = SkillLibrary.getSkill('defend');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(defend);
      
      // Then: Targeting should be described
      expect(viewModel.targetingDescription).toBe('Targets self');
    });
    
    it('should describe single-enemy-lowest-hp targeting', () => {
      // Given: Single enemy lowest HP skill
      const strike = SkillLibrary.getSkill('strike');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(strike);
      
      // Then: Targeting should be described
      expect(viewModel.targetingDescription).toBe('Targets lowest HP enemy');
    });
    
    it('should describe single-enemy-highest-hp targeting', () => {
      // Given: Single enemy highest HP skill (interrupt uses this)
      const interrupt = SkillLibrary.getSkill('interrupt');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(interrupt);
      
      // Then: Targeting should be described
      expect(viewModel.targetingDescription).toBe('Targets highest HP enemy');
    });
    
    it('should describe all-enemies targeting', () => {
      // Given: AOE damage skill (fireball)
      const fireball = SkillLibrary.getSkill('fireball');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(fireball);
      
      // Then: Targeting should be described
      expect(viewModel.targetingDescription).toBe('Targets all enemies');
    });
    
    it('should describe ally-lowest-hp targeting', () => {
      // Given: Ally heal skill
      const shield = SkillLibrary.getSkill('shield');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(shield);
      
      // Then: Targeting should be described
      expect(viewModel.targetingDescription).toBe('Targets lowest HP ally (including self)');
    });
    
    it('should describe ally-lowest-hp-damaged targeting', () => {
      // Given: Damaged ally heal skill
      const heal = SkillLibrary.getSkill('heal');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(heal);
      
      // Then: Targeting should be described
      expect(viewModel.targetingDescription).toBe('Targets lowest HP damaged ally');
    });
    
    it('should describe ally-dead targeting', () => {
      // Given: Revive skill
      const revive = SkillLibrary.getSkill('revive');
      
      // When: Create view model
      const viewModel = ViewModelFactory.createSkillViewModel(revive);
      
      // Then: Targeting should be described
      expect(viewModel.targetingDescription).toBe('Targets dead ally');
    });
  });

  describe('createStatusEffectViewModel', () => {
    it('should format status effect duration', () => {
      // Given: Status effect
      const status = {
        type: 'poisoned' as const,
        duration: 3,
        value: 5,
      };

      // When: Create status effect view model
      const viewModel = ViewModelFactory.createStatusEffectViewModel(status);

      // Then: Duration should be formatted
      expect(viewModel.formattedDuration).toBe('3 ticks');
      expect(viewModel.formattedValue).toBe('5');
    });
  });

  describe('createActionViewModel', () => {
    it('should include skill name and formatted countdown', () => {
      // Given: Action
      const action = {
        skillId: 'strike',
        casterId: 'hero',
        targets: ['goblin'],
        ticksRemaining: 2,
      };

      // When: Create action view model
      const viewModel = ViewModelFactory.createActionViewModel(action);

      // Then: Should have skill name and formatted countdown
      expect(viewModel.skillName).toBe('Strike');
      expect(viewModel.formattedCountdown).toBe('resolves in 2 ticks');
    });
  });
});
