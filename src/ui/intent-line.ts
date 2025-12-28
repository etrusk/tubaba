import type { IntentLine, SkillColorMap } from '../types/visualization.js';

/**
 * Skill type to color mapping for intent lines
 * Based on spec lines 215-241
 */
export const SKILL_COLORS: SkillColorMap = {
  // Damage skills (red spectrum)
  'strike': '#f44336',
  
  // Default
  'default': '#ffd700',
};

/**
 * Render an intent line connecting caster to target
 * Based on spec lines 243-265
 *
 * @param line - Intent line data with positions and styling
 * @returns SVG string containing marker definition and path element
 */
export function renderIntentLine(line: IntentLine): string {
  const { casterId, targetId, skillId, ticksRemaining, lineStyle, color, startPos, endPos, controlPoint } = line;
  
  // Generate unique marker ID for this line
  const markerId = `arrowhead-${casterId}-${targetId}-${skillId}`;
  
  // Determine stroke width based on execution state
  const strokeWidth = ticksRemaining === 0 ? 3 : 2;
  
  // Determine stroke dash pattern
  const strokeDashArray = lineStyle === 'solid' ? '' : ' stroke-dasharray="8,4"';
  
  // Build path data: curved if controlPoint exists, straight otherwise
  let pathData: string;
  if (controlPoint) {
    // Quadratic Bezier curve: M start Q control end
    pathData = `M ${startPos.x} ${startPos.y} Q ${controlPoint.x} ${controlPoint.y} ${endPos.x} ${endPos.y}`;
  } else {
    // Straight line: M start L end
    pathData = `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`;
  }
  
  // Build SVG string
  const marker = `<defs>
  <marker id="${markerId}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
    <polygon points="0 0, 10 3, 0 6" fill="${color}" />
  </marker>
</defs>`;
  
  const pathElement = `<path d="${pathData}" stroke="${color}" stroke-width="${strokeWidth}"${strokeDashArray} fill="none" marker-end="url(#${markerId})" class="intent-line ${lineStyle}" data-caster-id="${casterId}" data-target-id="${targetId}" data-skill-id="${skillId}" />`;
  
  return marker + '\n' + pathElement;
}
