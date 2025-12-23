import { describe, it, expect } from 'vitest';
import type { Character } from '../../src/types/character.js';
import type { CombatState, Action } from '../../src/types/combat.js';
import type { Skill, Condition } from '../../src/types/skill.js';
import type { CharacterInstructions } from '../../src/types/instructions.js';
import type { StatusEffect } from '../../src/types/status.js';
import { forecastNextActions } from '../../src/ui/action-forecast-analyzer.js';

/**
 * Test helper: Create a mock character
 */
function createTestCharacter(
  id: string,
  name: string,
  currentHp: number,
  maxHp: number,
  isPlayer: boolean,
  skills: Skill[] = [],
  statusEffects: StatusEffect[] = [],
  currentAction: Action | null = null
): Character {
  return {
    id,
    name,
    maxHp,
    currentHp,
    skills,
    statusEffects,
    currentAction,
    isPlayer,
  };
}

/**
 * Test helper: Create a combat state
 */
function createTestCombatState(
  players: Character[],
  enemies: Character[],
  tickNumber: number = 10,
  actionQueue: Action[] = []
): CombatState {
  return {
    players,
    enemies,
    tickNumber,
    actionQueue,
    eventLog: [],
    battleStatus: 'ongoing',
  };
}

/**
 * Test helper: Create a skill
 */
function createTestSkill(
  id: string,
  name: string,
  targeting: Skill['targeting'],
  rules?: Skill['rules']
): Skill {
  return {
    id,
    name,
    baseDuration: 3,
    effects: [{ type: 'damage', value: 10 }],
    targeting,
    rules,
  };
}

/**
 * Test helper: Create character instructions
 */
function createInstructions(
  characterId: string,
  controlMode: 'human' | 'ai',
  skillInstructions: CharacterInstructions['skillInstructions'] = []
): CharacterInstructions {
  return {
    characterId,
    controlMode,
    skillInstructions,
  };
}

describe('ActionForecastAnalyzer', () => {
  describe('forecastNextActions - timeline with queued actions', () => {
    it('should include queued actions in timeline', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      player.currentAction = {
        skillId: 'strike',
        casterId: 'p1',
        targets: ['e1'],
        ticksRemaining: 2,
      };
      
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      const instructions = new Map<string, CharacterInstructions>();
      
      const forecast = forecastNextActions(state, instructions);
      
      expect(forecast.timeline).toHaveLength(1);
      expect(forecast.timeline[0]).toEqual({
        tickNumber: 12, // Current tick 10 + 2 ticks remaining
        characterId: 'p1',
        characterName: 'Warrior',
        skillName: 'Strike',
        targetNames: ['Goblin'],
        isQueued: true,
      });
    });

    it('should order timeline by tick number', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const healSkill = createTestSkill('heal', 'Heal', 'self');
      
      const player1 = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      player1.currentAction = {
        skillId: 'strike',
        casterId: 'p1',
        targets: ['e1'],
        ticksRemaining: 3,
      };
      
      const player2 = createTestCharacter('p2', 'Mage', 80, 100, true, [healSkill]);
      player2.currentAction = {
        skillId: 'heal',
        casterId: 'p2',
        targets: ['p2'],
        ticksRemaining: 1,
      };
      
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player1, player2], [enemy], 10);
      const instructions = new Map<string, CharacterInstructions>();
      
      const forecast = forecastNextActions(state, instructions);
      
      expect(forecast.timeline).toHaveLength(2);
      expect(forecast.timeline[0].tickNumber).toBe(11); // Mage heals first
      expect(forecast.timeline[0].characterName).toBe('Mage');
      expect(forecast.timeline[1].tickNumber).toBe(13); // Warrior strikes later
      expect(forecast.timeline[1].characterName).toBe('Warrior');
    });

    it('should handle multiple actions at same tick with deterministic ordering', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      
      const player1 = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      player1.currentAction = {
        skillId: 'strike',
        casterId: 'p1',
        targets: ['e1'],
        ticksRemaining: 2,
      };
      
      const player2 = createTestCharacter('p2', 'Rogue', 90, 100, true, [strikeSkill]);
      player2.currentAction = {
        skillId: 'strike',
        casterId: 'p2',
        targets: ['e1'],
        ticksRemaining: 2,
      };
      
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player1, player2], [enemy], 10);
      const instructions = new Map<string, CharacterInstructions>();
      
      const forecast = forecastNextActions(state, instructions);
      
      expect(forecast.timeline).toHaveLength(2);
      expect(forecast.timeline[0].tickNumber).toBe(12);
      expect(forecast.timeline[1].tickNumber).toBe(12);
      // Players should come before enemies in ties (both are players here, so order preserved)
      expect(forecast.timeline[0].characterId).toBe('p1');
      expect(forecast.timeline[1].characterId).toBe('p2');
    });
  });

  describe('forecastNextActions - prediction accuracy', () => {
    it('should predict next action using actual AI logic', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp', [
        { priority: 10, conditions: [] }
      ]);
      
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'ai', [
        {
          skillId: 'strike',
          priority: 100,
          conditions: [],
          enabled: true,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast).toBeDefined();
      expect(p1Forecast?.nextAction).not.toBeNull();
      expect(p1Forecast?.nextAction?.skillName).toBe('Strike');
      expect(p1Forecast?.nextAction?.targetNames).toEqual(['Goblin']);
    });

    it('should combine queued and predicted actions in timeline', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp', [
        { priority: 10, conditions: [] }
      ]);
      
      const player1 = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      player1.currentAction = {
        skillId: 'strike',
        casterId: 'p1',
        targets: ['e1'],
        ticksRemaining: 2,
      };
      
      const player2 = createTestCharacter('p2', 'Rogue', 90, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player1, player2], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p2', createInstructions('p2', 'ai', [
        {
          skillId: 'strike',
          priority: 100,
          conditions: [],
          enabled: true,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      expect(forecast.timeline.length).toBeGreaterThan(0);
      const queuedAction = forecast.timeline.find(e => e.isQueued);
      const predictedAction = forecast.timeline.find(e => !e.isQueued);
      
      expect(queuedAction).toBeDefined();
      expect(queuedAction?.characterId).toBe('p1');
      expect(predictedAction).toBeDefined();
      expect(predictedAction?.characterId).toBe('p2');
    });

    it('should predict based on conditions matching current state', () => {
      const healSkill = createTestSkill('heal', 'Heal', 'self', [
        { priority: 100, conditions: [{ type: 'hp-below', threshold: 50 }] }
      ]);
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp', [
        { priority: 50, conditions: [] }
      ]);
      
      const player = createTestCharacter('p1', 'Warrior', 40, 100, true, [healSkill, strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'ai', [
        {
          skillId: 'heal',
          priority: 100,
          conditions: [{ type: 'hp-below', threshold: 50 }],
          enabled: true,
        },
        {
          skillId: 'strike',
          priority: 50,
          conditions: [],
          enabled: true,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.nextAction?.skillName).toBe('Heal');
      expect(p1Forecast?.nextAction?.reason).toContain('HP < 50%');
    });
  });

  describe('forecastNextActions - character forecasts', () => {
    it('should include current action for character with queued action', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      player.currentAction = {
        skillId: 'strike',
        casterId: 'p1',
        targets: ['e1'],
        ticksRemaining: 2,
      };
      
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      const instructions = new Map<string, CharacterInstructions>();
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.currentAction).not.toBeNull();
      expect(p1Forecast?.currentAction?.skillName).toBe('Strike');
      expect(p1Forecast?.currentAction?.targetNames).toEqual(['Goblin']);
      expect(p1Forecast?.currentAction?.ticksRemaining).toBe(2);
    });

    it('should have null current action for idle character', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      const instructions = new Map<string, CharacterInstructions>();
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.currentAction).toBeNull();
    });

    it('should include all alive characters in forecasts', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player1 = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const player2 = createTestCharacter('p2', 'Mage', 80, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false, [strikeSkill]);
      const state = createTestCombatState([player1, player2], [enemy], 10);
      const instructions = new Map<string, CharacterInstructions>();
      
      const forecast = forecastNextActions(state, instructions);
      
      expect(forecast.characterForecasts).toHaveLength(3);
      expect(forecast.characterForecasts.map(f => f.characterId).sort()).toEqual(['e1', 'p1', 'p2']);
    });

    it('should exclude dead characters from forecasts', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player1 = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const player2 = createTestCharacter('p2', 'Mage', 0, 100, true, [strikeSkill]); // Dead
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false, [strikeSkill]);
      const state = createTestCombatState([player1, player2], [enemy], 10);
      const instructions = new Map<string, CharacterInstructions>();
      
      const forecast = forecastNextActions(state, instructions);
      
      expect(forecast.characterForecasts).toHaveLength(2);
      expect(forecast.characterForecasts.find(f => f.characterId === 'p2')).toBeUndefined();
    });
  });

  describe('forecastNextActions - rule summaries', () => {
    it('should generate human-readable rule summaries', () => {
      const healSkill = createTestSkill('heal', 'Heal', 'self');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [healSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'ai', [
        {
          skillId: 'heal',
          priority: 100,
          conditions: [{ type: 'hp-below', threshold: 50 }],
          enabled: true,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.rulesSummary).toHaveLength(1);
      expect(p1Forecast?.rulesSummary[0]).toEqual({
        priority: 100,
        skillName: 'Heal',
        tickCost: 3,
        conditionsText: 'If HP < 50%',
        targetingMode: 'Self',
        enabled: true,
      });
    });

    it('should format multiple conditions with AND logic', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'ai', [
        {
          skillId: 'strike',
          priority: 100,
          conditions: [
            { type: 'hp-below', threshold: 80 },
            { type: 'ally-count', threshold: 1 }
          ],
          enabled: true,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.rulesSummary[0].conditionsText).toBe('If HP < 80% AND Ally Count > 1');
    });

    it('should show "Always" for empty conditions', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'ai', [
        {
          skillId: 'strike',
          priority: 50,
          conditions: [],
          enabled: true,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.rulesSummary[0].conditionsText).toBe('Always');
    });

    it('should include targeting override in rule summary', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'ai', [
        {
          skillId: 'strike',
          priority: 50,
          conditions: [],
          targetingOverride: 'all-enemies',
          enabled: true,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.rulesSummary[0].targetingMode).toBe('All Enemies');
    });

    it('should mark disabled rules', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'ai', [
        {
          skillId: 'strike',
          priority: 50,
          conditions: [],
          enabled: false,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.rulesSummary[0].enabled).toBe(false);
    });
  });

  describe('forecastNextActions - edge cases', () => {
    it('should handle character with no instructions (human mode)', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'human', []));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.nextAction).toBeNull();
      expect(p1Forecast?.rulesSummary).toHaveLength(0);
    });

    it('should handle character with no matching rules', () => {
      const healSkill = createTestSkill('heal', 'Heal', 'self');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [healSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'ai', [
        {
          skillId: 'heal',
          priority: 100,
          conditions: [{ type: 'hp-below', threshold: 30 }],
          enabled: true,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.nextAction).toBeNull();
    });

    it('should limit timeline to next 5 actions', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp', [
        { priority: 10, conditions: [] }
      ]);
      
      const players: Character[] = [];
      for (let i = 1; i <= 10; i++) {
        const player = createTestCharacter(`p${i}`, `Player${i}`, 100, 100, true, [strikeSkill]);
        players.push(player);
      }
      
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState(players, [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      for (let i = 1; i <= 10; i++) {
        instructions.set(`p${i}`, createInstructions(`p${i}`, 'ai', [
          {
            skillId: 'strike',
            priority: 100,
            conditions: [],
            enabled: true,
          }
        ]));
      }
      
      const forecast = forecastNextActions(state, instructions);
      
      expect(forecast.timeline.length).toBeLessThanOrEqual(5);
    });

    it('should handle stunned character prediction', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp', [
        { priority: 10, conditions: [] }
      ]);
      
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill], [
        { type: 'stunned', duration: 2 }
      ]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      instructions.set('p1', createInstructions('p1', 'ai', [
        {
          skillId: 'strike',
          priority: 100,
          conditions: [],
          enabled: true,
        }
      ]));
      
      const forecast = forecastNextActions(state, instructions);
      
      const p1Forecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(p1Forecast?.nextAction).toBeNull(); // Stunned characters can't act
    });

    it('should handle empty instruction map', () => {
      const strikeSkill = createTestSkill('strike', 'Strike', 'single-enemy-lowest-hp');
      const player = createTestCharacter('p1', 'Warrior', 100, 100, true, [strikeSkill]);
      const enemy = createTestCharacter('e1', 'Goblin', 50, 50, false);
      const state = createTestCombatState([player], [enemy], 10);
      
      const instructions = new Map<string, CharacterInstructions>();
      
      const forecast = forecastNextActions(state, instructions);
      
      expect(forecast.characterForecasts).toHaveLength(2);
      expect(forecast.timeline.length).toBe(0); // No predictions without instructions
    });
  });
});
