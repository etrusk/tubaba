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
  'heavy-strike': '#E53935',
  'fireball': '#FF5722',
  'execute': '#B71C1C',
  'bash': '#FFC107',
  'interrupt': '#00BCD4',
  'poison': '#AEEA00',
  'heal': '#4CAF50',
  'shield': '#2196F3',
  'defend': '#607D8B',
  'revive': '#E040FB',
  'taunt': '#FFD700',
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
