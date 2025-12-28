/**
 * Skill Color Palette
 *
 * Provides consistent color theming for skills across the UI.
 * Each skill has a unique color based on its identity, making
 * it easy to visually distinguish skills in the battle interface.
 */

/**
 * Predefined color mappings for each skill by ID.
 * Colors are chosen for visual distinction and thematic association.
 */
const SKILL_COLORS: Record<string, string> = {
  'strike': '#FF6B6B',
};

/**
 * Returns the display color for a skill.
 *
 * @param skillId - The unique identifier of the skill
 * @returns Hex color code for the skill (e.g., '#FF6B6B')
 *
 * @example
 * getSkillColor('strike')  // returns '#FF6B6B'
 * getSkillColor('heal')    // returns '#4CAF50'
 * getSkillColor('unknown') // returns '#888888' (fallback gray)
 */
export function getSkillColor(skillId: string): string {
  return SKILL_COLORS[skillId] ?? '#888888';
}
