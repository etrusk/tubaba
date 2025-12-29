import type { Skill } from '../types/skill.js';

/**
 * Skill library containing all available skills
 */
const skills: Skill[] = [
  {
    id: 'strike',
    name: 'Strike',
    baseDuration: 2,
    targeting: 'nearest-enemy',
    effects: [
      {
        type: 'damage',
        value: 15,
      },
    ],
  },
];

/**
 * Get a skill by ID
 * @param id - Skill identifier
 * @returns Skill definition
 * @throws Error if skill not found
 */
function getSkill(id: string): Skill {
  const skill = skills.find((s) => s.id === id);
  if (!skill) {
    throw new Error(`Skill not found: ${id}`);
  }
  return skill;
}

/**
 * Get all available skills
 * @returns Array of all skill definitions
 */
function getAllSkills(): Skill[] {
  return skills;
}

/**
 * SkillLibrary namespace for skill management
 */
export const SkillLibrary = {
  getSkill,
  getAllSkills,
};
