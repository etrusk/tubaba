import type { Character, RunState } from '../types/index.js';
import { SkillLibrary } from '../engine/skill-library.js';

/**
 * SkillLoadoutManager - Manages skill distribution from pool to characters
 *
 * Prototype implementation for skill inventory system.
 * Skills are stored in a shared pool and manually distributed to characters.
 * All skills (including starting skills) are in the pool at run start.
 */

const MAX_SKILLS_PER_CHARACTER = 4;

/**
 * Innate skills that all characters have and cannot be unequipped
 */
const INNATE_SKILLS = ['strike', 'defend'];

/**
 * Check if a character can receive more skills
 * (4 skill cap per character, excluding innate skills: strike and defend)
 */
export function canReceiveSkill(character: Character): boolean {
  const nonInnateSkills = character.skills.filter(s => !INNATE_SKILLS.includes(s.id));
  return nonInnateSkills.length < MAX_SKILLS_PER_CHARACTER;
}

/**
 * Distribute a skill from pool to a character
 * @returns Updated RunState or throws if invalid
 */
export function distributeSkill(
  runState: RunState,
  skillId: string,
  characterId: string
): RunState {
  // Validate skill is in pool
  if (!runState.skillPool.includes(skillId)) {
    throw new Error(`Skill ${skillId} not found in skill pool`);
  }

  // Find character
  const characterIndex = runState.playerParty.findIndex(c => c.id === characterId);
  if (characterIndex === -1) {
    throw new Error(`Character ${characterId} not found in party`);
  }

  const character = runState.playerParty[characterIndex]!;

  // Check if character can receive more skills
  if (!canReceiveSkill(character)) {
    throw new Error(`Character ${characterId} already has ${MAX_SKILLS_PER_CHARACTER} skills`);
  }

  // Check if character already has this skill
  if (character.skills.some(s => s.id === skillId)) {
    throw new Error(`Character ${characterId} already has skill ${skillId}`);
  }

  // Get skill from library
  const skillFromPool = SkillLibrary.getSkill(skillId);

  // Create updated character with new skill
  const updatedCharacter = {
    ...character,
    skills: [...character.skills, skillFromPool],
  };

  // Create updated party
  const updatedParty = [...runState.playerParty];
  updatedParty[characterIndex] = updatedCharacter;

  // Remove skill from pool
  const updatedPool = runState.skillPool.filter(id => id !== skillId);

  return {
    ...runState,
    playerParty: updatedParty,
    skillPool: updatedPool,
  };
}

/**
 * Unequip a skill from character back to pool
 * Innate skills (strike, defend) cannot be unequipped
 * @returns Updated RunState or throws if invalid
 */
export function unequipSkill(
  runState: RunState,
  skillId: string,
  characterId: string
): RunState {
  // Innate skills cannot be unequipped
  if (INNATE_SKILLS.includes(skillId)) {
    throw new Error(`${skillId} is an innate skill and cannot be unequipped`);
  }

  // Find character
  const characterIndex = runState.playerParty.findIndex(c => c.id === characterId);
  if (characterIndex === -1) {
    throw new Error(`Character ${characterId} not found in party`);
  }

  const character = runState.playerParty[characterIndex]!;

  // Check if character has this skill
  const skillIndex = character.skills.findIndex(s => s.id === skillId);
  if (skillIndex === -1) {
    throw new Error(`Character ${characterId} does not have skill ${skillId}`);
  }

  // Create updated character with skill removed
  const updatedSkills = [...character.skills];
  updatedSkills.splice(skillIndex, 1);

  const updatedCharacter = {
    ...character,
    skills: updatedSkills,
  };

  // Create updated party
  const updatedParty = [...runState.playerParty];
  updatedParty[characterIndex] = updatedCharacter;

  // Add skill back to pool
  const updatedPool = [...runState.skillPool, skillId];

  return {
    ...runState,
    playerParty: updatedParty,
    skillPool: updatedPool,
  };
}
