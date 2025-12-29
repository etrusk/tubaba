/**
 * Debug type definitions for TickExecutor debug enhancement
 *
 * These types extend the normal tick execution to capture detailed debug information
 * about rule evaluations, targeting decisions, and resolution substeps.
 */

import type { CombatState } from './combat.js';
import type { Character } from './character.js';

/**
 * Debug Battle State
 *
 * Lightweight state for debug mode - allows creating custom battles
 * with both players and enemies, without run progression complexity.
 */
export interface DebugBattleState {
  /** All characters in the debug battle (players and enemies) */
  characters: Character[];
  /** Shared skill pool for distribution */
  skillPool: string[];
}

/** Condition type for rule evaluation */
export type ConditionType = 
  | 'hp-below' 
  | 'ally-count' 
  | 'enemy-has-status' 
  | 'self-has-status' 
  | 'ally-has-status';

/**
 * Targeting mode type (re-exported for convenience)
 * - self: Targets the caster
 * - nearest-enemy: First living enemy in array (preparation for grid-based distance)
 */
export type TargetingMode = 'self' | 'nearest-enemy';

/** Debug-enhanced tick result */
export interface TickResultWithDebug {
  updatedState: CombatState;
  events: any[];
  battleEnded: boolean;
  debugInfo: DebugInfo;
}

/** Complete debug information for a tick */
export interface DebugInfo {
  ruleEvaluations: RuleEvaluation[];
  targetingDecisions: TargetingDecision[];
  resolutionSubsteps: ResolutionSubstep[];
}

/** Rule evaluation details for a character */
export interface RuleEvaluation {
  characterId: string;
  characterName: string;
  rulesChecked: RuleCheckResult[];
  selectedRule: string | null;
  selectedSkill: string | null;
  selectedTargets: string[];
}

/** Rule evaluation status - distinguishes why a rule was/wasn't selected */
export type RuleEvaluationStatus =
  | 'selected'      // Conditions passed, targets found, action queued
  | 'skipped'       // Conditions passed but no valid targets
  | 'not-reached'   // Never evaluated (higher priority action selected)
  | 'failed';       // Conditions did not pass

/** Individual rule check result */
export interface RuleCheckResult {
  ruleIndex: number;
  skillId: string;              // Which skill this rule belongs to
  skillName: string;            // Human-readable skill name
  priority: number;
  conditions: ConditionCheckResult[];
  status: RuleEvaluationStatus; // Replaces boolean 'matched' field
  reason: string;               // Now includes skip/target reasoning
  // Optional: only populated when targets were evaluated
  candidatesConsidered?: string[]; // e.g., ["Goblin (30/50)", "Orc (45/50)"]
  targetChosen?: string;        // e.g., "Goblin - lowest HP"
}

/** Condition evaluation result */
export interface ConditionCheckResult {
  type: ConditionType;
  expected: string;
  actual: string;
  passed: boolean;
}

/** Targeting decision details */
export interface TargetingDecision {
  casterId: string;
  skillId: string;
  targetingMode: TargetingMode;
  candidates: string[];
  filtersApplied: TargetFilterResult[];
  finalTargets: string[];
  tieBreaker?: string;
}

/** Target filter application result */
export interface TargetFilterResult {
  filterType: 'taunt' | 'dead-exclusion' | 'self-exclusion';
  removed: string[];
}

/** Resolution substep details */
export interface ResolutionSubstep {
  substep: 'damage-calc' | 'healing-calc' | 'shield-absorption' | 'health-update' | 'status-application' | 'action-cancel';
  details: SubstepDetail[];
}

/** Individual substep detail */
export interface SubstepDetail {
  actorId: string;
  targetId: string;
  skillId: string;
  value?: number;
  description: string;
}
