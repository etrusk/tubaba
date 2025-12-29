/**
 * Central export for all type definitions
 */

// Skill types
export type {
  TargetingMode,
  SkillEffect,
  Condition,
  Rule,
  Skill,
} from './skill.js';

// Character types
export type { Character, StatusEffect } from './character.js';

// Combat types
export type {
  Action,
  CombatState,
  TickResult,
  CombatEvent,
} from './combat.js';

// Run management types
export type {
  RunStatus,
  Encounter,
  SkillUnlockChoice,
  RunState,
} from './run.js';

// Debug types
export type {
  ConditionType,
  TickResultWithDebug,
  DebugInfo,
  RuleEvaluation,
  RuleCheckResult,
  ConditionCheckResult,
  TargetingDecision,
  TargetFilterResult,
  ResolutionSubstep,
  SubstepDetail,
} from './debug.js';

// Instructions types
export type {
  CharacterInstructions,
  SkillInstruction,
  InstructionsBuilderState,
  InstructionsPanelData,
} from './instructions.js';

// Visualization types
export type {
  CharacterPosition,
  CircleCharacterData,
  IntentLine,
  BattleVisualization,
  SkillColorMap,
} from './visualization.js';
