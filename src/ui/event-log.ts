import type { CombatEvent } from '../types/combat.js';
import type { CombatState } from '../types/combat.js';
import type { Character } from '../types/character.js';
import { colorizeCharacterNamesInText } from './character-name-formatter.js';

/**
 * Renders combat events as HTML
 *
 * Displays events in descending tick order (newest at top).
 * Shows tick number, event type, message, and optional metadata.
 * Character names in messages are color-coded with unique colors per character.
 *
 * @param events - Array of combat events to display
 * @param combatState - Optional combat state for colorizing character names
 * @returns HTML string representing the event log
 */
export function renderEventLog(events: CombatEvent[], combatState?: CombatState): string {
  // Handle empty array
  if (events.length === 0) {
    return '<div class="event-log">\n  <p>No events</p>\n</div>';
  }

  // Build character array if combat state provided
  const characters = combatState ? buildCharacterArray(combatState) : [];

  // Sort by tick descending (newest first), maintaining original order for same tick
  // Use stable sort by adding index to ensure stability
  const sortedEvents = events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      if (a.event.tick !== b.event.tick) {
        return b.event.tick - a.event.tick; // Descending tick order
      }
      return a.index - b.index; // Maintain original order for same tick
    })
    .map(({ event }) => event);

  // Build HTML for each event
  const eventHtml = sortedEvents.map(event => {
    const metaParts: string[] = [];
    
    if (event.actorId !== undefined) {
      metaParts.push(`Actor: ${event.actorId}`);
    }
    if (event.targetId !== undefined) {
      metaParts.push(`Target: ${event.targetId}`);
    }
    if (event.value !== undefined) {
      metaParts.push(`Value: ${event.value}`);
    }
    if (event.skillName !== undefined) {
      metaParts.push(`Skill: ${event.skillName}`);
    }
    if (event.statusType !== undefined) {
      metaParts.push(`Status: ${event.statusType}`);
    }

    const metaHtml = metaParts.length > 0
      ? `\n    <span class="meta">${metaParts.join(' | ')}</span>`
      : '';

    // Colorize character names in message with unique colors
    const colorizedMessage = characters.length > 0
      ? colorizeCharacterNamesInText(event.message, characters)
      : event.message;

    return `  <div class="event ${event.type}" data-tick="${event.tick}">
    <span class="tick">Tick ${event.tick}</span>
    <span class="type">${event.type}</span>
    <span class="message">${colorizedMessage}</span>${metaHtml}
  </div>`;
  }).join('\n');

  return `<div class="event-log">\n${eventHtml}\n</div>`;
}

/**
 * Builds an array of all characters (players and enemies)
 */
function buildCharacterArray(state: CombatState): Character[] {
  return [...state.players, ...state.enemies];
}
