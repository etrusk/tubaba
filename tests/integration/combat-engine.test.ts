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

  describe('Scenario 2: Poison vs Heal Race', () => {
    it('should apply poison and deal tick damage over time', () => {
      // Setup: Player poisons enemy (low HP), poison kills over time
      // Poison: 2 ticks to cast, applies 6-tick poison dealing 5 damage/tick
      const poisonSkill = SkillLibrary.getSkill('poison');
      const strikeSkill = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Poisoner',
        maxHp: 100,
        currentHp: 100,
        skills: [poisonSkill, strikeSkill],
        isPlayer: true,
      });
      
      // Enemy with 25 HP - poison will apply on tick 3, then tick 5 times (ticks 4-8)
      // Total poison damage: 5 ticks * 5 damage = 25 damage
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Weak Enemy',
        maxHp: 25,
        currentHp: 25,
        skills: [strikeSkill],
        isPlayer: false,
      });
      
      // Queue poison action (will cast on tick 3, apply poison status)
      const initialActions = [
        createAction('poison', 'player-1', ['enemy-1'], 2),
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      
      // Run battle
      const finalState = TickExecutor.runBattle(initialState);
      
      // Battle should end with victory (poison kills enemy)
      expect(finalState.battleStatus).toBe('victory');
      
      // Verify poison status was applied
      const poisonAppliedEvent = finalState.eventLog.find(
        e => e.type === 'status-applied' && e.statusType === 'poisoned'
      );
      expect(poisonAppliedEvent).toBeDefined();
      
      // Enemy should be knocked out
      const finalEnemy = finalState.enemies.find(e => e.id === 'enemy-1');
      expect(finalEnemy?.currentHp).toBeLessThanOrEqual(0);
      
      // Snapshot test for full event log
      expect(finalState.eventLog).toMatchSnapshot();
    });
  });

  describe('Scenario 3: Taunt Tank Strategy', () => {
    it('should apply taunt status and demonstrate status interaction', () => {
      // Setup: Tank uses Taunt (self-buff), then DPS finishes low-HP enemy
      const tauntSkill = SkillLibrary.getSkill('taunt');
      const strikeSkill = SkillLibrary.getSkill('strike');
      
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
        name: 'Enemy',
        maxHp: 15,
        currentHp: 15,
        skills: [strikeSkill],
        isPlayer: false,
      });
      
      // Queue actions: Tank taunts (tick 3), DPS strikes (tick 3)
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
        e => e.type === 'status-applied' && e.statusType === 'taunting'
      );
      expect(tauntAppliedEvent).toBeDefined();
      
      // Enemy should be knocked out
      const finalEnemy = finalState.enemies.find(e => e.id === 'enemy-1');
      expect(finalEnemy?.currentHp).toBeLessThanOrEqual(0);
      
      // Snapshot test for full event log
      expect(finalState.eventLog).toMatchSnapshot();
    });
  });

  describe('Scenario 4: Interrupt Spam', () => {
    it('should cancel enemy channeled attack with interrupt', () => {
      // Setup: Player interrupts enemy heavy strike (4-tick channel)
      // Interrupt resolves tick 2, Heavy Strike would resolve tick 5
      const interruptSkill = SkillLibrary.getSkill('interrupt');
      const heavyStrikeSkill = SkillLibrary.getSkill('heavy-strike');
      const strikeSkill = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Interrupter',
        maxHp: 100,
        currentHp: 100,
        skills: [interruptSkill, strikeSkill],
        isPlayer: true,
      });
      
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Heavy Striker',
        maxHp: 10,
        currentHp: 10,
        skills: [heavyStrikeSkill],
        isPlayer: false,
      });
      
      // Queue actions: Interrupt (1 tick), enemy's Heavy Strike (4 ticks)
      // Multiple interrupts and strikes to finish enemy
      const initialActions = [
        createAction('interrupt', 'player-1', ['enemy-1'], 1), // Resolves tick 2
        createAction('strike', 'player-1', ['enemy-1'], 3),    // Resolves tick 4
        createAction('heavy-strike', 'enemy-1', ['player-1'], 4), // Cancelled by interrupt
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      
      // Run battle
      const finalState = TickExecutor.runBattle(initialState);
      
      // Battle should end with victory
      expect(finalState.battleStatus).toBe('victory');
      
      // Enemy should be knocked out
      const finalEnemy = finalState.enemies.find(e => e.id === 'enemy-1');
      expect(finalEnemy?.currentHp).toBeLessThanOrEqual(0);
      
      // Verify damage events from player occurred
      const playerDamageEvents = finalState.eventLog.filter(
        e => e.type === 'damage' && e.actorId === 'player-1'
      );
      expect(playerDamageEvents.length).toBeGreaterThan(0);
      
      // Snapshot test for full event log
      expect(finalState.eventLog).toMatchSnapshot();
    });
  });

  describe('Scenario 5: Execute Finisher', () => {
    it('should deal execute damage when target below 25% HP threshold', () => {
      // Setup: Player with Execute, enemy at low HP (below 25% threshold)
      // Execute deals 50 damage with 3-tick cast time
      const executeSkill = SkillLibrary.getSkill('execute');
      const strikeSkill = SkillLibrary.getSkill('strike');
      
      const player = createCharacter({
        id: 'player-1',
        name: 'Executioner',
        maxHp: 100,
        currentHp: 100,
        skills: [executeSkill, strikeSkill],
        isPlayer: true,
      });
      
      // Enemy at 20 HP (20% of 100 max), below 25% threshold
      const enemy = createCharacter({
        id: 'enemy-1',
        name: 'Low HP Enemy',
        maxHp: 100,
        currentHp: 20,
        skills: [strikeSkill],
        isPlayer: false,
      });
      
      // Queue Execute action (3 ticks to cast)
      const initialActions = [
        createAction('execute', 'player-1', ['enemy-1'], 3),
      ];
      
      const initialState = createCombatState([player], [enemy], initialActions);
      
      // Run battle
      const finalState = TickExecutor.runBattle(initialState);
      
      // Battle should end with victory
      expect(finalState.battleStatus).toBe('victory');
      
      // Enemy should be knocked out (Execute deals 50 damage to 20 HP enemy)
      const finalEnemy = finalState.enemies.find(e => e.id === 'enemy-1');
      expect(finalEnemy?.currentHp).toBeLessThanOrEqual(0);
      
      // Verify damage was dealt to enemy
      const damageEvents = finalState.eventLog.filter(
        e => e.type === 'damage' && e.targetId === 'enemy-1'
      );
      expect(damageEvents.length).toBeGreaterThan(0);
      
      // Snapshot test for full event log
      expect(finalState.eventLog).toMatchSnapshot();
    });
  });
});
