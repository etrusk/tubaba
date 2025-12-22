import { describe, it, expect } from 'vitest';
import { renderControlModeToggle } from '../../src/ui/control-mode-toggle.js';

/**
 * ControlModeToggle Test Suite
 *
 * Tests the control mode toggle component that allows switching between
 * Human (manual) and AI (automated) control modes.
 *
 * Acceptance Criteria: AC55
 * - Human mode: "Human" button is active, "AI" is inactive
 * - AI mode: "AI" button is active, "Human" is inactive
 *
 * Implementation: src/ui/control-mode-toggle.ts
 */

describe('ControlModeToggle - Basic Rendering', () => {
  it('should render toggle with root class', () => {
    const html = renderControlModeToggle('human');

    expect(html).toContain('class="control-mode-toggle"');
  });

  it('should render two toggle buttons', () => {
    const html = renderControlModeToggle('human');

    expect(html).toContain('toggle-buttons');
    // Should have two button elements
    const buttonMatches = html.match(/<button/g);
    expect(buttonMatches).toHaveLength(2);
  });

  it('should render Human option with icon', () => {
    const html = renderControlModeToggle('human');

    expect(html).toContain('👤');
    expect(html).toContain('Human');
  });

  it('should render AI option with icon', () => {
    const html = renderControlModeToggle('ai');

    expect(html).toContain('🤖');
    expect(html).toContain('AI');
  });

  it('should render both options regardless of mode', () => {
    const humanHtml = renderControlModeToggle('human');
    const aiHtml = renderControlModeToggle('ai');

    // Both modes should show both options
    expect(humanHtml).toContain('Human');
    expect(humanHtml).toContain('AI');
    expect(aiHtml).toContain('Human');
    expect(aiHtml).toContain('AI');
  });
});

describe('ControlModeToggle - Human Mode State (AC55)', () => {
  it('should mark Human button as active in human mode', () => {
    const html = renderControlModeToggle('human');

    // Find the Human button and check it has active class
    const humanButtonMatch = html.match(/<button[^>]*data-action="set-human"[^>]*>/);
    expect(humanButtonMatch).toBeTruthy();
    expect(humanButtonMatch![0]).toContain('active');
  });

  it('should mark AI button as inactive in human mode', () => {
    const html = renderControlModeToggle('human');

    // Find the AI button and check it does NOT have active class
    const aiButtonMatch = html.match(/<button[^>]*data-action="set-ai"[^>]*>/);
    expect(aiButtonMatch).toBeTruthy();
    expect(aiButtonMatch![0]).not.toContain('active');
  });

  it('should display human mode help text', () => {
    const html = renderControlModeToggle('human');

    expect(html).toContain('mode-help');
    expect(html).toContain('You will manually control this character');
  });
});

describe('ControlModeToggle - AI Mode State (AC55)', () => {
  it('should mark AI button as active in AI mode', () => {
    const html = renderControlModeToggle('ai');

    // Find the AI button and check it has active class
    const aiButtonMatch = html.match(/<button[^>]*data-action="set-ai"[^>]*>/);
    expect(aiButtonMatch).toBeTruthy();
    expect(aiButtonMatch![0]).toContain('active');
  });

  it('should mark Human button as inactive in AI mode', () => {
    const html = renderControlModeToggle('ai');

    // Find the Human button and check it does NOT have active class
    const humanButtonMatch = html.match(/<button[^>]*data-action="set-human"[^>]*>/);
    expect(humanButtonMatch).toBeTruthy();
    expect(humanButtonMatch![0]).not.toContain('active');
  });

  it('should display AI mode help text', () => {
    const html = renderControlModeToggle('ai');

    expect(html).toContain('mode-help');
    expect(html).toContain('Character follows configured rules automatically');
  });
});

describe('ControlModeToggle - Data Attributes', () => {
  it('should have data-mode attribute with current mode value', () => {
    const humanHtml = renderControlModeToggle('human');
    const aiHtml = renderControlModeToggle('ai');

    expect(humanHtml).toContain('data-mode="human"');
    expect(aiHtml).toContain('data-mode="ai"');
  });

  it('should have data-action="set-human" on Human button', () => {
    const html = renderControlModeToggle('human');

    expect(html).toContain('data-action="set-human"');
  });

  it('should have data-action="set-ai" on AI button', () => {
    const html = renderControlModeToggle('ai');

    expect(html).toContain('data-action="set-ai"');
  });

  it('should have correct data-action on both buttons', () => {
    const html = renderControlModeToggle('human');

    // Both buttons should have their respective data-action attributes
    expect(html).toContain('data-action="set-human"');
    expect(html).toContain('data-action="set-ai"');
  });
});

describe('ControlModeToggle - Help Text', () => {
  it('should show human help text when in human mode', () => {
    const html = renderControlModeToggle('human');

    expect(html).toContain('You will manually control this character');
  });

  it('should show AI help text when in AI mode', () => {
    const html = renderControlModeToggle('ai');

    expect(html).toContain('Character follows configured rules automatically');
  });

  it('should render help text in p.mode-help element', () => {
    const html = renderControlModeToggle('ai');

    expect(html).toMatch(/<p class="mode-help">.*<\/p>/);
  });

  it('should change help text based on mode', () => {
    const humanHtml = renderControlModeToggle('human');
    const aiHtml = renderControlModeToggle('ai');

    expect(humanHtml).toContain('manually control');
    expect(humanHtml).not.toContain('configured rules automatically');

    expect(aiHtml).toContain('configured rules automatically');
    expect(aiHtml).not.toContain('manually control');
  });
});

describe('ControlModeToggle - Structure', () => {
  it('should have toggle-buttons wrapper', () => {
    const html = renderControlModeToggle('human');

    expect(html).toContain('class="toggle-buttons"');
  });

  it('should have buttons with toggle-btn class', () => {
    const html = renderControlModeToggle('human');

    expect(html).toMatch(/class="toggle-btn[^"]*"/g);
  });

  it('should return valid HTML string', () => {
    const html = renderControlModeToggle('human');

    expect(typeof html).toBe('string');
    expect(html).toMatch(/<div/);
    expect(html).toMatch(/<\/div>/);
  });
});
