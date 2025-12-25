import type { Character } from '../types/character.js';
import type { CharacterInstructions, SkillInstruction } from '../types/instructions.js';
import type { Rule } from '../types/skill.js';

/**
 * Apply instructions to a character's skills
 * For human mode: clears all rules
 * For AI mode: converts SkillInstruction[] to Rule[] and attaches to skills
 */
export function applyInstructionsToCharacter(
  character: Character,
  instructions: CharacterInstructions
): Character {
  if (instructions.controlMode === 'human') {
    // Remove all rules - character requires manual input
    return {
      ...character,
      skills: character.skills.map(skill => ({ ...skill, rules: [] }))
    };
  }
  
  // Apply AI rules to skills
  return {
    ...character,
    skills: character.skills.map(skill => {
      const instruction = instructions.skillInstructions.find(
        si => si.skillId === skill.id && si.enabled
      );
      
      if (!instruction) {
        return { ...skill, rules: [] }; // No rule for this skill
      }
      
      const rule: Rule = {
        priority: instruction.priority,
        conditions: instruction.conditions,
        targetingOverride: instruction.targetingOverride
      };
      
      return { ...skill, rules: [rule] };
    })
  };
}

/**
 * Convert a single SkillInstruction to a Rule
 * Helper function used by applyInstructionsToCharacter
 */
export function skillInstructionToRule(
  instruction: SkillInstruction
): Rule {
  return {
    priority: instruction.priority,
    conditions: instruction.conditions,
    targetingOverride: instruction.targetingOverride
  };
}

/**
 * Create default instructions for a character (all skills enabled, no conditions)
 */
export function createDefaultInstructions(
  character: Character
): CharacterInstructions {
  // Use character's equipped skills, not full library
  return {
    characterId: character.id,
    controlMode: 'ai',
    skillInstructions: character.skills.map(skill => ({
      skillId: skill.id,
      priority: 10,
      conditions: [],
      enabled: true
    }))
  };
}
