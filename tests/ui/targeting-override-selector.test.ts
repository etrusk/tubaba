import { describe, it, expect } from 'vitest';
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
 * - Renders select dropdown with all targeting modes
 * - Plus "(Default)" option to clear override
 * - Current selection is marked as selected
 * - Each targeting mode has descriptive help text
 *
 * Implementation: src/ui/targeting-override-selector.ts
 */

describe('TargetingOverrideSelector - Basic Rendering (AC59)', () => {
  it('should render root container with correct class', () => {
    const html = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    expect(html).toContain('class="targeting-override-selector"');
  });

  it('should render label for the select dropdown', () => {
    const html = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    expect(html).toContain('<label');
    expect(html).toContain('for="targeting-select"');
    expect(html).toContain('Targeting Override');
  });

  it('should render select dropdown element', () => {
    const html = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    expect(html).toContain('<select');
    expect(html).toContain('id="targeting-select"');
  });

  it('should render help text container', () => {
    const html = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    expect(html).toContain('class="targeting-help"');
    expect(html).toContain('<p');
  });
});

describe('TargetingOverrideSelector - Dropdown Options (AC59)', () => {
  it('should render "(Default)" option as first option', () => {
    const html = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    // Find first option tag
    const firstOptionMatch = html.match(/<option[^>]*>/);
    expect(firstOptionMatch).toBeTruthy();
    expect(firstOptionMatch![0]).toContain('value=""');
  });

  it('should have empty value for default option', () => {
    const html = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    expect(html).toContain('value=""');
  });

  it('should select default option when currentOverride is undefined', () => {
    const html = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    // Find the default option and check it's selected
    const defaultOptionMatch = html.match(/<option value=""[^>]*>/);
    expect(defaultOptionMatch).toBeTruthy();
    expect(defaultOptionMatch![0]).toContain('selected');
  });
});

describe('TargetingOverrideSelector - Current Selection (AC59)', () => {
  it('should mark selected option when override is set', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'nearest-enemy');

    // Find the nearest-enemy option
    const optionMatch = html.match(/<option value="nearest-enemy"[^>]*>/);
    expect(optionMatch).toBeTruthy();
    expect(optionMatch![0]).toContain('selected');
  });

  it('should only have one selected option', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'nearest-enemy');

    // Count selected attributes
    const selectedMatches = html.match(/selected/g);
    expect(selectedMatches).toHaveLength(1);
  });

  it('should not mark default option as selected when override is set', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'nearest-enemy');

    // Find the default option
    const defaultOptionMatch = html.match(/<option value=""[^>]*>/);
    expect(defaultOptionMatch).toBeTruthy();
    expect(defaultOptionMatch![0]).not.toContain('selected');
  });
});

describe('TargetingOverrideSelector - Help Text', () => {
  it('should display help text for selected targeting mode', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'nearest-enemy');

    expect(html).toContain('class="targeting-help"');
    expect(html).toContain('Targets the nearest living enemy');
  });
});

describe('TargetingOverrideSelector - Data Attributes', () => {
  it('should have data-input attribute on select dropdown', () => {
    const html = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    expect(html).toContain('data-input="targeting-override"');
  });

  it('should have data-current-value attribute on container', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'nearest-enemy');

    expect(html).toContain('data-current-value="nearest-enemy"');
  });

  it('should have empty data-current-value when no override', () => {
    const html = renderTargetingOverrideSelector(undefined, 'nearest-enemy');

    expect(html).toContain('data-current-value=""');
  });
});

describe('getTargetingModeLabel - Utility Function', () => {
  it('should return "Nearest Enemy" for nearest-enemy', () => {
    expect(getTargetingModeLabel('nearest-enemy')).toBe('Nearest Enemy');
  });
});

describe('getTargetingModeHelp - Utility Function', () => {
  it('should return descriptive help text for nearest-enemy', () => {
    const help = getTargetingModeHelp('nearest-enemy');
    expect(help).toContain('nearest');
    expect(help).toContain('enemy');
  });
});

describe('TargetingOverrideSelector - Edge Cases', () => {
  it('should render valid HTML structure', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'nearest-enemy');

    expect(typeof html).toBe('string');
    expect(html).toMatch(/<div/);
    expect(html).toMatch(/<\/div>/);
    expect(html).toMatch(/<select/);
    expect(html).toMatch(/<\/select>/);
  });

  it('should handle override same as default', () => {
    const html = renderTargetingOverrideSelector('nearest-enemy', 'nearest-enemy');

    // Should select the override option, not the default
    const optionMatch = html.match(/<option value="nearest-enemy"[^>]*>/);
    expect(optionMatch).toBeTruthy();
    expect(optionMatch![0]).toContain('selected');
  });
});
