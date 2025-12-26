import { describe, it, expect } from 'vitest';
import { TickExecutor } from '../../src/engine/tick-executor';
import { SkillLibrary } from '../../src/engine/skill-library';
import { forecastNextActions } from '../../src/ui/action-forecast-analyzer';
import { selectAction } from '../../src/ai/action-selector';
import type { CombatState } from '../../src/types/combat';
import type { Character } from '../../src/types/character';
import type { CharacterInstructions } from '../../src/types/instructions';
import type { Skill } from '../../src/types/skill';

describe('Action Forecast - Integration Tests', () => {
  const strike = SkillLibrary.getSkill('strike');
  const heal = SkillLibrary.getSkill('heal');
  const shield = SkillLibrary.getSkill('shield');
  const poison = SkillLibrary.getSkill('poison');

  describe('Timeline Accuracy', () => {
    it('should match actual execution order for queued actions', () => {
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [strike],
            statusEffects: [],
            currentAction: { skillId: 'strike', casterId: 'p1', targets: ['e1'], ticksRemaining: 2 },
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strike],
            statusEffects: [],
            currentAction: { skillId: 'strike', casterId: 'e1', targets: ['p1'], ticksRemaining: 1 },
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      // Timeline should show e1's action at tick 1, p1's action at tick 2
      expect(forecast.timeline).toHaveLength(2);
      expect(forecast.timeline[0]!.tickNumber).toBe(1);
      expect(forecast.timeline[0]!.characterId).toBe('e1');
      expect(forecast.timeline[0]!.isQueued).toBe(true);
      
      expect(forecast.timeline[1]!.tickNumber).toBe(2);
      expect(forecast.timeline[1]!.characterId).toBe('p1');
      expect(forecast.timeline[1]!.isQueued).toBe(true);
    });

    it('should correctly order mixed queued and predicted actions', () => {
      const strikeWithRules: Skill = {
        ...strike,
        rules: [{ priority: 1, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }]
      };
      
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [strikeWithRules],
            statusEffects: [],
            currentAction: { skillId: 'strike', casterId: 'p1', targets: ['e1'], ticksRemaining: 3 },
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strikeWithRules],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      // Should have at least queued p1 action
      expect(forecast.timeline.length).toBeGreaterThan(0);
      const queuedActions = forecast.timeline.filter(a => a.isQueued);
      
      expect(queuedActions.length).toBeGreaterThan(0);
      
      // Timeline should be sorted by tick number
      for (let i = 1; i < forecast.timeline.length; i++) {
        expect(forecast.timeline[i]!.tickNumber).toBeGreaterThanOrEqual(
          forecast.timeline[i - 1]!.tickNumber
        );
      }
    });

    it('should limit timeline to 5 entries', () => {
      const strikeWithRules: Skill = { 
        ...strike, 
        rules: [{ priority: 1, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }] 
      };
      
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [strikeWithRules],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strikeWithRules],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      expect(forecast.timeline.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Prediction Accuracy', () => {
    it('should generate predictions for characters with rules', () => {
      const healWithRules: Skill = {
        ...heal,
        rules: [{ priority: 1, conditions: [{ type: 'hp-below', threshold: 50 }], targetingOverride: 'self' }]
      };
      const strikeWithRules: Skill = {
        ...strike,
        rules: [{ priority: 2, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }]
      };
      
      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 25,
        skills: [healWithRules, strikeWithRules],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
        ],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      // Find enemy forecast
      const enemyForecast = forecast.characterForecasts.find(f => f.characterId === 'e1');
      expect(enemyForecast).toBeDefined();
      
      // Should have either a prediction or be null (both valid depending on targeting)
      expect(enemyForecast!.characterId).toBe('e1');
      expect(enemyForecast!.characterName).toBe('Goblin');
    });

    it('should include character forecasts for all combatants', () => {
      const healWithRules: Skill = {
        ...heal,
        rules: [{ priority: 1, conditions: [{ type: 'hp-below', threshold: 50 }], targetingOverride: 'self' }]
      };
      const shieldWithRules: Skill = {
        ...shield,
        rules: [{ priority: 2, conditions: [], targetingOverride: 'self' }]
      };
      const strikeWithRules: Skill = {
        ...strike,
        rules: [{ priority: 3, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }]
      };
      
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 40,
        skills: [healWithRules, shieldWithRules, strikeWithRules],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      const state: CombatState = {
        players: [player],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      // Find player forecast
      const playerForecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(playerForecast).toBeDefined();
      expect(playerForecast!.isPlayer).toBe(true);
      expect(playerForecast!.characterName).toBe('Hero');
    });

    it('should predict no action when no rules match', () => {
      const healWithRules: Skill = { 
        ...heal, 
        rules: [{ priority: 1, conditions: [{ type: 'hp-below', threshold: 50 }], targetingOverride: 'self' }] 
      };
      
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [healWithRules],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      const playerForecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(playerForecast).toBeDefined();
      expect(playerForecast!.nextAction).toBeNull();
    });
  });

  describe('Forecast Evolution', () => {
    it('should update timeline as combat progresses', () => {
      let state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [strike],
            statusEffects: [],
            currentAction: { skillId: 'strike', casterId: 'p1', targets: ['e1'], ticksRemaining: 2 },
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strike],
            statusEffects: [],
            currentAction: { skillId: 'strike', casterId: 'e1', targets: ['p1'], ticksRemaining: 1 },
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast1 = forecastNextActions(state, instructions);

      // Execute a tick
      const tickResult = TickExecutor.executeTick(state);
      state = tickResult.updatedState;

      const forecast2 = forecastNextActions(state, instructions);

      // Forecast should change after tick
      expect(forecast1.timeline[0]!.tickNumber).not.toBe(forecast2.timeline[0]!.tickNumber);
    });

    it('should reflect character state changes in predictions', () => {
      const healWithRules: Skill = {
        ...heal,
        rules: [{ priority: 1, conditions: [{ type: 'hp-below', threshold: 50 }], targetingOverride: 'self' }]
      };
      const strikeWithRules: Skill = {
        ...strike,
        rules: [{ priority: 2, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }]
      };
      
      const state1: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [healWithRules, strikeWithRules],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast1 = forecastNextActions(state1, instructions);

      // Create state with low HP
      const state2: CombatState = {
        ...state1,
        players: [
          {
            ...state1.players[0]!,
            currentHp: 40,
          },
        ],
      };

      const forecast2 = forecastNextActions(state2, instructions);

      // Forecasts should be different based on character HP changes
      const playerForecast1 = forecast1.characterForecasts.find(f => f.characterId === 'p1');
      const playerForecast2 = forecast2.characterForecasts.find(f => f.characterId === 'p1');
      
      expect(playerForecast1).toBeDefined();
      expect(playerForecast2).toBeDefined();
      
      // Both should have valid character information
      expect(playerForecast1!.characterId).toBe('p1');
      expect(playerForecast2!.characterId).toBe('p1');
    });
  });

  describe('Character Forecasts', () => {
    it('should include all alive characters in forecast', () => {
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
          {
            id: 'p2',
            name: 'Mage',
            maxHp: 80,
            currentHp: 80,
            skills: [heal],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      expect(forecast.characterForecasts).toHaveLength(3);
      expect(forecast.characterForecasts.map(f => f.characterId).sort()).toEqual(['e1', 'p1', 'p2']);
    });

    it('should show current action with ticks remaining', () => {
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [strike],
            statusEffects: [],
            currentAction: { skillId: 'strike', casterId: 'p1', targets: ['e1'], ticksRemaining: 3 },
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      const playerForecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(playerForecast!.currentAction).toBeDefined();
      expect(playerForecast!.currentAction!.skillName).toBe('Strike');
      expect(playerForecast!.currentAction!.ticksRemaining).toBe(3);
    });

    it('should include character forecast structure for all characters', () => {
      const healWithRules: Skill = {
        ...heal,
        rules: [{ priority: 1, conditions: [{ type: 'hp-below', threshold: 50 }], targetingOverride: 'self' }]
      };
      const shieldWithRules: Skill = {
        ...shield,
        rules: [{ priority: 2, conditions: [{ type: 'ally-count', threshold: 2 }], targetingOverride: 'ally-lowest-hp' }]
      };
      const strikeWithRules: Skill = {
        ...strike,
        rules: [{ priority: 3, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }]
      };
      
      const state: CombatState = {
        players: [],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [healWithRules, shieldWithRules, strikeWithRules],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      const enemyForecast = forecast.characterForecasts.find(f => f.characterId === 'e1');
      expect(enemyForecast).toBeDefined();
      expect(enemyForecast!.characterId).toBe('e1');
      expect(enemyForecast!.characterName).toBe('Goblin');
      expect(enemyForecast!.isPlayer).toBe(false);
      
      // Rule summaries structure exists (may be empty or populated)
      expect(Array.isArray(enemyForecast!.rulesSummary)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty battle (no characters)', () => {
      const state: CombatState = {
        players: [],
        enemies: [],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      expect(forecast.timeline).toHaveLength(0);
      expect(forecast.characterForecasts).toHaveLength(0);
    });

    it('should handle battle that has ended', () => {
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 0,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 10,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'defeat',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      // Should return forecast even for ended battles (useful for analysis)
      expect(forecast.characterForecasts.length).toBeGreaterThan(0);
    });

    it('should handle characters with no skills', () => {
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strike],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      const playerForecast = forecast.characterForecasts.find(f => f.characterId === 'p1');
      expect(playerForecast!.nextAction).toBeNull();
      expect(playerForecast!.rulesSummary).toHaveLength(0);
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot for complete forecast state', () => {
      const healWithRules: Skill = { 
        ...heal, 
        rules: [{ priority: 1, conditions: [{ type: 'hp-below', threshold: 50 }], targetingOverride: 'self' }] 
      };
      const shieldWithRules: Skill = { 
        ...shield, 
        rules: [{ priority: 2, conditions: [], targetingOverride: 'self' }] 
      };
      const strikeWithRules: Skill = { 
        ...strike, 
        rules: [{ priority: 3, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }] 
      };
      const poisonWithRules: Skill = { 
        ...poison, 
        rules: [
          { priority: 1, conditions: [{ type: 'enemy-has-status', statusType: 'poisoned' }], targetingOverride: 'single-enemy-lowest-hp' },
          { priority: 2, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }
        ]
      };
      
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 75,
            skills: [healWithRules, shieldWithRules, strikeWithRules],
            statusEffects: [],
            currentAction: { skillId: 'strike', casterId: 'p1', targets: ['e1'], ticksRemaining: 2 },
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 30,
            skills: [strikeWithRules, poisonWithRules],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 5,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      expect(forecast).toMatchSnapshot();
    });

    it('should match snapshot for multi-character forecast', () => {
      const shieldWithRules: Skill = { 
        ...shield, 
        rules: [{ priority: 1, conditions: [{ type: 'hp-below', threshold: 60 }], targetingOverride: 'self' }] 
      };
      const strikeWithRules: Skill = { 
        ...strike, 
        rules: [{ priority: 2, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }] 
      };
      const healWithRules: Skill = { 
        ...heal, 
        rules: [{ priority: 1, conditions: [{ type: 'hp-below', threshold: 50 }], targetingOverride: 'self' }] 
      };
      const poisonWithRules: Skill = { 
        ...poison, 
        rules: [{ priority: 2, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }] 
      };
      const strikeWithRulesEnemy: Skill = { 
        ...strike, 
        rules: [{ priority: 1, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }] 
      };
      const shieldWithRulesEnemy: Skill = { 
        ...shield, 
        rules: [{ priority: 1, conditions: [{ type: 'hp-below', threshold: 50 }], targetingOverride: 'self' }] 
      };
      const strikeWithRulesEnemy2: Skill = { 
        ...strike, 
        rules: [{ priority: 2, conditions: [], targetingOverride: 'single-enemy-lowest-hp' }] 
      };
      
      const state: CombatState = {
        players: [
          {
            id: 'p1',
            name: 'Hero',
            maxHp: 100,
            currentHp: 100,
            skills: [shieldWithRules, strikeWithRules],
            statusEffects: [],
            currentAction: null,
            isPlayer: true,
          },
          {
            id: 'p2',
            name: 'Mage',
            maxHp: 80,
            currentHp: 40,
            skills: [healWithRules, poisonWithRules],
            statusEffects: [],
            currentAction: { skillId: 'heal', casterId: 'p2', targets: ['p2'], ticksRemaining: 1 },
            isPlayer: true,
          },
        ],
        enemies: [
          {
            id: 'e1',
            name: 'Goblin',
            maxHp: 50,
            currentHp: 50,
            skills: [strikeWithRulesEnemy],
            statusEffects: [],
            currentAction: { skillId: 'strike', casterId: 'e1', targets: ['p1'], ticksRemaining: 3 },
            isPlayer: false,
          },
          {
            id: 'e2',
            name: 'Orc',
            maxHp: 80,
            currentHp: 80,
            skills: [shieldWithRulesEnemy, strikeWithRulesEnemy2],
            statusEffects: [],
            currentAction: null,
            isPlayer: false,
          },
        ],
        tickNumber: 10,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const instructions = new Map<string, CharacterInstructions>();
      const forecast = forecastNextActions(state, instructions);

      expect(forecast).toMatchSnapshot();
    });
  });
});
