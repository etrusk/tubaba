import type { Condition, TargetingMode, Skill, ConditionGroup } from './skill.js';
import type { Character } from './character.js';

export type { ConditionGroup } from './skill.js';

/**
 * Per-character instruction configuration
 * Stores control mode and AI rules for automated behavior
 */
export interface CharacterInstructions {
  characterId: string;           // Which character these instructions apply to
  controlMode: 'human' | 'ai';   // Manual control or automated
  skillInstructions: SkillInstruction[]; // Rules per skill (only used if controlMode = 'ai')
}

/**
 * Configuration for a single skill's AI behavior
 * Maps to Rule type from skill.ts with UI-friendly structure
 */
export interface SkillInstruction {
  skillId: string;                   // Which skill this instruction applies to
  priority: number;                  // Higher = evaluated first (1-100 scale)
  conditions: Condition[];           // When to use this skill (reuses existing type)
  conditionGroups?: ConditionGroup[]; // Optional OR groups of conditions
  targetingOverride?: TargetingMode; // Optional targeting mode override
  enabled: boolean;                  // Allow disabling rules without deleting
}

/**
 * UI state for instructions builder panel
 * Manages selection, editing, and persistence
 */
export interface InstructionsBuilderState {
  selectedCharacterId: string | null;        // Currently editing character (null = no selection)
  instructions: Map<string, CharacterInstructions>; // All character instructions
  editingSkillId: string | null;             // Currently editing skill (null = viewing all)
  isDirty: boolean;                          // Unsaved changes indicator
}

/**
 * Props for rendering instructions builder
 * Pure data passed to render function
 */
export interface InstructionsPanelData {
  selectedCharacter: Character | null;       // Character being configured
  instructions: CharacterInstructions | null; // Current instructions for character
  availableSkills: Skill[];                  // Skills the character has equipped
}
