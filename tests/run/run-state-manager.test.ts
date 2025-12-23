import { describe, it, expect } from 'vitest';
import type {
  Character,
  TickResult,
  CombatState,
  RunState,
  Encounter,
  SkillUnlockChoice,
} from '../../src/types/index.js';

/**
 * RunStateManager Test Suite (TDD - Tests First)
 *
 * Tests the run state machine that manages encounter progression:
 * - Run initialization with party and encounter list
 * - Battle victory → awaiting-skill-selection transition
 * - Skill selection → next encounter progression
 * - Battle defeat handling and run termination
 * - Run completion detection (final encounter victory)
 * - Mid-run state tracking (encountersCleared, skillsUnlockedThisRun)
 *
 * Implementation: src/run/run-state-manager.ts (Task 21)
 */

// Mock RunStateManager interface (will be implemented in Task 21)
interface RunStateManagerType {
  initializeRun(
    runId: string,
    playerParty: Character[],
    encounters: Encounter[]
  ): RunState;
  
  handleBattleResult(
    runState: RunState,
    tickResult: TickResult
  ): RunState;
  
  applySkillUnlock(
    runState: RunState,
    choice: SkillUnlockChoice
  ): RunState;
  
  loadNextEncounter(runState: RunState): RunState;
  
  getCurrentEncounter(runState: RunState): Encounter;
  
  canProgressToNextEncounter(runState: RunState): boolean;
  
  isRunComplete(runState: RunState): boolean;
}

// Import actual implementation (will fail until implemented)
import { RunStateManager } from '../../src/run/run-state-manager.js';

// Use real implementation
const manager: RunStateManagerType = RunStateManager;

// Test helpers
function createTestCharacter(
  id: string,
  name: string = `Character ${id}`,
  maxHp: number = 100,
  currentHp: number = 100,
  isPlayer: boolean = true
): Character {
  return {
    id,
    name,
    maxHp,
    currentHp,
    skills: [],
    statusEffects: [],
    currentAction: null,
    isPlayer,
  };
}

function createTestEncounter(
  encounterId: string,
  name: string,
  enemyCount: number = 2,
  skillRewards: string[] = ['strike']
): Encounter {
  const enemies: Character[] = [];
  for (let i = 0; i < enemyCount; i++) {
    enemies.push(
      createTestCharacter(
        `enemy-${encounterId}-${i + 1}`,
        `Enemy ${i + 1}`,
        100,
        100,
        false
      )
    );
  }

  return {
    encounterId,
    name,
    enemies,
    skillRewards,
  };
}

function createTickResult(
  battleEnded: boolean,
  battleStatus: 'ongoing' | 'victory' | 'defeat',
  players: Character[] = [],
  enemies: Character[] = []
): TickResult {
  const combatState: CombatState = {
    players,
    enemies,
    tickNumber: 10,
    actionQueue: [],
    eventLog: [],
    battleStatus,
  };

  return {
    updatedState: combatState,
    events: [],
    battleEnded,
  };
}

describe('RunStateManager - AC35: Run Initialization', () => {
  it('should initialize run with valid party and encounters', () => {
    const playerParty = [
      createTestCharacter('player-1', 'Warrior'),
      createTestCharacter('player-2', 'Mage'),
      createTestCharacter('player-3', 'Healer'),
    ];

    const encounters = [
      createTestEncounter('enc-1', 'Forest Ambush', 2, ['heavy-strike']),
      createTestEncounter('enc-2', 'Mountain Pass', 3, ['fireball']),
      createTestEncounter('enc-3', 'Boss Battle', 1, ['execute']),
    ];

    const runState = manager.initializeRun('run-001', playerParty, encounters);

    expect(runState.runId).toBe('run-001');
    expect(runState.currentEncounterIndex).toBe(0);
    expect(runState.encounters).toEqual(encounters);
    expect(runState.playerParty).toEqual(playerParty);
    expect(runState.runStatus).toBe('in-progress');
    expect(runState.encountersCleared).toBe(0);
    expect(runState.skillsUnlockedThisRun).toEqual([]);
  });

  it('should start at encounter 0 with in-progress status', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [createTestEncounter('enc-1', 'First Battle')];

    const runState = manager.initializeRun('run-002', playerParty, encounters);

    expect(runState.currentEncounterIndex).toBe(0);
    expect(runState.runStatus).toBe('in-progress');
  });

  it('should handle single encounter run', () => {
    const playerParty = [createTestCharacter('player-1', 'Solo')];
    const encounters = [createTestEncounter('enc-1', 'Solo Battle')];

    const runState = manager.initializeRun('run-003', playerParty, encounters);

    expect(runState.encounters.length).toBe(1);
    expect(runState.currentEncounterIndex).toBe(0);
  });

  it('should throw validation error for empty party', () => {
    const encounters = [createTestEncounter('enc-1', 'Battle')];

    expect(() => {
      manager.initializeRun('run-004', [], encounters);
    }).toThrow();
  });

  it('should throw validation error for empty encounter list', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];

    expect(() => {
      manager.initializeRun('run-005', playerParty, []);
    }).toThrow();
  });

  it('should generate unique runId for each run', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [createTestEncounter('enc-1', 'Battle')];

    const run1 = manager.initializeRun('run-001', playerParty, encounters);
    const run2 = manager.initializeRun('run-002', playerParty, encounters);

    expect(run1.runId).not.toBe(run2.runId);
  });
});

describe('RunStateManager - AC36: Battle Victory → Skill Selection', () => {
  it('should transition to awaiting-skill-selection on battle victory', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['heavy-strike']),
      createTestEncounter('enc-2', 'Battle 2', 2, ['fireball']),
    ];

    const runState = manager.initializeRun('run-010', playerParty, encounters);

    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    const updatedState = manager.handleBattleResult(runState, victoryResult);

    expect(updatedState.runStatus).toBe('awaiting-skill-selection');
  });

  it('should keep current encounter index on victory', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1'),
      createTestEncounter('enc-2', 'Battle 2'),
    ];

    const runState = manager.initializeRun('run-011', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    const updatedState = manager.handleBattleResult(runState, victoryResult);

    // Encounter index should not change until skill selection completes
    expect(updatedState.currentEncounterIndex).toBe(0);
  });

  it('should increment encountersCleared on victory', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1'),
      createTestEncounter('enc-2', 'Battle 2'),
    ];

    const runState = manager.initializeRun('run-012', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    const updatedState = manager.handleBattleResult(runState, victoryResult);

    expect(updatedState.encountersCleared).toBe(1);
  });

  it('should skip to next encounter if no skill rewards available', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, []), // No rewards
      createTestEncounter('enc-2', 'Battle 2'),
    ];

    const runState = manager.initializeRun('run-013', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    const updatedState = manager.handleBattleResult(runState, victoryResult);

    // Should skip skill selection and go directly to in-progress for next encounter
    expect(updatedState.runStatus).toBe('in-progress');
    expect(updatedState.currentEncounterIndex).toBe(1);
  });

  it('should not change status on ongoing battle', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [createTestEncounter('enc-1', 'Battle 1')];

    const runState = manager.initializeRun('run-014', playerParty, encounters);
    const ongoingResult = createTickResult(false, 'ongoing', playerParty, []);
    const updatedState = manager.handleBattleResult(runState, ongoingResult);

    expect(updatedState.runStatus).toBe('in-progress');
  });
});

describe('RunStateManager - AC37: Skill Selection → Encounter Progression', () => {
  it('should increment currentEncounterIndex after skill selection', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['heavy-strike']),
      createTestEncounter('enc-2', 'Battle 2', 2, ['fireball']),
    ];

    let runState = manager.initializeRun('run-020', playerParty, encounters);
    
    // Win first battle
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    // Apply skill unlock
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'heavy-strike',
    };
    runState = manager.applySkillUnlock(runState, choice);
    
    // Load next encounter
    const updatedState = manager.loadNextEncounter(runState);

    expect(updatedState.currentEncounterIndex).toBe(1);
  });

  it('should transition to in-progress status after loading next encounter', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['strike']),
      createTestEncounter('enc-2', 'Battle 2', 2, ['heal']),
    ];

    let runState = manager.initializeRun('run-021', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'strike',
    };
    runState = manager.applySkillUnlock(runState, choice);
    const updatedState = manager.loadNextEncounter(runState);

    expect(updatedState.runStatus).toBe('in-progress');
  });

  it('should load new encounter enemies into CombatState', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['strike']),
      createTestEncounter('enc-2', 'Battle 2', 3, ['heal']), // 3 enemies
    ];

    let runState = manager.initializeRun('run-022', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'strike',
    };
    runState = manager.applySkillUnlock(runState, choice);
    const updatedState = manager.loadNextEncounter(runState);

    const currentEncounter = manager.getCurrentEncounter(updatedState);
    expect(currentEncounter.enemies.length).toBe(3);
  });

  it('should record skill unlock in skillsUnlockedThisRun', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['heavy-strike']),
    ];

    let runState = manager.initializeRun('run-023', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'heavy-strike',
    };
    const updatedState = manager.applySkillUnlock(runState, choice);

    expect(updatedState.skillsUnlockedThisRun).toContain('heavy-strike');
  });

  it('should validate skill is in encounter rewards', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['heavy-strike']),
    ];

    let runState = manager.initializeRun('run-024', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    const invalidChoice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'fireball', // Not in rewards
    };

    expect(() => {
      manager.applySkillUnlock(runState, invalidChoice);
    }).toThrow();
  });

  it('should validate character exists in party', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['heavy-strike']),
    ];

    let runState = manager.initializeRun('run-025', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    const invalidChoice: SkillUnlockChoice = {
      characterId: 'player-99', // Non-existent
      skillId: 'heavy-strike',
    };

    expect(() => {
      manager.applySkillUnlock(runState, invalidChoice);
    }).toThrow();
  });
});

describe('RunStateManager - AC38: Battle Defeat Handling', () => {
  it('should set runStatus to defeat on battle defeat', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [createTestEncounter('enc-1', 'Battle 1')];

    const runState = manager.initializeRun('run-030', playerParty, encounters);
    const defeatResult = createTickResult(true, 'defeat', [], []);
    const updatedState = manager.handleBattleResult(runState, defeatResult);

    expect(updatedState.runStatus).toBe('defeat');
  });

  it('should not increment encountersCleared on defeat', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [createTestEncounter('enc-1', 'Battle 1')];

    const runState = manager.initializeRun('run-031', playerParty, encounters);
    const defeatResult = createTickResult(true, 'defeat', [], []);
    const updatedState = manager.handleBattleResult(runState, defeatResult);

    expect(updatedState.encountersCleared).toBe(0);
  });

  it('should block progression after defeat', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1'),
      createTestEncounter('enc-2', 'Battle 2'),
    ];

    let runState = manager.initializeRun('run-032', playerParty, encounters);
    const defeatResult = createTickResult(true, 'defeat', [], []);
    runState = manager.handleBattleResult(runState, defeatResult);

    expect(manager.canProgressToNextEncounter(runState)).toBe(false);
  });

  it('should not allow loadNextEncounter after defeat', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1'),
      createTestEncounter('enc-2', 'Battle 2'),
    ];

    let runState = manager.initializeRun('run-033', playerParty, encounters);
    const defeatResult = createTickResult(true, 'defeat', [], []);
    runState = manager.handleBattleResult(runState, defeatResult);

    expect(() => {
      manager.loadNextEncounter(runState);
    }).toThrow();
  });

  it('should handle defeat at any encounter index', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['strike']),
      createTestEncounter('enc-2', 'Battle 2', 2, ['heal']),
      createTestEncounter('enc-3', 'Battle 3', 2, ['shield']),
    ];

    let runState = manager.initializeRun('run-034', playerParty, encounters);
    
    // Win first encounter
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'strike',
    };
    runState = manager.applySkillUnlock(runState, choice);
    runState = manager.loadNextEncounter(runState);
    
    // Lose second encounter
    const defeatResult = createTickResult(true, 'defeat', [], []);
    runState = manager.handleBattleResult(runState, defeatResult);

    expect(runState.runStatus).toBe('defeat');
    expect(runState.encountersCleared).toBe(1); // Only first encounter cleared
    expect(runState.currentEncounterIndex).toBe(1);
  });
});

describe('RunStateManager - AC39: Run Completion Detection', () => {
  it('should set runStatus to victory on final encounter victory', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Final Battle', 2, []),
    ];

    let runState = manager.initializeRun('run-040', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);

    // No skill rewards, so should go directly to victory
    expect(runState.runStatus).toBe('victory');
  });

  it('should detect run completion when all encounters cleared', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['strike']),
      createTestEncounter('enc-2', 'Battle 2', 2, ['heal']),
    ];

    let runState = manager.initializeRun('run-041', playerParty, encounters);
    
    // Win first encounter
    let victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    const choice1: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'strike',
    };
    runState = manager.applySkillUnlock(runState, choice1);
    runState = manager.loadNextEncounter(runState);
    
    // Win final encounter
    victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    const choice2: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'heal',
    };
    runState = manager.applySkillUnlock(runState, choice2);

    // No more encounters, should complete run
    expect(manager.isRunComplete(runState)).toBe(true);
    expect(runState.runStatus).toBe('victory');
  });

  it('should set encountersCleared to total count on run completion', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, []),
      createTestEncounter('enc-2', 'Battle 2', 2, []),
      createTestEncounter('enc-3', 'Battle 3', 2, []),
    ];

    let runState = manager.initializeRun('run-042', playerParty, encounters);
    
    // Win all encounters (no skill rewards for simplicity)
    for (let i = 0; i < 3; i++) {
      const victoryResult = createTickResult(true, 'victory', playerParty, []);
      runState = manager.handleBattleResult(runState, victoryResult);
      if (i < 2) {
        runState = manager.loadNextEncounter(runState);
      }
    }

    expect(runState.encountersCleared).toBe(3);
    expect(runState.runStatus).toBe('victory');
  });

  it('should transition from awaiting-skill-selection to victory on final encounter', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Final Boss', 2, ['execute']),
    ];

    let runState = manager.initializeRun('run-043', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    // Should be awaiting skill selection
    expect(runState.runStatus).toBe('awaiting-skill-selection');
    
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'execute',
    };
    runState = manager.applySkillUnlock(runState, choice);

    // After skill unlock, should detect run completion
    expect(runState.runStatus).toBe('victory');
  });

  it('should not allow loading next encounter after run completion', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Only Battle', 2, []),
    ];

    let runState = manager.initializeRun('run-044', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);

    expect(() => {
      manager.loadNextEncounter(runState);
    }).toThrow();
  });
});

describe('RunStateManager - AC40: Mid-Run State Tracking', () => {
  it('should track encountersCleared across multiple victories', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, []),
      createTestEncounter('enc-2', 'Battle 2', 2, []),
      createTestEncounter('enc-3', 'Battle 3', 2, []),
    ];

    let runState = manager.initializeRun('run-050', playerParty, encounters);
    
    // Win first encounter
    let victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    expect(runState.encountersCleared).toBe(1);
    runState = manager.loadNextEncounter(runState);
    
    // Win second encounter
    victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    expect(runState.encountersCleared).toBe(2);
  });

  it('should accumulate skillsUnlockedThisRun across encounters', () => {
    const playerParty = [
      createTestCharacter('player-1', 'Warrior'),
      createTestCharacter('player-2', 'Mage'),
    ];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['heavy-strike']),
      createTestEncounter('enc-2', 'Battle 2', 2, ['fireball']),
    ];

    let runState = manager.initializeRun('run-051', playerParty, encounters);
    
    // Win first encounter, unlock heavy-strike
    let victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    const choice1: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'heavy-strike',
    };
    runState = manager.applySkillUnlock(runState, choice1);
    expect(runState.skillsUnlockedThisRun).toEqual(['heavy-strike']);
    runState = manager.loadNextEncounter(runState);
    
    // Win second encounter, unlock fireball
    victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    const choice2: SkillUnlockChoice = {
      characterId: 'player-2',
      skillId: 'fireball',
    };
    runState = manager.applySkillUnlock(runState, choice2);
    
    expect(runState.skillsUnlockedThisRun).toEqual(['heavy-strike', 'fireball']);
  });

  it('should persist playerParty state across encounters', () => {
    const playerParty = [
      createTestCharacter('player-1', 'Warrior', 100, 75), // Damaged
    ];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['heal']),
      createTestEncounter('enc-2', 'Battle 2', 2, []),
    ];

    let runState = manager.initializeRun('run-052', playerParty, encounters);
    
    // Win first encounter
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'heal',
    };
    runState = manager.applySkillUnlock(runState, choice);
    runState = manager.loadNextEncounter(runState);

    // Party state should persist
    expect(runState.playerParty[0]!.id).toBe('player-1');
  });

  it('should maintain currentEncounterIndex through state transitions', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['strike']),
      createTestEncounter('enc-2', 'Battle 2', 2, ['heal']),
    ];

    let runState = manager.initializeRun('run-053', playerParty, encounters);
    expect(runState.currentEncounterIndex).toBe(0);
    
    // Win and unlock skill
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    expect(runState.currentEncounterIndex).toBe(0); // Still on first encounter
    
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'strike',
    };
    runState = manager.applySkillUnlock(runState, choice);
    expect(runState.currentEncounterIndex).toBe(0); // Still on first encounter
    
    runState = manager.loadNextEncounter(runState);
    expect(runState.currentEncounterIndex).toBe(1); // Now on second encounter
  });
});

describe('RunStateManager - Standard Coverage: encountersCleared', () => {
  it('should increment encountersCleared for each victory', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, []),
    ];

    let runState = manager.initializeRun('run-060', playerParty, encounters);
    expect(runState.encountersCleared).toBe(0);
    
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    expect(runState.encountersCleared).toBe(1);
  });

  it('should not decrement encountersCleared on defeat', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, []),
      createTestEncounter('enc-2', 'Battle 2', 2, []),
    ];

    let runState = manager.initializeRun('run-061', playerParty, encounters);
    
    // Win first
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    expect(runState.encountersCleared).toBe(1);
    runState = manager.loadNextEncounter(runState);
    
    // Lose second
    const defeatResult = createTickResult(true, 'defeat', [], []);
    runState = manager.handleBattleResult(runState, defeatResult);
    
    expect(runState.encountersCleared).toBe(1); // Should not change
  });
});

describe('RunStateManager - Standard Coverage: skillsUnlockedThisRun', () => {
  it('should append skill IDs to skillsUnlockedThisRun', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['strike', 'heal']),
    ];

    let runState = manager.initializeRun('run-070', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'strike',
    };
    runState = manager.applySkillUnlock(runState, choice);

    expect(runState.skillsUnlockedThisRun).toContain('strike');
    expect(runState.skillsUnlockedThisRun.length).toBe(1);
  });

  it('should maintain order of unlocked skills', () => {
    const playerParty = [
      createTestCharacter('player-1', 'Warrior'),
      createTestCharacter('player-2', 'Mage'),
    ];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['strike', 'heal', 'shield']),
    ];

    let runState = manager.initializeRun('run-071', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    // Unlock in specific order
    const choice1: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'strike',
    };
    runState = manager.applySkillUnlock(runState, choice1);
    
    const choice2: SkillUnlockChoice = {
      characterId: 'player-2',
      skillId: 'heal',
    };
    runState = manager.applySkillUnlock(runState, choice2);

    expect(runState.skillsUnlockedThisRun).toEqual(['strike', 'heal']);
  });
});

describe('RunStateManager - Standard Coverage: Encounter Loading', () => {
  it('should load encounter enemies correctly', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounter1 = createTestEncounter('enc-1', 'Battle 1', 3, []);
    const encounters = [encounter1];

    const runState = manager.initializeRun('run-080', playerParty, encounters);
    const currentEncounter = manager.getCurrentEncounter(runState);

    expect(currentEncounter.enemies.length).toBe(3);
    expect(currentEncounter.enemies[0]!.isPlayer).toBe(false);
  });

  it('should get current encounter by index', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Forest'),
      createTestEncounter('enc-2', 'Mountain'),
      createTestEncounter('enc-3', 'Castle'),
    ];

    let runState = manager.initializeRun('run-081', playerParty, encounters);
    
    expect(manager.getCurrentEncounter(runState).name).toBe('Forest');
    
    // Progress to next
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    runState = manager.loadNextEncounter(runState);
    
    expect(manager.getCurrentEncounter(runState).name).toBe('Mountain');
  });

  it('should preserve encounter data during progression', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['strike']),
      createTestEncounter('enc-2', 'Battle 2', 3, ['heal', 'shield']),
    ];

    let runState = manager.initializeRun('run-082', playerParty, encounters);
    
    // Win first
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    const choice: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'strike',
    };
    runState = manager.applySkillUnlock(runState, choice);
    runState = manager.loadNextEncounter(runState);
    
    const currentEncounter = manager.getCurrentEncounter(runState);
    expect(currentEncounter.encounterId).toBe('enc-2');
    expect(currentEncounter.skillRewards).toEqual(['heal', 'shield']);
  });
});

describe('RunStateManager - Standard Coverage: runId Uniqueness', () => {
  it('should maintain unique runId throughout run', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, []),
      createTestEncounter('enc-2', 'Battle 2', 2, []),
    ];

    let runState = manager.initializeRun('run-unique-001', playerParty, encounters);
    const originalRunId = runState.runId;
    
    // Progress through run
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    runState = manager.loadNextEncounter(runState);
    
    expect(runState.runId).toBe(originalRunId);
  });

  it('should use provided runId in initialization', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [createTestEncounter('enc-1', 'Battle 1')];

    const runState = manager.initializeRun('custom-run-id-123', playerParty, encounters);

    expect(runState.runId).toBe('custom-run-id-123');
  });
});

describe('RunStateManager - Edge Cases', () => {
  it('should handle multiple skill unlocks from same encounter', () => {
    const playerParty = [
      createTestCharacter('player-1', 'Warrior'),
      createTestCharacter('player-2', 'Mage'),
    ];
    const encounters = [
      createTestEncounter('enc-1', 'Battle 1', 2, ['strike', 'heal', 'shield']),
    ];

    let runState = manager.initializeRun('run-090', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);
    
    // Unlock multiple skills
    const choice1: SkillUnlockChoice = {
      characterId: 'player-1',
      skillId: 'strike',
    };
    runState = manager.applySkillUnlock(runState, choice1);
    
    const choice2: SkillUnlockChoice = {
      characterId: 'player-2',
      skillId: 'heal',
    };
    runState = manager.applySkillUnlock(runState, choice2);

    expect(runState.skillsUnlockedThisRun).toEqual(['strike', 'heal']);
  });

  it('should handle run with single encounter and no rewards', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [
      createTestEncounter('enc-1', 'Quick Battle', 1, []),
    ];

    let runState = manager.initializeRun('run-091', playerParty, encounters);
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    runState = manager.handleBattleResult(runState, victoryResult);

    expect(runState.runStatus).toBe('victory');
    expect(runState.encountersCleared).toBe(1);
  });

  it('should maintain immutability of input RunState', () => {
    const playerParty = [createTestCharacter('player-1', 'Warrior')];
    const encounters = [createTestEncounter('enc-1', 'Battle 1')];

    const runState = manager.initializeRun('run-092', playerParty, encounters);
    const originalStatus = runState.runStatus;
    const originalEncountersCleared = runState.encountersCleared;
    
    const victoryResult = createTickResult(true, 'victory', playerParty, []);
    manager.handleBattleResult(runState, victoryResult);

    // Original should not be mutated
    expect(runState.runStatus).toBe(originalStatus);
    expect(runState.encountersCleared).toBe(originalEncountersCleared);
  });
});
