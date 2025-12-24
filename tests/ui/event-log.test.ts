import { describe, it, expect } from 'vitest';
import { parseHTML } from 'linkedom';
import type { CombatEvent, StatusType } from '../../src/types/index.js';
import { renderEventLog } from '../../src/ui/event-log.js';

/**
 * EventLog Test Suite
 *
 * TDD tests for EventLog renderer (Phase 5 UI Layer)
 *
 * Tests the event log rendering:
 * - Event display with all event types
 * - Ordering (newest at top - descending tick order)
 * - Formatting of tick numbers, values, and metadata
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
    statusType?: StatusType;
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
    
    expect(html).toMatch(/Tick\s*1/i);
    expect(html).toMatch(/Tick\s*10/i);
  });

  it('should show event type indicator for damage events', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'damage', 'Goblin takes 15 damage', { value: 15 }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('damage');
  });

  it('should show event type indicator for different event types', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'action-queued', 'Action queued'),
      createEvent(2, 'action-resolved', 'Action resolved'),
      createEvent(3, 'healing', 'Healing occurred'),
      createEvent(4, 'status-applied', 'Status applied'),
      createEvent(5, 'knockout', 'Enemy knocked out'),
      createEvent(6, 'victory', 'Victory!'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('action-queued');
    expect(html).toContain('action-resolved');
    expect(html).toContain('healing');
    expect(html).toContain('status-applied');
    expect(html).toContain('knockout');
    expect(html).toContain('victory');
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

  it('should maintain order for events with same tick', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'damage', 'First at tick 5'),
      createEvent(5, 'damage', 'Second at tick 5'),
      createEvent(5, 'knockout', 'Third at tick 5'),
    ];
    const html = renderEventLog(events);
    
    const firstPos = html.indexOf('First at tick 5');
    const secondPos = html.indexOf('Second at tick 5');
    const thirdPos = html.indexOf('Third at tick 5');
    
    // Should maintain array order for same-tick events
    expect(firstPos).toBeLessThan(secondPos);
    expect(secondPos).toBeLessThan(thirdPos);
  });

  it('should handle single event', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'victory', 'Only event'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('Only event');
    expect(html).toMatch(/Tick\s*1/i);
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
  it('should format tick numbers with "Tick" prefix', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'damage', 'Test event'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toMatch(/Tick\s*5/i);
  });

  it('should include actor ID when present', () => {
    const events: CombatEvent[] = [
      createEvent(3, 'damage', 'Attack!', { actorId: 'player-1' }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('player-1');
  });

  it('should include target ID when present', () => {
    const events: CombatEvent[] = [
      createEvent(4, 'healing', 'Healed!', { targetId: 'player-2' }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('player-2');
  });

  it('should show damage values', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'damage', 'Goblin takes damage', { value: 42 }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('42');
  });

  it('should show healing values', () => {
    const events: CombatEvent[] = [
      createEvent(6, 'healing', 'Hero healed', { value: 25 }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('25');
  });

  it('should show skill name when present', () => {
    const events: CombatEvent[] = [
      createEvent(2, 'action-queued', 'Hero uses skill', { skillName: 'Fireball' }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('Fireball');
  });

  it('should show status type for status events', () => {
    const events: CombatEvent[] = [
      createEvent(7, 'status-applied', 'Poisoned!', { statusType: 'poisoned' }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('poisoned');
  });

  it('should format events with multiple metadata fields', () => {
    const events: CombatEvent[] = [
      createEvent(8, 'damage', 'Critical hit!', {
        actorId: 'player-1',
        targetId: 'enemy-1',
        value: 50,
        skillName: 'Backstab',
      }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('player-1');
    expect(html).toContain('enemy-1');
    expect(html).toContain('50');
    expect(html).toContain('Backstab');
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

  it('should handle events with minimal data (only required fields)', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'victory', 'Victory!'),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('Victory!');
    expect(html).toContain('victory');
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
    
    expect(html).toMatch(/Tick\s*0/i);
  });

  it('should handle all event types correctly', () => {
    const allEventTypes: CombatEvent['type'][] = [
      'action-queued',
      'action-resolved',
      'damage',
      'healing',
      'status-applied',
      'status-expired',
      'knockout',
      'victory',
      'defeat',
      'target-lost',
    ];
    
    const events: CombatEvent[] = allEventTypes.map((type, i) => 
      createEvent(i + 1, type, `${type} event`)
    );
    const html = renderEventLog(events);
    
    allEventTypes.forEach(type => {
      expect(html).toContain(type);
    });
  });

  it('should handle status-expired event with statusType', () => {
    const events: CombatEvent[] = [
      createEvent(10, 'status-expired', 'Poison expired', { statusType: 'poisoned' }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('poisoned');
    expect(html).toContain('status-expired');
  });
});

describe('EventLog - Event Grouping', () => {
  it('should consolidate action-resolved with single damage result', () => {
    const events: CombatEvent[] = [
      createEvent(3, 'action-resolved', 'Hero used Strike', {
        actorId: 'hero',
        skillName: 'Strike'
      }),
      createEvent(3, 'damage', 'Goblin takes 15 damage', {
        actorId: 'hero',
        targetId: 'goblin',
        value: 15
      }),
    ];
    const html = renderEventLog(events);
    
    // Should combine messages with arrow
    expect(html).toContain('Hero used Strike → Goblin takes 15 damage');
    
    // Should not show as separate entries
    const { document } = parseHTML(html);
    const eventElements = Array.from(document.querySelectorAll('.event'));
    expect(eventElements).toHaveLength(1);
  });

  it('should consolidate action-resolved with multiple results (AoE)', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'action-resolved', 'Wizard used Fireball', {
        actorId: 'wizard',
        skillName: 'Fireball'
      }),
      createEvent(5, 'damage', 'Goblin takes 20 damage', {
        actorId: 'wizard',
        targetId: 'goblin',
        value: 20
      }),
      createEvent(5, 'damage', 'Orc takes 18 damage', {
        actorId: 'wizard',
        targetId: 'orc',
        value: 18
      }),
    ];
    const html = renderEventLog(events);
    
    // Should combine all results
    expect(html).toContain('Wizard used Fireball → Goblin takes 20 damage, Orc takes 18 damage');
    
    // Single consolidated entry
    const { document } = parseHTML(html);
    const eventElements = Array.from(document.querySelectorAll('.event'));
    expect(eventElements).toHaveLength(1);
  });

  it('should show action-resolved standalone when no results follow', () => {
    const events: CombatEvent[] = [
      createEvent(2, 'action-resolved', 'Hero used Dodge', {
        actorId: 'hero',
        skillName: 'Dodge'
      }),
    ];
    const html = renderEventLog(events);
    
    // Should show as standalone without arrow
    expect(html).toContain('Hero used Dodge');
    expect(html).not.toContain('→');
  });

  it('should handle mixed grouped and standalone events', () => {
    const events: CombatEvent[] = [
      createEvent(3, 'action-resolved', 'Hero used Strike', {
        actorId: 'hero',
        skillName: 'Strike'
      }),
      createEvent(3, 'damage', 'Goblin takes 15 damage', {
        actorId: 'hero',
        targetId: 'goblin',
        value: 15
      }),
      createEvent(3, 'knockout', 'Goblin defeated', {
        actorId: 'hero',
        targetId: 'goblin'
      }),
      createEvent(2, 'status-expired', 'Poison expired', {
        actorId: 'goblin',
        statusType: 'poisoned'
      }),
    ];
    const html = renderEventLog(events);
    
    // Should have grouped action and standalone status-expired
    const { document } = parseHTML(html);
    const eventElements = Array.from(document.querySelectorAll('.event'));
    expect(eventElements).toHaveLength(2);
    
    // Grouped entry should have combined message
    expect(html).toContain('Hero used Strike → Goblin takes 15 damage, Goblin defeated');
    
    // Standalone should appear separately
    expect(html).toContain('Poison expired');
  });

  it('should not group events from different actors on same tick', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'action-resolved', 'Hero used Strike', {
        actorId: 'hero',
        skillName: 'Strike'
      }),
      createEvent(5, 'damage', 'Goblin takes 15 damage', {
        actorId: 'hero',
        targetId: 'goblin',
        value: 15
      }),
      createEvent(5, 'action-resolved', 'Wizard used Fireball', {
        actorId: 'wizard',
        skillName: 'Fireball'
      }),
      createEvent(5, 'damage', 'Orc takes 20 damage', {
        actorId: 'wizard',
        targetId: 'orc',
        value: 20
      }),
    ];
    const html = renderEventLog(events);
    
    // Should create two separate groups
    const { document } = parseHTML(html);
    const eventElements = Array.from(document.querySelectorAll('.event'));
    expect(eventElements).toHaveLength(2);
    
    // Each group should have its own combined message
    expect(html).toContain('Hero used Strike → Goblin takes 15 damage');
    expect(html).toContain('Wizard used Fireball → Orc takes 20 damage');
  });

  it('should consolidate action with healing result', () => {
    const events: CombatEvent[] = [
      createEvent(4, 'action-resolved', 'Cleric used Heal', {
        actorId: 'cleric',
        skillName: 'Heal'
      }),
      createEvent(4, 'healing', 'Hero restored 25 HP', {
        actorId: 'cleric',
        targetId: 'hero',
        value: 25
      }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('Cleric used Heal → Hero restored 25 HP');
    
    const { document } = parseHTML(html);
    const eventElements = Array.from(document.querySelectorAll('.event'));
    expect(eventElements).toHaveLength(1);
  });

  it('should consolidate action with status-applied result', () => {
    const events: CombatEvent[] = [
      createEvent(6, 'action-resolved', 'Rogue used Poison Dagger', {
        actorId: 'rogue',
        skillName: 'Poison Dagger'
      }),
      createEvent(6, 'damage', 'Goblin takes 10 damage', {
        actorId: 'rogue',
        targetId: 'goblin',
        value: 10
      }),
      createEvent(6, 'status-applied', 'Goblin is poisoned', {
        actorId: 'rogue',
        targetId: 'goblin',
        statusType: 'poisoned'
      }),
    ];
    const html = renderEventLog(events);
    
    expect(html).toContain('Rogue used Poison Dagger → Goblin takes 10 damage, Goblin is poisoned');
    
    const { document } = parseHTML(html);
    const eventElements = Array.from(document.querySelectorAll('.event'));
    expect(eventElements).toHaveLength(1);
  });

  it('should include combined metadata from grouped events', () => {
    const events: CombatEvent[] = [
      createEvent(3, 'action-resolved', 'Hero used Strike', {
        actorId: 'hero',
        skillName: 'Strike'
      }),
      createEvent(3, 'damage', 'Goblin takes 15 damage', {
        actorId: 'hero',
        targetId: 'goblin',
        value: 15
      }),
    ];
    const html = renderEventLog(events);
    
    // Should show actor, skill, target, and value in metadata
    expect(html).toContain('Actor: hero');
    expect(html).toContain('Skill: Strike');
    expect(html).toContain('Target: goblin');
    expect(html).toContain('Value: 15');
  });

  it('should include multiple targets in metadata for AoE', () => {
    const events: CombatEvent[] = [
      createEvent(5, 'action-resolved', 'Wizard used Fireball', {
        actorId: 'wizard',
        skillName: 'Fireball'
      }),
      createEvent(5, 'damage', 'Goblin takes 20 damage', {
        actorId: 'wizard',
        targetId: 'goblin',
        value: 20
      }),
      createEvent(5, 'damage', 'Orc takes 18 damage', {
        actorId: 'wizard',
        targetId: 'orc',
        value: 18
      }),
    ];
    const html = renderEventLog(events);
    
    // Should show multiple targets and values
    expect(html).toMatch(/Target:.*goblin.*orc|Target:.*orc.*goblin/);
    expect(html).toContain('Value: 20, 18');
  });

  it('should not group standalone events (victory, defeat, etc.)', () => {
    const events: CombatEvent[] = [
      createEvent(10, 'victory', 'Victory!'),
      createEvent(9, 'defeat', 'Defeat!'),
      createEvent(8, 'target-lost', 'Target lost'),
    ];
    const html = renderEventLog(events);
    
    // All should be standalone
    const { document } = parseHTML(html);
    const eventElements = Array.from(document.querySelectorAll('.event'));
    expect(eventElements).toHaveLength(3);
    
    // None should have arrows
    expect(html).not.toContain('→');
  });

  it('should maintain tick descending order with grouped events', () => {
    const events: CombatEvent[] = [
      createEvent(1, 'action-resolved', 'Early action', {
        actorId: 'hero',
        skillName: 'Strike'
      }),
      createEvent(1, 'damage', 'Early damage', {
        actorId: 'hero',
        targetId: 'goblin',
        value: 10
      }),
      createEvent(5, 'action-resolved', 'Late action', {
        actorId: 'wizard',
        skillName: 'Fireball'
      }),
      createEvent(5, 'damage', 'Late damage', {
        actorId: 'wizard',
        targetId: 'orc',
        value: 20
      }),
    ];
    const html = renderEventLog(events);
    
    // Later tick should appear first
    const latePos = html.indexOf('Late action');
    const earlyPos = html.indexOf('Early action');
    expect(latePos).toBeLessThan(earlyPos);
  });

  it('should stop grouping when encountering different tick', () => {
    const events: CombatEvent[] = [
      createEvent(3, 'action-resolved', 'Hero used Strike', {
        actorId: 'hero',
        skillName: 'Strike'
      }),
      createEvent(2, 'damage', 'Goblin takes 15 damage', {
        actorId: 'hero',
        targetId: 'goblin',
        value: 15
      }),
    ];
    const html = renderEventLog(events);
    
    // Different ticks should not group
    const { document } = parseHTML(html);
    const eventElements = Array.from(document.querySelectorAll('.event'));
    expect(eventElements).toHaveLength(2);
    
    expect(html).not.toContain('→');
  });
});
