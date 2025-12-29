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
 * - Renders select dropdown with all 2 targeting modes
 * - Plus "(Default)" option to clear override
 * - Current selection is marked as selected
 * - Each targeting mode has descriptive help text
 *
 * Implementation: src/ui/targeting-override-selector.ts
 */

describe('TargetingOverrideSelector - Basic Rendering (AC59)', () => {
  it('should render root container with correct class', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('class="targeting-override-selector"');
  });

  it('should render label for the select dropdown', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('<label');
    expect(html).toContain('for="targeting-select"');
    expect(html).toContain('Targeting Override');
  });

  it('should render select dropdown element', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('<select');
    expect(html).toContain('id="targeting-select"');
  });

  it('should render help text container', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('class="targeting-help"');
    expect(html).toContain('<p');
  });
});

describe('TargetingOverrideSelector - Dropdown Options (AC59)', () => {
  it('should render select with all 2 targeting modes', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    // Count option elements (2 targeting modes + 1 default = 3 total)
    const optionMatches = html.match(/<option/g);
    expect(optionMatches).toHaveLength(3);
  });

  it('should render all 2 targeting mode options', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('value="self"');
    expect(html).toContain('value="nearest-enemy"');
  });

  it('should render human-readable labels for each targeting mode', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('>Self<');
    expect(html).toContain('>Nearest Enemy<');
  });
});

describe('TargetingOverrideSelector - Default Option', () => {
  it('should render "(Default)" option as first option', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    // Find first option tag
    const firstOptionMatch = html.match(/<option[^>]*>/);
    expect(firstOptionMatch).toBeTruthy();
    expect(firstOptionMatch![0]).toContain('value=""');
  });

  it('should have empty value for default option', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('value=""');
  });

  it('should include skill default mode in default option label', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('(Default: Self)');
  });

  it('should show different default labels for different skill defaults', () => {
    const html1 = renderTargetingOverrideSelector(undefined, 'self');
    const html2 = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    expect(html1).toContain('(Default: Self)');
    expect(html2).toContain('(Default: Nearest Enemy)');
  });

  it('should select default option when currentOverride is undefined', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    // Find the default option and check it's selected
    const defaultOptionMatch = html.match(/<option value=""[^>]*>/);
    expect(defaultOptionMatch).toBeTruthy();
    expect(defaultOptionMatch![0]).toContain('selected');
  });
});

describe('TargetingOverrideSelector - Current Selection (AC59)', () => {
  it('should mark selected option when override is set', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'self');

    // Find the nearest-enemy option
    const optionMatch = html.match(/<option value="nearest-enemy"[^>]*>/);
    expect(optionMatch).toBeTruthy();
    expect(optionMatch![0]).toContain('selected');
  });

  it('should only have one selected option', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'self');

    // Count selected attributes
    const selectedMatches = html.match(/selected/g);
    expect(selectedMatches).toHaveLength(1);
  });

  it('should not mark default option as selected when override is set', () => {
    const html = renderTargetingOverrideSelector('self', 'nearest-enemy');

    // Find the default option
    const defaultOptionMatch = html.match(/<option value=""[^>]*>/);
    expect(defaultOptionMatch).toBeTruthy();
    expect(defaultOptionMatch![0]).not.toContain('selected');
  });

  it('should correctly select each targeting mode', () => {
    const modes: TargetingMode[] = [
      'self',
      'nearest-enemy',
    ];

    for (const mode of modes) {
      const html = renderTargetingOverrideSelector(mode, 'self');
      const optionMatch = html.match(new RegExp(`<option value="${mode}"[^>]*>`));
      expect(optionMatch).toBeTruthy();
      expect(optionMatch![0]).toContain('selected');
    }
  });
});

describe('TargetingOverrideSelector - Help Text', () => {
  it('should display help text for selected targeting mode', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'self');

    expect(html).toContain('class="targeting-help"');
    expect(html).toContain('Targets the nearest living enemy');
  });

  it('should display default mode help text when no override set', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('Targets only the character itself');
  });

  it('should show different help text for different targeting modes', () => {
    const selfHtml = renderTargetingOverrideSelector('self', 'nearest-enemy');
    const nearestEnemyHtml = renderTargetingOverrideSelector('nearest-enemy', 'self');

    expect(selfHtml).toContain('Targets only the character itself');
    expect(nearestEnemyHtml).toContain('Targets the nearest living enemy');
  });

  it('should update help text for all 2 targeting modes', () => {
    const modes: TargetingMode[] = [
      'self',
      'nearest-enemy',
    ];

    for (const mode of modes) {
      const html = renderTargetingOverrideSelector(mode, 'self');
      const helpText = getTargetingModeHelp(mode);
      expect(html).toContain(helpText);
    }
  });
});

describe('TargetingOverrideSelector - Data Attributes', () => {
  it('should have data-input attribute on select dropdown', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('data-input="targeting-override"');
  });

  it('should have data-current-value attribute on container', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'self');

    expect(html).toContain('data-current-value="nearest-enemy"');
  });

  it('should have empty data-current-value when no override', () => {
    const html = renderTargetingOverrideSelector(undefined, 'self');

    expect(html).toContain('data-current-value=""');
  });
});

describe('getTargetingModeLabel - Utility Function', () => {
  it('should return "Self" for self mode', () => {
    expect(getTargetingModeLabel('self')).toBe('Self');
  });

  it('should return "Nearest Enemy" for nearest-enemy', () => {
    expect(getTargetingModeLabel('nearest-enemy')).toBe('Nearest Enemy');
  });
});

describe('getTargetingModeHelp - Utility Function', () => {
  it('should return descriptive help text for self', () => {
    const help = getTargetingModeHelp('self');
    expect(help).toContain('itself');
    expect(typeof help).toBe('string');
    expect(help.length).toBeGreaterThan(0);
  });

  it('should return descriptive help text for nearest-enemy', () => {
    const help = getTargetingModeHelp('nearest-enemy');
    expect(help).toContain('nearest');
    expect(help).toContain('enemy');
  });
});

describe('TargetingOverrideSelector - Edge Cases', () => {
  it('should handle all targeting modes as skill default', () => {
    const modes: TargetingMode[] = [
      'self',
      'nearest-enemy',
    ];

    for (const mode of modes) {
      const html = renderTargetingOverrideSelector(undefined, mode);
      expect(html).toContain('targeting-override-selector');
      expect(html).toContain(getTargetingModeLabel(mode));
    }
  });

  it('should render valid HTML structure', () => {
    const html = renderTargetingOverrideSelector('self', 'nearest-enemy');

    expect(typeof html).toBe('string');
    expect(html).toMatch(/<div/);
    expect(html).toMatch(/<\/div>/);
    expect(html).toMatch(/<select/);
    expect(html).toMatch(/<\/select>/);
  });

  it('should handle override same as default', () => {
    const html = renderTargetingOverrideSelector('self', 'self');

    // Should select the override option, not the default
    const optionMatch = html.match(/<option value="self"[^>]*>/);
    expect(optionMatch).toBeTruthy();
    expect(optionMatch![0]).toContain('selected');
  });
});
