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
