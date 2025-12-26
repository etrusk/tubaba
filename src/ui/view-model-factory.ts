/**
 * View Model Factory
 * 
 * Transforms domain objects into presentation-ready view models.
 * Single transformation point ensures consistent UI presentation.
 */

import type { Character } from '../types/character.js';
import type { CombatState, Action } from '../types/combat.js';
import type { Skill, SkillEffect, TargetingMode } from '../types/skill.js';
import type { StatusEffect, StatusType } from '../types/status.js';
import type {
  BattleViewModel,
  CharacterViewModel,
  SkillViewModel,
  StatusEffectViewModel,
  ActionViewModel,
} from '../types/view-models.js';
import { formatCharacterName, getCharacterColor } from './character-name-formatter.js';
import { SkillLibrary } from '../engine/skill-library.js';
import { getSkillColor } from './skill-color-palette.js';

/**
 * Status effect descriptions for tooltip enhancement
 */
const STATUS_DESCRIPTIONS: Record<StatusType, string> = {
  'poisoned': 'Deals damage over time',
  'stunned': 'Prevents action queueing',
  'shielded': 'Absorbs damage before HP',
  'taunting': 'Forces enemies to target this character',
  'defending': 'Reduces incoming damage by 50%',
  'enraged': 'Doubles outgoing damage',
};

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
      color: getSkillColor(skill.id),
      effectsSummary: this.formatEffects(skill.effects),
      targetingDescription: this.formatTargeting(skill.targeting),
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
   * Format skill effects as human-readable summary
   */
  private static formatEffects(effects: SkillEffect[]): string {
    return effects.map(effect => {
      switch (effect.type) {
        case 'damage':
          return `Deals ${effect.value} damage`;
        case 'heal':
          return `Heals ${effect.value} HP`;
        case 'shield':
          return `Grants ${effect.value} Shield`;
        case 'status': {
          const statusName = this.capitalize(effect.statusType!);
          const tickText = effect.duration === 1 ? 'tick' : 'ticks';
          const description = STATUS_DESCRIPTIONS[effect.statusType!];
          return `Applies ${statusName} for ${effect.duration} ${tickText}\n→ ${description}`;
        }
        case 'revive':
          return `Revives with ${effect.value}% HP`;
        case 'cancel':
          return `Interrupts target's action`;
        default:
          return '';
      }
    }).filter(Boolean).join(', ');
  }
  
  /**
   * Format targeting mode as human-readable description
   */
  private static formatTargeting(mode: TargetingMode): string {
    const descriptions: Record<TargetingMode, string> = {
      'self': 'Targets self',
      'single-enemy-lowest-hp': 'Targets lowest HP enemy',
      'single-enemy-highest-hp': 'Targets highest HP enemy',
      'all-enemies': 'Targets all enemies',
      'ally-lowest-hp': 'Targets lowest HP ally (including self)',
      'ally-lowest-hp-damaged': 'Targets lowest HP damaged ally',
      'ally-dead': 'Targets dead ally',
      'all-allies': 'Targets all allies',
    };
    return descriptions[mode] ?? mode;
  }
  
  /**
   * Capitalize first letter of a string
   */
  private static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
