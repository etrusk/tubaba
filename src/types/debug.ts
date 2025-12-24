/**
 * Debug type definitions for TickExecutor debug enhancement
 * 
 * These types extend the normal tick execution to capture detailed debug information
 * about rule evaluations, targeting decisions, and resolution substeps.
 */

import type { CombatState } from './combat.js';

/** Condition type for rule evaluation */
export type ConditionType = 
  | 'hp-below' 
  | 'ally-count' 
  | 'enemy-has-status' 
  | 'self-has-status' 
  | 'ally-has-status';

/** Targeting mode type (re-exported for convenience) */
export type TargetingMode = 
  | 'self' 
  | 'single-enemy-lowest-hp' 
  | 'single-enemy-highest-hp'
  | 'all-enemies' 
  | 'ally-lowest-hp' 
  | 'ally-dead' 
  | 'all-allies';

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
