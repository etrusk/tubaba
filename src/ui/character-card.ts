import type { Character } from '../types/character.js';
import { formatCharacterName } from './character-name-formatter.js';

/**
 * Renders a character card as HTML string
 *
 * @param character - The character to render
 * @returns HTML string representing the character card
 */
export function renderCharacterCard(character: Character): string {
  const { id, name, currentHp, maxHp, statusEffects, currentAction, isPlayer } = character;
  
  // Calculate HP percentage, capped at 100%
  const hpPercent = Math.min((currentHp / maxHp) * 100, 100);
  
  // Determine if character is KO'd
  const isKO = currentHp === 0;
  
  // Determine character type class
  const typeClass = isPlayer ? 'player' : 'enemy';
  
  // Build status effects HTML
  const statusHtml = statusEffects.length > 0
    ? statusEffects.map(status => {
        let statusText = status.type.charAt(0).toUpperCase() + status.type.slice(1);
        
        // Add value for shielded status
        if (status.type === 'shielded' && status.value !== undefined) {
          statusText += ` (${status.value})`;
        }
        
        // Add duration if not permanent (-1)
        if (status.duration !== -1) {
          if (status.type === 'shielded' && status.value !== undefined) {
            // Already has value, add duration separately
            statusText = statusText.replace(')', `, ${status.duration})`);
          } else {
            statusText += ` (${status.duration})`;
          }
        }
        
        return `<span class="status ${status.type}" data-duration="${status.duration}">${statusText}</span>`;
      }).join('')
    : '';
  
  // Build action display HTML
  let actionHtml: string;
  if (currentAction === null) {
    actionHtml = '<span class="action-name">Idle</span>';
  } else {
    const { skillId, ticksRemaining } = currentAction;
    const actionName = skillId.charAt(0).toUpperCase() + skillId.slice(1);
    
    if (ticksRemaining === 0) {
      actionHtml = `<span class="action-name">${actionName}</span><span class="ticks-remaining">Executing</span>`;
    } else {
      actionHtml = `<span class="action-name">${actionName}</span><span class="ticks-remaining">${ticksRemaining}</span>`;
    }
  }
  
  // Build complete HTML
  return `<div class="character-card ${typeClass}" data-character-id="${id}">
  <div class="character-name">${formatCharacterName(name, id)}</div>
  <div class="hp-bar-container">
    <div class="hp-bar" style="width: ${hpPercent}%"></div>
    <span class="hp-text">${currentHp}/${maxHp}</span>
  </div>${isKO ? '\n  <div class="ko-indicator">KO</div>' : ''}
  <div class="status-effects">${statusHtml}</div>
  <div class="action-display">${actionHtml}</div>
</div>`;
}
