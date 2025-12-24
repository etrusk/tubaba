import type { CircleCharacterData } from '../types/visualization.js';
import { getCharacterColor } from './character-name-formatter.js';
import { SKILL_COLORS } from './intent-line.js';

/**
 * Renders a character circle as SVG string
 * 
 * Visualizes character HP as a "liquid drain" effect where the circle
 * fills from bottom-to-top based on HP percentage.
 * 
 * @param data - The character visualization data
 * @returns SVG string representing the character circle
 */
export function renderCharacterCircle(data: CircleCharacterData): string {
  const {
    id,
    name,
    currentHp,
    maxHp,
    hpPercent,
    statusEffects,
    currentAction,
    isPlayer,
    position,
  } = data;

  const { x, y, radius } = position;

  // Clamp HP percent to 100 for visual fill (but show actual HP in text)
  const fillPercent = Math.min(hpPercent, 100);

  // Determine if character is KO'd
  const isKO = currentHp === 0;

  // Calculate fill dimensions
  // Fill height = percentage of full diameter
  const fillHeight = (fillPercent / 100) * radius * 2;
  
  // Fill Y position: start from bottom and fill upward
  // Bottom of circle is at (y + radius), fill grows upward
  const fillY = y - radius + (1 - fillPercent / 100) * radius * 2;

  // Circle border styling
  const borderClass = isPlayer ? 'player' : 'enemy';
  const borderColor = isPlayer ? '#4caf50' : '#f44336';
  const borderStyle = isKO ? 'stroke-dasharray="8,4"' : '';

  // HP fill color
  let fillColor: string;
  if (isKO) {
    fillColor = '#424242'; // Gray for KO
  } else if (isPlayer) {
    fillColor = '#66bb6a'; // Green for player
  } else {
    fillColor = '#ff6b6b'; // Red for enemy
  }

  // HP text display
  const hpText = isKO ? 'KO' : `${currentHp}/${maxHp}`;

  // Build status effects text
  const statusText = statusEffects.length > 0
    ? statusEffects
        .map((status) => {
          const typeLabel = status.type.charAt(0).toUpperCase() + status.type.slice(1);
          if (status.type === 'shielded' && status.value !== undefined) {
            return `${typeLabel}(${status.value})`;
          }
          return `${typeLabel}(${status.duration})`;
        })
        .join(', ')
    : '';

  // Build action display text
  let actionText = '';
  let actionColor = SKILL_COLORS['default'];
  if (currentAction !== null) {
    const skillName = currentAction.skillId.charAt(0).toUpperCase() + currentAction.skillId.slice(1);
    actionColor = SKILL_COLORS[currentAction.skillId] ?? SKILL_COLORS['default'];
    if (currentAction.ticksRemaining === 0) {
      actionText = `${skillName} - Executing!`;
    } else {
      actionText = `${skillName} - ${currentAction.ticksRemaining} ticks`;
    }
  }

  // Calculate text positions
  const nameY = y - radius - 10;
  const statusX = x + radius + 15;  // Right of circle
  const statusY = y;                 // Vertically centered with circle
  const actionY = y + radius + 20;

  // Build SVG
  return `<g class="character-circle" data-character-id="${id}">
  <!-- Clip path for HP fill -->
  <defs>
    <clipPath id="circle-clip-${id}">
      <circle cx="${x}" cy="${y}" r="${radius - 2}" />
    </clipPath>
  </defs>
  
  <!-- Outer circle border -->
  <circle 
    cx="${x}" 
    cy="${y}" 
    r="${radius}" 
    class="circle-border ${borderClass}" 
    fill="none" 
    stroke="${borderColor}" 
    stroke-width="3" 
    ${borderStyle} />
  
  <!-- HP fill (clipped to circle, anchored bottom) -->
  <rect 
    x="${x - radius}" 
    y="${fillY}" 
    width="${radius * 2}" 
    height="${fillHeight}"
    class="hp-fill ${borderClass}"
    fill="${fillColor}"
    clip-path="url(#circle-clip-${id})" />
  
  <!-- HP text -->
  <text 
    x="${x}" 
    y="${y}" 
    class="hp-text"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="#ffffff"
    font-size="14"
    font-weight="bold">${hpText}</text>
  
  <!-- Character name -->
  <text
    x="${x}"
    y="${nameY}"
    class="character-name"
    text-anchor="middle"
    fill="${getCharacterColor(id)}"
    font-size="12"
    font-weight="bold">${name}</text>
  ${
    statusText
      ? `
  <!-- Status effects -->
  <text
    x="${statusX}"
    y="${statusY}"
    class="status-effects"
    text-anchor="start"
    fill="#ffeb3b"
    font-size="10">${statusText}</text>`
      : ''
  }${
    actionText
      ? `
  
  <!-- Current action -->
  <text
    x="${x}"
    y="${actionY}"
    class="action-display"
    text-anchor="middle"
    fill="${actionColor}"
    font-size="11">${actionText}</text>`
      : ''
  }
</g>`;
}
