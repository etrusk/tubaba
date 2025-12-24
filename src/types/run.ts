import type { Character } from './character.js';

/**
 * Run state machine status
 */
export type RunStatus = 'in-progress' | 'awaiting-skill-selection' | 'victory' | 'defeat';

/**
 * Single encounter definition
 */
export interface Encounter {
  /** Unique encounter identifier */
  encounterId: string;
  /** Display name (e.g., "Forest Ambush") */
  name: string;
  /** Enemy units for this battle */
  enemies: Character[];
  /** Skill IDs available for unlock after victory */
  skillRewards: string[];
}

/**
 * Player skill selection after victory
 */
export interface SkillUnlockChoice {
  /** Which character unlocks the skill */
  characterId: string;
  /** Skill to unlock (must be from encounter rewards) */
  skillId: string;
}

/**
 * Run management state
 */
export interface RunState {
  /** Unique run identifier */
  runId: string;
  /** Which encounter is active (0-based) */
  currentEncounterIndex: number;
  /** All encounters in this run */
  encounters: Encounter[];
  /** Player party with unlocked skills */
  playerParty: Character[];
  /** Current run status */
  runStatus: RunStatus;
  /** Number of victories */
  encountersCleared: number;
  /** Skill IDs unlocked during this run */
  skillsUnlockedThisRun: string[];
  /** Shared pool of skill IDs available for distribution */
  skillPool: string[];
}
