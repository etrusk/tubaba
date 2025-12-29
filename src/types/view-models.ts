/**
 * View Model Types
 *
 * Presentation-ready interfaces that transform domain objects into UI-ready data.
 * All formatting, color coding, and calculations are pre-applied.
 */

/**
 * Presentation-ready skill data
 */
export interface SkillViewModel {
  /** Unique skill identifier */
  id: string;
  /** Display name */
  name: string;
  /** Number of ticks to execute */
  baseDuration: number;
  /** Formatted duration text (e.g., "2 ticks") */
  formattedDuration: string;
  /** Skill-type color for UI theming */
  color: string;
  /** Human-readable effect summary, e.g., "Deals 15 damage" */
  effectsSummary: string;
  /** Human-readable targeting description, e.g., "Targets lowest HP enemy" */
  targetingDescription: string;
}

/**
 * Presentation-ready status effect data
 */
export interface StatusEffectViewModel {
  /** Type of status effect */
  type: string;
  /** Ticks remaining */
  duration: number;
  /** Formatted duration text (e.g., "3 ticks") */
  formattedDuration: string;
  /** Numeric value for shields/poison */
  value?: number;
  /** Formatted value text if applicable */
  formattedValue?: string;
}

/**
 * Presentation-ready action data
 */
export interface ActionViewModel {
  /** Skill being executed */
  skillId: string;
  /** Skill display name */
  skillName: string;
  /** Who is casting */
  casterId: string;
  /** Target character IDs */
  targets: string[];
  /** Countdown to resolution */
  ticksRemaining: number;
  /** Formatted countdown text (e.g., "resolves in 2 ticks") */
  formattedCountdown: string;
}

/**
 * Presentation-ready character data with all formatting pre-applied
 */
export interface CharacterViewModel {
  // Identity
  /** Unique identifier */
  id: string;
  /** Raw name */
  name: string;
  /** HTML with color styling */
  formattedName: string;
  /** Hex color for this character */
  color: string;
  
  // State
  /** Current health points */
  currentHp: number;
  /** Maximum health points */
  maxHp: number;
  /** Pre-calculated HP percentage (0-100) */
  hpPercent: number;
  /** True if knocked out (0 HP) */
  isKO: boolean;
  /** Player vs enemy distinction */
  isPlayer: boolean;
  
  // Skills (always full library for all characters)
  /** All available skills in the game */
  skills: SkillViewModel[];
  
  // Status
  /** Active status effects */
  statusEffects: StatusEffectViewModel[];
  
  // Action
  /** Currently queued action in progress */
  currentAction: ActionViewModel | null;
}

/**
 * Complete presentation state for the entire battle UI
 */
export interface BattleViewModel {
  /** Current tick count */
  tick: number;
  /** Current battle status */
  battleStatus: 'ongoing' | 'victory' | 'defeat';
  
  // All characters with consistent formatting
  /** Player party */
  players: CharacterViewModel[];
  /** Enemy units */
  enemies: CharacterViewModel[];
  /** Combined list for name lookups */
  allCharacters: CharacterViewModel[];
  
  // Pre-built lookups for text colorization
  /** Map of character ID to hex color */
  characterColorMap: Map<string, string>;
}
