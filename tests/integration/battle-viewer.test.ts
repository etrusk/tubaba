import { describe, it, expect } from 'vitest';
import { BattleController } from '../../src/ui/battle-controller.js';
import { renderCharacterCard } from '../../src/ui/character-card.js';
import { renderDebugInspector } from '../../src/ui/debug-inspector.js';
import { renderEventLog } from '../../src/ui/event-log.js';
import { TickExecutor } from '../../src/engine/tick-executor.js';
import { SkillLibrary } from '../../src/engine/skill-library.js';
import type { CombatState, Character, Action } from '../../src/types/index.js';

/**
 * Helper to create a character
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

/**
 * Helper function to render all battle viewer components together
 * Simulates BattleViewer integration
 */
function renderBattleViewer(state: CombatState, debugInfo?: any): string {
  const playersHtml = state.players.map(p => renderCharacterCard(p)).join('\n');
  const enemiesHtml = state.enemies.map(e => renderCharacterCard(e)).join('\n');
  const eventLogHtml = renderEventLog(state.eventLog);
  const debugHtml = debugInfo ? renderDebugInspector(debugInfo) : '';

  return `<div class="battle-viewer">
  <div class="players">${playersHtml}</div>
  <div class="enemies">${enemiesHtml}</div>
  ${eventLogHtml}
  ${debugHtml}
</div>`;
}

describe('BattleViewer Integration', () => {
  describe('Component Integration', () => {
    it('should render all components together without errors', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 80,
        skills: [strike],
        isPlayer: true,
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [strike],
        isPlayer: false,
      });
      
      const state = createCombatState([player], [enemy]);
      const html = renderBattleViewer(state);
      
      // Verify all components are present
      expect(html).toContain('battle-viewer');
      expect(html).toContain('Hero');
      expect(html).toContain('Goblin');
      expect(html).toContain('event-log');
      expect(html).toContain('players');
      expect(html).toContain('enemies');
    });

    it('should render CharacterCard for each player and enemy', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const players = [
        createCharacter({ id: 'p1', name: 'Warrior', skills: [strike] }),
        createCharacter({ id: 'p2', name: 'Mage', skills: [strike] }),
        createCharacter({ id: 'p3', name: 'Rogue', skills: [strike] }),
      ];
      
      const enemies = [
        createCharacter({ id: 'e1', name: 'Orc', isPlayer: false, skills: [strike] }),
        createCharacter({ id: 'e2', name: 'Troll', isPlayer: false, skills: [strike] }),
      ];
      
      const state = createCombatState(players, enemies);
      const html = renderBattleViewer(state);
      
      // Verify all characters rendered
      expect(html).toContain('Warrior');
      expect(html).toContain('Mage');
      expect(html).toContain('Rogue');
      expect(html).toContain('Orc');
      expect(html).toContain('Troll');
      
      // Count character cards (3 players + 2 enemies)
      const cardMatches = html.match(/character-card/g);
      expect(cardMatches).toHaveLength(5);
    });

    it('should show DebugInspector with debug info after tick with debug', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        skills: [strike],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        skills: [strike],
        isPlayer: false,
      });
      
      const initialActions = [
        createAction('strike', 'player-1', ['enemy-1'], 2),
      ];
      
      const state = createCombatState([player], [enemy], initialActions);
      
      // Execute tick with debug
      const tickResult = TickExecutor.executeTickWithDebug(state);
      const html = renderBattleViewer(tickResult.updatedState, tickResult.debugInfo);
      
      // Verify debug inspector is present
      expect(html).toContain('debug-inspector');
      expect(html).toContain('Rule Evaluations');
    });

    it('should accumulate events in EventLog across ticks', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        currentHp: 100,
        skills: [strike],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        currentHp: 50,
        skills: [strike],
        isPlayer: false,
      });
      
      const initialActions = [
        createAction('strike', 'player-1', ['enemy-1'], 2),
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      
      // Execute multiple ticks
      const controller = new BattleController(initialState);
      controller.step(); // Tick 1
      controller.step(); // Tick 2
      controller.step(); // Tick 3 - strike resolves
      
      const currentState = controller.getCurrentState();
      const html = renderBattleViewer(currentState);
      
      // Verify event log contains accumulated events
      expect(html).toContain('event-log');
      expect(currentState.eventLog.length).toBeGreaterThan(0);
      
      // Events should appear in the HTML
      const eventMatches = html.match(/class="event/g);
      expect(eventMatches).not.toBeNull();
      expect(eventMatches!.length).toBeGreaterThan(0);
    });

    it('should update all component views when BattleController steps', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strike],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [strike],
        isPlayer: false,
      });
      
      const initialActions = [
        createAction('strike', 'player-1', ['enemy-1'], 2),
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      const controller = new BattleController(initialState);
      
      // Render initial state
      const initialHtml = renderBattleViewer(controller.getCurrentState());
      expect(initialHtml).toContain('battle-viewer');
      
      // Step forward
      controller.step();
      controller.step();
      controller.step(); // Strike resolves
      
      const updatedState = controller.getCurrentState();
      const updatedHtml = renderBattleViewer(updatedState);
      
      // Verify state changed
      expect(updatedState.tickNumber).toBe(3);
      expect(updatedHtml).not.toBe(initialHtml);
      
      // Verify enemy took damage
      const finalEnemy = updatedState.enemies.find(e => e.id === 'enemy-1');
      expect(finalEnemy!.currentHp).toBeLessThan(50);
    });

    it('should show character status effects in CharacterCards', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        skills: [strike],
        statusEffects: [
          { type: 'shielded', duration: 3, value: 20 },
          { type: 'poisoned', duration: 2, value: 5 },
        ],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        skills: [strike],
        isPlayer: false,
        statusEffects: [
          { type: 'stunned', duration: 1 },
        ],
      });
      
      const state = createCombatState([player], [enemy]);
      const html = renderBattleViewer(state);
      
      // Verify status effects are rendered
      expect(html).toContain('Shielded');
      expect(html).toContain('Poisoned');
      expect(html).toContain('Stunned');
      expect(html).toContain('status shielded');
      expect(html).toContain('status poisoned');
      expect(html).toContain('status stunned');
    });
  });

  describe('Full Battle Flow', () => {
    it('should initialize → step → verify state changes', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strike],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 30,
        currentHp: 30,
        skills: [strike],
        isPlayer: false,
      });
      
      const initialActions = [
        createAction('strike', 'player-1', ['enemy-1'], 2),
        createAction('strike', 'player-1', ['enemy-1'], 5), // Second strike
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      const controller = new BattleController(initialState);
      
      // Initial state
      expect(controller.getCurrentTick()).toBe(0);
      expect(controller.getCurrentState().battleStatus).toBe('ongoing');
      
      // Step through battle
      controller.step(); // Tick 1
      expect(controller.getCurrentTick()).toBe(1);
      
      controller.step(); // Tick 2
      controller.step(); // Tick 3 - first strike resolves
      
      const state3 = controller.getCurrentState();
      expect(state3.tickNumber).toBe(3);
      
      // Enemy should have taken damage
      const enemyAfterStrike = state3.enemies.find(e => e.id === 'enemy-1');
      expect(enemyAfterStrike!.currentHp).toBeLessThan(30);
      
      // Continue to second strike
      controller.step(); // Tick 4
      controller.step(); // Tick 5
      controller.step(); // Tick 6 - second strike resolves
      
      const finalState = controller.getCurrentState();
      
      // Enemy should be defeated
      expect(finalState.battleStatus).toBe('victory');
      const finalEnemy = finalState.enemies.find(e => e.id === 'enemy-1');
      expect(finalEnemy!.currentHp).toBe(0);
    });

    it('should play through complete battle until victory', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strike],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Weak Goblin',
        maxHp: 15,
        currentHp: 15,
        skills: [strike],
        isPlayer: false,
      });
      
      const initialActions = [
        createAction('strike', 'player-1', ['enemy-1'], 2),
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      
      // Run battle to completion
      const finalState = TickExecutor.runBattle(initialState);
      
      // Verify victory
      expect(finalState.battleStatus).toBe('victory');
      expect(finalState.enemies[0]!.currentHp).toBe(0);
      
      // Render final state
      const html = renderBattleViewer(finalState);
      expect(html).toContain('Weak Goblin');
      expect(html).toContain('0/15'); // Enemy KO'd
      expect(html).toContain('KO'); // KO indicator
    });

    it('should play through complete battle until defeat', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Weak Hero',
        maxHp: 15,
        currentHp: 15,
        skills: [strike],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Strong Orc',
        maxHp: 100,
        currentHp: 100,
        skills: [strike],
        isPlayer: false,
      });
      
      const initialActions = [
        createAction('strike', 'enemy-1', ['player-1'], 2),
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      
      // Run battle to completion
      const finalState = TickExecutor.runBattle(initialState);
      
      // Verify defeat
      expect(finalState.battleStatus).toBe('defeat');
      expect(finalState.players[0]!.currentHp).toBe(0);
      
      // Render final state
      const html = renderBattleViewer(finalState);
      expect(html).toContain('Weak Hero');
      expect(html).toContain('0/15'); // Player KO'd
      expect(html).toContain('KO'); // KO indicator
    });

    it('should handle step back to restore all component views', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strike],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [strike],
        isPlayer: false,
      });
      
      const initialActions = [
        createAction('strike', 'player-1', ['enemy-1'], 2),
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      const controller = new BattleController(initialState);
      
      // Step forward multiple times
      controller.step(); // Tick 1
      controller.step(); // Tick 2
      controller.step(); // Tick 3 - strike resolves
      
      const state3 = controller.getCurrentState();
      const html3 = renderBattleViewer(state3);
      
      expect(state3.tickNumber).toBe(3);
      
      // Step back
      controller.stepBack(); // Back to tick 2
      const state2 = controller.getCurrentState();
      const html2 = renderBattleViewer(state2);
      
      expect(state2.tickNumber).toBe(2);
      expect(html2).not.toBe(html3);
      
      // Enemy HP should be restored
      const enemyTick2 = state2.enemies.find(e => e.id === 'enemy-1');
      const enemyTick3 = state3.enemies.find(e => e.id === 'enemy-1');
      expect(enemyTick2!.currentHp).toBeGreaterThan(enemyTick3!.currentHp);
      
      // Step back to initial
      controller.stepBack(); // Back to tick 1
      controller.stepBack(); // Back to tick 0
      
      const state0 = controller.getCurrentState();
      expect(state0.tickNumber).toBe(0);
      expect(state0.enemies[0]!.currentHp).toBe(50); // Original HP
    });

    it('should reset and clear all components', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strike],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [strike],
        isPlayer: false,
      });
      
      const initialActions = [
        createAction('strike', 'player-1', ['enemy-1'], 2),
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      const controller = new BattleController(initialState);
      
      // Step forward
      controller.step();
      controller.step();
      controller.step();
      
      expect(controller.getCurrentTick()).toBe(3);
      
      // Reset
      controller.reset();
      
      const resetState = controller.getCurrentState();
      expect(resetState.tickNumber).toBe(0);
      expect(resetState.eventLog.length).toBe(0);
      expect(resetState.enemies[0]!.currentHp).toBe(50); // Original HP
      
      // Render reset state
      const html = renderBattleViewer(resetState);
      expect(html).toContain('Hero');
      expect(html).toContain('Goblin');
      expect(html).toContain('50/50'); // Enemy at full HP
    });
  });

  describe('Snapshot Tests', () => {
    it('should match snapshot for initial state', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strike],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [strike],
        isPlayer: false,
      });
      
      const state = createCombatState([player], [enemy]);
      const html = renderBattleViewer(state);
      
      expect(html).toMatchSnapshot();
    });

    it('should match snapshot for battle at specific tick', () => {
      const strike = SkillLibrary.getSkill('strike');
      const poison = SkillLibrary.getSkill('poison');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strike, poison],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [strike],
        isPlayer: false,
      });
      
      const initialActions = [
        createAction('poison', 'player-1', ['enemy-1'], 2),
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      const controller = new BattleController(initialState);
      
      // Step to tick 5 (poison applied at tick 3, active for 2 ticks)
      for (let i = 0; i < 5; i++) {
        controller.step();
      }
      
      const state = controller.getCurrentState();
      const html = renderBattleViewer(state);
      
      expect(html).toMatchSnapshot();
    });

    it('should produce deterministic rendering for same input', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 80,
        skills: [strike],
        statusEffects: [
          { type: 'shielded', duration: 2, value: 15 },
        ],
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 30,
        skills: [strike],
        isPlayer: false,
        statusEffects: [
          { type: 'poisoned', duration: 3, value: 5 },
        ],
      });
      
      const state = createCombatState([player], [enemy]);
      
      // Render multiple times
      const html1 = renderBattleViewer(state);
      const html2 = renderBattleViewer(state);
      const html3 = renderBattleViewer(state);
      
      // All renders should be identical
      expect(html1).toBe(html2);
      expect(html2).toBe(html3);
      
      // Snapshot for regression testing
      expect(html1).toMatchSnapshot();
    });
  });

  describe('Debug Inspector Integration', () => {
    it('should display rule evaluations in debug panel', () => {
      const strike = SkillLibrary.getSkill('strike');
      
      // Create character with rules (enemy AI)
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Smart Goblin',
        maxHp: 100,
        currentHp: 50,
        skills: [
          {
            ...strike,
            rules: [
              {
                priority: 10,
                conditions: [
                  { type: 'hp-below' as const, threshold: 60 },
                ],
              },
            ],
          },
        ],
        isPlayer: false,
      });
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        skills: [strike],
      });
      
      const state = createCombatState([player], [enemy]);
      
      // Execute with debug
      const tickResult = TickExecutor.executeTickWithDebug(state);
      const html = renderBattleViewer(tickResult.updatedState, tickResult.debugInfo);
      
      // Verify debug info is rendered
      expect(html).toContain('Rule Evaluations');
      expect(html).toContain('Smart Goblin');
    });

  });
});
