/**
 * View Model Factory
 * 
 * Transforms domain objects into presentation-ready view models.
 * Single transformation point ensures consistent UI presentation.
 */

import type { Character } from '../types/character.js';
import type { CombatState, Action } from '../types/combat.js';
import type { Skill } from '../types/skill.js';
import type { StatusEffect } from '../types/status.js';
import type {
  BattleViewModel,
  CharacterViewModel,
  SkillViewModel,
  StatusEffectViewModel,
  ActionViewModel,
} from '../types/view-models.js';
import { formatCharacterName, getCharacterColor } from './character-name-formatter.js';
import { SkillLibrary } from '../engine/skill-library.js';

/**
 * Factory for creating view models from domain objects
 */
export class ViewModelFactory {
  /**
   * Transform entire combat state into a presentation-ready view model
   */
  static createBattleViewModel(state: CombatState): BattleViewModel {
    const players = state.players.map(char => this.createCharacterViewModel(char));
    const enemies = state.enemies.map(char => this.createCharacterViewModel(char));
    const allCharacters = [...players, ...enemies];
    
    // Build character color lookup map
    const characterColorMap = new Map<string, string>();
    for (const char of allCharacters) {
      characterColorMap.set(char.id, char.color);
    }
    
    const viewModel: BattleViewModel = {
      tick: state.tickNumber,
      battleStatus: state.battleStatus,
      players,
      enemies,
      allCharacters,
      characterColorMap,
    };
    
    return Object.freeze(viewModel) as BattleViewModel;
  }
  
  /**
   * Transform character into presentation-ready view model
   * Always includes full skill library (12 skills) regardless of character's equipped skills
   */
  static createCharacterViewModel(char: Character): CharacterViewModel {
    // Get full skill library for all characters
    const allSkills = SkillLibrary.getAllSkills();
    
    const viewModel: CharacterViewModel = {
      // Identity
      id: char.id,
      name: char.name,
      formattedName: formatCharacterName(char.name, char.id),
      color: getCharacterColor(char.id),
      
      // State
      currentHp: char.currentHp,
      maxHp: char.maxHp,
      hpPercent: char.maxHp > 0 ? Math.round((char.currentHp / char.maxHp) * 100) : 0,
      isKO: char.currentHp <= 0,
      isPlayer: char.isPlayer,
      
      // Skills (full library for all characters)
      skills: allSkills.map(skill => this.createSkillViewModel(skill)),
      
      // Status
      statusEffects: char.statusEffects.map(status => this.createStatusEffectViewModel(status)),
      
      // Action
      currentAction: char.currentAction ? this.createActionViewModel(char.currentAction) : null,
    };
    
    return Object.freeze(viewModel) as CharacterViewModel;
  }
  
  /**
   * Transform skill into presentation-ready view model
   */
  static createSkillViewModel(skill: Skill): SkillViewModel {
    const viewModel: SkillViewModel = {
      id: skill.id,
      name: skill.name,
      baseDuration: skill.baseDuration,
      formattedDuration: this.formatDuration(skill.baseDuration),
      color: this.getSkillColor(skill),
    };
    
    return Object.freeze(viewModel) as SkillViewModel;
  }
  
  /**
   * Transform status effect into presentation-ready view model
   */
  static createStatusEffectViewModel(status: StatusEffect): StatusEffectViewModel {
    const viewModel: StatusEffectViewModel = {
      type: status.type,
      duration: status.duration,
      formattedDuration: this.formatDuration(status.duration),
      value: status.value,
      formattedValue: status.value !== undefined ? String(status.value) : undefined,
    };
    
    return Object.freeze(viewModel) as StatusEffectViewModel;
  }
  
  /**
   * Transform action into presentation-ready view model
   */
  static createActionViewModel(action: Action): ActionViewModel {
    // Look up skill name
    const skill = SkillLibrary.getSkill(action.skillId);
    
    const viewModel: ActionViewModel = {
      skillId: action.skillId,
      skillName: skill.name,
      casterId: action.casterId,
      targets: action.targets,
      ticksRemaining: action.ticksRemaining,
      formattedCountdown: `resolves in ${this.formatDuration(action.ticksRemaining)}`,
    };
    
    return Object.freeze(viewModel) as ActionViewModel;
  }
  
  /**
   * Format duration as human-readable text
   */
  private static formatDuration(ticks: number): string {
    if (ticks === 1) {
      return '1 tick';
    }
    return `${ticks} ticks`;
  }
  
  /**
   * Get color for skill based on its type
   * Determined by primary effect type
   */
  private static getSkillColor(skill: Skill): string {
    // Check primary effect (first in array)
    const primaryEffect = skill.effects[0];
    
    if (!primaryEffect) {
      return '#888888'; // Gray fallback
    }
    
    switch (primaryEffect.type) {
      case 'damage':
        return '#f44336'; // Red for damage
      case 'heal':
        return '#4caf50'; // Green for healing
      case 'shield':
        return '#2196f3'; // Blue for shields
      case 'status':
        return '#ff9800'; // Orange for status effects
      case 'revive':
        return '#9c27b0'; // Purple for revive
      case 'cancel':
        return '#00bcd4'; // Cyan for interrupt
      default:
        return '#888888'; // Gray fallback
    }
  }
}
