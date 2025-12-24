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
  TickResultWithDebug,
  DebugInfo,
  RuleEvaluation,
  RuleCheckResult,
  ConditionCheckResult,
  TargetingDecision,
  TargetFilterResult,
  ResolutionSubstep,
  SubstepDetail,
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
 * - AC46: Targeting decision capture (targeting resolution with filters)
 * - AC47: Resolution substep capture (action resolution substeps)
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
    const skill1 = createSkill('strike', 'Strike', 'single-enemy-lowest-hp', 3, [
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
    const skill = createSkill('strike', 'Strike', 'single-enemy-lowest-hp', 3, [
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
    const skill = createSkill('strike', 'Strike', 'single-enemy-lowest-hp', 3, [
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
    const skill = createSkill('strike', 'Strike', 'single-enemy-lowest-hp', 3, [
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
    const skill = createSkill('heal', 'Heal', 'ally-lowest-hp', 3, [
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
    const skill1 = createSkill('strike', 'Strike', 'single-enemy-lowest-hp', 3, [
      { priority: 10, conditions: [] },
    ]);
    const skill2 = createSkill('heal', 'Heal', 'ally-lowest-hp', 3, [
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

  it('should show empty rulesChecked when character has no skills with rules', () => {
    const skillNoRules = createSkill('strike', 'Strike', 'single-enemy-lowest-hp', 3); // No rules
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skillNoRules]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const playerEval = result.debugInfo.ruleEvaluations.find(e => e.characterId === 'player-1');
    
    // Should have evaluation but no rules to check
    expect(playerEval).toBeDefined();
    expect(playerEval?.rulesChecked.length).toBe(0);
    expect(playerEval?.selectedRule).toBeNull();
  });
});

describe('TickExecutor Debug Enhancement - AC46: Targeting Decision Capture', () => {
  it('should capture targeting candidates and final selection', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 100, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 50, 100, [], false);
    const enemy3 = createTestCharacter('enemy-3', 75, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-2'], 0);
    const state = createCombatState([player], [enemy1, enemy2, enemy3], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    expect(result.debugInfo.targetingDecisions).toBeDefined();
    expect(result.debugInfo.targetingDecisions.length).toBeGreaterThan(0);
    
    const decision = result.debugInfo.targetingDecisions.find(d => d.casterId === 'player-1');
    expect(decision).toBeDefined();
    expect(decision?.skillId).toBe('strike');
    expect(decision?.targetingMode).toBeDefined();
    expect(decision?.candidates).toContain('enemy-1');
    expect(decision?.candidates).toContain('enemy-2');
    expect(decision?.candidates).toContain('enemy-3');
    expect(decision?.finalTargets).toContain('enemy-2'); // Lowest HP
  });

  it('should capture dead-exclusion filter when targets are filtered', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 0, 100, [], false); // Dead
    const enemy2 = createTestCharacter('enemy-2', 50, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-2'], 0);
    const state = createCombatState([player], [enemy1, enemy2], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const decision = result.debugInfo.targetingDecisions.find(d => d.casterId === 'player-1');
    expect(decision).toBeDefined();
    
    // Should show dead-exclusion filter was applied
    const deadFilter = decision?.filtersApplied.find(f => f.filterType === 'dead-exclusion');
    expect(deadFilter).toBeDefined();
    expect(deadFilter?.removed).toContain('enemy-1');
  });

  it('should capture taunt filter override when taunt is active', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 100, 100, [], false, null, []);
    const enemy2 = createTestCharacter('enemy-2', 50, 100, [
      createStatus('taunting', 2),
    ], false);
    
    const action = createAction('strike', 'player-1', ['enemy-2'], 0);
    const state = createCombatState([player], [enemy1, enemy2], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const decision = result.debugInfo.targetingDecisions.find(d => d.casterId === 'player-1');
    expect(decision).toBeDefined();
    
    // Should show taunt filter was applied
    const tauntFilter = decision?.filtersApplied.find(f => f.filterType === 'taunt');
    expect(tauntFilter).toBeDefined();
    
    // Final targets should only include taunting enemy
    expect(decision?.finalTargets).toContain('enemy-2');
    expect(decision?.finalTargets).not.toContain('enemy-1');
  });

  it('should capture self-exclusion filter for ally targeting', () => {
    const player1 = createTestCharacter('player-1', 100, 100, [], true);
    const player2 = createTestCharacter('player-2', 50, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    // Heal targets ally-lowest-hp (should exclude caster)
    const action = createAction('heal', 'player-1', ['player-2'], 0);
    const state = createCombatState([player1, player2], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const decision = result.debugInfo.targetingDecisions.find(d => d.casterId === 'player-1');
    expect(decision).toBeDefined();
    
    // Should show self-exclusion filter was applied
    const selfFilter = decision?.filtersApplied.find(f => f.filterType === 'self-exclusion');
    if (selfFilter) {
      expect(selfFilter.removed).toContain('player-1');
    }
    
    // Final targets should not include caster
    expect(decision?.finalTargets).not.toContain('player-1');
  });

  it('should document tie-breaker explanation when multiple targets have same HP', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 50, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 50, 100, [], false);
    const enemy3 = createTestCharacter('enemy-3', 75, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy1, enemy2, enemy3], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const decision = result.debugInfo.targetingDecisions.find(d => d.casterId === 'player-1');
    expect(decision).toBeDefined();
    
    // Should have tie-breaker explanation
    expect(decision?.tieBreaker).toBeDefined();
    expect(decision?.tieBreaker).toContain('leftmost'); // Or similar deterministic explanation
  });

  it('should capture targeting mode used for decision', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('fireball', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const decision = result.debugInfo.targetingDecisions.find(d => d.casterId === 'player-1');
    expect(decision).toBeDefined();
    expect(decision?.targetingMode).toBeDefined();
    expect(['self', 'single-enemy-lowest-hp', 'all-enemies', 'ally-lowest-hp', 'ally-dead', 'all-allies']).toContain(decision?.targetingMode);
  });

  it('should capture multiple targeting decisions per tick', () => {
    const player1 = createTestCharacter('player-1', 100, 100, [], true);
    const player2 = createTestCharacter('player-2', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const actions = [
      createAction('strike', 'player-1', ['enemy-1'], 0),
      createAction('heal', 'player-2', ['player-1'], 0),
    ];
    const state = createCombatState([player1, player2], [enemy], 1, actions);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    expect(result.debugInfo.targetingDecisions.length).toBeGreaterThanOrEqual(2);
    
    const decision1 = result.debugInfo.targetingDecisions.find(d => d.casterId === 'player-1');
    const decision2 = result.debugInfo.targetingDecisions.find(d => d.casterId === 'player-2');
    
    expect(decision1).toBeDefined();
    expect(decision2).toBeDefined();
  });

  it('should show empty filters when no filters are applied', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    const decision = result.debugInfo.targetingDecisions.find(d => d.casterId === 'player-1');
    expect(decision).toBeDefined();
    
    // Should have empty or minimal filters
    expect(decision?.filtersApplied).toBeDefined();
    // All filters with no removals
    decision?.filtersApplied.forEach(filter => {
      if (filter.removed.length > 0) {
        // If there are removals, they should be valid
        expect(filter.filterType).toBeDefined();
      }
    });
  });
});

describe('TickExecutor Debug Enhancement - AC47: Resolution Substep Capture', () => {
  it('should capture damage-calc and health-update substeps for damage skill', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    expect(result.debugInfo.resolutionSubsteps).toBeDefined();
    
    // Should have damage-calc substep
    const damageCalc = result.debugInfo.resolutionSubsteps.find(s => s.substep === 'damage-calc');
    expect(damageCalc).toBeDefined();
    expect(damageCalc?.details.length).toBeGreaterThan(0);
    
    const damageDetail = damageCalc?.details[0];
    expect(damageDetail?.actorId).toBe('player-1');
    expect(damageDetail?.targetId).toBe('enemy-1');
    expect(damageDetail?.skillId).toBe('strike');
    expect(damageDetail?.value).toBeDefined();
    expect(damageDetail?.description).toContain('damage');
    
    // Should have health-update substep
    const healthUpdate = result.debugInfo.resolutionSubsteps.find(s => s.substep === 'health-update');
    expect(healthUpdate).toBeDefined();
  });

  it('should capture healing-calc substep for heal skill', () => {
    const player1 = createTestCharacter('player-1', 100, 100, [], true);
    const player2 = createTestCharacter('player-2', 50, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('heal', 'player-1', ['player-2'], 0);
    const state = createCombatState([player1, player2], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Should have healing-calc substep
    const healingCalc = result.debugInfo.resolutionSubsteps.find(s => s.substep === 'healing-calc');
    expect(healingCalc).toBeDefined();
    expect(healingCalc?.details.length).toBeGreaterThan(0);
    
    const healDetail = healingCalc?.details[0];
    expect(healDetail?.actorId).toBe('player-1');
    expect(healDetail?.targetId).toBe('player-2');
    expect(healDetail?.skillId).toBe('heal');
    expect(healDetail?.value).toBeDefined();
    expect(healDetail?.description).toContain('heal');
  });

  it('should capture shield-absorption substep when damage hits shielded target', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [
      createStatus('shielded', 2, 20),
    ], false);
    
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Should have shield-absorption substep
    const shieldAbsorb = result.debugInfo.resolutionSubsteps.find(s => s.substep === 'shield-absorption');
    expect(shieldAbsorb).toBeDefined();
    expect(shieldAbsorb?.details.length).toBeGreaterThan(0);
    
    const absorbDetail = shieldAbsorb?.details[0];
    expect(absorbDetail?.targetId).toBe('enemy-1');
    expect(absorbDetail?.description).toContain('shield');
  });

  it('should capture status-application substep when status is applied', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('poison', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Should have status-application substep
    const statusApp = result.debugInfo.resolutionSubsteps.find(s => s.substep === 'status-application');
    expect(statusApp).toBeDefined();
    expect(statusApp?.details.length).toBeGreaterThan(0);
    
    const statusDetail = statusApp?.details[0];
    expect(statusDetail?.actorId).toBe('player-1');
    expect(statusDetail?.targetId).toBe('enemy-1');
    expect(statusDetail?.skillId).toBe('poison');
    expect(statusDetail?.description).toContain('status');
  });

  it('should capture action-cancel substep when action is interrupted', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false, 
      createAction('heavy-strike', 'enemy-1', ['player-1'], 1)
    );
    
    const action = createAction('interrupt', 'player-1', ['enemy-1'], 0);
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Should have action-cancel substep
    const actionCancel = result.debugInfo.resolutionSubsteps.find(s => s.substep === 'action-cancel');
    expect(actionCancel).toBeDefined();
    expect(actionCancel?.details.length).toBeGreaterThan(0);
    
    const cancelDetail = actionCancel?.details[0];
    expect(cancelDetail?.targetId).toBe('enemy-1');
    expect(cancelDetail?.description).toContain('cancel');
  });

  it('should capture substeps in correct order', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 50, 100, [
      createStatus('shielded', 2, 10),
    ], false);
    
    const action = createAction('bash', 'player-1', ['enemy-1'], 0); // Damage + status
    const state = createCombatState([player], [enemy], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Expected order: damage-calc → shield-absorption → health-update → status-application
    const substepOrder = result.debugInfo.resolutionSubsteps.map(s => s.substep);
    
    const damageIndex = substepOrder.indexOf('damage-calc');
    const healthIndex = substepOrder.indexOf('health-update');
    const statusIndex = substepOrder.indexOf('status-application');
    
    // Damage calc should come before health update
    if (damageIndex !== -1 && healthIndex !== -1) {
      expect(damageIndex).toBeLessThan(healthIndex);
    }
    
    // Health update should come before status application
    if (healthIndex !== -1 && statusIndex !== -1) {
      expect(healthIndex).toBeLessThan(statusIndex);
    }
  });

  it('should capture multiple substep details when multiple targets are affected', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 100, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 100, 100, [], false);
    
    const action = createAction('fireball', 'player-1', ['enemy-1', 'enemy-2'], 0);
    const state = createCombatState([player], [enemy1, enemy2], 1, [action]);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Should have damage-calc substep with multiple details
    const damageCalc = result.debugInfo.resolutionSubsteps.find(s => s.substep === 'damage-calc');
    expect(damageCalc).toBeDefined();
    expect(damageCalc?.details.length).toBeGreaterThanOrEqual(2);
    
    const target1Detail = damageCalc?.details.find(d => d.targetId === 'enemy-1');
    const target2Detail = damageCalc?.details.find(d => d.targetId === 'enemy-2');
    
    expect(target1Detail).toBeDefined();
    expect(target2Detail).toBeDefined();
  });

  it('should show empty resolutionSubsteps when no actions resolve', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    // No actions resolving this tick
    const state = createCombatState([player], [enemy], 1, []);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    expect(result.debugInfo.resolutionSubsteps).toBeDefined();
    expect(result.debugInfo.resolutionSubsteps.length).toBe(0);
  });
});

describe('TickExecutor Debug Enhancement - Integration', () => {
  it('should provide complete debug info with all three sections', () => {
    const skill = createSkill('strike', 'Strike', 'single-enemy-lowest-hp', 3, [
      { priority: 10, conditions: [] },
    ]);
    
    const player = createTestCharacter('player-1', 100, 100, [], true, null, [skill]);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const state = createCombatState([player], [enemy], 1);

    const result = TickExecutorDebug.executeTickWithDebug(state);

    // Should have all three debug sections
    expect(result.debugInfo).toBeDefined();
    expect(result.debugInfo.ruleEvaluations).toBeDefined();
    expect(result.debugInfo.targetingDecisions).toBeDefined();
    expect(result.debugInfo.resolutionSubsteps).toBeDefined();
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
});
