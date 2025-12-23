import { describe, it, expect } from 'vitest';
import type { ActionForecast, ActionTimelineEntry, CharacterForecast, RuleSummary } from '../../src/types/forecast.js';
import { renderActionForecast } from '../../src/ui/action-forecast.js';

/**
 * Test helpers for creating forecast data
 */
function createTimelineEntry(
  tickNumber: number,
  characterId: string,
  characterName: string,
  skillName: string,
  targetNames: string[],
  isQueued: boolean
): ActionTimelineEntry {
  return {
    tickNumber,
    characterId,
    characterName,
    skillName,
    targetNames,
    isQueued,
  };
}

function createRuleSummary(
  priority: number,
  skillName: string,
  conditionsText: string,
  targetingMode: string,
  enabled: boolean,
  tickCost: number = 0
): RuleSummary {
  return {
    priority,
    skillName,
    tickCost,
    conditionsText,
    targetingMode,
    enabled,
  };
}

function createCharacterForecast(
  characterId: string,
  characterName: string,
  isPlayer: boolean,
  currentAction: CharacterForecast['currentAction'] = null,
  nextAction: CharacterForecast['nextAction'] = null,
  rulesSummary: RuleSummary[] = []
): CharacterForecast {
  return {
    characterId,
    characterName,
    isPlayer,
    currentAction,
    nextAction,
    rulesSummary,
  };
}

function createActionForecast(
  timeline: ActionTimelineEntry[] = [],
  characterForecasts: CharacterForecast[] = []
): ActionForecast {
  return {
    timeline,
    characterForecasts,
  };
}

describe('ActionForecastRenderer - Timeline Rendering', () => {
  it('should render timeline entry with tick number', () => {
    const entry = createTimelineEntry(12, 'p1', 'Warrior', 'Strike', ['Goblin'], true);
    const forecast = createActionForecast([entry], []);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('12');
    expect(html).toContain('Warrior');
    expect(html).toContain('Strike');
    expect(html).toContain('Goblin');
  });

  it('should render timeline entry with character → skill → targets format', () => {
    const entry = createTimelineEntry(15, 'e1', 'Goblin', 'Bash', ['Warrior'], false);
    const forecast = createActionForecast([entry], []);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('Goblin');
    expect(html).toContain('Bash');
    expect(html).toContain('Warrior');
  });

  it('should visually distinguish queued actions from predicted actions', () => {
    const queued = createTimelineEntry(12, 'p1', 'Warrior', 'Strike', ['Goblin'], true);
    const predicted = createTimelineEntry(13, 'p2', 'Mage', 'Fireball', ['Goblin'], false);
    const forecast = createActionForecast([queued, predicted], []);
    
    const html = renderActionForecast(forecast);
    
    // Queued should be styled differently (e.g., bold or different class)
    expect(html).toMatch(/queued|in-progress/i);
    expect(html).toMatch(/predicted|forecast/i);
  });

  it('should render multiple target names', () => {
    const entry = createTimelineEntry(20, 'p1', 'Mage', 'Fireball', ['Goblin A', 'Goblin B', 'Goblin C'], false);
    const forecast = createActionForecast([entry], []);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('Goblin A');
    expect(html).toContain('Goblin B');
    expect(html).toContain('Goblin C');
  });

  it('should render timeline in chronological order', () => {
    const entry1 = createTimelineEntry(10, 'p1', 'Warrior', 'Strike', ['Goblin'], true);
    const entry2 = createTimelineEntry(12, 'p2', 'Mage', 'Heal', ['Warrior'], false);
    const entry3 = createTimelineEntry(15, 'e1', 'Goblin', 'Bash', ['Warrior'], false);
    const forecast = createActionForecast([entry1, entry2, entry3], []);
    
    const html = renderActionForecast(forecast);
    
    const tick10Index = html.indexOf('10');
    const tick12Index = html.indexOf('12');
    const tick15Index = html.indexOf('15');
    
    expect(tick10Index).toBeLessThan(tick12Index);
    expect(tick12Index).toBeLessThan(tick15Index);
  });

  it('should show "No actions in timeline" when empty', () => {
    const forecast = createActionForecast([], []);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toMatch(/no actions|empty timeline|no upcoming/i);
  });

  it('should render timeline section header', () => {
    const entry = createTimelineEntry(12, 'p1', 'Warrior', 'Strike', ['Goblin'], true);
    const forecast = createActionForecast([entry], []);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toMatch(/timeline|next actions|upcoming/i);
  });
});

describe('ActionForecastRenderer - Character Forecast Rendering', () => {
  it('should render character name', () => {
    const charForecast = createCharacterForecast('p1', 'Warrior', true);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('Warrior');
  });

  it('should render current action details', () => {
    const charForecast = createCharacterForecast('p1', 'Warrior', true, {
      skillName: 'Strike',
      targetNames: ['Goblin'],
      ticksRemaining: 2,
    });
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('Strike');
    expect(html).toContain('Goblin');
    expect(html).toContain('2');
  });

  it('should show "Idle" when no current action', () => {
    const charForecast = createCharacterForecast('p1', 'Warrior', true);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toMatch(/idle|not acting|waiting/i);
  });

  it('should render next action prediction', () => {
    const charForecast = createCharacterForecast('p1', 'Warrior', true, null, {
      skillName: 'Strike',
      targetNames: ['Goblin'],
      reason: 'Always',
    });
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('Strike');
    expect(html).toContain('Goblin');
    expect(html).toContain('Always');
  });

  it('should show next action reason (which rule matched)', () => {
    const charForecast = createCharacterForecast('p1', 'Warrior', true, null, {
      skillName: 'Heal',
      targetNames: ['Self'],
      reason: 'HP < 50%',
    });
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('HP < 50%');
  });

  it('should show "No valid action" when next action is null', () => {
    const charForecast = createCharacterForecast('p1', 'Warrior', true);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toMatch(/no action|no valid|waiting/i);
  });

  it('should render multiple characters', () => {
    const char1 = createCharacterForecast('p1', 'Warrior', true);
    const char2 = createCharacterForecast('p2', 'Mage', true);
    const char3 = createCharacterForecast('e1', 'Goblin', false);
    const forecast = createActionForecast([], [char1, char2, char3]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('Warrior');
    expect(html).toContain('Mage');
    expect(html).toContain('Goblin');
  });

  it('should distinguish player characters from enemies', () => {
    const player = createCharacterForecast('p1', 'Warrior', true);
    const enemy = createCharacterForecast('e1', 'Goblin', false);
    const forecast = createActionForecast([], [player, enemy]);
    
    const html = renderActionForecast(forecast);
    
    // Characters should be distinguished by unique colors (using formatCharacterName)
    // Both should have colored span elements
    expect(html).toContain('<span style="color:');
    expect(html).toContain('Warrior');
    expect(html).toContain('Goblin');
    
    // Each character should have a different color based on their ID
    const warriorColorMatch = html.match(/Warrior<\/span>/);
    const goblinColorMatch = html.match(/Goblin<\/span>/);
    expect(warriorColorMatch).toBeTruthy();
    expect(goblinColorMatch).toBeTruthy();
  });
});

describe('ActionForecastRenderer - Rule Summary Rendering', () => {
  it('should render rule without priority prefix', () => {
    const rule = createRuleSummary(100, 'Heal', 'If HP < 50%', 'Self', true);
    const charForecast = createCharacterForecast('p1', 'Warrior', true, null, null, [rule]);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    // Priority should not be displayed (no [P100] prefix)
    expect(html).not.toContain('[P100]');
    expect(html).not.toContain('[P');
    // But the rule details should still be present
    expect(html).toContain('Heal');
    expect(html).toContain('If HP < 50%');
  });

  it('should render skill name in rule summary', () => {
    const rule = createRuleSummary(50, 'Strike', 'Always', 'Lowest HP Enemy', true);
    const charForecast = createCharacterForecast('p1', 'Warrior', true, null, null, [rule]);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('Strike');
  });

  it('should render conditions text', () => {
    const rule = createRuleSummary(80, 'Heal', 'If HP < 30% AND Ally Count > 1', 'Lowest HP Ally', true);
    const charForecast = createCharacterForecast('p1', 'Mage', true, null, null, [rule]);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('If HP < 30% AND Ally Count > 1');
  });

  it('should render targeting mode', () => {
    const rule = createRuleSummary(50, 'Strike', 'Always', 'Lowest HP Enemy', true);
    const charForecast = createCharacterForecast('p1', 'Warrior', true, null, null, [rule]);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toContain('Lowest HP Enemy');
  });

  it('should visually distinguish enabled vs disabled rules', () => {
    const enabled = createRuleSummary(100, 'Heal', 'If HP < 50%', 'Self', true);
    const disabled = createRuleSummary(50, 'Strike', 'Always', 'Lowest HP Enemy', false);
    const charForecast = createCharacterForecast('p1', 'Warrior', true, null, null, [enabled, disabled]);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toMatch(/disabled|inactive/i);
  });

  it('should render multiple rules in priority order', () => {
    const rule1 = createRuleSummary(100, 'Heal', 'If HP < 50%', 'Self', true);
    const rule2 = createRuleSummary(50, 'Strike', 'Always', 'Lowest HP Enemy', true);
    const charForecast = createCharacterForecast('p1', 'Warrior', true, null, null, [rule1, rule2]);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    // Verify both rules are present (priority values not displayed anymore)
    const healIndex = html.indexOf('Heal');
    const strikeIndex = html.indexOf('Strike');
    
    // Rules should be in the order they were provided (higher priority first)
    expect(healIndex).toBeGreaterThan(0);
    expect(strikeIndex).toBeGreaterThan(healIndex);
    
    // Priority prefixes should not be present
    expect(html).not.toContain('[P100]');
    expect(html).not.toContain('[P50]');
  });

  it('should show "No rules configured" when rules list is empty', () => {
    const charForecast = createCharacterForecast('p1', 'Warrior', true, null, null, []);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toMatch(/no rules|no instructions|not configured/i);
  });

  it('should render rule summary section header', () => {
    const rule = createRuleSummary(100, 'Heal', 'If HP < 50%', 'Self', true);
    const charForecast = createCharacterForecast('p1', 'Warrior', true, null, null, [rule]);
    const forecast = createActionForecast([], [charForecast]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toMatch(/rules|ai rules|instructions/i);
  });
});

describe('ActionForecastRenderer - Complete Forecast Rendering', () => {
  it('should render complete forecast with all sections', () => {
    const timeline = [
      createTimelineEntry(12, 'p1', 'Warrior', 'Strike', ['Goblin'], true),
      createTimelineEntry(13, 'p2', 'Mage', 'Fireball', ['Goblin'], false),
    ];
    
    const rule1 = createRuleSummary(100, 'Heal', 'If HP < 50%', 'Self', true);
    const char1 = createCharacterForecast('p1', 'Warrior', true, {
      skillName: 'Strike',
      targetNames: ['Goblin'],
      ticksRemaining: 2,
    }, null, [rule1]);
    
    const rule2 = createRuleSummary(50, 'Fireball', 'Always', 'All Enemies', true);
    const char2 = createCharacterForecast('p2', 'Mage', true, null, {
      skillName: 'Fireball',
      targetNames: ['Goblin'],
      reason: 'Always',
    }, [rule2]);
    
    const forecast = createActionForecast(timeline, [char1, char2]);
    
    const html = renderActionForecast(forecast);
    
    // Timeline section
    expect(html).toContain('12');
    expect(html).toContain('Strike');
    
    // Character forecasts
    expect(html).toContain('Warrior');
    expect(html).toContain('Mage');
    
    // Rules
    expect(html).toContain('If HP < 50%');
    expect(html).toContain('Always');
  });

  it('should return valid HTML string', () => {
    const forecast = createActionForecast([], []);
    const html = renderActionForecast(forecast);
    
    expect(typeof html).toBe('string');
    expect(html).toMatch(/<div/);
    expect(html).toMatch(/<\/div>/);
  });

  it('should handle empty forecast gracefully', () => {
    const forecast = createActionForecast([], []);
    const html = renderActionForecast(forecast);
    
    expect(html).toBeTruthy();
    expect(typeof html).toBe('string');
  });

  it('should have distinct visual sections', () => {
    const timeline = [createTimelineEntry(12, 'p1', 'Warrior', 'Strike', ['Goblin'], true)];
    const char = createCharacterForecast('p1', 'Warrior', true);
    const forecast = createActionForecast(timeline, [char]);
    
    const html = renderActionForecast(forecast);
    
    expect(html).toMatch(/timeline|next actions/i);
    expect(html).toMatch(/character|forecast/i);
  });
});
