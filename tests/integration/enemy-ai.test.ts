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
        targeting: 'nearest-enemy',
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
      expect(selection!.targets[0]!.id).toBe('player-1');
    });

  });

  describe('Scenario: Priority-Based Decision Making', () => {
    it('should prioritize higher priority rules when conditions met', () => {
      const lowPriorityStrike: Skill = {
        id: 'basic-strike',
        name: 'Basic Strike',
        baseDuration: 2,
        targeting: 'nearest-enemy',
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
        targeting: 'nearest-enemy',
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
        targeting: 'nearest-enemy',
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
        targeting: 'nearest-enemy',
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
    it('should change tactics based on ally-count condition', () => {
      const teamworkStrike: Skill = {
        id: 'teamwork-strike',
        name: 'Teamwork Strike',
        baseDuration: 2,
        targeting: 'nearest-enemy',
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
        targeting: 'nearest-enemy',
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
        targeting: 'nearest-enemy',
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
        targeting: 'nearest-enemy',
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
      expect(selection!.targets[0]!.id).toBe('player-1'); // Forced to tank, not DPS
    });
  });

  describe('Scenario: Multi-Turn AI Combat', () => {
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

  });

  describe('Scenario: AI Integration with TargetSelector and TargetFilter', () => {
    it('should respect targeting mode from skill definition', () => {
      const aoeSkill: Skill = {
        id: 'aoe-blast',
        name: 'AOE Blast',
        baseDuration: 3,
        targeting: 'nearest-enemy',
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

      // AI should select nearest-enemy targeting
      const selection = selectAction(enemy, state);

      expect(selection).not.toBeNull();
      expect(selection?.skill.id).toBe('aoe-blast');
      expect(selection?.targets).toHaveLength(1); // Single nearest enemy
      expect(['player-1', 'player-2']).toContain(selection!.targets[0]!.id);
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
      expect(selection!.targets[0]!.id).toBe('player-1');
      expect(selection!.targets[0]!.currentHp).toBeGreaterThan(0);
    });
  });
});
