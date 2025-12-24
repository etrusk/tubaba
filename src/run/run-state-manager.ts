import type {
  Character,
  TickResult,
  RunState,
  Encounter,
  SkillUnlockChoice,
} from '../types/index.js';
import { SkillLibrary } from '../engine/skill-library.js';

/**
 * RunStateManager - Manages run state machine and encounter progression
 * 
 * State transitions:
 * - in-progress → (battle victory) → awaiting-skill-selection
 * - awaiting-skill-selection → (skill choice) → in-progress (next encounter)
 * - in-progress → (battle defeat) → defeat
 * - in-progress → (final encounter victory) → victory
 */
export const RunStateManager = {
  /**
   * Initialize a new run with player party and encounters
   * Strike and Defend are innate (all characters start with them)
   * Other starting skills are moved to skillPool
   */
  initializeRun(
    runId: string,
    playerParty: Character[],
    encounters: Encounter[]
  ): RunState {
    if (playerParty.length === 0) {
      throw new Error('Player party cannot be empty');
    }
    if (encounters.length === 0) {
      throw new Error('Encounter list cannot be empty');
    }

    // Innate skills that all characters start with
    const INNATE_SKILL_IDS = ['strike', 'defend'];

    // Collect non-innate starting skills into the pool
    const startingSkillIds: string[] = [];
    for (const character of playerParty) {
      for (const skill of character.skills) {
        if (!INNATE_SKILL_IDS.includes(skill.id)) {
          startingSkillIds.push(skill.id);
        }
      }
    }

    // Get innate skills from library
    const innateSkills = INNATE_SKILL_IDS.map(id => SkillLibrary.getSkill(id));

    // Create party with innate skills
    const partyWithInnateSkills = playerParty.map(character => ({
      ...character,
      skills: innateSkills,
    }));

    return {
      runId,
      currentEncounterIndex: 0,
      encounters,
      playerParty: partyWithInnateSkills,
      runStatus: 'in-progress',
      encountersCleared: 0,
      skillsUnlockedThisRun: [],
      skillPool: startingSkillIds,
    };
  },

  /**
   * Handle battle result and update run state
   */
  handleBattleResult(runState: RunState, tickResult: TickResult): RunState {
    // If battle hasn't ended, no state changes
    if (!tickResult.battleEnded) {
      return runState;
    }

    // Handle defeat
    if (tickResult.updatedState.battleStatus === 'defeat') {
      return {
        ...runState,
        runStatus: 'defeat',
      };
    }

    // Handle victory
    if (tickResult.updatedState.battleStatus === 'victory') {
      const currentEncounter = runState.encounters[runState.currentEncounterIndex]!;
      const hasSkillRewards = currentEncounter.skillRewards.length > 0;
      const isLastEncounter = runState.currentEncounterIndex === runState.encounters.length - 1;

      // Increment encounters cleared on any victory
      const newEncountersCleared = runState.encountersCleared + 1;

      if (hasSkillRewards) {
        // Has rewards - transition to awaiting skill selection
        return {
          ...runState,
          runStatus: 'awaiting-skill-selection',
          encountersCleared: newEncountersCleared,
        };
      } else if (isLastEncounter) {
        // No rewards and final encounter - run complete
        return {
          ...runState,
          runStatus: 'victory',
          encountersCleared: newEncountersCleared,
        };
      } else {
        // No rewards but more encounters - auto-advance to next encounter
        return {
          ...runState,
          runStatus: 'in-progress',
          currentEncounterIndex: runState.currentEncounterIndex + 1,
          encountersCleared: newEncountersCleared,
        };
      }
    }

    return runState;
  },

  /**
   * Apply skill unlock choice and update run state
   * Now adds skills to skillPool instead of directly to character
   */
  applySkillUnlock(
    runState: RunState,
    choice: SkillUnlockChoice
  ): RunState {
    // Validate character exists (for backward compatibility)
    const character = runState.playerParty.find(c => c.id === choice.characterId);
    if (!character) {
      throw new Error(`Character ${choice.characterId} not found in party`);
    }

    // Validate skill is in current encounter rewards
    const currentEncounter = runState.encounters[runState.currentEncounterIndex]!;
    if (!currentEncounter.skillRewards.includes(choice.skillId)) {
      throw new Error(`Skill ${choice.skillId} not available in current encounter rewards`);
    }

    const isLastEncounter = runState.currentEncounterIndex === runState.encounters.length - 1;

    return {
      ...runState,
      skillsUnlockedThisRun: [...runState.skillsUnlockedThisRun, choice.skillId],
      skillPool: [...runState.skillPool, choice.skillId],
      runStatus: isLastEncounter ? 'victory' : runState.runStatus,
    };
  },

  /**
   * Load next encounter
   */
  loadNextEncounter(runState: RunState): RunState {
    if (runState.runStatus === 'defeat' || runState.runStatus === 'victory') {
      throw new Error('Cannot load next encounter after run completion');
    }

    // If already in-progress (from auto-advancement), this is a no-op
    // Only advance when transitioning from 'awaiting-skill-selection'
    if (runState.runStatus === 'in-progress') {
      return runState;
    }

    const nextIndex = runState.currentEncounterIndex + 1;
    if (nextIndex >= runState.encounters.length) {
      throw new Error('No more encounters available');
    }

    return {
      ...runState,
      currentEncounterIndex: nextIndex,
      runStatus: 'in-progress',
    };
  },

  /**
   * Get current encounter
   */
  getCurrentEncounter(runState: RunState): Encounter {
    return runState.encounters[runState.currentEncounterIndex]!;
  },

  /**
   * Check if can progress to next encounter
   */
  canProgressToNextEncounter(runState: RunState): boolean {
    return runState.runStatus !== 'defeat' && runState.runStatus !== 'victory';
  },

  /**
   * Check if run is complete
   */
  isRunComplete(runState: RunState): boolean {
    return runState.runStatus === 'victory' || runState.runStatus === 'defeat';
  },
};
