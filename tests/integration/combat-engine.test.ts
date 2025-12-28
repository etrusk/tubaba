import { describe, it, expect } from 'vitest';
import { TickExecutor } from '../../src/engine/tick-executor.js';
import { SkillLibrary } from '../../src/engine/skill-library.js';
import type { CombatState, Character, Action } from '../../src/types/index.js';

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
 * Helper to create a combat state with initial actions queued
 *
 * Note: Rule Evaluation (Phase 1) is not yet implemented, so we manually
 * queue initial actions to kickstart the battle for integration tests.
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

describe('Combat Engine Integration', () => {
  describe('Scenario 1: 3 Strikers vs 1 Heavy Enemy', () => {
    it('should defeat enemy through simultaneous damage', () => {
      // Setup: 3 players with Strike (15 dmg, 2 ticks), 1 enemy with 45 HP
      // Expected: All 3 strikes resolve simultaneously on tick 3, dealing 45 total damage
      const strikeSkill = SkillLibrary.getSkill('strike');
      
      const player1 = createCharacter({
        id: 'player-1',
        name: 'Striker 1',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill],
        isPlayer: true,
      });
      
      const player2 = createCharacter({
        id: 'player-2',
        name: 'Striker 2',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill],
        isPlayer: true,
      });
      
      const player3 = createCharacter({
        id: 'player-3',
        name: 'Striker 3',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill],
        isPlayer: true,
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Heavy Enemy',
        maxHp: 45,
        currentHp: 45,
        skills: [strikeSkill],
        isPlayer: false,
      });
      
      // Queue initial actions at tick 2 (will resolve on tick 3)
      // Strike has baseDuration 2, so starts at 2 ticks remaining
      const initialActions = [
        createAction('strike', 'player-1', ['enemy-1'], 2),
        createAction('strike', 'player-2', ['enemy-1'], 2),
        createAction('strike', 'player-3', ['enemy-1'], 2),
      ];
      
      const initialState = createCombatState([player1, player2, player3], [enemy], initialActions);
      
      // Run battle
      const finalState = TickExecutor.runBattle(initialState);
      
      // Validate victory condition
      expect(finalState.battleStatus).toBe('victory');
      
      // Enemy should be knocked out (HP <= 0)
      const finalEnemy = finalState.enemies.find(e => e.id === 'enemy-1');
      expect(finalEnemy?.currentHp).toBeLessThanOrEqual(0);
      
      // Snapshot test for full event log
      expect(finalState.eventLog).toMatchSnapshot();
    });
  });
});
