import { describe, it, expect } from 'vitest';
import type {
  DebugInfo,
  RuleEvaluation,
  RuleCheckResult,
  ConditionCheckResult,
} from '../../src/types/debug.js';
import { renderDebugInspector } from '../../src/ui/debug-inspector.js';

/**
 * DebugInspector Test Suite
 *
 * TDD tests for DebugInspector renderer (Phase 5 UI Layer - PRIMARY FEATURE)
 *
 * Tests the debug panel rendering that shows WHY each action was chosen:
 * - AC51: Rule evaluation display (shows all rules checked, matched rule, conditions)
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
  status: 'selected' | 'skipped' | 'not-reached' | 'failed',
  reason: string,
  skillId: string = 'strike',
  skillName: string = 'Strike'
): RuleCheckResult {
  return { ruleIndex, priority, conditions, status, reason, skillId, skillName };
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

function createDebugInfo(
  ruleEvaluations: RuleEvaluation[]
): DebugInfo {
  return { ruleEvaluations };
}

describe('DebugInspector - AC51: Rule Evaluation Display', () => {
  it('should show all rules checked with ✓ (matched) or ✗ (failed) indicators', () => {
    const condition1 = createConditionCheckResult('hp-below', '50%', '30%', true);
    const condition2 = createConditionCheckResult('ally-count', '>2', '3', true);
    const matchedRule = createRuleCheckResult(0, 100, [condition1, condition2], 'selected', 'All conditions met', 'heal', 'Heal');
    const failedRule = createRuleCheckResult(1, 50, [condition1], 'failed', 'HP not low enough', 'strike', 'Strike');
    
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Goblin Shaman',
      [matchedRule, failedRule],
      'rule-0',
      'heal',
      ['enemy-2']
    );
    
    const debugInfo = createDebugInfo([evaluation]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('✓');
    expect(html).toContain('✗');
    // Now shows skill name instead of rule-0/rule-1
    expect(html).toContain('heal');
  });

  it('should highlight matched rule distinctly from failed rules', () => {
    const matchedRule = createRuleCheckResult(0, 100, [], 'selected', 'Matched', 'strike', 'Strike');
    const failedRule = createRuleCheckResult(1, 50, [], 'failed', 'Failed', 'heal', 'Heal');
    
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Orc',
      [matchedRule, failedRule],
      'rule-0',
      'strike',
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([evaluation]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('✓');
    expect(html).toMatch(/matched|selected|chosen/i);
  });

  it('should show selected skill and targets for matched rule', () => {
    const matchedRule = createRuleCheckResult(0, 100, [], 'selected', 'Matched', 'fireball', 'Fireball');
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Dark Mage',
      [matchedRule],
      'rule-0',
      'fireball',
      ['player-1', 'player-2']
    );
    
    const debugInfo = createDebugInfo([evaluation]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('fireball');
    expect(html).toContain('player-1');
    expect(html).toContain('player-2');
  });

  it('should show "No action (waiting)" when no rules matched', () => {
    const failedRule1 = createRuleCheckResult(0, 100, [], 'failed', 'HP too high', 'heal', 'Heal');
    const failedRule2 = createRuleCheckResult(1, 50, [], 'failed', 'No allies nearby', 'strike', 'Strike');
    
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Skeleton',
      [failedRule1, failedRule2],
      null,
      null,
      []
    );
    
    const debugInfo = createDebugInfo([evaluation]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/no action|waiting/i);
  });

  it('should show condition details (expected vs actual)', () => {
    const condition = createConditionCheckResult('hp-below', '50%', '75%', false);
    const rule = createRuleCheckResult(0, 100, [condition], 'failed', 'HP not low enough', 'heal', 'Heal');
    
    const evaluation = createRuleEvaluation('enemy-1', 'Troll', [rule], null, null, []);
    const debugInfo = createDebugInfo([evaluation]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('hp-below');
    expect(html).toContain('50%');
    expect(html).toContain('75%');
  });


  it('should handle multiple character evaluations', () => {
    const rule1 = createRuleCheckResult(0, 100, [], 'selected', 'Matched', 'strike', 'Strike');
    const evaluation1 = createRuleEvaluation('enemy-1', 'Goblin', [rule1], 'rule-0', 'strike', ['player-1']);
    
    const rule2 = createRuleCheckResult(0, 100, [], 'failed', 'Failed', 'heal', 'Heal');
    const evaluation2 = createRuleEvaluation('enemy-2', 'Orc', [rule2], null, null, []);
    
    const debugInfo = createDebugInfo([evaluation1, evaluation2]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('Goblin');
    expect(html).toContain('Orc');
    expect(html).toContain('enemy-1');
    expect(html).toContain('enemy-2');
  });

  it('should display character name in rule evaluation section', () => {
    const rule = createRuleCheckResult(0, 100, [], 'selected', 'Matched', 'flame-breath', 'Flame Breath');
    const evaluation = createRuleEvaluation(
      'enemy-1',
      'Ancient Dragon',
      [rule],
      'rule-0',
      'flame-breath',
      ['player-1']
    );
    
    const debugInfo = createDebugInfo([evaluation]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('Ancient Dragon');
  });
});

describe('DebugInspector - General Rendering', () => {
  it('should render complete debug panel', () => {
    const rule = createRuleCheckResult(0, 100, [], 'selected', 'Matched', 'strike', 'Strike');
    const evaluation = createRuleEvaluation('enemy-1', 'Goblin', [rule], 'rule-0', 'strike', ['player-1']);
    
    const debugInfo = createDebugInfo([evaluation]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toContain('Goblin');
    expect(html).toContain('strike');
  });

  it('should return valid HTML string', () => {
    const debugInfo = createDebugInfo([]);
    const html = renderDebugInspector(debugInfo);
    
    expect(typeof html).toBe('string');
    expect(html).toMatch(/<div/);
    expect(html).toMatch(/<\/div>/);
  });

  it('should handle empty debug info gracefully', () => {
    const debugInfo = createDebugInfo([]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toBeTruthy();
    expect(typeof html).toBe('string');
  });

  it('should have section for rule evaluations', () => {
    const rule = createRuleCheckResult(0, 100, [], 'selected', 'Matched', 'strike', 'Strike');
    const evaluation = createRuleEvaluation('enemy-1', 'Goblin', [rule], 'rule-0', 'strike', ['player-1']);
    
    const debugInfo = createDebugInfo([evaluation]);
    const html = renderDebugInspector(debugInfo);
    
    expect(html).toMatch(/rule|evaluation/i);
  });
});
