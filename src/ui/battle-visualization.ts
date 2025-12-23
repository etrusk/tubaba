import type { BattleVisualization } from '../types/visualization.js';
import { renderCharacterCircle } from './character-circle.js';
import { renderIntentLine } from './intent-line.js';

/**
 * Render complete SVG battle arena from visualization data
 * Based on spec lines 362-390
 * 
 * SVG Structure:
 * - Root SVG element with dimensions and viewBox
 * - Intent lines layer (background)
 * - Characters layer (foreground)
 * 
 * This ensures lines don't obscure character details
 * 
 * @param visualization - Complete battle visualization data
 * @returns SVG string representing the full battle arena
 */
export function renderBattleVisualization(visualization: BattleVisualization): string {
  const { characters, intentLines, arenaDimensions } = visualization;
  const { width, height } = arenaDimensions;

  // Render intent lines (background layer)
  const intentLinesHtml = intentLines
    .map((line) => renderIntentLine(line))
    .join('\n');

  // Render character circles (foreground layer)
  const charactersHtml = characters
    .map((character) => renderCharacterCircle(character))
    .join('\n');

  // Compose complete SVG with gradient definitions
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="battle-arena-svg">
  <defs>
    <linearGradient id="player-fill-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#66bb6a"/>
      <stop offset="100%" style="stop-color:#4caf50"/>
    </linearGradient>
    <linearGradient id="enemy-fill-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" style="stop-color:#ff6b6b"/>
      <stop offset="100%" style="stop-color:#f44336"/>
    </linearGradient>
  </defs>
  <g class="intent-lines-layer">
    ${intentLinesHtml}
  </g>
  <g class="characters-layer">
    ${charactersHtml}
  </g>
</svg>`;
}
