import { describe, it, expect } from 'vitest';
import type { TargetingMode } from '../../src/types/skill.js';
import {
  renderTargetingOverrideSelector,
  getTargetingModeLabel,
  getTargetingModeHelp,
} from '../../src/ui/targeting-override-selector.js';

/**
 * TargetingOverrideSelector Test Suite
 *
 * Tests the targeting override selector component that allows users to
 * override the default targeting mode for a skill.
 *
 * Acceptance Criteria: AC59
 * - Renders select dropdown with all 7 targeting modes
 * - Plus "(Default)" option to clear override
 * - Current selection is marked as selected
 * - Each targeting mode has descriptive help text
 *
 * Implementation: src/ui/targeting-override-selector.ts
 */

describe('TargetingOverrideSelector - Basic Rendering (AC59)', () => {
  it('should render root container with correct class', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('class="targeting-override-selector"');
  });

  it('should render label for the select dropdown', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('<label');
    expect(html).toContain('for="targeting-select"');
    expect(html).toContain('Targeting Override');
  });

  it('should render select dropdown element', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('<select');
    expect(html).toContain('id="targeting-select"');
  });

  it('should render help text container', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('class="targeting-help"');
    expect(html).toContain('<p');
  });
});

describe('TargetingOverrideSelector - Dropdown Options (AC59)', () => {
  it('should render select with all 7 targeting modes', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    // Count option elements (7 targeting modes + 1 default = 8 total)
    const optionMatches = html.match(/<option/g);
    expect(optionMatches).toHaveLength(8);
  });

  it('should render all 7 targeting mode options', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('value="self"');
    expect(html).toContain('value="single-enemy-lowest-hp"');
    expect(html).toContain('value="single-enemy-highest-hp"');
    expect(html).toContain('value="all-enemies"');
    expect(html).toContain('value="ally-lowest-hp"');
    expect(html).toContain('value="ally-dead"');
    expect(html).toContain('value="all-allies"');
  });

  it('should render human-readable labels for each targeting mode', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('>Self<');
    expect(html).toContain('>Single Enemy (Lowest HP)<');
    expect(html).toContain('>Single Enemy (Highest HP)<');
    expect(html).toContain('>All Enemies<');
    expect(html).toContain('>Ally (Lowest HP)<');
    expect(html).toContain('>Ally (Dead - for Revive)<');
    expect(html).toContain('>All Allies<');
  });
});

describe('TargetingOverrideSelector - Default Option', () => {
  it('should render "(Default)" option as first option', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    // Find first option tag
    const firstOptionMatch = html.match(/<option[^>]*>/);
    expect(firstOptionMatch).toBeTruthy();
    expect(firstOptionMatch![0]).toContain('value=""');
  });

  it('should have empty value for default option', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('value=""');
  });

  it('should include skill default mode in default option label', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('(Default: Single Enemy (Lowest HP))');
  });

  it('should show different default labels for different skill defaults', () => {
    const html1 = renderTargetingOverrideSelector(undefined, 'self');
    const html2 = renderTargetingOverrideSelector(undefined, 'all-enemies');

    expect(html1).toContain('(Default: Self)');
    expect(html2).toContain('(Default: All Enemies)');
  });

  it('should select default option when currentOverride is undefined', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    // Find the default option and check it's selected
    const defaultOptionMatch = html.match(/<option value=""[^>]*>/);
    expect(defaultOptionMatch).toBeTruthy();
    expect(defaultOptionMatch![0]).toContain('selected');
  });
});

describe('TargetingOverrideSelector - Current Selection (AC59)', () => {
  it('should mark selected option when override is set', () => {
    const html = renderTargetingOverrideSelector('single-enemy-highest-hp', 'single-enemy-lowest-hp');

    // Find the highest-hp option
    const optionMatch = html.match(/<option value="single-enemy-highest-hp"[^>]*>/);
    expect(optionMatch).toBeTruthy();
    expect(optionMatch![0]).toContain('selected');
  });

  it('should only have one selected option', () => {
    const html = renderTargetingOverrideSelector('all-enemies', 'single-enemy-lowest-hp');

    // Count selected attributes
    const selectedMatches = html.match(/selected/g);
    expect(selectedMatches).toHaveLength(1);
  });

  it('should not mark default option as selected when override is set', () => {
    const html = renderTargetingOverrideSelector('self', 'single-enemy-lowest-hp');

    // Find the default option
    const defaultOptionMatch = html.match(/<option value=""[^>]*>/);
    expect(defaultOptionMatch).toBeTruthy();
    expect(defaultOptionMatch![0]).not.toContain('selected');
  });

  it('should correctly select each targeting mode', () => {
    const modes: TargetingMode[] = [
      'self',
      'single-enemy-lowest-hp',
      'single-enemy-highest-hp',
      'all-enemies',
      'ally-lowest-hp',
      'ally-dead',
      'all-allies',
    ];

    for (const mode of modes) {
      const html = renderTargetingOverrideSelector(mode, 'single-enemy-lowest-hp');
      const optionMatch = html.match(new RegExp(`<option value="${mode}"[^>]*>`));
      expect(optionMatch).toBeTruthy();
      expect(optionMatch![0]).toContain('selected');
    }
  });
});

describe('TargetingOverrideSelector - Help Text', () => {
  it('should display help text for selected targeting mode', () => {
    const html = renderTargetingOverrideSelector('single-enemy-highest-hp', 'single-enemy-lowest-hp');

    expect(html).toContain('class="targeting-help"');
    expect(html).toContain('Targets the enemy with the highest current HP');
  });

  it('should display default mode help text when no override set', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('Targets the enemy with the lowest current HP');
  });

  it('should show different help text for different targeting modes', () => {
    const selfHtml = renderTargetingOverrideSelector('self', 'single-enemy-lowest-hp');
    const allEnemiesHtml = renderTargetingOverrideSelector('all-enemies', 'single-enemy-lowest-hp');

    expect(selfHtml).toContain('Targets only the character itself');
    expect(allEnemiesHtml).toContain('Targets all enemies in the battle');
  });

  it('should update help text for all 7 targeting modes', () => {
    const modes: TargetingMode[] = [
      'self',
      'single-enemy-lowest-hp',
      'single-enemy-highest-hp',
      'all-enemies',
      'ally-lowest-hp',
      'ally-dead',
      'all-allies',
    ];

    for (const mode of modes) {
      const html = renderTargetingOverrideSelector(mode, 'single-enemy-lowest-hp');
      const helpText = getTargetingModeHelp(mode);
      expect(html).toContain(helpText);
    }
  });
});

describe('TargetingOverrideSelector - Data Attributes', () => {
  it('should have data-input attribute on select dropdown', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('data-input="targeting-override"');
  });

  it('should have data-current-value attribute on container', () => {
    const html = renderTargetingOverrideSelector('single-enemy-highest-hp', 'single-enemy-lowest-hp');

    expect(html).toContain('data-current-value="single-enemy-highest-hp"');
  });

  it('should have empty data-current-value when no override', () => {
    const html = renderTargetingOverrideSelector(undefined, 'single-enemy-lowest-hp');

    expect(html).toContain('data-current-value=""');
  });
});

describe('getTargetingModeLabel - Utility Function', () => {
  it('should return "Self" for self mode', () => {
    expect(getTargetingModeLabel('self')).toBe('Self');
  });

  it('should return "Single Enemy (Lowest HP)" for single-enemy-lowest-hp', () => {
    expect(getTargetingModeLabel('single-enemy-lowest-hp')).toBe('Single Enemy (Lowest HP)');
  });

  it('should return "Single Enemy (Highest HP)" for single-enemy-highest-hp', () => {
    expect(getTargetingModeLabel('single-enemy-highest-hp')).toBe('Single Enemy (Highest HP)');
  });

  it('should return "All Enemies" for all-enemies', () => {
    expect(getTargetingModeLabel('all-enemies')).toBe('All Enemies');
  });

  it('should return "Ally (Lowest HP)" for ally-lowest-hp', () => {
    expect(getTargetingModeLabel('ally-lowest-hp')).toBe('Ally (Lowest HP)');
  });

  it('should return "Ally (Dead - for Revive)" for ally-dead', () => {
    expect(getTargetingModeLabel('ally-dead')).toBe('Ally (Dead - for Revive)');
  });

  it('should return "All Allies" for all-allies', () => {
    expect(getTargetingModeLabel('all-allies')).toBe('All Allies');
  });
});

describe('getTargetingModeHelp - Utility Function', () => {
  it('should return descriptive help text for self', () => {
    const help = getTargetingModeHelp('self');
    expect(help).toContain('itself');
    expect(typeof help).toBe('string');
    expect(help.length).toBeGreaterThan(0);
  });

  it('should return descriptive help text for single-enemy-lowest-hp', () => {
    const help = getTargetingModeHelp('single-enemy-lowest-hp');
    expect(help).toContain('lowest');
    expect(help).toContain('HP');
  });

  it('should return descriptive help text for single-enemy-highest-hp', () => {
    const help = getTargetingModeHelp('single-enemy-highest-hp');
    expect(help).toContain('highest');
    expect(help).toContain('HP');
  });

  it('should return descriptive help text for all-enemies', () => {
    const help = getTargetingModeHelp('all-enemies');
    expect(help).toContain('all enemies');
  });

  it('should return descriptive help text for ally-lowest-hp', () => {
    const help = getTargetingModeHelp('ally-lowest-hp');
    expect(help).toContain('ally');
    expect(help).toContain('lowest');
  });

  it('should return descriptive help text for ally-dead', () => {
    const help = getTargetingModeHelp('ally-dead');
    expect(help).toContain('dead');
  });

  it('should return descriptive help text for all-allies', () => {
    const help = getTargetingModeHelp('all-allies');
    expect(help).toContain('all allies');
  });
});

describe('TargetingOverrideSelector - Edge Cases', () => {
  it('should handle all targeting modes as skill default', () => {
    const modes: TargetingMode[] = [
      'self',
      'single-enemy-lowest-hp',
      'single-enemy-highest-hp',
      'all-enemies',
      'ally-lowest-hp',
      'ally-dead',
      'all-allies',
    ];

    for (const mode of modes) {
      const html = renderTargetingOverrideSelector(undefined, mode);
      expect(html).toContain('targeting-override-selector');
      expect(html).toContain(getTargetingModeLabel(mode));
    }
  });

  it('should render valid HTML structure', () => {
    const html = renderTargetingOverrideSelector('self', 'single-enemy-lowest-hp');

    expect(typeof html).toBe('string');
    expect(html).toMatch(/<div/);
    expect(html).toMatch(/<\/div>/);
    expect(html).toMatch(/<select/);
    expect(html).toMatch(/<\/select>/);
  });

  it('should handle override same as default', () => {
    const html = renderTargetingOverrideSelector('single-enemy-lowest-hp', 'single-enemy-lowest-hp');

    // Should select the override option, not the default
    const optionMatch = html.match(/<option value="single-enemy-lowest-hp"[^>]*>/);
    expect(optionMatch).toBeTruthy();
    expect(optionMatch![0]).toContain('selected');
  });
});
