import { describe, it, expect } from 'vitest';
import { parseHTML } from 'linkedom';
import type { CombatEvent } from '../../src/types/index.js';
import { renderEventLog } from '../../src/ui/event-log.js';

/**
 * EventLog Test Suite
 *
 * TDD tests for EventLog renderer (Phase 5 UI Layer)
 *
 * Tests the event log rendering with tick-summary format:
 * - Event display with all event types grouped by tick
 * - Ordering (newest at top - descending tick order)
 * - Formatting of tick numbers, values, and metadata in summaries
 * - Edge cases and error handling
 *
 * Implementation: src/ui/event-log.ts
 */

// Test helpers
function createEvent(
  tick: number,
  type: CombatEvent['type'],
  message: string,
  options: {
    actorId?: string;
    targetId?: string;
    value?: number;
    skillName?: string;
    statusType?: string;
  } = {}
): CombatEvent {
  return {
    tick,
    type,
    message,
    ...options,
  };
}

describe('EventLog - Event Display', () => {
  it('should render all events in the array', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'action-queued', 'Hero queues Strike'),
      createEvent(2, 'damage', 'Goblin takes 10 damage'),
      createEvent(3, 'victory', 'Victory!'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('Hero queues Strike');
    expect(html).toContain('Goblin takes 10 damage');
    expect(html).toContain('Victory!');
  });

  it('should show event message text', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'healing', 'Cleric heals Hero for 25 HP'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('Cleric heals Hero for 25 HP');
  });

  it('should show tick number for each event', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'action-queued', 'Event at tick 1'),
      createEvent(10, 'damage', 'Event at tick 10'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toMatch(/T\s*1/i);
    expect(html).toMatch(/T\s*10/i);
  });

  it('should show event type indicator for damage events', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'damage', 'Goblin takes 15 damage', { value: 15 }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('damage');
  });

  it('should show tick-summary class for all events', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'action-queued', 'Action queued'),
      createEvent(2, 'action-resolved', 'Action resolved'),
      createEvent(3, 'healing', 'Healing occurred'),
      createEvent(4, 'status-applied', 'Status applied'),
      createEvent(5, 'knockout', 'Enemy knocked out'),
      createEvent(6, 'victory', 'Victory!'),
    ];
    const html = renderEventLog(events);
    
    // New format uses tick-summary class instead of individual event type classes
    expect(html).toContain('tick-summary');
    // Verify events are rendered (by checking their messages)
    expect(html).toContain('Healing occurred');
    expect(html).toContain('Status applied');
    expect(html).toContain('⚔️ Enemy knocked out');
    expect(html).toContain('⚔️ Victory!');
  });

  it('should handle empty events array (shows "No events")', () => {
    const events: CombatEvent[] = [];
    const html = renderEventLog(events);
    
    expect(html).toMatch(/no events/i);
  });
});

describe('EventLog - Ordering', () => {
  it('should display newest events at top (descending tick order)', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'action-queued', 'First event'),
      createEvent(5, 'damage', 'Latest event'),
      createEvent(3, 'healing', 'Middle event'),
    ];
    const html = renderEventLog(events);
    
    // Find positions of events in HTML
    const latestPos = html.indexOf('Latest event');
    const middlePos = html.indexOf('Middle event');
    const firstPos = html.indexOf('First event');
    
    // Newest (tick 5) should appear before older events
    expect(latestPos).toBeLessThan(middlePos);
    expect(middlePos).toBeLessThan(firstPos);
  });

  it('should group events with same tick into single summary', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'damage', 'First at tick 5'),
      createEvent(5, 'damage', 'Second at tick 5'),
      createEvent(5, 'knockout', 'Third at tick 5'),
    ];
    const html = renderEventLog(events);
    
    // New format groups same-tick events into a single line
    // Should have exactly one tick-5 summary
    const tick5Matches = html.match(/data-tick="5"/g);
    expect(tick5Matches).toHaveLength(1);
    
    // Should contain all messages (combined in summary)
    expect(html).toContain('First at tick 5');
    expect(html).toContain('Second at tick 5');
    expect(html).toContain('Third at tick 5');
  });

  it('should handle single event', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'victory', 'Only event'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('Only event');
    expect(html).toMatch(/T\s*1/i);
  });

  it('should sort events from different ticks correctly', () => {
    const events: CombatEvent[] = [
      createEvent(10, 'damage', 'Tick 10'),
      createEvent(1, 'action-queued', 'Tick 1'),
      createEvent(20, 'victory', 'Tick 20'),
      createEvent(15, 'healing', 'Tick 15'),
    ];
    const html = renderEventLog(events);
    
    // Parse HTML and verify descending order: 20, 15, 10, 1
    const { document } = parseHTML(html);
    const eventElements = Array.from(document.querySelectorAll('.event'));
    const ticks = eventElements.map((el: any) => Number(el.getAttribute('data-tick')));
    
    expect(ticks).toEqual([20, 15, 10, 1]);
  });
});

describe('EventLog - Formatting', () => {
  it('should format tick numbers with "T" prefix', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'damage', 'Test event'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toMatch(/T\s*5/i);
  });

  it('should include actor information in summaries', () => {
    const events: CombatEvent[] = [
      createEvent(3, 'action-resolved', 'Attack!', { 
        actorId: 'player-1',
        skillName: 'Strike'
      }),
    ];
    const html = renderEventLog(events);
    
    // New format creates narrative summaries with actor info
    // Without combatState, it uses the ID
    expect(html).toContain('player-1');
    expect(html).toContain('Strike');
  });

  it('should include target information in action summaries', () => {
    const events: CombatEvent[] = [
      createEvent(4, 'action-resolved', 'Healed!', { 
        actorId: 'player-1',
        targetId: 'player-2',
        skillName: 'Heal'
      }),
      createEvent(4, 'healing', 'Player healed', {
        actorId: 'player-1',
        targetId: 'player-2',
        value: 25
      }),
    ];
    const html = renderEventLog(events);
    
    // New format shows target in narrative summary with value
    expect(html).toContain('player-2');
    expect(html).toContain('25');
  });

  it('should show damage values in action summaries', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'action-resolved', 'Attack', {
        actorId: 'player-1',
        skillName: 'Strike',
      }),
      createEvent(5, 'damage', 'Goblin takes damage', { 
        actorId: 'player-1',
        targetId: 'goblin-1',
        value: 42 
      }),
    ];
    const html = renderEventLog(events);
    
    // New format shows damage value in narrative summary
    expect(html).toContain('42');
  });

  it('should show healing values in action summaries', () => {
    const events: CombatEvent[] = [
      createEvent(6, 'action-resolved', 'Heal', {
        actorId: 'cleric-1',
        skillName: 'Heal',
      }),
      createEvent(6, 'healing', 'Hero healed', { 
        actorId: 'cleric-1',
        targetId: 'hero-1',
        value: 25 
      }),
    ];
    const html = renderEventLog(events);
    
    // New format shows healing value in narrative summary
    expect(html).toContain('25');
  });

  it('should show skill name in action summaries', () => {
    const events: CombatEvent[] = [
      createEvent(2, 'action-resolved', 'Hero uses skill', { 
        actorId: 'hero-1',
        skillName: 'Fireball' 
      }),
    ];
    const html = renderEventLog(events);
    
    // New format includes skill name in narrative summary
    expect(html).toContain('Fireball');
  });

  it('should show status events in summaries', () => {
    const events: CombatEvent[] = [
      createEvent(7, 'status-applied', 'Poisoned!', { statusType: 'poisoned' }),
    ];
    const html = renderEventLog(events);
    
    // New format shows status event message
    expect(html).toContain('Poisoned!');
  });

  it('should format complete action with all metadata', () => {
    const events: CombatEvent[] = [
      createEvent(8, 'action-resolved', 'Attack', {
        actorId: 'player-1',
        skillName: 'Backstab',
      }),
      createEvent(8, 'damage', 'Critical hit!', {
        actorId: 'player-1',
        targetId: 'enemy-1',
        value: 50,
      }),
    ];
    const html = renderEventLog(events);
    
    // New format creates narrative summary with all relevant info
    expect(html).toContain('player-1');
    expect(html).toContain('Backstab');
    expect(html).toContain('enemy-1');
    expect(html).toContain('50');
  });
});

describe('EventLog - Edge Cases', () => {
  it('should handle very long message text', () => {
    const longMessage = 'The extraordinarily powerful and magnificently skilled warrior hero performs an incredibly devastating and catastrophically damaging ultimate ability attack on the unfortunate enemy target';
    const events: CombatEvent[] = [
      createEvent(5, 'damage', longMessage),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain(longMessage);
  });

  it('should handle victory events with minimal data', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'victory', 'Victory!'),
    ];
    const html = renderEventLog(events);
    
    // New format shows victory with emoji prefix and tick-summary class
    expect(html).toContain('Victory!');
    expect(html).toContain('tick-summary');
    expect(html).toContain('⚔️');
  });

  it('should handle large number of events', () => {
    const events: CombatEvent[] = Array.from({ length: 100 }, (_, i) => 
      createEvent(i + 1, 'damage', `Event ${i + 1}`)
    );
    const html = renderEventLog(events);
    
    // Should contain first and last events
    expect(html).toContain('Event 1');
    expect(html).toContain('Event 100');
    
    // Should be valid HTML
    expect(html).toMatch(/<[^>]+>/);
  });

  it('should return valid HTML string', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'damage', 'Test'),
    ];
    const html = renderEventLog(events);
    
    expect(typeof html).toBe('string');
    expect(html).toMatch(/<[^>]+>/);
  });

  it('should handle tick number 0', () => {
    const events: CombatEvent[] = [
      createEvent(0, 'action-queued', 'Initial event'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toMatch(/T\s*0/i);
  });

  it('should handle all combat-relevant event types', () => {
    // Events that appear in summaries (action-relevant events)
    const summaryEvents: CombatEvent[] = [
      createEvent(1, 'action-resolved', 'action-resolved event', { actorId: 'p1', skillName: 'Strike' }),
      createEvent(2, 'damage', 'damage event'),
      createEvent(3, 'healing', 'healing event'),
      createEvent(4, 'status-applied', 'status-applied event'),
      createEvent(5, 'knockout', 'knockout event'),
      createEvent(6, 'victory', 'victory event'),
      createEvent(7, 'defeat', 'defeat event'),
    ];
    
    const html = renderEventLog(summaryEvents);
    
    // New format shows all combat events in summaries
    // action-resolved gets transformed to narrative format (actor→skill)
    expect(html).toContain('p1');
    expect(html).toContain('Strike');
    expect(html).toContain('damage event');
    expect(html).toContain('healing event');
    expect(html).toContain('status-applied event');
    expect(html).toContain('⚔️ knockout event');
    expect(html).toContain('⚔️ victory event');
    expect(html).toContain('⚔️ defeat event');
  });

  it('should show status-expired events in summaries', () => {
    const events: CombatEvent[] = [
      createEvent(10, 'status-expired', 'Poison expired', { statusType: 'poisoned' }),
    ];
    const html = renderEventLog(events);
    
    // status-expired is not in the action events list, so falls back to message
    expect(html).toContain('Poison expired');
  });
});

describe('EventLog - Layout', () => {
  it('should left-align event log text', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'damage', 'Hero strikes Goblin'),
    ];
    const html = renderEventLog(events);
    
    // Event log should have left-aligned text style
    expect(html).toContain('text-align: left');
  });

  it('should render each entry on its own line within a tick', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'action-resolved', 'Attack', {
        actorId: 'player-1',
        skillName: 'Strike',
      }),
      createEvent(5, 'damage', 'Goblin takes damage', {
        actorId: 'player-1',
        targetId: 'goblin-1',
        value: 25,
      }),
      createEvent(5, 'action-resolved', 'Slash', {
        actorId: 'enemy-1',
        skillName: 'Slash',
      }),
      createEvent(5, 'damage', 'Hero takes damage', {
        actorId: 'enemy-1',
        targetId: 'hero-1',
        value: 10,
      }),
    ];
    const html = renderEventLog(events);
    const { document } = parseHTML(html);
    
    // Each action entry should be in its own .entry element within the tick
    const tick5Container = document.querySelector('[data-tick="5"]');
    const entries = tick5Container?.querySelectorAll('.entry');
    
    // Should have separate entries for player action and enemy action
    expect(entries?.length).toBeGreaterThanOrEqual(2);
  });

  it('should not join entries with period separators', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'damage', 'First damage'),
      createEvent(5, 'damage', 'Second damage'),
    ];
    const html = renderEventLog(events);
    
    // Should NOT have entries joined with ". " separator
    expect(html).not.toContain('First damage. Second damage');
  });

  it('should not join player and enemy entries with pipe separator', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'action-resolved', 'Attack', {
        actorId: 'player-1',
        skillName: 'Strike',
      }),
      createEvent(5, 'action-resolved', 'Slash', {
        actorId: 'enemy-1',
        skillName: 'Slash',
      }),
    ];
    const html = renderEventLog(events);
    
    // Should NOT have player/enemy groups separated by pipe
    expect(html).not.toContain('<span class="separator">|</span>');
  });
});
