import type { CombatEvent } from '../types/combat.js';

/**
 * Renders combat events as HTML
 * 
 * Displays events in descending tick order (newest at top).
 * Shows tick number, event type, message, and optional metadata.
 * 
 * @param events - Array of combat events to display
 * @returns HTML string representing the event log
 */
export function renderEventLog(events: CombatEvent[]): string {
  // Handle empty array
  if (events.length === 0) {
    return '<div class="event-log">\n  <p>No events</p>\n</div>';
  }

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

    return `  <div class="event ${event.type}" data-tick="${event.tick}">
    <span class="tick">Tick ${event.tick}</span>
    <span class="type">${event.type}</span>
    <span class="message">${event.message}</span>${metaHtml}
  </div>`;
  }).join('\n');

  return `<div class="event-log">\n${eventHtml}\n</div>`;
}
