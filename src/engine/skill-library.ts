import type { Skill } from '../types/skill.js';

/**
 * Skill library containing all available skills
 */
const skills: Skill[] = [
  {
    id: 'strike',
    name: 'Strike',
    baseDuration: 2,
    targeting: 'single-enemy-lowest-hp',
    effects: [
      {
        type: 'damage',
        value: 15,
      },
    ],
  },
  {
    id: 'heavy-strike',
    name: 'Heavy Strike',
    baseDuration: 4,
    targeting: 'single-enemy-lowest-hp',
    effects: [
      {
        type: 'damage',
        value: 35,
      },
    ],
  },
  {
    id: 'fireball',
    name: 'Fireball',
    baseDuration: 4,
    targeting: 'all-enemies',
    effects: [
      {
        type: 'damage',
        value: 20,
      },
    ],
  },
  {
    id: 'execute',
    name: 'Execute',
    baseDuration: 3,
    targeting: 'single-enemy-lowest-hp',
    effects: [
      {
        type: 'damage',
        value: 50,
      },
    ],
    rules: [
      {
        priority: 1,
        conditions: [
          {
            type: 'hp-below',
            threshold: 25,
          },
        ],
      },
    ],
  },
  {
    id: 'poison',
    name: 'Poison',
    baseDuration: 2,
    targeting: 'single-enemy-lowest-hp',
    effects: [
      {
        type: 'status',
        statusType: 'poisoned',
        duration: 6,
      },
    ],
  },
  {
    id: 'heal',
    name: 'Heal',
    baseDuration: 3,
    targeting: 'ally-lowest-hp',
    effects: [
      {
        type: 'heal',
        value: 30,
      },
    ],
  },
  {
    id: 'shield',
    name: 'Shield',
    baseDuration: 2,
    targeting: 'ally-lowest-hp',
    effects: [
      {
        type: 'shield',
        value: 30,
      },
    ],
  },
  {
    id: 'defend',
    name: 'Defend',
    baseDuration: 1,
    targeting: 'self',
    effects: [
      {
        type: 'status',
        statusType: 'defending',
        duration: 3,
      },
    ],
  },
  {
    id: 'revive',
    name: 'Revive',
    baseDuration: 4,
    targeting: 'ally-dead',
    effects: [
      {
        type: 'revive',
        value: 40,
      },
    ],
  },
  {
    id: 'taunt',
    name: 'Taunt',
    baseDuration: 2,
    targeting: 'self',
    effects: [
      {
        type: 'status',
        statusType: 'taunting',
        duration: 4,
      },
    ],
  },
  {
    id: 'bash',
    name: 'Bash',
    baseDuration: 3,
    targeting: 'single-enemy-lowest-hp',
    effects: [
      {
        type: 'damage',
        value: 10,
      },
      {
        type: 'status',
        statusType: 'stunned',
        duration: 2,
      },
    ],
  },
  {
    id: 'interrupt',
    name: 'Interrupt',
    baseDuration: 1,
    targeting: 'single-enemy-highest-hp',
    effects: [
      {
        type: 'damage',
        value: 5,
      },
      {
        type: 'cancel',
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
