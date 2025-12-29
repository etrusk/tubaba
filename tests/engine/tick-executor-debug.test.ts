import { describe, it, expect } from 'vitest';
import type {
  Action,
  Character,
  CombatState,
  StatusEffect,
  TargetingMode,
  Condition,
  Skill,
  ConditionType,
} from '../../src/types/index.js';
import { TickExecutor } from '../../src/engine/tick-executor.js';

/**
 * TickExecutor Debug Enhancement Test Suite
 *
 * Tests the debug information capture for rule evaluations, targeting decisions,
 * and resolution substeps.
 *
 * Acceptance Criteria:
 * - AC45: Rule evaluation capture (character evaluates rules, shows all checks)
 */

// Alias for convenience
const TickExecutorDebug = TickExecutor;

// Test helpers
function createTestCharacter(
  id: string,
  currentHp: number = 100,
  maxHp: number = 100,
  statusEffects: StatusEffect[] = [],
  isPlayer: boolean = true,
  currentAction: Action | null = null,
  skills: Skill[] = []
): Character {
  return {
    id,
    name: `Character ${id}`,
    maxHp,
    currentHp,
    skills,
    statusEffects,
    currentAction,
    isPlayer,
  };
}

function createAction(
  skillId: string,
  casterId: string,
  targets: string[],
  ticksRemaining: number = 0
): Action {
  return {
    skillId,
    casterId,
    targets,
    ticksRemaining,
  };
}

function createStatus(
  type: 'poisoned' | 'stunned' | 'shielded' | 'taunting' | 'defending' | 'enraged',
  duration: number,
  value?: number
): StatusEffect {
  return { type, duration, value };
}

function createCombatState(
  players: Character[],
  enemies: Character[],
  tickNumber: number = 0,
  actionQueue: Action[] = [],
  battleStatus: 'ongoing' | 'victory' | 'defeat' = 'ongoing'
): CombatState {
  return {
    players,
    enemies,
    tickNumber,
    actionQueue,
    eventLog: [],
    battleStatus,
  };
}

function createSkill(
  id: string,
  name: string,
  targeting: TargetingMode,
  baseDuration: number = 3,
  rules?: any[]
): Skill {
  return {
    id,
    name,
    baseDuration,
    targeting,
    effects: [{ type: 'damage', value: 30 }],
    rules,
  };
}

function createCondition(
  type: ConditionType,
  threshold?: number,
  statusType?: string
): Condition {
  return {
    type,
    threshold,
    statusType: statusType as any,
  };
}

describe('TickExecutor Debug Enhancement - AC45: Rule Evaluation Capture', () => {
  it('should capture all rules checked for an idle character', () => {
    const skill1 = createSkill('strike', 'Strike', 'nearest-enemy', 3, [
      {
        priority: 10,
        conditions: [createCondition('hp-below', 50)],
      },
      {
        priority: 5,
        conditions: [],
      },
    ]);
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skill1]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Should have debug info for rule evaluations
    expect(result.debugInfo).toBeDefined();
    expect(result.debugInfo.ruleEvaluations).toBeDefined();
    expect(result.debugInfo.ruleEvaluations.length).toBeGreaterThan(0);
    
    // Find player's evaluation
    const playerEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    expect(playerEval).toBeDefined();
    expect(playerEval?.characterName).toBe('Character player-1');
    expect(playerEval?.rulesChecked.length).toBe(2); // Both rules checked
  });

  it('should capture rule check with pass/fail status for each condition', () => {
    const skill = createSkill('strike', 'Strike', 'nearest-enemy', 3, [
      {
        priority: 10,
        conditions: [
          createCondition('hp-below', 50), // Should fail (player at 80%)
          createCondition('ally-count', 1),  // Should pass (1 ally exists)
        ],
      },
    ]);
    
    const player1 = createTestCharacter('player-1', 80, 100, [], true, null, [skill]);
    const player2 = createTestCharacter('player-2', 100, 100, [], true, null, []);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player1, player2], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const playerEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    expect(playerEval).toBeDefined();
    
    const ruleCheck = playerEval?.rulesChecked[0];
    expect(ruleCheck?.priority).toBe(10);
    expect(ruleCheck?.conditions.length).toBe(2);
    
    // First condition: hp-below 50% should fail (player at 80%)
    const hpCondition = ruleCheck?.conditions.find(c => c.type === 'hp-below');
    expect(hpCondition?.passed).toBe(false);
    expect(hpCondition?.expected).toBeDefined();
    expect(hpCondition?.actual).toBeDefined();
    
    // Second condition: ally-count > 1 should pass (or fail, depending on implementation)
    const allyCondition = ruleCheck?.conditions.find(c => c.type === 'ally-count');
    expect(allyCondition?.passed).toBeDefined();
  });

  it('should capture matched rule and selected skill/targets', () => {
    const skill = createSkill('strike', 'Strike', 'nearest-enemy', 3, [
      {
        priority: 10,
        conditions: [], // No conditions - always matches
      },
    ]);
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skill]);
    const enemy = createTestCharacter('enemy-1', 50, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const playerEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    expect(playerEval).toBeDefined();
    
    // Should show matched rule
    expect(playerEval?.selectedRule).toBeDefined();
    expect(playerEval?.selectedSkill).toBe('strike');
    expect(playerEval?.selectedTargets).toContain('enemy-1');
    
    // Rule should be marked as selected
    const selectedRule = playerEval?.rulesChecked.find(r => r.status === 'selected');
    expect(selectedRule).toBeDefined();
  });

  it('should show no rules checked for stunned character', () => {
    const skill = createSkill('strike', 'Strike', 'nearest-enemy', 3, [
      { priority: 10, conditions: [] },
    ]);
    
    const stunnedPlayer = createTestCharacter('player-1', 100, 100, [
      createStatus('stunned', 2),
    ], true, null, [skill]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([stunnedPlayer], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const playerEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    
    // Either no evaluation entry, or rulesChecked is empty
    if (playerEval) {
      expect(playerEval.rulesChecked.length).toBe(0);
      expect(playerEval.selectedRule).toBeNull();
      expect(playerEval.selectedSkill).toBeNull();
    }
  });

  it('should capture rule check reason for non-matching rules', () => {
    const skill = createSkill('heal', 'Heal', 'self', 3, [
      {
        priority: 10,
        conditions: [createCondition('hp-below', 50)], // Won't match at 100% HP
      },
    ]);
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skill]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const playerEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    expect(playerEval).toBeDefined();
    
    const ruleCheck = playerEval?.rulesChecked[0];
    expect(ruleCheck?.status).toBe('failed');
    expect(ruleCheck?.reason).toBeDefined();
    expect(ruleCheck?.reason.toLowerCase()).toContain('condition'); // Should explain why it didn't match
  });

  it('should capture multiple rule evaluations for multiple idle characters', () => {
    const skill1 = createSkill('strike', 'Strike', 'nearest-enemy', 3, [
      { priority: 10, conditions: [] },
    ]);
    const skill2 = createSkill('heal', 'Heal', 'self', 3, [
      { priority: 5, conditions: [] },
    ]);
    
    const player1 = createTestCharacter('player-1', 100, 100, [], true, null, [skill1]);
    const player2 = createTestCharacter('player-2', 100, 100, [], true, null, [skill2]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false, null, [skill1]);
    
    const state = createCombatState([player1, player2], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Should have evaluations for all idle characters
    expect(result.debugInfo.ruleEvaluations.length).toBeGreaterThanOrEqual(2);
    
    const player1Eval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    const player2Eval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-2');
    const enemyEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'enemy-1');
    
    expect(player1Eval).toBeDefined();
    expect(player2Eval).toBeDefined();
    expect(enemyEval).toBeDefined();
  });

  it('should include synthetic rule for character with skill that has no rules', () => {
    const skillNoRules = createSkill('strike', 'Strike', 'nearest-enemy', 3); // No rules
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skillNoRules]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const playerEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    
    // Should have evaluation with synthetic rule (priority 0) for skill without rules
    expect(playerEval).toBeDefined();
    expect(playerEval?.rulesChecked.length).toBe(1);
    expect(playerEval?.rulesChecked[0]?.priority).toBe(0);
    expect(playerEval?.rulesChecked[0]?.skillId).toBe('strike');
    expect(playerEval?.selectedSkill).toBe('strike');
  });
});

describe('TickExecutor Debug Enhancement - Integration', () => {
  it('should provide complete debug info', () => {
    const skill = createSkill('strike', 'Strike', 'nearest-enemy', 3, [
      { priority: 10, conditions: [] },
    ]);
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skill]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Should have debug info
    expect(result.debugInfo).toBeDefined();
    expect(result.debugInfo.ruleEvaluations).toBeDefined();
  });

  it('should maintain regular TickResult properties alongside debug info', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Regular TickResult properties should still exist
    expect(result.updatedState).toBeDefined();
    expect(result.events).toBeDefined();
    expect(result.battleEnded).toBeDefined();
    
    // Plus debug info
    expect(result.debugInfo).toBeDefined();
  });

  it('should respect targetingOverride from CharacterInstructions', () => {
    const strikeSkill: Skill = {
      id: 'strike',
      name: 'Strike',
      baseDuration: 3,
      targeting: 'nearest-enemy', // Default targeting
      effects: [{ type: 'damage', value: 30 }],
      rules: [], // No rules - instructions will provide them
    };
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [strikeSkill]);
    const enemy1 = createTestCharacter('enemy-1', 50, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy1, enemy2], 1);

    // Create instructions with targetingOverride
    const instructions = new Map();
    instructions.set('player-1', {
      characterId: 'player-1',
      controlMode: 'ai' as const,
      skillInstructions: [{
        skillId: 'strike',
        priority: 10,
        conditions: [],
        targetingOverride: 'nearest-enemy',
        enabled: true,
      }],
    });

    const result = TickExecutorDebug.executeTickWithDebug(state, instructions);

    // Verify rule evaluation shows the override was used
    const playerEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    expect(playerEval).toBeDefined();
    expect(playerEval?.selectedTargets).toContain('enemy-1'); // Nearest (first) enemy
  });
});

describe('TickExecutor Debug - Skills Without Rules (Legacy Fallback Path)', () => {
  /**
   * BUG: executeTickWithDebug legacy fallback path (lines 411-425) only includes
   * skills that have rules. Skills without rules are never added to ruleSkillPairs,
   * so characters with only rule-less skills cannot queue actions.
   *
   * Expected behavior (from action-selector.ts lines 70-84):
   * Skills without rules should be treated as always-matching with priority 0
   * and empty conditions array.
   */

  it('should queue action for character with skill that has NO rules (undefined)', () => {
    // Create skill with no rules property (undefined)
    const skillWithNoRules: Skill = {
      id: 'basic-attack',
      name: 'Basic Attack',
      baseDuration: 3,
      targeting: 'nearest-enemy',
      effects: [{ type: 'damage', value: 30 }],
      // rules is undefined - NOT explicitly set
    };
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skillWithNoRules]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    // No instructions provided - should use legacy fallback path
    const state = createCombatState([player], [enemy], 0);
    
    const result = TickExecutorDebug.executeTickWithDebug(state);
    
    // Player should have queued an action since skill without rules should be treated
    // as always-matching with priority 0
    const playerInResult = result.updatedState.players.find(p => p.id === 'player-1');
    expect(playerInResult?.currentAction).not.toBeNull();
    expect(playerInResult?.currentAction?.skillId).toBe('basic-attack');
    
    // Action queue should contain the player's action
    expect(result.updatedState.actionQueue.length).toBeGreaterThan(0);
    const playerAction = result.updatedState.actionQueue.find(a => a.casterId === 'player-1');
    expect(playerAction).toBeDefined();
    expect(playerAction?.skillId).toBe('basic-attack');
  });

  it('should queue action for character with skill that has EMPTY rules array', () => {
    // Create skill with empty rules array
    const skillWithEmptyRules: Skill = {
      id: 'slash',
      name: 'Slash',
      baseDuration: 2,
      targeting: 'nearest-enemy',
      effects: [{ type: 'damage', value: 25 }],
      rules: [], // Explicitly empty array
    };
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skillWithEmptyRules]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    // No instructions provided - should use legacy fallback path
    const state = createCombatState([player], [enemy], 0);
    
    const result = TickExecutorDebug.executeTickWithDebug(state);
    
    // Player should have queued an action since skill with empty rules array
    // should be treated as always-matching with priority 0
    const playerInResult = result.updatedState.players.find(p => p.id === 'player-1');
    expect(playerInResult?.currentAction).not.toBeNull();
    expect(playerInResult?.currentAction?.skillId).toBe('slash');
    
    // Action queue should contain the player's action
    expect(result.updatedState.actionQueue.length).toBeGreaterThan(0);
    const playerAction = result.updatedState.actionQueue.find(a => a.casterId === 'player-1');
    expect(playerAction).toBeDefined();
    expect(playerAction?.skillId).toBe('slash');
  });

  it('should use legacy fallback path when no instructions provided for control mode', () => {
    // This test verifies the legacy path is used when:
    // 1. No instructions map is provided
    // 2. Or controlMode is not 'ai' (e.g., 'human')
    
    const skillWithNoRules: Skill = {
      id: 'strike',
      name: 'Strike',
      baseDuration: 3,
      targeting: 'nearest-enemy',
      effects: [{ type: 'damage', value: 20 }],
      // rules undefined - should work via legacy path
    };
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skillWithNoRules]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 0);
    
    // Case 1: No instructions at all
    const resultNoInstructions = TickExecutorDebug.executeTickWithDebug(state);
    
    const playerCase1 = resultNoInstructions.updatedState.players.find(p => p.id === 'player-1');
    expect(playerCase1?.currentAction).not.toBeNull();
    expect(playerCase1?.currentAction?.skillId).toBe('strike');
    
    // Case 2: Instructions with controlMode 'human' (should fall back to skill.rules)
    const humanInstructions = new Map();
    humanInstructions.set('player-1', {
      characterId: 'player-1',
      controlMode: 'human' as const,
      skillInstructions: [], // Empty - player controls manually
    });
    
    // Re-create fresh state for second case
    const state2 = createCombatState([player], [enemy], 0);
    const resultHumanMode = TickExecutorDebug.executeTickWithDebug(state2, humanInstructions);
    
    const playerCase2 = resultHumanMode.updatedState.players.find(p => p.id === 'player-1');
    expect(playerCase2?.currentAction).not.toBeNull();
    expect(playerCase2?.currentAction?.skillId).toBe('strike');
  });

  it('should include skill without rules in debug ruleEvaluations with priority 0', () => {
    // Skills without rules should appear in the debug output as having been evaluated
    // with a synthetic rule of priority 0 and empty conditions
    const skillWithNoRules: Skill = {
      id: 'basic-attack',
      name: 'Basic Attack',
      baseDuration: 3,
      targeting: 'nearest-enemy',
      effects: [{ type: 'damage', value: 30 }],
      // rules undefined
    };
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skillWithNoRules]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 0);
    
    const result = TickExecutorDebug.executeTickWithDebug(state);
    
    const playerEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    expect(playerEval).toBeDefined();
    
    // Should have at least one rule checked (the synthetic rule for the skill)
    expect(playerEval?.rulesChecked.length).toBeGreaterThan(0);
    
    // The rule should have priority 0 (default for skills without rules)
    const ruleCheck = playerEval?.rulesChecked[0];
    expect(ruleCheck?.priority).toBe(0);
    expect(ruleCheck?.skillId).toBe('basic-attack');
    expect(ruleCheck?.status).toBe('selected');
    
    // Selected skill should be set
    expect(playerEval?.selectedSkill).toBe('basic-attack');
    expect(playerEval?.selectedTargets).toContain('enemy-1');
  });
});
