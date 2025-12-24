import type { Character, RunState } from '../types/index.js';
import { SkillLibrary } from '../engine/skill-library.js';

/**
 * SkillLoadoutManager - Manages skill distribution from pool to characters
 *
 * Prototype implementation for skill inventory system.
 * Skills are stored in a shared pool and manually distributed to characters.
 */

const MAX_SKILLS_PER_CHARACTER = 4;

/**
 * Get innate (starting) skills for a character that cannot be unequipped
 * For now, hardcode: first skill of each character is innate
 */
export function getInnateSkillIds(character: Character): string[] {
  if (character.skills.length === 0) {
    return [];
  }
  return [character.skills[0]!.id];
}

/**
 * Check if a character can receive more skills
 * (4 skill cap per character)
 */
export function canReceiveSkill(character: Character): boolean {
  return character.skills.length < MAX_SKILLS_PER_CHARACTER;
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
 * (Cannot unequip "innate" starting skills)
 * @returns Updated RunState or throws if invalid
 */
export function unequipSkill(
  runState: RunState,
  skillId: string,
  characterId: string
): RunState {
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

  // Check if skill is innate
  const innateSkillIds = getInnateSkillIds(character);
  if (innateSkillIds.includes(skillId)) {
    throw new Error(`Cannot unequip innate skill ${skillId} from character ${characterId}`);
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
