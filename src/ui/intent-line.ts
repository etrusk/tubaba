import type { IntentLine, SkillColorMap } from '../types/visualization.js';

/**
 * Skill type to color mapping for intent lines
 * Based on spec lines 215-241
 */
export const SKILL_COLORS: SkillColorMap = {
  // Damage skills (red spectrum)
  'strike': '#f44336',
  'heavy-strike': '#d32f2f',
  'fireball': '#ff5722',
  'execute': '#b71c1c',
  'bash': '#e91e63',
  
  // Healing skills (green spectrum)
  'heal': '#4caf50',
  'revive': '#66bb6a',
  
  // Buff/Shield skills (blue spectrum)
  'shield': '#2196f3',
  'defend': '#1976d2',
  
  // Debuff skills (purple spectrum)
  'poison': '#9c27b0',
  'stun': '#673ab7',
  
  // Utility (yellow/orange)
  'taunt': '#ff9800',
  'interrupt': '#ffc107',
  
  // Default
  'default': '#ffd700',
};

/**
 * Render an intent line connecting caster to target
 * Based on spec lines 243-265
 * 
 * @param line - Intent line data with positions and styling
 * @returns SVG string containing marker definition and line element
 */
export function renderIntentLine(line: IntentLine): string {
  const { casterId, targetId, skillId, ticksRemaining, lineStyle, color, startPos, endPos } = line;
  
  // Generate unique marker ID for this line
  const markerId = `arrowhead-${casterId}-${targetId}-${skillId}`;
  
  // Determine stroke width based on execution state
  const strokeWidth = ticksRemaining === 0 ? 3 : 2;
  
  // Determine stroke dash pattern
  const strokeDashArray = lineStyle === 'solid' ? '' : ' stroke-dasharray="8,4"';
  
  // Build SVG string
  const marker = `<defs>
  <marker id="${markerId}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
    <polygon points="0 0, 10 3, 0 6" fill="${color}" />
  </marker>
</defs>`;
  
  const lineElement = `<line x1="${startPos.x}" y1="${startPos.y}" x2="${endPos.x}" y2="${endPos.y}" stroke="${color}" stroke-width="${strokeWidth}"${strokeDashArray} marker-end="url(#${markerId})" class="intent-line ${lineStyle}" data-caster-id="${casterId}" data-target-id="${targetId}" data-skill-id="${skillId}" />`;
  
  return marker + '\n' + lineElement;
}
