import { describe, it, expect } from 'vitest';
import type {
  DebugInfo,
  RuleEvaluation,
  RuleCheckResult,
  ConditionCheckResult,
  TargetingDecision,
  TargetFilterResult,
  ResolutionSubstep,
  SubstepDetail,
} from '../../src/types/debug.js';
import { renderDebugInspector } from '../../src/ui/debug-inspector.js';

/**
 * DebugInspector Test Suite
 *
 * TDD tests for DebugInspector renderer (Phase 5 UI Layer - PRIMARY FEATURE)
 *
 * Tests the debug panel rendering that shows WHY each action was chosen:
 * - AC51: Rule evaluation display (shows all rules checked, matched rule, conditions)
 * - AC52: Targeting decision display (shows candidates, filters, final targets, tie-breakers)
 * - AC53: Resolution substep display (shows numbered substeps with details)
 *
 * Implementation: src/ui/debug-inspector.ts
 */

// Test helpers for creating debug data
function createConditionCheckResult(
  type: 'hp-below' | 'ally-count' | 'enemy-has-status' | 'self-has-status' | 'ally-has-status',
  expected: string,
  actual: string,
  passed: boolean
): ConditionCheckResult {
  return { type, expected, actual, passed };
}

function createRuleCheckResult(
  ruleIndex: number,
  priority: number,
  conditions: ConditionCheckResult[],
  matched: boolean,
  reason: string
): RuleCheckResult {
  return { ruleIndex, priority, conditions, matched, reason };
}

function createRuleEvaluation(
  characterId: string,
  characterName: string,
  rulesChecked: RuleCheckResult[],
  selectedRule: string | null,
  selectedSkill: string | null,
  selectedTargets: string[]
): RuleEvaluation {
  return {
    characterId,
    characterName,
    rulesChecked,
    selectedRule,
    selectedSkill,
    selectedTargets,
  };
}

function createTargetFilterResult(
  filterType: 'taunt' | 'dead-exclusion' | 'self-exclusion',
  removed: string[]
): TargetFilterResult {
  return { filterType, removed };
}

function createTargetingDecision(
  casterId: string,
  skillId: string,
  targetingMode: 'self' | 'single-enemy-lowest-hp' | 'single-enemy-highest-hp' | 'all-enemies' | 'ally-lowest-hp' | 'ally-dead' | 'all-allies',
  candidates: string[],
  filtersApplied: TargetFilterResult[],
  finalTargets: string[],
  tieBreaker?: string
): TargetingDecision {
  return {
    casterId,
    skillId,
    targetingMode,
    candidates,
    filtersApplied,
    finalTargets,
    tieBreaker,
  };
}

function createSubstepDetail(
  actorId: string,
  targetId: string,
  skillId: string,
  value: number | undefined,
  description: string
): SubstepDetail {
  return { actorId, targetId, skillId, value, description };
}

function createResolutionSubstep(
  substep: 'damage-calc' | 'healing-calc' | 'shield-absorption' | 'health-update' | 'status-application' | 'action-cancel',
  details: SubstepDetail[]
): ResolutionSubstep {
  return { substep, details };
}

function createDebugInfo(
  ruleEvaluations: RuleEvaluation[],
  targetingDecisions: TargetingDecision[],
  resolutionSubsteps: ResolutionSubstep[]
): DebugInfo {
  return { ruleEvaluations, targetingDecisions, resolutionSubsteps };
}

describe('DebugInspector - AC51: Rule Evaluation Display', () => {
  it('should show all rules checked with ✓ (matched) or ✗ (failed) indicators', () => {
    const condition1 = createConditionCheckResult('hp-below', '50%', '30%', true);
    const condition2 = createConditionCheckResult('ally-count', '>2', '3', true);
    const matchedRule = createRuleCheckResult(0, 100, [condition1, condition2], true, 'All conditions met');
    const failedRule = createRuleCheckResult(1, 50, [condition1], false, 'HP not low enough');
    
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Goblin Shaman',
      [matchedRule, failedRule],
      'rule-0',
      'heal',
      ['enemy-2']
    );
    
    const debugInfo = createDebugInfo([evaluation], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('✓');
    expect(html).toContain('✗');
    expect(html).toContain('rule-0');
    expect(html).toContain('rule-1');
  });

  it('should highlight matched rule distinctly from failed rules', () => {
    const matchedRule = createRuleCheckResult(0, 100, [], true, 'Matched');
    const failedRule = createRuleCheckResult(1, 50, [], false, 'Failed');
    
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Orc',
      [matchedRule, failedRule],
      'rule-0',
      'strike',
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([evaluation], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('✓');
    expect(html).toMatch(/matched|selected|chosen/i);
  });

  it('should show selected skill and targets for matched rule', () => {
    const matchedRule = createRuleCheckResult(0, 100, [], true, 'Matched');
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Dark Mage',
      [matchedRule],
      'rule-0',
      'fireball',
      ['player-1', 'player-2']
    );
    
    const debugInfo = createDebugInfo([evaluation], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('fireball');
    expect(html).toContain('player-1');
    expect(html).toContain('player-2');
  });

  it('should show "No action (waiting)" when no rules matched', () => {
    const failedRule1 = createRuleCheckResult(0, 100, [], false, 'HP too high');
    const failedRule2 = createRuleCheckResult(1, 50, [], false, 'No allies nearby');
    
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Skeleton',
      [failedRule1, failedRule2],
      null,
      null,
      []
    );
    
    const debugInfo = createDebugInfo([evaluation], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/no action|waiting/i);
  });

  it('should show condition details (expected vs actual)', () => {
    const condition = createConditionCheckResult('hp-below', '50%', '75%', false);
    const rule = createRuleCheckResult(0, 100, [condition], false, 'HP not low enough');
    
    const evaluation = createRuleEvaluation('enemy-1', 'Troll', [rule], null, null, []);
    const debugInfo = createDebugInfo([evaluation], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('hp-below');
    expect(html).toContain('50%');
    expect(html).toContain('75%');
  });

  it('should show rule priority', () => {
    const highPriorityRule = createRuleCheckResult(0, 100, [], true, 'High priority');
    const lowPriorityRule = createRuleCheckResult(1, 10, [], false, 'Low priority');
    
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Elite Guard',
      [highPriorityRule, lowPriorityRule],
      'rule-0',
      'power-strike',
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([evaluation], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('100');
    expect(html).toContain('10');
  });

  it('should handle multiple character evaluations', () => {
    const rule1 = createRuleCheckResult(0, 100, [], true, 'Matched');
    const evaluation1 = createRuleEvaluation('enemy-1', 'Goblin', [rule1], 'rule-0', 'strike', ['player-1']);
    
    const rule2 = createRuleCheckResult(0, 100, [], false, 'Failed');
    const evaluation2 = createRuleEvaluation('enemy-2', 'Orc', [rule2], null, null, []);
    
    const debugInfo = createDebugInfo([evaluation1, evaluation2], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('Goblin');
    expect(html).toContain('Orc');
    expect(html).toContain('enemy-1');
    expect(html).toContain('enemy-2');
  });

  it('should display character name in rule evaluation section', () => {
    const rule = createRuleCheckResult(0, 100, [], true, 'Matched');
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Ancient Dragon',
      [rule],
      'rule-0',
      'flame-breath',
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([evaluation], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('Ancient Dragon');
  });
});

describe('DebugInspector - AC52: Targeting Display', () => {
  it('should show all candidates before filtering', () => {
    const decision = createTargetingDecision(
      'enemy-1',
      'strike',
      'single-enemy-lowest-hp',
      ['player-1', 'player-2', 'player-3'],
      [],
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([], [decision], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('player-1');
    expect(html).toContain('player-2');
    expect(html).toContain('player-3');
  });

  it('should show filters applied and targets removed', () => {
    const tauntFilter = createTargetFilterResult('taunt', ['player-2', 'player-3']);
    const decision = createTargetingDecision(
      'enemy-1',
      'strike',
      'single-enemy-lowest-hp',
      ['player-1', 'player-2', 'player-3'],
      [tauntFilter],
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([], [decision], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('taunt');
    expect(html).toContain('player-2');
    expect(html).toContain('player-3');
  });

  it('should show taunt filter details', () => {
    const tauntFilter = createTargetFilterResult('taunt', ['player-2']);
    const decision = createTargetingDecision(
      'enemy-1',
      'strike',
      'single-enemy-lowest-hp',
      ['player-1', 'player-2'],
      [tauntFilter],
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([], [decision], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/taunt/i);
    expect(html).toContain('player-2');
  });

  it('should show dead-exclusion filter details', () => {
    const deadFilter = createTargetFilterResult('dead-exclusion', ['player-3']);
    const decision = createTargetingDecision(
      'enemy-1',
      'strike',
      'single-enemy-lowest-hp',
      ['player-1', 'player-2', 'player-3'],
      [deadFilter],
      ['player-1', 'player-2']
    );
    
    const debugInfo = createDebugInfo([], [decision], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/dead-exclusion|dead/i);
    expect(html).toContain('player-3');
  });

  it('should show final targets', () => {
    const decision = createTargetingDecision(
      'enemy-1',
      'strike',
      'single-enemy-lowest-hp',
      ['player-1', 'player-2'],
      [],
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([], [decision], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/final|selected|target/i);
    expect(html).toContain('player-1');
  });

  it('should show tie-breaker explanation when applicable', () => {
    const decision = createTargetingDecision(
      'enemy-1',
      'strike',
      'single-enemy-lowest-hp',
      ['player-1', 'player-2'],
      [],
      ['player-1'],
      'Random selection from tied candidates'
    );
    
    const debugInfo = createDebugInfo([], [decision], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/tie-breaker|tie breaker/i);
    expect(html).toContain('Random selection from tied candidates');
  });

  it('should handle multiple targeting decisions', () => {
    const decision1 = createTargetingDecision(
      'enemy-1',
      'strike',
      'single-enemy-lowest-hp',
      ['player-1'],
      [],
      ['player-1']
    );
    const decision2 = createTargetingDecision(
      'player-1',
      'heal',
      'self',
      ['player-1'],
      [],
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([], [decision1, decision2], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('enemy-1');
    expect(html).toContain('strike');
    expect(html).toContain('heal');
  });

  it('should display targeting mode', () => {
    const decision = createTargetingDecision(
      'enemy-1',
      'fireball',
      'all-enemies',
      ['player-1', 'player-2', 'player-3'],
      [],
      ['player-1', 'player-2', 'player-3']
    );
    
    const debugInfo = createDebugInfo([], [decision], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('all-enemies');
  });
});

describe('DebugInspector - AC53: Substep Display', () => {
  it('should show numbered list of substeps', () => {
    const detail1 = createSubstepDetail('enemy-1', 'player-1', 'strike', 25, 'Calculated damage: 25');
    const substep1 = createResolutionSubstep('damage-calc', [detail1]);
    
    const detail2 = createSubstepDetail('enemy-1', 'player-1', 'strike', undefined, 'Applied damage to health');
    const substep2 = createResolutionSubstep('health-update', [detail2]);
    
    const debugInfo = createDebugInfo([], [], [substep1, substep2]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/1[\.\)]/);
    expect(html).toMatch(/2[\.\)]/);
  });

  it('should show substep type (damage-calc, healing-calc, etc.)', () => {
    const detail = createSubstepDetail('enemy-1', 'player-1', 'strike', 25, 'Damage calculated');
    const substep = createResolutionSubstep('damage-calc', [detail]);
    
    const debugInfo = createDebugInfo([], [], [substep]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/damage-calc|damage calculation/i);
  });

  it('should show details for each substep (actor, target, value)', () => {
    const detail = createSubstepDetail('enemy-1', 'player-1', 'strike', 25, 'Calculated damage: 25');
    const substep = createResolutionSubstep('damage-calc', [detail]);
    
    const debugInfo = createDebugInfo([], [], [substep]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('enemy-1');
    expect(html).toContain('player-1');
    expect(html).toContain('strike');
    expect(html).toContain('25');
  });

  it('should show "No resolutions this tick" when empty', () => {
    const debugInfo = createDebugInfo([], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/no resolutions|no substeps|nothing resolved/i);
  });

  it('should show correct order of substeps', () => {
    const detail1 = createSubstepDetail('enemy-1', 'player-1', 'strike', 25, 'First');
    const substep1 = createResolutionSubstep('damage-calc', [detail1]);
    
    const detail2 = createSubstepDetail('player-1', 'player-1', 'heal', 15, 'Second');
    const substep2 = createResolutionSubstep('healing-calc', [detail2]);
    
    const detail3 = createSubstepDetail('enemy-1', 'player-1', 'strike', undefined, 'Third');
    const substep3 = createResolutionSubstep('health-update', [detail3]);
    
    const debugInfo = createDebugInfo([], [], [substep1, substep2, substep3]);
    const html = renderDebugInspector(debugInfo);
    
    const damageIndex = html.indexOf('damage-calc');
    const healingIndex = html.indexOf('healing-calc');
    const healthIndex = html.indexOf('health-update');
    
    expect(damageIndex).toBeLessThan(healingIndex);
    expect(healingIndex).toBeLessThan(healthIndex);
  });

  it('should handle multiple details per substep', () => {
    const detail1 = createSubstepDetail('enemy-1', 'player-1', 'fireball', 30, 'Damage to player 1');
    const detail2 = createSubstepDetail('enemy-1', 'player-2', 'fireball', 30, 'Damage to player 2');
    const detail3 = createSubstepDetail('enemy-1', 'player-3', 'fireball', 30, 'Damage to player 3');
    const substep = createResolutionSubstep('damage-calc', [detail1, detail2, detail3]);
    
    const debugInfo = createDebugInfo([], [], [substep]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('player-1');
    expect(html).toContain('player-2');
    expect(html).toContain('player-3');
  });

  it('should display different substep types correctly', () => {
    const damageDetail = createSubstepDetail('enemy-1', 'player-1', 'strike', 20, 'Damage');
    const damageSubstep = createResolutionSubstep('damage-calc', [damageDetail]);
    
    const healDetail = createSubstepDetail('player-1', 'player-2', 'heal', 15, 'Healing');
    const healSubstep = createResolutionSubstep('healing-calc', [healDetail]);
    
    const shieldDetail = createSubstepDetail('player-1', 'player-1', 'shield', 10, 'Shield absorbed');
    const shieldSubstep = createResolutionSubstep('shield-absorption', [shieldDetail]);
    
    const statusDetail = createSubstepDetail('enemy-1', 'player-1', 'poison', undefined, 'Applied poison');
    const statusSubstep = createResolutionSubstep('status-application', [statusDetail]);
    
    const debugInfo = createDebugInfo([], [], [damageSubstep, healSubstep, shieldSubstep, statusSubstep]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/damage-calc|damage/i);
    expect(html).toMatch(/healing-calc|healing/i);
    expect(html).toMatch(/shield-absorption|shield/i);
    expect(html).toMatch(/status-application|status/i);
  });

  it('should show description text for each detail', () => {
    const detail = createSubstepDetail(
      'enemy-1',
      'player-1',
      'strike',
      25,
      'Calculated base damage of 25 before modifiers'
    );
    const substep = createResolutionSubstep('damage-calc', [detail]);
    
    const debugInfo = createDebugInfo([], [], [substep]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('Calculated base damage of 25 before modifiers');
  });
});

describe('DebugInspector - General Rendering', () => {
  it('should render complete debug panel with all sections', () => {
    const rule = createRuleCheckResult(0, 100, [], true, 'Matched');
    const evaluation = createRuleEvaluation('enemy-1', 'Goblin', [rule], 'rule-0', 'strike', ['player-1']);
    
    const decision = createTargetingDecision(
      'enemy-1',
      'strike',
      'single-enemy-lowest-hp',
      ['player-1', 'player-2'],
      [],
      ['player-1']
    );
    
    const detail = createSubstepDetail('enemy-1', 'player-1', 'strike', 25, 'Damage calculated');
    const substep = createResolutionSubstep('damage-calc', [detail]);
    
    const debugInfo = createDebugInfo([evaluation], [decision], [substep]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('Goblin');
    expect(html).toContain('strike');
    expect(html).toContain('damage-calc');
  });

  it('should return valid HTML string', () => {
    const debugInfo = createDebugInfo([], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(typeof html).toBe('string');
    expect(html).toMatch(/<div/);
    expect(html).toMatch(/<\/div>/);
  });

  it('should handle empty debug info gracefully', () => {
    const debugInfo = createDebugInfo([], [], []);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toBeTruthy();
    expect(typeof html).toBe('string');
  });

  it('should have distinct sections for rules, targeting, and substeps', () => {
    const rule = createRuleCheckResult(0, 100, [], true, 'Matched');
    const evaluation = createRuleEvaluation('enemy-1', 'Goblin', [rule], 'rule-0', 'strike', ['player-1']);
    
    const decision = createTargetingDecision(
      'enemy-1',
      'strike',
      'single-enemy-lowest-hp',
      ['player-1'],
      [],
      ['player-1']
    );
    
    const detail = createSubstepDetail('enemy-1', 'player-1', 'strike', 25, 'Damage');
    const substep = createResolutionSubstep('damage-calc', [detail]);
    
    const debugInfo = createDebugInfo([evaluation], [decision], [substep]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/rule|evaluation/i);
    expect(html).toMatch(/target|targeting/i);
    expect(html).toMatch(/substep|resolution/i);
  });
});
