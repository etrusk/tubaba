import type { Character } from '../types/character.js';
import type { DebugBattleState } from '../types/debug.js';
import { SkillLibrary } from '../engine/skill-library.js';

/**
 * Debug Character Manager - Manages characters and skills in debug mode
 *
 * Debug-specific utilities for battle builder. Unlike production RunState,
 * this allows skill management for BOTH players and enemies.
 */

const MAX_SKILLS_PER_CHARACTER = 4;

/**
 * Innate skills that all characters have and cannot be unequipped
 */
const INNATE_SKILLS = ['strike', 'defend'];

/**
 * Distribute a skill to any character in debug mode
 * @returns Updated state with skill moved from pool to character
 */
export function debugDistributeSkill(
  state: DebugBattleState,
  skillId: string,
  characterId: string
): DebugBattleState {
  // Validate skill is in pool
  if (!state.skillPool.includes(skillId)) {
    throw new Error(`Skill ${skillId} not found in skill pool`);
  }

  // Find character
  const characterIndex = state.characters.findIndex(c => c.id === characterId);
  if (characterIndex === -1) {
    throw new Error(`Character ${characterId} not found`);
  }

  const character = state.characters[characterIndex]!;

  // Check if character can receive more skills (4 skill cap excluding innate)
  const nonInnateSkills = character.skills.filter(s => !INNATE_SKILLS.includes(s.id));
  if (nonInnateSkills.length >= MAX_SKILLS_PER_CHARACTER) {
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

  // Create updated characters array
  const updatedCharacters = [...state.characters];
  updatedCharacters[characterIndex] = updatedCharacter;

  // Remove skill from pool
  const updatedPool = state.skillPool.filter(id => id !== skillId);

  return {
    ...state,
    characters: updatedCharacters,
    skillPool: updatedPool,
  };
}

/**
 * Unequip a skill from any character in debug mode
 * Innate skills (strike, defend) cannot be unequipped
 * @returns Updated state with skill returned to pool
 */
export function debugUnequipSkill(
  state: DebugBattleState,
  skillId: string,
  characterId: string
): DebugBattleState {
  // Innate skills cannot be unequipped
  if (INNATE_SKILLS.includes(skillId)) {
    throw new Error(`${skillId} is an innate skill and cannot be unequipped`);
  }

  // Find character
  const characterIndex = state.characters.findIndex(c => c.id === characterId);
  if (characterIndex === -1) {
    throw new Error(`Character ${characterId} not found`);
  }

  const character = state.characters[characterIndex]!;

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

  // Create updated characters array
  const updatedCharacters = [...state.characters];
  updatedCharacters[characterIndex] = updatedCharacter;

  // Add skill back to pool
  const updatedPool = [...state.skillPool, skillId];

  return {
    ...state,
    characters: updatedCharacters,
    skillPool: updatedPool,
  };
}

/**
 * Add a new character to the debug battle
 * @returns Updated state with new character
 */
export function debugAddCharacter(
  state: DebugBattleState,
  character: Character
): DebugBattleState {
  // Check for duplicate ID
  if (state.characters.some(c => c.id === character.id)) {
    throw new Error(`Character with id ${character.id} already exists`);
  }

  return {
    ...state,
    characters: [...state.characters, character],
  };
}

/**
 * Remove a character from the debug battle
 * Returns all non-innate skills to the pool
 * @returns Updated state with character removed, skills returned to pool
 */
export function debugRemoveCharacter(
  state: DebugBattleState,
  characterId: string
): DebugBattleState {
  // Find character
  const characterIndex = state.characters.findIndex(c => c.id === characterId);
  if (characterIndex === -1) {
    throw new Error(`Character ${characterId} not found`);
  }

  const character = state.characters[characterIndex]!;

  // Get non-innate skills to return to pool
  const skillsToReturn = character.skills
    .filter(s => !INNATE_SKILLS.includes(s.id))
    .map(s => s.id);

  // Remove character from array
  const updatedCharacters = state.characters.filter(c => c.id !== characterId);

  // Add skills back to pool
  const updatedPool = [...state.skillPool, ...skillsToReturn];

  return {
    ...state,
    characters: updatedCharacters,
    skillPool: updatedPool,
  };
}
