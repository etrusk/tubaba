import type { Character, Skill } from '../types/index.js';
import { SkillLibrary } from '../engine/skill-library.js';

/**
 * Extended Character interface with unlocked skill pool tracking
 * @internal
 */
interface CharacterWithSkillPool extends Character {
  /** All skills unlocked throughout the run (beyond the 3 active) */
  unlockedSkillPool?: Skill[];
}

/**
 * Get or initialize the unlocked skill pool for a character
 * @internal
 */
function getOrInitializeSkillPool(character: Character): Skill[] {
  const charWithPool = character as CharacterWithSkillPool;
  if (!charWithPool.unlockedSkillPool) {
    // Initialize from current skills (starting loadout)
    return [...character.skills];
  }
  return [...charWithPool.unlockedSkillPool];
}

/**
 * Unlock a skill and add it to the character's skill pool
 * @param character - Character to unlock skill for
 * @param skillId - Skill ID to unlock
 * @param availableRewards - List of skill IDs available from encounter rewards
 * @returns Updated character with skill unlocked (immutable)
 * @throws Error if skill is not in rewards, already unlocked, or doesn't exist
 */
function unlockSkill(
  character: Character,
  skillId: string,
  availableRewards: string[]
): Character {
  // Validate skill ID is not empty
  if (!skillId || skillId.trim() === '') {
    throw new Error('Skill ID cannot be empty');
  }

  // Validate skill is in available rewards
  if (!availableRewards.includes(skillId)) {
    throw new Error(`Skill '${skillId}' is not in available rewards`);
  }

  // Get skill definition from library (throws if not found)
  const skill = SkillLibrary.getSkill(skillId);

  // Get current unlocked pool
  const currentUnlocked = getOrInitializeSkillPool(character);

  // Check if skill is already unlocked
  if (currentUnlocked.some((s) => s.id === skillId)) {
    throw new Error(`Skill '${skillId}' is already unlocked for this character`);
  }

  // Create new unlocked pool with skill added
  const newUnlocked = [...currentUnlocked, skill];

  // Auto-add to active loadout if character has < 3 skills
  const newActiveSkills =
    character.skills.length < 3 ? [...character.skills, skill] : [...character.skills];

  // Return new character with updated pool (immutable update)
  const updated: CharacterWithSkillPool = {
    ...character,
    skills: newActiveSkills,
    unlockedSkillPool: newUnlocked,
  };

  return updated;
}

/**
 * Set the active loadout (which 3 skills are equipped for battle)
 * @param character - Character to update loadout for
 * @param skillIds - Array of skill IDs to set as active (max 3)
 * @returns Updated character with new active loadout (immutable)
 * @throws Error if more than 3 skills, duplicates, or skills not unlocked
 */
function setActiveLoadout(character: Character, skillIds: string[]): Character {
  // Validate maximum 3 active skills
  if (skillIds.length > 3) {
    throw new Error('Cannot set more than 3 active skills in loadout');
  }

  // Check for duplicate skill IDs
  const uniqueIds = new Set(skillIds);
  if (uniqueIds.size !== skillIds.length) {
    throw new Error('Loadout cannot contain duplicate skills');
  }

  // Get unlocked skill pool
  const unlockedSkills = getOrInitializeSkillPool(character);

  // Validate all skills are unlocked
  for (const skillId of skillIds) {
    if (!unlockedSkills.some((s) => s.id === skillId)) {
      throw new Error(`Skill '${skillId}' is not unlocked for this character`);
    }
  }

  // Build new active skills array in the order specified
  const newActiveSkills: Skill[] = [];
  for (const skillId of skillIds) {
    const skill = unlockedSkills.find((s) => s.id === skillId);
    if (skill) {
      newActiveSkills.push(skill);
    }
  }

  // Return new character with updated active loadout (immutable update)
  return {
    ...character,
    skills: newActiveSkills,
  };
}

/**
 * Get all unlocked skills for a character
 * @param character - Character to get unlocked skills for
 * @returns Array of all unlocked skills (may be more than 3)
 */
function getUnlockedSkills(character: Character): Skill[] {
  return getOrInitializeSkillPool(character);
}

/**
 * Get the active loadout (skills equipped for battle)
 * @param character - Character to get active loadout for
 * @returns Array of active skills (max 3)
 */
function getActiveLoadout(character: Character): Skill[] {
  // Enforce 3-skill maximum (in case character was created with more)
  return character.skills.slice(0, 3);
}

/**
 * Check if a skill can be unlocked
 * @param character - Character to check for
 * @param skillId - Skill ID to check
 * @param availableRewards - List of skill IDs available from encounter rewards
 * @returns True if skill can be unlocked, false otherwise
 */
function canUnlockSkill(
  character: Character,
  skillId: string,
  availableRewards: string[]
): boolean {
  // Check if skill is in available rewards
  if (!availableRewards.includes(skillId)) {
    return false;
  }

  // Check if skill exists in SkillLibrary
  try {
    SkillLibrary.getSkill(skillId);
  } catch {
    return false;
  }

  // Check if skill is already unlocked
  const unlockedSkills = getOrInitializeSkillPool(character);
  if (unlockedSkills.some((s) => s.id === skillId)) {
    return false;
  }

  return true;
}

/**
 * Validate that a character's loadout is valid (max 3 skills)
 * @param character - Character to validate
 * @returns True if loadout is valid, false otherwise
 */
function validateLoadout(character: Character): boolean {
  return character.skills.length <= 3;
}

/**
 * CharacterProgression system for managing skill unlocks and loadouts
 */
export const CharacterProgression = {
  unlockSkill,
  setActiveLoadout,
  getUnlockedSkills,
  getActiveLoadout,
  canUnlockSkill,
  validateLoadout,
};
