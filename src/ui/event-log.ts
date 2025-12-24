import type { CombatEvent } from '../types/combat.js';
import type { CombatState } from '../types/combat.js';
import type { Character } from '../types/character.js';
import { colorizeCharacterNamesInText } from './character-name-formatter.js';

/**
 * Represents a grouped action with its results
 */
interface EventGroup {
  tick: number;
  parentEvent: CombatEvent; // The action-resolved event
  resultEvents: CombatEvent[]; // damage, healing, status-applied, knockout
}

/**
 * Renders combat events as HTML
 *
 * Displays events in descending tick order (newest at top).
 * Consolidates action-resolved events with their consequence events.
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

  // Group events: consolidate action-resolved with their results
  const grouped = groupEvents(sortedEvents);

  // Build HTML for each event or group
  const eventHtml = grouped.map(item => {
    if ('parentEvent' in item) {
      return renderEventGroup(item, characters);
    } else {
      return renderSingleEvent(item, characters);
    }
  }).join('\n');

  return `<div class="event-log">\n${eventHtml}\n</div>`;
}

/**
 * Groups action-resolved events with their consequence events
 */
function groupEvents(sortedEvents: CombatEvent[]): (CombatEvent | EventGroup)[] {
  const groups: (CombatEvent | EventGroup)[] = [];
  const resultEventTypes = new Set(['damage', 'healing', 'status-applied', 'knockout']);
  
  let i = 0;
  while (i < sortedEvents.length) {
    const event = sortedEvents[i];
    if (!event) {
      i++;
      continue;
    }
    
    // Check if this is an action-resolved event
    if (event.type === 'action-resolved' && event.actorId !== undefined) {
      // Look ahead for result events with same tick and actorId
      const resultEvents: CombatEvent[] = [];
      let j = i + 1;
      
      while (j < sortedEvents.length) {
        const nextEvent = sortedEvents[j];
        if (!nextEvent) {
          j++;
          continue;
        }
        
        // Stop if different tick
        if (nextEvent.tick !== event.tick) break;
        
        // Check if this is a result event from the same actor
        if (
          resultEventTypes.has(nextEvent.type) &&
          nextEvent.actorId === event.actorId
        ) {
          resultEvents.push(nextEvent);
          j++;
        } else {
          // Different actor or non-result event, stop grouping
          break;
        }
      }
      
      // Create group if we have results, otherwise standalone event
      if (resultEvents.length > 0) {
        groups.push({
          tick: event.tick,
          parentEvent: event,
          resultEvents,
        });
        i = j; // Skip past all grouped events
      } else {
        groups.push(event);
        i++;
      }
    } else {
      // Not an action-resolved event, add as standalone
      groups.push(event);
      i++;
    }
  }
  
  return groups;
}

/**
 * Renders a grouped action-resolved event with its results
 */
function renderEventGroup(group: EventGroup, characters: Character[]): string {
  // Combine messages: "Hero used Strike → Goblin takes 15 damage"
  const parentMsg = characters.length > 0
    ? colorizeCharacterNamesInText(group.parentEvent.message, characters)
    : group.parentEvent.message;
  
  const resultMsgs = group.resultEvents.map(e => {
    const msg = characters.length > 0
      ? colorizeCharacterNamesInText(e.message, characters)
      : e.message;
    return msg;
  }).join(', ');
  
  const combinedMessage = `${parentMsg} → ${resultMsgs}`;
  
  // Combine metadata from all events
  const metaParts: string[] = [];
  
  // Add actor from parent
  if (group.parentEvent.actorId !== undefined) {
    metaParts.push(`Actor: ${group.parentEvent.actorId}`);
  }
  if (group.parentEvent.skillName !== undefined) {
    metaParts.push(`Skill: ${group.parentEvent.skillName}`);
  }
  
  // Add targets and values from results
  const targets = new Set<string>();
  const values: number[] = [];
  const statuses: string[] = [];
  
  for (const result of group.resultEvents) {
    if (result.targetId !== undefined) {
      targets.add(result.targetId);
    }
    if (result.value !== undefined) {
      values.push(result.value);
    }
    if (result.statusType !== undefined) {
      statuses.push(result.statusType);
    }
  }
  
  if (targets.size > 0) {
    metaParts.push(`Target: ${Array.from(targets).join(', ')}`);
  }
  if (values.length > 0) {
    metaParts.push(`Value: ${values.join(', ')}`);
  }
  if (statuses.length > 0) {
    metaParts.push(`Status: ${statuses.join(', ')}`);
  }
  
  const metaHtml = metaParts.length > 0
    ? `\n    <span class="meta">${metaParts.join(' | ')}</span>`
    : '';
  
  // Build combined type string for CSS classes
  const types = [group.parentEvent.type, ...group.resultEvents.map(e => e.type)].join(' ');
  
  return `  <div class="event ${types}" data-tick="${group.tick}">
    <span class="tick">Tick ${group.tick}</span>
    <span class="type">${group.parentEvent.type}</span>
    <span class="message">${combinedMessage}</span>${metaHtml}
  </div>`;
}

/**
 * Renders a single standalone event
 */
function renderSingleEvent(event: CombatEvent, characters: Character[]): string {
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
}

/**
 * Builds an array of all characters (players and enemies)
 */
function buildCharacterArray(state: CombatState): Character[] {
  return [...state.players, ...state.enemies];
}
