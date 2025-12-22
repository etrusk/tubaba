import { describe, it, expect } from 'vitest';
import type { Character } from '../../src/types/character.js';
import type { CharacterInstructions } from '../../src/types/instructions.js';
import type { Skill } from '../../src/types/skill.js';
import { renderInstructionsBuilder } from '../../src/ui/instructions-builder.js';

/**
 * InstructionsBuilder Container Test Suite
 *
 * Tests the main instructions builder panel that coordinates:
 * - Character selection state (empty vs selected)
 * - Control mode toggle section
 * - Skill editor visibility (AI mode only)
 * - Sub-component slots (ControlModeToggle, SkillPriorityEditor, ConditionBuilder, TargetingOverrideSelector)
 * - Action buttons (Apply/Cancel)
 * - Validation error display
 *
 * Implementation: src/ui/instructions-builder.ts
 */

// Test helpers
function createTestCharacter(
  id: string,
  name: string,
  skills: Skill[] = []
): Character {
  return {
    id,
    name,
    maxHp: 100,
    currentHp: 100,
    skills,
    statusEffects: [],
    currentAction: null,
    isPlayer: true,
  };
}

function createTestSkill(
  id: string,
  name: string
): Skill {
  return {
    id,
    name,
    baseDuration: 10,
    effects: [{ type: 'damage', value: 10 }],
    targeting: 'single-enemy-lowest-hp',
  };
}

function createInstructions(
  characterId: string,
  controlMode: 'human' | 'ai'
): CharacterInstructions {
  return {
    characterId,
    controlMode,
    skillInstructions: [],
  };
}

describe('InstructionsBuilder - Empty State', () => {
  it('should render empty state when no character selected', () => {
    const html = renderInstructionsBuilder(null, null, null, false);

    expect(html).toContain('empty-state');
    expect(html).toMatch(/select\s+a\s+character/i);
  });

  it('should show placeholder message when no character selected', () => {
    const html = renderInstructionsBuilder(null, null, null, false);

    expect(html).toMatch(/configure.*ai.*behavior/i);
  });

  it('should not render character content in empty state', () => {
    const html = renderInstructionsBuilder(null, null, null, false);

    expect(html).not.toContain('instructions-content');
    expect(html).not.toContain('character-header');
  });

  it('should not render action buttons in empty state', () => {
    const html = renderInstructionsBuilder(null, null, null, false);

    expect(html).not.toContain('apply-btn');
    expect(html).not.toContain('cancel-btn');
  });
});

describe('InstructionsBuilder - Character Selection', () => {
  it('should render character name in header when character selected', () => {
    const character = createTestCharacter('hero-1', 'Brave Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('character-header');
    expect(html).toContain('Brave Hero');
  });

  it('should render instructions content section when character selected', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('instructions-content');
    expect(html).not.toContain('empty-state');
  });

  it('should display character ID for DOM targeting', () => {
    const character = createTestCharacter('hero-42', 'Hero', []);
    const instructions = createInstructions('hero-42', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('hero-42');
  });

  it('should render available skills when character selected', () => {
    const skills = [
      createTestSkill('strike', 'Strike'),
      createTestSkill('heal', 'Heal'),
    ];
    const character = createTestCharacter('hero-1', 'Hero', skills);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('Strike');
    expect(html).toContain('Heal');
  });
});

describe('InstructionsBuilder - Control Mode Integration', () => {
  it('should render control mode section with slot', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('control-mode-section');
    expect(html).toContain('control-mode-slot');
  });

  it('should show skill editor section when in AI mode', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('skill-editor');
    expect(html).toMatch(/data-visible="true"/);
  });

  it('should hide skill editor section when in Human mode', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'human');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('skill-editor');
    expect(html).toMatch(/data-visible="false"/);
  });

  it('should apply correct visibility attribute based on control mode', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    
    // AI mode
    const aiInstructions = createInstructions('hero-1', 'ai');
    const aiHtml = renderInstructionsBuilder(character, aiInstructions, null, false);
    expect(aiHtml).toMatch(/data-visible="true"/);

    // Human mode
    const humanInstructions = createInstructions('hero-1', 'human');
    const humanHtml = renderInstructionsBuilder(character, humanInstructions, null, false);
    expect(humanHtml).toMatch(/data-visible="false"/);
  });
});

describe('InstructionsBuilder - Sub-Component Slots', () => {
  it('should render slot for ControlModeToggle', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('id="control-mode-slot"');
  });

  it('should render slot for SkillPriorityEditor in AI mode', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('skill-priority-section');
    expect(html).toContain('id="skill-priority-slot"');
  });

  it('should not render SkillPriorityEditor slot in Human mode', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'human');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    // Skill editor exists but hidden
    expect(html).toContain('skill-editor');
    expect(html).toMatch(/data-visible="false"/);
  });

  it('should render slot for ConditionBuilder (placeholder for future)', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('condition-section');
    expect(html).toContain('id="condition-slot"');
  });

  it('should render slot for TargetingOverrideSelector (placeholder for future)', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('targeting-section');
    expect(html).toContain('id="targeting-slot"');
  });

  it('should include skill-details section for condition and targeting slots', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('skill-details');
  });
});

describe('InstructionsBuilder - Action Buttons', () => {
  it('should render Apply button when character selected', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('apply-btn');
    expect(html).toContain('data-action="apply"');
  });

  it('should render Cancel button when character selected', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('cancel-btn');
    expect(html).toContain('data-action="cancel"');
  });

  it('should disable buttons when isDirty is false (no changes)', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false); // isDirty = false

    // Both buttons should be disabled
    const applyMatch = html.match(/<button[^>]*apply-btn[^>]*>/);
    const cancelMatch = html.match(/<button[^>]*cancel-btn[^>]*>/);

    expect(applyMatch).toBeTruthy();
    expect(applyMatch![0]).toContain('disabled');
    expect(cancelMatch).toBeTruthy();
    expect(cancelMatch![0]).toContain('disabled');
  });

  it('should enable buttons when isDirty is true (has changes)', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, true); // isDirty = true

    // Both buttons should NOT be disabled
    const applyMatch = html.match(/<button[^>]*apply-btn[^>]*>/);
    const cancelMatch = html.match(/<button[^>]*cancel-btn[^>]*>/);

    expect(applyMatch).toBeTruthy();
    expect(applyMatch![0]).not.toContain('disabled');
    expect(cancelMatch).toBeTruthy();
    expect(cancelMatch![0]).not.toContain('disabled');
  });

  it('should render action buttons section', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('action-buttons');
  });

  it('should have Apply button labeled "Apply"', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toMatch(/Apply<\/button>/);
  });

  it('should have Cancel button labeled "Cancel"', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toMatch(/Cancel<\/button>/);
  });
});

describe('InstructionsBuilder - General Rendering', () => {
  it('should return valid HTML string', () => {
    const html = renderInstructionsBuilder(null, null, null, false);

    expect(typeof html).toBe('string');
    expect(html).toMatch(/<div/);
    expect(html).toMatch(/<\/div>/);
  });

  it('should have instructions-builder root class', () => {
    const html = renderInstructionsBuilder(null, null, null, false);

    expect(html).toContain('class="instructions-builder"');
  });

  it('should handle character with multiple skills', () => {
    const skills = [
      createTestSkill('skill1', 'Skill One'),
      createTestSkill('skill2', 'Skill Two'),
      createTestSkill('skill3', 'Skill Three'),
    ];
    const character = createTestCharacter('hero-1', 'Hero', skills);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain('Skill One');
    expect(html).toContain('Skill Two');
    expect(html).toContain('Skill Three');
  });

  it('should handle character with no skills', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    // Should still render without errors
    expect(html).toContain('instructions-content');
    expect(html).toContain('character-header');
  });
});

describe('InstructionsBuilder - Edge Cases', () => {
  it('should handle very long character names', () => {
    const longName = 'The Extraordinarily Long Named Character of Extreme Verbosity';
    const character = createTestCharacter('hero-1', longName, []);
    const instructions = createInstructions('hero-1', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    expect(html).toContain(longName);
  });

  it('should handle null instructions gracefully', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);

    const html = renderInstructionsBuilder(character, null, null, false);

    // Should render but might show default state
    expect(html).toContain('instructions-content');
  });

  it('should handle mismatched character ID and instructions', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('different-id', 'ai');

    const html = renderInstructionsBuilder(character, instructions, null, false);

    // Should still render without crashing
    expect(html).toContain('instructions-content');
  });

  it('should transition from empty state to character selected', () => {
    // Empty state
    const emptyHtml = renderInstructionsBuilder(null, null, null, false);
    expect(emptyHtml).toContain('empty-state');

    // Character selected
    const character = createTestCharacter('hero-1', 'Hero', []);
    const instructions = createInstructions('hero-1', 'ai');
    const selectedHtml = renderInstructionsBuilder(character, instructions, null, false);
    expect(selectedHtml).toContain('instructions-content');
    expect(selectedHtml).not.toContain('empty-state');
  });

  it('should handle switching between AI and Human modes', () => {
    const character = createTestCharacter('hero-1', 'Hero', []);

    // AI mode
    const aiInstructions = createInstructions('hero-1', 'ai');
    const aiHtml = renderInstructionsBuilder(character, aiInstructions, null, false);
    expect(aiHtml).toMatch(/data-visible="true"/);

    // Switch to Human mode
    const humanInstructions = createInstructions('hero-1', 'human');
    const humanHtml = renderInstructionsBuilder(character, humanInstructions, null, false);
    expect(humanHtml).toMatch(/data-visible="false"/);
  });
});
