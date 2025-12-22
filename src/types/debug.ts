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

/** Individual rule check result */
export interface RuleCheckResult {
  ruleIndex: number;
  priority: number;
  conditions: ConditionCheckResult[];
  matched: boolean;
  reason: string;
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
