import type { CombatEvent } from '../types/combat.js';
import type { CombatState } from '../types/combat.js';
import type { Character } from '../types/character.js';
import { colorizeCharacterNamesInText } from './character-name-formatter.js';

/**
 * Renders combat events as HTML
 *
 * Displays events in descending tick order (newest at top).
 * Groups all events for a tick onto a single line with compact narrative format.
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

  // Group events by tick
  const eventsByTick = groupEventsByTick(events);

  // Build HTML for each tick (newest first)
  const tickNumbers = Array.from(eventsByTick.keys()).sort((a, b) => b - a);
  
  const tickHtml = tickNumbers.map(tickNumber => {
    const tickEvents = eventsByTick.get(tickNumber)!;
    const summary = summarizeTick(tickEvents, characters, combatState);
    
    return `  <div class="event tick-summary" data-tick="${tickNumber}">
    <span class="tick">T${tickNumber}:</span>
    <span class="message">${summary}</span>
  </div>`;
  }).join('\n');

  return `<div class="event-log">\n${tickHtml}\n</div>`;
}

/**
 * Groups events by tick number
 */
function groupEventsByTick(events: CombatEvent[]): Map<number, CombatEvent[]> {
  const grouped = new Map<number, CombatEvent[]>();
  
  for (const event of events) {
    if (!grouped.has(event.tick)) {
      grouped.set(event.tick, []);
    }
    grouped.get(event.tick)!.push(event);
  }
  
  return grouped;
}

/**
 * Summarizes all events for a tick into a compact narrative
 */
function summarizeTick(events: CombatEvent[], characters: Character[], combatState?: CombatState): string {
  // Filter out meta events we don't want to show in summary
  const actionEvents = events.filter(e => 
    e.type === 'action-resolved' || 
    e.type === 'damage' || 
    e.type === 'healing' ||
    e.type === 'status-applied' ||
    e.type === 'knockout' ||
    e.type === 'victory' ||
    e.type === 'defeat'
  );

  if (actionEvents.length === 0) {
    // Fallback to showing first message if no action events
    const message = events[0]?.message || 'No activity';
    return colorizeCharacterNamesInText(message, characters);
  }

  // Group by player vs enemy actions
  const playerActions: string[] = [];
  const enemyActions: string[] = [];

  // Track actions and their consequences
  const processedIndices = new Set<number>();

  for (let i = 0; i < actionEvents.length; i++) {
    if (processedIndices.has(i)) continue;
    
    const event = actionEvents[i];
    if (!event) continue;
    
    // Handle special events
    if (event.type === 'victory' || event.type === 'defeat' || event.type === 'knockout') {
      const message = colorizeCharacterNamesInText(event.message, characters);
      playerActions.push(`⚔️ ${message}`);
      processedIndices.add(i);
      continue;
    }

    // Handle action-resolved events
    if (event.type === 'action-resolved' && event.actorId && event.skillName) {
      const actor = getCharacterName(event.actorId, combatState);
      const skill = event.skillName;
      
      // Look for consequence (damage/healing) in next events
      let consequence = '';
      for (let j = i + 1; j < actionEvents.length; j++) {
        const nextEvent = actionEvents[j];
        if (!nextEvent) continue;
        
        if ((nextEvent.type === 'damage' || nextEvent.type === 'healing') &&
            nextEvent.actorId === event.actorId) {
          const target = getCharacterName(nextEvent.targetId || '', combatState);
          const value = nextEvent.value || 0;
          const arrow = nextEvent.type === 'damage' ? '→' : '♥';
          consequence = `${arrow}${target}(${value})`;
          processedIndices.add(j);
          break;
        }
      }
      
      const actionText = consequence
        ? `${colorizeCharacterNamesInText(actor, characters)}→${skill}${consequence}`
        : `${colorizeCharacterNamesInText(actor, characters)}→${skill}`;
      
      const isPlayerAction = combatState?.players.some(p => p.id === event.actorId);
      if (isPlayerAction) {
        playerActions.push(actionText);
      } else {
        enemyActions.push(actionText);
      }
      processedIndices.add(i);
      continue;
    }

    // Handle standalone damage/healing/status events
    if (event.type === 'damage' || event.type === 'healing' || event.type === 'status-applied') {
      const message = colorizeCharacterNamesInText(event.message, characters);
      const isPlayerEvent = combatState?.players.some(p => p.id === event.targetId || p.id === event.actorId);
      if (isPlayerEvent) {
        playerActions.push(message);
      } else {
        enemyActions.push(message);
      }
      processedIndices.add(i);
    }
  }

  // Combine player and enemy actions
  const parts: string[] = [];
  if (playerActions.length > 0) {
    parts.push(playerActions.join('. '));
  }
  if (enemyActions.length > 0) {
    parts.push(enemyActions.join('. '));
  }

  return parts.join(' <span class="separator">|</span> ');
}

/**
 * Gets character name from ID
 */
function getCharacterName(id: string, combatState?: CombatState): string {
  if (!combatState) return id;
  
  const character = [...combatState.players, ...combatState.enemies].find(c => c.id === id);
  return character?.name || id;
}

/**
 * Builds an array of all characters (players and enemies)
 */
function buildCharacterArray(state: CombatState): Character[] {
  return [...state.players, ...state.enemies];
}
