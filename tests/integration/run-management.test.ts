import { describe, it, expect } from 'vitest';
import { RunStateManager } from '../../src/run/run-state-manager.js';
import { CharacterProgression } from '../../src/run/character-progression.js';
import { TickExecutor } from '../../src/engine/tick-executor.js';
import { SkillLibrary } from '../../src/engine/skill-library.js';
import type {
  Character,
  Encounter,
  RunState,
  CombatState,
  Action,
  SkillUnlockChoice,
} from '../../src/types/index.js';

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
 * Helper to create an encounter
 */
function createEncounter(
  id: string,
  name: string,
  enemies: Character[],
  skillRewards: string[] = []
): Encounter {
  return {
    encounterId: id,
    name,
    enemies,
    skillRewards,
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
 * Helper to create a combat state from run state and encounter
 */
function createCombatStateFromRun(
  runState: RunState,
  initialActions: Action[] = []
): CombatState {
  const currentEncounter = RunStateManager.getCurrentEncounter(runState);

  return {
    players: runState.playerParty.map((p) => ({ ...p })),
    enemies: currentEncounter.enemies.map((e) => ({ ...e })),
    tickNumber: 0,
    actionQueue: initialActions,
    eventLog: [],
    battleStatus: 'ongoing',
  };
}

/**
 * Helper to simulate a battle victory with pre-queued actions
 */
function simulateBattleVictory(
  runState: RunState,
  playerActions: Action[]
): CombatState {
  const combatState = createCombatStateFromRun(runState, playerActions);
  return TickExecutor.runBattle(combatState);
}

/**
 * Helper to simulate a battle defeat
 */
function simulateBattleDefeat(runState: RunState, enemyActions: Action[]): CombatState {
  const combatState = createCombatStateFromRun(runState, enemyActions);
  return TickExecutor.runBattle(combatState);
}

describe('Run Management Integration', () => {
  describe('Scenario 1: Three Encounter Victory Run', () => {
    it('should initialize run with 3 encounters correctly', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill],
        isPlayer: true,
      });

      const encounter0 = createEncounter(
        'enc-0',
        'Encounter 0',
        [
          createCharacter({
            id: 'enemy-0-1',
            name: 'Goblin',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        ['heal']
      );

      const encounter1 = createEncounter(
        'enc-1',
        'Encounter 1',
        [
          createCharacter({
            id: 'enemy-1-1',
            name: 'Orc',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        ['shield']
      );

      const encounter2 = createEncounter(
        'enc-2',
        'Encounter 2',
        [
          createCharacter({
            id: 'enemy-2-1',
            name: 'Troll',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        []
      );

      const runState = RunStateManager.initializeRun('run-1', [player], [
        encounter0,
        encounter1,
        encounter2,
      ]);

      expect(runState.runId).toBe('run-1');
      expect(runState.currentEncounterIndex).toBe(0);
      expect(runState.runStatus).toBe('in-progress');
      expect(runState.encountersCleared).toBe(0);
      expect(runState.skillsUnlockedThisRun).toEqual([]);
      expect(runState.encounters).toHaveLength(3);

      // Snapshot initial state
      expect(runState).toMatchSnapshot();
    });

    it('should complete encounter 0, unlock skill, and transition to awaiting-skill-selection', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill],
        isPlayer: true,
      });

      const encounter0 = createEncounter(
        'enc-0',
        'Encounter 0',
        [
          createCharacter({
            id: 'enemy-0-1',
            name: 'Goblin',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        ['heal']
      );

      const encounter1 = createEncounter('enc-1', 'Encounter 1', [], ['shield']);
      const encounter2 = createEncounter('enc-2', 'Encounter 2', [], []);

      let runState = RunStateManager.initializeRun('run-1', [player], [
        encounter0,
        encounter1,
        encounter2,
      ]);

      // Simulate battle victory (player strikes enemy)
      const playerAction = createAction('strike', 'player-1', ['enemy-0-1'], 2);
      const battleResult = simulateBattleVictory(runState, [playerAction]);

      expect(battleResult.battleStatus).toBe('victory');

      // Handle battle result
      runState = RunStateManager.handleBattleResult(
        runState,
        TickExecutor.executeTick(battleResult)
      );

      expect(runState.runStatus).toBe('awaiting-skill-selection');
      expect(runState.encountersCleared).toBe(1);
      expect(runState.currentEncounterIndex).toBe(0);

      // Apply skill unlock
      const skillChoice: SkillUnlockChoice = {
        characterId: 'player-1',
        skillId: 'heal',
      };

      runState = RunStateManager.applySkillUnlock(runState, skillChoice);

      expect(runState.skillsUnlockedThisRun).toContain('heal');

      // Snapshot after encounter 0
      expect({
        runState,
        battleLog: battleResult.eventLog,
      }).toMatchSnapshot();
    });

    it('should progress to encounter 1, complete it, and verify encountersCleared increments', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');
      const healSkill = SkillLibrary.getSkill('heal');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill],
        isPlayer: true,
      });

      const encounter0 = createEncounter('enc-0', 'Encounter 0', [], ['heal']);
      const encounter1 = createEncounter(
        'enc-1',
        'Encounter 1',
        [
          createCharacter({
            id: 'enemy-1-1',
            name: 'Orc',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        ['shield']
      );
      const encounter2 = createEncounter('enc-2', 'Encounter 2', [], []);

      let runState = RunStateManager.initializeRun('run-1', [player], [
        encounter0,
        encounter1,
        encounter2,
      ]);

      // Simulate encounter 0 already completed (fast-forward state)
      runState = {
        ...runState,
        runStatus: 'awaiting-skill-selection',
        encountersCleared: 1,
        skillsUnlockedThisRun: ['heal'],
      };

      // Apply heal unlock to character
      const updatedPlayer = CharacterProgression.unlockSkill(player, 'heal', ['heal']);
      runState = {
        ...runState,
        playerParty: [updatedPlayer],
      };

      // Load next encounter
      runState = RunStateManager.loadNextEncounter(runState);

      expect(runState.currentEncounterIndex).toBe(1);
      expect(runState.runStatus).toBe('in-progress');

      // Battle encounter 1
      const playerAction = createAction('strike', 'player-1', ['enemy-1-1'], 2);
      const battleResult = simulateBattleVictory(runState, [playerAction]);

      expect(battleResult.battleStatus).toBe('victory');

      // Handle battle result
      runState = RunStateManager.handleBattleResult(
        runState,
        TickExecutor.executeTick(battleResult)
      );

      expect(runState.runStatus).toBe('awaiting-skill-selection');
      expect(runState.encountersCleared).toBe(2);

      // Snapshot after encounter 1
      expect({
        runState,
        battleLog: battleResult.eventLog,
      }).toMatchSnapshot();
    });

    it('should complete final encounter 2 and verify runStatus = victory', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill],
        isPlayer: true,
      });

      const encounter0 = createEncounter('enc-0', 'Encounter 0', [], []);
      const encounter1 = createEncounter('enc-1', 'Encounter 1', [], []);
      const encounter2 = createEncounter(
        'enc-2',
        'Encounter 2',
        [
          createCharacter({
            id: 'enemy-2-1',
            name: 'Troll',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        []
      );

      let runState = RunStateManager.initializeRun('run-1', [player], [
        encounter0,
        encounter1,
        encounter2,
      ]);

      // Fast-forward to encounter 2 (last encounter, no rewards)
      runState = {
        ...runState,
        currentEncounterIndex: 2,
        runStatus: 'in-progress',
        encountersCleared: 2,
      };

      // Battle final encounter
      const playerAction = createAction('strike', 'player-1', ['enemy-2-1'], 2);
      const battleResult = simulateBattleVictory(runState, [playerAction]);

      expect(battleResult.battleStatus).toBe('victory');

      // Handle battle result
      runState = RunStateManager.handleBattleResult(
        runState,
        TickExecutor.executeTick(battleResult)
      );

      expect(runState.runStatus).toBe('victory');
      expect(runState.encountersCleared).toBe(3);
      expect(RunStateManager.isRunComplete(runState)).toBe(true);

      // Snapshot final victory state
      expect({
        runState,
        battleLog: battleResult.eventLog,
      }).toMatchSnapshot();
    });
  });

  describe('Scenario 2: Early Defeat Run', () => {
    it('should handle defeat in encounter 0 and verify runStatus = defeat', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 10, // Low HP - will be defeated by enemy strike (15 damage)
        skills: [],
        isPlayer: true,
      });

      const strongEnemy = createCharacter({
        id: 'enemy-0-1',
        name: 'Strong Goblin',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill],
        isPlayer: false,
      });

      const encounter0 = createEncounter('enc-0', 'Encounter 0', [strongEnemy], ['heal']);
      const encounter1 = createEncounter('enc-1', 'Encounter 1', [], []);
      const encounter2 = createEncounter('enc-2', 'Encounter 2', [], []);

      let runState = RunStateManager.initializeRun('run-1', [player], [
        encounter0,
        encounter1,
        encounter2,
      ]);

      // Simulate battle defeat (enemy strikes player to death)
      const enemyAction = createAction('strike', 'enemy-0-1', ['player-1'], 2);
      const battleResult = simulateBattleDefeat(runState, [enemyAction]);

      expect(battleResult.battleStatus).toBe('defeat');

      // Handle battle result
      runState = RunStateManager.handleBattleResult(
        runState,
        TickExecutor.executeTick(battleResult)
      );

      expect(runState.runStatus).toBe('defeat');
      expect(runState.encountersCleared).toBe(0);
      expect(RunStateManager.isRunComplete(runState)).toBe(true);

      // Snapshot defeat state
      expect({
        runState,
        battleLog: battleResult.eventLog,
      }).toMatchSnapshot();
    });

    it('should verify cannot progress to next encounter after defeat', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 0,
        skills: [],
        isPlayer: true,
      });

      const encounter0 = createEncounter('enc-0', 'Encounter 0', [], []);
      const encounter1 = createEncounter('enc-1', 'Encounter 1', [], []);

      const runState = RunStateManager.initializeRun('run-1', [player], [
        encounter0,
        encounter1,
      ]);

      // Set to defeat state
      const defeatedRunState: RunState = {
        ...runState,
        runStatus: 'defeat',
        encountersCleared: 0,
      };

      expect(RunStateManager.canProgressToNextEncounter(defeatedRunState)).toBe(false);

      // Attempting to load next encounter should throw
      expect(() => RunStateManager.loadNextEncounter(defeatedRunState)).toThrow(
        'Cannot load next encounter after run completion'
      );
    });
  });

  describe('Scenario 3: Skill Persistence Across Encounters', () => {
    it('should unlock strike skill after encounter 0 and verify persistence', () => {
      const healSkill = SkillLibrary.getSkill('heal');
      const strikeSkill = SkillLibrary.getSkill('strike');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [healSkill],
        isPlayer: true,
      });

      const encounter0 = createEncounter(
        'enc-0',
        'Encounter 0',
        [
          createCharacter({
            id: 'enemy-0-1',
            name: 'Goblin',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        ['strike']
      );

      const encounter1 = createEncounter('enc-1', 'Encounter 1', [], []);

      let runState = RunStateManager.initializeRun('run-1', [player], [
        encounter0,
        encounter1,
      ]);

      // Simulate battle victory
      const healAction = createAction('heal', 'player-1', ['player-1'], 3);
      const strikeAction = createAction('strike', 'enemy-0-1', ['player-1'], 10); // Enemy too slow
      const battleResult = simulateBattleVictory(runState, [healAction, strikeAction]);

      // Handle victory
      runState = RunStateManager.handleBattleResult(
        runState,
        TickExecutor.executeTick(battleResult)
      );

      // Unlock strike
      const skillChoice: SkillUnlockChoice = {
        characterId: 'player-1',
        skillId: 'strike',
      };

      runState = RunStateManager.applySkillUnlock(runState, skillChoice);

      // Verify strike in skillsUnlockedThisRun
      expect(runState.skillsUnlockedThisRun).toContain('strike');

      // Apply unlock to character
      const updatedPlayer = CharacterProgression.unlockSkill(player, 'strike', ['strike']);
      runState = {
        ...runState,
        playerParty: [updatedPlayer],
      };

      // Verify strike in character's unlocked pool
      const unlockedSkills = CharacterProgression.getUnlockedSkills(
        runState.playerParty[0]!
      );
      expect(unlockedSkills.map((s) => s.id)).toContain('strike');

      // Snapshot character skill arrays
      expect({
        characterSkills: runState.playerParty[0]!.skills.map((s) => s.id),
        unlockedSkills: unlockedSkills.map((s) => s.id),
        skillsUnlockedThisRun: runState.skillsUnlockedThisRun,
      }).toMatchSnapshot();
    });

    it('should verify strike available in encounter 1 loadout and battle', () => {
      const healSkill = SkillLibrary.getSkill('heal');
      const strikeSkill = SkillLibrary.getSkill('strike');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [healSkill],
        isPlayer: true,
      });

      // Unlock strike on character
      const playerWithStrike = CharacterProgression.unlockSkill(player, 'strike', [
        'strike',
      ]);

      const encounter0 = createEncounter('enc-0', 'Encounter 0', [], []);
      const encounter1 = createEncounter(
        'enc-1',
        'Encounter 1',
        [
          createCharacter({
            id: 'enemy-1-1',
            name: 'Orc',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        []
      );

      let runState = RunStateManager.initializeRun('run-1', [playerWithStrike], [
        encounter0,
        encounter1,
      ]);

      // Fast-forward to encounter 1
      runState = {
        ...runState,
        currentEncounterIndex: 1,
        runStatus: 'in-progress',
        encountersCleared: 1,
        skillsUnlockedThisRun: ['strike'],
      };

      // Verify strike is in character's active skills
      const activeLoadout = CharacterProgression.getActiveLoadout(runState.playerParty[0]!);
      expect(activeLoadout.map((s) => s.id)).toContain('strike');

      // Battle using strike skill
      const strikeAction = createAction('strike', 'player-1', ['enemy-1-1'], 2);
      const battleResult = simulateBattleVictory(runState, [strikeAction]);

      expect(battleResult.battleStatus).toBe('victory');

      // Verify strike was used in battle (damage event from player)
      const strikeUsedEvent = battleResult.eventLog.find(
        (e) => e.type === 'damage' && e.actorId === 'player-1'
      );
      expect(strikeUsedEvent).toBeDefined();

      // Snapshot battle result with strike usage
      expect({
        activeLoadout: activeLoadout.map((s) => s.id),
        battleLog: battleResult.eventLog,
      }).toMatchSnapshot();
    });
  });

  describe('Scenario 4: Loadout Swap Between Battles', () => {
    it('should unlock 4th skill and swap active loadout', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');
      const healSkill = SkillLibrary.getSkill('heal');
      const shieldSkill = SkillLibrary.getSkill('shield');

      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill, healSkill, shieldSkill],
        isPlayer: true,
      });

      const encounter0 = createEncounter(
        'enc-0',
        'Encounter 0',
        [
          createCharacter({
            id: 'enemy-0-1',
            name: 'Goblin',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        ['defend']
      );

      const encounter1 = createEncounter('enc-1', 'Encounter 1', [], []);

      let runState = RunStateManager.initializeRun('run-1', [player], [
        encounter0,
        encounter1,
      ]);

      // Capture initial loadout
      const initialLoadout = CharacterProgression.getActiveLoadout(
        runState.playerParty[0]!
      );
      expect(initialLoadout).toHaveLength(3);

      // Simulate battle victory
      const playerAction = createAction('strike', 'player-1', ['enemy-0-1'], 2);
      const battleResult = simulateBattleVictory(runState, [playerAction]);

      // Handle victory and unlock defend
      runState = RunStateManager.handleBattleResult(
        runState,
        TickExecutor.executeTick(battleResult)
      );

      const skillChoice: SkillUnlockChoice = {
        characterId: 'player-1',
        skillId: 'defend',
      };

      runState = RunStateManager.applySkillUnlock(runState, skillChoice);

      // Apply defend unlock to character (now has 4 skills unlocked, 3 active)
      let updatedPlayer = CharacterProgression.unlockSkill(player, 'defend', ['defend']);
      runState = {
        ...runState,
        playerParty: [updatedPlayer],
      };

      // Verify 4 skills unlocked
      const unlockedSkills = CharacterProgression.getUnlockedSkills(
        runState.playerParty[0]!
      );
      expect(unlockedSkills).toHaveLength(4);
      expect(unlockedSkills.map((s) => s.id)).toEqual(
        expect.arrayContaining(['strike', 'heal', 'shield', 'defend'])
      );

      // Active loadout should still be 3 skills (original 3, defend not auto-added)
      const currentLoadout = CharacterProgression.getActiveLoadout(
        runState.playerParty[0]!
      );
      expect(currentLoadout).toHaveLength(3);

      // Snapshot before swap
      const beforeSwap = {
        unlockedSkills: unlockedSkills.map((s) => s.id),
        activeLoadout: currentLoadout.map((s) => s.id),
      };

      // Swap loadout: replace shield with defend
      updatedPlayer = CharacterProgression.setActiveLoadout(runState.playerParty[0]!, [
        'strike',
        'heal',
        'defend',
      ]);
      runState = {
        ...runState,
        playerParty: [updatedPlayer],
      };

      // Verify new loadout
      const newLoadout = CharacterProgression.getActiveLoadout(runState.playerParty[0]!);
      expect(newLoadout.map((s) => s.id)).toEqual(['strike', 'heal', 'defend']);
      expect(newLoadout).toHaveLength(3);

      // Snapshot after swap
      const afterSwap = {
        unlockedSkills: unlockedSkills.map((s) => s.id),
        activeLoadout: newLoadout.map((s) => s.id),
      };

      expect({
        beforeSwap,
        afterSwap,
      }).toMatchSnapshot();
    });

    it('should verify new loadout applies to encounter 1 battle', () => {
      const strikeSkill = SkillLibrary.getSkill('strike');
      const healSkill = SkillLibrary.getSkill('heal');
      const defendSkill = SkillLibrary.getSkill('defend');

      // Character with strike, heal, defend active (shield swapped out)
      const player = createCharacter({
        id: 'player-1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [strikeSkill, healSkill, defendSkill],
        isPlayer: true,
      });

      const encounter0 = createEncounter('enc-0', 'Encounter 0', [], []);
      const encounter1 = createEncounter(
        'enc-1',
        'Encounter 1',
        [
          createCharacter({
            id: 'enemy-1-1',
            name: 'Orc',
            maxHp: 15,
            currentHp: 15,
            skills: [strikeSkill],
            isPlayer: false,
          }),
        ],
        []
      );

      let runState = RunStateManager.initializeRun('run-1', [player], [
        encounter0,
        encounter1,
      ]);

      // Fast-forward to encounter 1 with new loadout
      runState = {
        ...runState,
        currentEncounterIndex: 1,
        runStatus: 'in-progress',
        encountersCleared: 1,
        skillsUnlockedThisRun: ['defend'],
      };

      // Battle using new loadout (defend skill)
      const defendAction = createAction('defend', 'player-1', ['player-1'], 2);
      const strikeAction = createAction('strike', 'player-1', ['enemy-1-1'], 5);
      const battleResult = simulateBattleVictory(runState, [defendAction, strikeAction]);

      expect(battleResult.battleStatus).toBe('victory');

      // Verify defend was used (defending status applied)
      const defendAppliedEvent = battleResult.eventLog.find(
        (e) => e.type === 'status-applied' && e.statusType === 'defending'
      );
      expect(defendAppliedEvent).toBeDefined();
      expect(defendAppliedEvent?.actorId).toBe('player-1');

      // Snapshot battle with new loadout
      expect({
        activeLoadout: runState.playerParty[0]!.skills.map((s) => s.id),
        battleLog: battleResult.eventLog,
      }).toMatchSnapshot();
    });
  });
});
