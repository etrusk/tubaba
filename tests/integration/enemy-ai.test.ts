import { describe, it, expect } from 'vitest';
import { selectAction } from '../../src/ai/action-selector.js';
import { TickExecutor } from '../../src/engine/tick-executor.js';
import { SkillLibrary } from '../../src/engine/skill-library.js';
import type { CombatState, Character, Action, Skill } from '../../src/types/index.js';

/**
 * Helper to create a character with specific setup
 */
function createCharacter(overrides: Partial<Character>): Character {
  return {
    id: overrides.id ?? 'char-1',
    name: overrides.name ?? 'Character',
    maxHp: overrides.maxHp ?? 100,
    currentHp: overrides.currentHp ?? overrides.maxHp ?? 100,
    skills: overrides.skills ?? [],
    statusEffects: overrides.statusEffects ?? [],
    currentAction: overrides.currentAction ?? null,
    isPlayer: overrides.isPlayer ?? true,
  };
}

/**
 * Helper to create an action
 */
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

/**
 * Helper to create a combat state
 */
function createCombatState(
  players: Character[],
  enemies: Character[],
  initialActions: Action[] = []
): CombatState {
  return {
    players,
    enemies,
    tickNumber: 0,
    actionQueue: initialActions,
    eventLog: [],
    battleStatus: 'ongoing',
  };
}

describe('Enemy AI Integration', () => {
  describe('Scenario: Basic AI Action Selection', () => {
    it('should select correct skill based on rules', () => {
      // Create a skill with a rule
      const aggressiveStrike: Skill = {
        id: 'aggressive-strike',
        name: 'Aggressive Strike',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 20 }],
        rules: [
          {
            priority: 5,
            conditions: [], // Always true
          },
        ],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [aggressiveStrike],
        isPlayer: false,
      });

      const state = createCombatState([player], [enemy]);

      // AI selects action
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('aggressive-strike');
      expect(selection?.targets).toHaveLength(1);
      expect(selection!.targets[0].id).toBe('player-1');
    });

    it('should target correctly based on skill targeting mode', () => {
      const healSkill: Skill = {
        id: 'enemy-heal',
        name: 'Enemy Heal',
        baseDuration: 3,
        targeting: 'ally-lowest-hp',
        effects: [{ type: 'heal', value: 30 }],
        rules: [{ priority: 1, conditions: [] }],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy1 = createCharacter({
        id: 'enemy-1',
        name: 'Healer Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [healSkill],
        isPlayer: false,
      });

      const enemy2 = createCharacter({
        id: 'enemy-2',
        name: 'Wounded Goblin',
        maxHp: 50,
        currentHp: 10, // Lowest HP ally
        isPlayer: false,
      });

      const state = createCombatState([player], [enemy1, enemy2]);

      // AI should select heal and target the wounded ally
      const selection = selectAction(enemy1, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('enemy-heal');
      expect(selection?.targets).toHaveLength(1);
      expect(selection!.targets[0].id).toBe('enemy-2'); // Lowest HP ally
    });
  });

  describe('Scenario: Priority-Based Decision Making', () => {
    it('should prioritize higher priority rules when conditions met', () => {
      const lowPriorityStrike: Skill = {
        id: 'basic-strike',
        name: 'Basic Strike',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 10 }],
        rules: [
          {
            priority: 1, // Low priority
            conditions: [],
          },
        ],
      };

      const highPriorityBerserk: Skill = {
        id: 'berserk',
        name: 'Berserk Attack',
        baseDuration: 3,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 50 }],
        rules: [
          {
            priority: 10, // High priority
            conditions: [
              {
                type: 'hp-below',
                threshold: 50, // Only when SELF below 50% HP (evaluator condition)
              },
            ],
          },
        ],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Smart Goblin',
        maxHp: 50,
        currentHp: 20, // Below 50% threshold - triggers berserk
        skills: [lowPriorityStrike, highPriorityBerserk],
        isPlayer: false,
      });

      const state = createCombatState([player], [enemy]);

      // AI should select berserk (higher priority, enemy is low HP)
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('berserk');
    });

    it('should fall back to lower priority when higher priority conditions not met', () => {
      const lowPriorityStrike: Skill = {
        id: 'basic-strike',
        name: 'Basic Strike',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 10 }],
        rules: [
          {
            priority: 1,
            conditions: [],
          },
        ],
      };

      const highPriorityBerserk: Skill = {
        id: 'berserk',
        name: 'Berserk Attack',
        baseDuration: 3,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 50 }],
        rules: [
          {
            priority: 10,
            conditions: [
              {
                type: 'hp-below',
                threshold: 50,
              },
            ],
          },
        ],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Smart Goblin',
        maxHp: 50,
        currentHp: 50, // At 100% HP - berserk conditions not met
        skills: [lowPriorityStrike, highPriorityBerserk],
        isPlayer: false,
      });

      const state = createCombatState([player], [enemy]);

      // AI should fall back to basic strike (berserk conditions not met)
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('basic-strike');
    });
  });

  describe('Scenario: Condition-Driven Behavior', () => {
    it('should use heal when hp-below condition triggers', () => {
      const healSelf: Skill = {
        id: 'self-heal',
        name: 'Self Heal',
        baseDuration: 2,
        targeting: 'self',
        effects: [{ type: 'heal', value: 30 }],
        rules: [
          {
            priority: 10,
            conditions: [
              {
                type: 'hp-below',
                threshold: 40, // When below 40% HP
              },
            ],
          },
        ],
      };

      const attackSkill: Skill = {
        id: 'attack',
        name: 'Attack',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 15 }],
        rules: [{ priority: 1, conditions: [] }],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Survivalist Goblin',
        maxHp: 100,
        currentHp: 30, // 30% HP - below 40% threshold
        skills: [healSelf, attackSkill],
        isPlayer: false,
      });

      const state = createCombatState([player], [enemy]);

      // AI should select heal (hp-below condition met)
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('self-heal');
      expect(selection!.targets[0].id).toBe('enemy-1'); // Self-targeting
    });

    it('should react to enemy-has-status condition', () => {
      const shieldBreakerStrike: Skill = {
        id: 'shield-breaker',
        name: 'Shield Breaker',
        baseDuration: 3,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 25 }],
        rules: [
          {
            priority: 8,
            conditions: [
              {
                type: 'enemy-has-status',
                statusType: 'shielded',
              },
            ],
          },
        ],
      };

      const normalStrike: Skill = {
        id: 'normal-strike',
        name: 'Normal Strike',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 15 }],
        rules: [{ priority: 1, conditions: [] }],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Shielded Hero',
        maxHp: 100,
        currentHp: 100,
        statusEffects: [
          {
            type: 'shielded',
            duration: 3,
            value: 20,
          },
        ],
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Tactical Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [shieldBreakerStrike, normalStrike],
        isPlayer: false,
      });

      const state = createCombatState([player], [enemy]);

      // AI should select shield breaker (player has shield)
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('shield-breaker');
    });

    it('should change tactics based on ally-count condition', () => {
      const teamworkStrike: Skill = {
        id: 'teamwork-strike',
        name: 'Teamwork Strike',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 40 }],
        rules: [
          {
            priority: 9,
            conditions: [
              {
                type: 'ally-count',
                threshold: 0, // Triggers when ally-count > 0 (has allies)
              },
            ],
          },
        ],
      };

      const soloAttack: Skill = {
        id: 'solo-attack',
        name: 'Solo Attack',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 15 }],
        rules: [{ priority: 1, conditions: [] }],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy1 = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [teamworkStrike, soloAttack],
        isPlayer: false,
      });

      const enemy2 = createCharacter({
        id: 'enemy-2',
        name: 'Goblin Ally',
        maxHp: 50,
        currentHp: 50,
        isPlayer: false,
      });

      // Has an ally (ally-count > 0 is true)
      const state = createCombatState([player], [enemy1, enemy2]);

      // AI should use teamwork strike (has allies, condition met)
      const selection = selectAction(enemy1, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('teamwork-strike');
    });

    it('should not trigger ally-count condition when alone', () => {
      const teamworkStrike: Skill = {
        id: 'teamwork-strike',
        name: 'Teamwork Strike',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 40 }],
        rules: [
          {
            priority: 9,
            conditions: [
              {
                type: 'ally-count',
                threshold: 0, // Triggers when ally-count > 0
              },
            ],
          },
        ],
      };

      const soloAttack: Skill = {
        id: 'solo-attack',
        name: 'Solo Attack',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 15 }],
        rules: [{ priority: 1, conditions: [] }],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Lone Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [teamworkStrike, soloAttack],
        isPlayer: false,
      });

      // No allies (ally-count > 0 is false, condition not met)
      const state = createCombatState([player], [enemy]);

      // Should use solo attack (no allies, teamwork condition not met)
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('solo-attack');
    });
  });

  describe('Scenario: Taunt Interaction', () => {
    it('should redirect attacks to taunting player', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');

      const tank = createCharacter({
        id: 'player-1',
        name: 'Tank',
        maxHp: 150,
        currentHp: 150,
        statusEffects: [
          {
            type: 'taunting',
            duration: 3,
          },
        ],
        isPlayer: true,
      });

      const dps = createCharacter({
        id: 'player-2',
        name: 'DPS',
        maxHp: 80,
        currentHp: 40, // Lower HP than tank
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [strikeSkill],
        isPlayer: false,
      });

      const state = createCombatState([tank, dps], [enemy]);

      // AI selects action - should be forced to target taunting tank
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('strike');
      expect(selection?.targets).toHaveLength(1);
      expect(selection!.targets[0].id).toBe('player-1'); // Forced to tank, not DPS
    });

    it('should demonstrate taunt forcing in full combat', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');
      const tauntSkill = SkillLibrary.getSkill('taunt');

      const tank = createCharacter({
        id: 'player-1',
        name: 'Tank',
        maxHp: 150,
        currentHp: 150,
        skills: [tauntSkill],
        isPlayer: true,
      });

      const dps = createCharacter({
        id: 'player-2',
        name: 'DPS',
        maxHp: 80,
        currentHp: 80,
        skills: [strikeSkill],
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 15,
        currentHp: 15,
        skills: [strikeSkill],
        isPlayer: false,
      });

      // Tank taunts, DPS strikes
      const initialActions = [
        createAction('taunt', 'player-1', ['player-1'], 2),
        createAction('strike', 'player-2', ['enemy-1'], 2),
      ];

      const initialState = createCombatState([tank, dps], [enemy], initialActions);

      // Run battle
      const finalState = TickExecutor.runBattle(initialState);

      // Battle should end with victory
      expect(finalState.battleStatus).toBe('victory');

      // Verify taunt was applied
      const tauntAppliedEvent = finalState.eventLog.find(
        (e) => e.type === 'status-applied' && e.statusType === 'taunting'
      );
      expect(tauntAppliedEvent).toBeDefined();

      // Enemy should be knocked out
      const finalEnemy = finalState.enemies.find((e) => e.id === 'enemy-1');
      expect(finalEnemy?.currentHp).toBeLessThanOrEqual(0);

      // Snapshot test for event log
      expect(finalState.eventLog).toMatchSnapshot();
    });
  });

  describe('Scenario: Multi-Turn AI Combat', () => {
    it('should make decisions each turn as combat state changes', () => {
      // Create an enemy that switches tactics as health drops
      const aggressiveStrike: Skill = {
        id: 'aggressive',
        name: 'Aggressive Strike',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 20 }],
        rules: [
          {
            priority: 5,
            conditions: [], // Default action
          },
        ],
      };

      const defensiveHeal: Skill = {
        id: 'defensive',
        name: 'Defensive Heal',
        baseDuration: 2,
        targeting: 'self',
        effects: [{ type: 'heal', value: 25 }],
        rules: [
          {
            priority: 10,
            conditions: [
              {
                type: 'hp-below',
                threshold: 50,
              },
            ],
          },
        ],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Adaptive Goblin',
        maxHp: 100,
        currentHp: 100,
        skills: [aggressiveStrike, defensiveHeal],
        isPlayer: false,
      });

      // Test 1: High HP - should be aggressive
      let state = createCombatState([player], [enemy]);
      let selection = selectAction(enemy, state);
      expect(selection?.skill.id).toBe('aggressive');

      // Test 2: Drop HP below 50% - should switch to defensive
      const damagedEnemy = { ...enemy, currentHp: 40 };
      state = createCombatState([player], [damagedEnemy]);
      selection = selectAction(damagedEnemy, state);
      expect(selection?.skill.id).toBe('defensive');

      // Test 3: After healing, back above 50% - should be aggressive again
      const healedEnemy = { ...enemy, currentHp: 60 };
      state = createCombatState([player], [healedEnemy]);
      selection = selectAction(healedEnemy, state);
      expect(selection?.skill.id).toBe('aggressive');
    });

    it('should demonstrate full multi-turn battle with AI decisions', () => {
      // Setup: Enemy with conditional tactics vs player
      // Note: Phase 1 (Rule Evaluation) not yet implemented, so we manually queue actions
      const strikeSkill = SkillLibrary.getSkill('strike');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill],
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 30,
        currentHp: 30,
        skills: [strikeSkill],
        isPlayer: false,
      });

      // Queue multiple strikes to complete the battle (enemy has 30 HP, each strike deals 15 damage)
      const initialActions = [
        createAction('strike', 'player-1', ['enemy-1'], 2), // Resolves tick 3
        createAction('strike', 'player-1', ['enemy-1'], 5), // Resolves tick 6
      ];

      const initialState = createCombatState([player], [enemy], initialActions);

      // Run battle
      const finalState = TickExecutor.runBattle(initialState);

      // Battle should end (enemy has less HP, should lose)
      expect(finalState.battleStatus).toBe('victory');

      // Enemy should be knocked out
      const finalEnemy = finalState.enemies.find((e) => e.id === 'enemy-1');
      expect(finalEnemy?.currentHp).toBeLessThanOrEqual(0);

      // Verify combat progressed through multiple ticks
      expect(finalState.tickNumber).toBeGreaterThan(2);

      // Snapshot test for event log
      expect(finalState.eventLog).toMatchSnapshot();
    });

    it('should validate AI re-evaluates rules when becoming idle', () => {
      // Enemy with two skills - one for high HP, one for low HP
      const powerStrike: Skill = {
        id: 'power-strike',
        name: 'Power Strike',
        baseDuration: 3,
        targeting: 'single-enemy-lowest-hp',
        effects: [{ type: 'damage', value: 30 }],
        rules: [
          {
            priority: 5,
            conditions: [], // Always available
          },
        ],
      };

      const emergencyHeal: Skill = {
        id: 'emergency-heal',
        name: 'Emergency Heal',
        baseDuration: 1,
        targeting: 'self',
        effects: [{ type: 'heal', value: 20 }],
        rules: [
          {
            priority: 15,
            conditions: [
              {
                type: 'hp-below',
                threshold: 30,
              },
            ],
          },
        ],
      };

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Smart Goblin',
        maxHp: 100,
        currentHp: 100,
        skills: [powerStrike, emergencyHeal],
        isPlayer: false,
      });

      // Scenario 1: Full health - chooses power strike
      let state = createCombatState([player], [enemy]);
      let selection = selectAction(enemy, state);
      expect(selection?.skill.id).toBe('power-strike');

      // Scenario 2: After taking damage (below 30%) - should choose emergency heal
      const lowHpEnemy = { ...enemy, currentHp: 25 };
      state = createCombatState([player], [lowHpEnemy]);
      selection = selectAction(lowHpEnemy, state);
      expect(selection?.skill.id).toBe('emergency-heal');
      expect(selection!.targets[0].id).toBe('enemy-1'); // Targets self

      // Scenario 3: After healing back up - returns to power strike
      const recoveredEnemy = { ...enemy, currentHp: 50 };
      state = createCombatState([player], [recoveredEnemy]);
      selection = selectAction(recoveredEnemy, state);
      expect(selection?.skill.id).toBe('power-strike');
    });
  });

  describe('Scenario: AI Integration with TargetSelector and TargetFilter', () => {
    it('should respect targeting mode from skill definition', () => {
      const aoeSkill: Skill = {
        id: 'aoe-blast',
        name: 'AOE Blast',
        baseDuration: 3,
        targeting: 'all-enemies',
        effects: [{ type: 'damage', value: 15 }],
        rules: [{ priority: 1, conditions: [] }],
      };

      const player1 = createCharacter({
        id: 'player-1',
        name: 'Hero 1',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const player2 = createCharacter({
        id: 'player-2',
        name: 'Hero 2',
        maxHp: 100,
        currentHp: 100,
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'AoE Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [aoeSkill],
        isPlayer: false,
      });

      const state = createCombatState([player1, player2], [enemy]);

      // AI should select all-enemies targeting
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('aoe-blast');
      expect(selection?.targets).toHaveLength(2); // All enemies (both players)
      expect(selection?.targets.map((t) => t.id)).toEqual(
        expect.arrayContaining(['player-1', 'player-2'])
      );
    });

    it('should apply targetingOverride from rules', () => {
      const strikeSkill: Skill = {
        id: 'strike-with-override',
        name: 'Strike with Override',
        baseDuration: 2,
        targeting: 'single-enemy-lowest-hp', // Default
        effects: [{ type: 'damage', value: 20 }],
        rules: [
          {
            priority: 8,
            conditions: [
              {
                type: 'enemy-has-status',
                statusType: 'taunting',
              },
            ],
            targetingOverride: 'single-enemy-highest-hp', // Override when player taunting
          },
          {
            priority: 1,
            conditions: [],
            // No override - uses default targeting
          },
        ],
      };

      const tank = createCharacter({
        id: 'player-1',
        name: 'Tank',
        maxHp: 200,
        currentHp: 200,
        statusEffects: [{ type: 'taunting', duration: 3 }],
        isPlayer: true,
      });

      const dps = createCharacter({
        id: 'player-2',
        name: 'DPS',
        maxHp: 80,
        currentHp: 50, // Lower HP
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Smart Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [strikeSkill],
        isPlayer: false,
      });

      const state = createCombatState([tank, dps], [enemy]);

      // Should use override targeting (highest HP) because player is taunting
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.targets).toHaveLength(1);
      // Note: TargetFilter will force to taunter regardless of targeting mode
      expect(selection!.targets[0].id).toBe('player-1');
    });

    it('should exclude dead targets from selection', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');

      const alivePlayer = createCharacter({
        id: 'player-1',
        name: 'Alive Hero',
        maxHp: 100,
        currentHp: 50,
        isPlayer: true,
      });

      const deadPlayer = createCharacter({
        id: 'player-2',
        name: 'Dead Hero',
        maxHp: 100,
        currentHp: 0, // Knocked out
        isPlayer: true,
      });

      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [strikeSkill],
        isPlayer: false,
      });

      const state = createCombatState([alivePlayer, deadPlayer], [enemy]);

      // AI should only target alive player
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.targets).toHaveLength(1);
      expect(selection!.targets[0].id).toBe('player-1');
      expect(selection!.targets[0].currentHp).toBeGreaterThan(0);
    });
  });
});
