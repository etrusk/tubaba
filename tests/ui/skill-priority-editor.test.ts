import { describe, it, expect } from 'vitest';
import type { SkillInstruction } from '../../src/types/instructions.js';
import type { Skill } from '../../src/types/skill.js';
import {
  renderSkillPriorityEditor,
  calculatePriority,
} from '../../src/ui/skill-priority-editor.js';

/**
 * SkillPriorityEditor Test Suite
 *
 * Tests the skill priority editor component that allows users to configure
 * skill priorities using up/down arrows for reordering.
 *
 * Acceptance Criteria: AC56
 * - Renders all skills in order by priority (highest first)
 * - Shows skill name and calculated priority number
 * - Shows enable/disable checkbox per skill
 * - Priority auto-calculated using linear interpolation (100 to 0)
 *
 * Implementation: src/ui/skill-priority-editor.ts
 */

// Helper: Create test skills
function createTestSkills(): Skill[] {
  return [
    {
      id: 'heal',
      name: 'Heal',
      baseDuration: 15,
      effects: [{ type: 'heal', value: 20 }],
      targeting: 'self',
    },
    {
      id: 'strike',
      name: 'Strike',
      baseDuration: 10,
      effects: [{ type: 'damage', value: 10 }],
      targeting: 'nearest-enemy',
    },
    {
      id: 'shield',
      name: 'Shield',
      baseDuration: 5,
      effects: [{ type: 'shield', value: 15 }],
      targeting: 'self',
    },
  ];
}

// Helper: Create test instructions
function createTestInstructions(enabled: boolean[] = [true, true, true]): SkillInstruction[] {
  return [
    {
      skillId: 'heal',
      priority: 100,
      conditions: [],
      enabled: enabled[0] ?? true,
    },
    {
      skillId: 'strike',
      priority: 50,
      conditions: [],
      enabled: enabled[1] ?? true,
    },
    {
      skillId: 'shield',
      priority: 0,
      conditions: [],
      enabled: enabled[2] ?? true,
    },
  ];
}

describe('SkillPriorityEditor - Basic Rendering', () => {
  it('should render root container with correct class', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('class="skill-priority-editor"');
  });

  it('should render header with title', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('<h4>');
    expect(html).toContain('Skill Priority');
  });

  it('should render help text explaining priority system', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('class="help-text"');
    expect(html).toContain('Higher priority skills are tried first');
  });

  it('should render skill list container', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('class="skill-list"');
    expect(html).toContain('<ul');
  });
});

describe('SkillPriorityEditor - Skill List Rendering (AC56)', () => {
  it('should render all skills in the list', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('Heal');
    expect(html).toContain('Strike');
    expect(html).toContain('Shield');
  });

  it('should render skills in priority order (highest first)', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Find positions of skill names
    const healPos = html.indexOf('Heal');
    const strikePos = html.indexOf('Strike');
    const shieldPos = html.indexOf('Shield');

    // Heal (priority 100) should come before Strike (priority 50)
    expect(healPos).toBeLessThan(strikePos);
    // Strike (priority 50) should come before Shield (priority 0)
    expect(strikePos).toBeLessThan(shieldPos);
  });

  it('should show skill name for each skill', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('class="skill-name"');
    // Check skill names appear (now rendered through skill-display component)
    expect(html).toContain('Heal');
    expect(html).toContain('Strike');
    expect(html).toContain('Shield');
    // Should contain skill-display components
    expect(html).toContain('class="skill-display"');
  });

  it('should show calculated priority number for each skill', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('class="skill-priority"');
    expect(html).toContain('>100<');
    expect(html).toContain('>50<');
    expect(html).toContain('>0<');
  });

  it('should show enable/disable checkbox for each skill', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Should have 3 checkboxes (one per skill)
    const checkboxMatches = html.match(/type="checkbox"/g);
    expect(checkboxMatches).toHaveLength(3);
    expect(html).toContain('class="skill-enable"');
  });

  it('should render each skill as a list item', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Should have 3 <li> elements with class="skill-item"
    const skillItemMatches = html.match(/<li[^>]*class="[^"]*skill-item[^"]*"/g);
    expect(skillItemMatches).toHaveLength(3);
    expect(html).toContain('class="skill-item"');
  });
});

describe('SkillPriorityEditor - Priority Auto-Calculation (AC56)', () => {
  it('should calculate priority as 100 for single skill', () => {
    const priority = calculatePriority(0, 1);
    expect(priority).toBe(100);
  });

  it('should calculate priorities as [100, 0] for two skills', () => {
    expect(calculatePriority(0, 2)).toBe(100);
    expect(calculatePriority(1, 2)).toBe(0);
  });

  it('should calculate priorities as [100, 50, 0] for three skills', () => {
    expect(calculatePriority(0, 3)).toBe(100);
    expect(calculatePriority(1, 3)).toBe(50);
    expect(calculatePriority(2, 3)).toBe(0);
  });

  it('should use linear interpolation for N skills', () => {
    // 4 skills: [100, 66.67, 33.33, 0]
    expect(calculatePriority(0, 4)).toBeCloseTo(100, 0);
    expect(calculatePriority(1, 4)).toBeCloseTo(66.67, 1);
    expect(calculatePriority(2, 4)).toBeCloseTo(33.33, 1);
    expect(calculatePriority(3, 4)).toBe(0);
  });

  it('should calculate 5 skills correctly', () => {
    // 5 skills: [100, 75, 50, 25, 0]
    expect(calculatePriority(0, 5)).toBe(100);
    expect(calculatePriority(1, 5)).toBe(75);
    expect(calculatePriority(2, 5)).toBe(50);
    expect(calculatePriority(3, 5)).toBe(25);
    expect(calculatePriority(4, 5)).toBe(0);
  });

  it('should display calculated priorities in rendered output', () => {
    const instructions: SkillInstruction[] = [
      { skillId: 'heal', priority: 100, conditions: [], enabled: true },
      { skillId: 'strike', priority: 50, conditions: [], enabled: true },
      { skillId: 'shield', priority: 0, conditions: [], enabled: true },
    ];
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Should show the priority values from instructions
    expect(html).toContain('>100<');
    expect(html).toContain('>50<');
    expect(html).toContain('>0<');
  });
});

describe('SkillPriorityEditor - Reordering Controls', () => {
  it('should render up/down arrow buttons for each skill', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Should have 6 buttons (2 per skill: up and down)
    const buttonMatches = html.match(/<button/g);
    expect(buttonMatches).toHaveLength(6);
  });

  it('should render move-up buttons with up arrow', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('data-action="move-up"');
    expect(html).toContain('↑');
  });

  it('should render move-down buttons with down arrow', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('data-action="move-down"');
    expect(html).toContain('↓');
  });

  it('should disable up button for first skill', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Find the first skill item (Heal, highest priority)
    const firstItemMatch = html.match(/<li[^>]*data-skill-id="heal"[^>]*>[\s\S]*?<\/li>/);
    expect(firstItemMatch).toBeTruthy();
    
    const firstItem = firstItemMatch![0];
    // Its up button should be disabled
    const upButtonMatch = firstItem.match(/<button[^>]*data-action="move-up"[^>]*>/);
    expect(upButtonMatch).toBeTruthy();
    expect(upButtonMatch![0]).toContain('disabled');
  });

  it('should not disable down button for first skill', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    const firstItemMatch = html.match(/<li[^>]*data-skill-id="heal"[^>]*>[\s\S]*?<\/li>/);
    expect(firstItemMatch).toBeTruthy();
    
    const firstItem = firstItemMatch![0];
    // Its down button should NOT be disabled
    const downButtonMatch = firstItem.match(/<button[^>]*data-action="move-down"[^>]*>/);
    expect(downButtonMatch).toBeTruthy();
    expect(downButtonMatch![0]).not.toContain('disabled');
  });

  it('should disable down button for last skill', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Find the last skill item (Shield, lowest priority)
    const lastItemMatch = html.match(/<li[^>]*data-skill-id="shield"[^>]*>[\s\S]*?<\/li>/);
    expect(lastItemMatch).toBeTruthy();
    
    const lastItem = lastItemMatch![0];
    // Its down button should be disabled
    const downButtonMatch = lastItem.match(/<button[^>]*data-action="move-down"[^>]*>/);
    expect(downButtonMatch).toBeTruthy();
    expect(downButtonMatch![0]).toContain('disabled');
  });

  it('should not disable up button for last skill', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    const lastItemMatch = html.match(/<li[^>]*data-skill-id="shield"[^>]*>[\s\S]*?<\/li>/);
    expect(lastItemMatch).toBeTruthy();
    
    const lastItem = lastItemMatch![0];
    // Its up button should NOT be disabled
    const upButtonMatch = lastItem.match(/<button[^>]*data-action="move-up"[^>]*>/);
    expect(upButtonMatch).toBeTruthy();
    expect(upButtonMatch![0]).not.toContain('disabled');
  });

  it('should enable both buttons for middle skills', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Find the middle skill item (Strike)
    const middleItemMatch = html.match(/<li[^>]*data-skill-id="strike"[^>]*>[\s\S]*?<\/li>/);
    expect(middleItemMatch).toBeTruthy();
    
    const middleItem = middleItemMatch![0];
    // Both buttons should be enabled
    const upButtonMatch = middleItem.match(/<button[^>]*data-action="move-up"[^>]*>/);
    const downButtonMatch = middleItem.match(/<button[^>]*data-action="move-down"[^>]*>/);
    
    expect(upButtonMatch![0]).not.toContain('disabled');
    expect(downButtonMatch![0]).not.toContain('disabled');
  });

  it('should disable both arrows for single skill', () => {
    const instructions: SkillInstruction[] = [
      { skillId: 'heal', priority: 100, conditions: [], enabled: true },
    ];
    const skills = createTestSkills().slice(0, 1);
    const html = renderSkillPriorityEditor(instructions, skills, null);

    const itemMatch = html.match(/<li[^>]*data-skill-id="heal"[^>]*>[\s\S]*?<\/li>/);
    expect(itemMatch).toBeTruthy();
    
    const item = itemMatch![0];
    const upButtonMatch = item.match(/<button[^>]*data-action="move-up"[^>]*>/);
    const downButtonMatch = item.match(/<button[^>]*data-action="move-down"[^>]*>/);
    
    expect(upButtonMatch![0]).toContain('disabled');
    expect(downButtonMatch![0]).toContain('disabled');
  });
});

describe('SkillPriorityEditor - Enable/Disable Toggle', () => {
  it('should check checkbox for enabled skills', () => {
    const instructions = createTestInstructions([true, true, true]);
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // All checkboxes should be checked
    const checkedMatches = html.match(/checked/g);
    expect(checkedMatches).toHaveLength(3);
  });

  it('should uncheck checkbox for disabled skills', () => {
    const instructions = createTestInstructions([true, false, true]);
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Find the strike skill item (disabled)
    const strikeItemMatch = html.match(/<li[^>]*data-skill-id="strike"[^>]*>[\s\S]*?<\/li>/);
    expect(strikeItemMatch).toBeTruthy();
    
    const strikeItem = strikeItemMatch![0];
    const checkboxMatch = strikeItem.match(/<input[^>]*type="checkbox"[^>]*>/);
    expect(checkboxMatch).toBeTruthy();
    expect(checkboxMatch![0]).not.toContain('checked');
  });

  it('should add "disabled" class to disabled skill items', () => {
    const instructions = createTestInstructions([true, false, true]);
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    const strikeItemMatch = html.match(/<li[^>]*data-skill-id="strike"[^>]*>/);
    expect(strikeItemMatch).toBeTruthy();
    expect(strikeItemMatch![0]).toContain('disabled');
  });

  it('should not add "disabled" class to enabled skill items', () => {
    const instructions = createTestInstructions([true, false, true]);
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    const healItemMatch = html.match(/<li[^>]*data-skill-id="heal"[^>]*>/);
    expect(healItemMatch).toBeTruthy();
    expect(healItemMatch![0]).not.toMatch(/class="[^"]*disabled[^"]*"/);
  });

  it('should include data-enabled attribute on skill items', () => {
    const instructions = createTestInstructions([true, false, true]);
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('data-enabled="true"');
    expect(html).toContain('data-enabled="false"');
  });

  it('should show disabled skills in the list', () => {
    const instructions = createTestInstructions([false, false, false]);
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // All skills should still be rendered
    expect(html).toContain('Heal');
    expect(html).toContain('Strike');
    expect(html).toContain('Shield');
  });

  it('should include toggle-skill action on checkboxes', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('data-action="toggle-skill"');
    const toggleMatches = html.match(/data-action="toggle-skill"/g);
    expect(toggleMatches).toHaveLength(3);
  });
});

describe('SkillPriorityEditor - Skill Selection', () => {
  it('should add "selected" class to selected skill', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, 'heal');

    const healItemMatch = html.match(/<li[^>]*data-skill-id="heal"[^>]*>/);
    expect(healItemMatch).toBeTruthy();
    expect(healItemMatch![0]).toContain('selected');
  });

  it('should not add "selected" class to non-selected skills', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, 'heal');

    const strikeItemMatch = html.match(/<li[^>]*data-skill-id="strike"[^>]*>/);
    const shieldItemMatch = html.match(/<li[^>]*data-skill-id="shield"[^>]*>/);
    
    expect(strikeItemMatch![0]).not.toMatch(/class="[^"]*selected[^"]*"/);
    expect(shieldItemMatch![0]).not.toMatch(/class="[^"]*selected[^"]*"/);
  });

  it('should handle null selectedSkillId (no selection)', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // No skill should have selected class
    expect(html).not.toMatch(/class="[^"]*selected[^"]*"/);
  });

  it('should include data-skill-id attribute on each skill item', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('data-skill-id="heal"');
    expect(html).toContain('data-skill-id="strike"');
    expect(html).toContain('data-skill-id="shield"');
  });
});

describe('SkillPriorityEditor - Edge Cases', () => {
  it('should handle empty instruction list', () => {
    const instructions: SkillInstruction[] = [];
    const skills: Skill[] = [];
    const html = renderSkillPriorityEditor(instructions, skills, null);

    expect(html).toContain('skill-priority-editor');
    expect(html).toContain('skill-list');
  });

  it('should handle mismatched instructions and skills', () => {
    const instructions = createTestInstructions();
    const skills = createTestSkills().slice(0, 2); // Only 2 skills
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Should only render skills that exist in availableSkills
    expect(html).toContain('Heal');
    expect(html).toContain('Strike');
  });

  it('should preserve skill order from instructions array', () => {
    // Instructions in reverse priority order
    const instructions: SkillInstruction[] = [
      { skillId: 'shield', priority: 0, conditions: [], enabled: true },
      { skillId: 'strike', priority: 50, conditions: [], enabled: true },
      { skillId: 'heal', priority: 100, conditions: [], enabled: true },
    ];
    const skills = createTestSkills();
    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Should render in the order provided (shield, strike, heal)
    const shieldPos = html.indexOf('data-skill-id="shield"');
    const strikePos = html.indexOf('data-skill-id="strike"');
    const healPos = html.indexOf('data-skill-id="heal"');

    expect(shieldPos).toBeLessThan(strikePos);
    expect(strikePos).toBeLessThan(healPos);
  });
});

describe('SkillPriorityEditor - Tooltip Targeting Override Display (Bug Fix)', () => {
  /**
   * Bug: When a skill has a targeting override set in its instruction,
   * the tooltip still shows the skill's DEFAULT targeting instead of the
   * effective targeting (override).
   *
   * Current behavior (bug): data-tooltip-targeting shows skill.targeting description
   * Expected behavior: data-tooltip-targeting shows instruction.targetingOverride description
   */

  it('should display override targeting description in tooltip when targetingOverride is set', () => {
    // Setup: skill with default targeting 'single-enemy-lowest-hp'
    // but instruction has override 'single-enemy-highest-hp'
    const skills: Skill[] = [
      {
        id: 'strike',
        name: 'Strike',
        baseDuration: 10,
        effects: [{ type: 'damage', value: 10 }],
        targeting: 'self', // Default: "Targets self"
      },
    ];

    const instructions: SkillInstruction[] = [
      {
        skillId: 'strike',
        priority: 100,
        conditions: [],
        enabled: true,
        targetingOverride: 'nearest-enemy', // Override: "Targets nearest enemy"
      },
    ];

    const html = renderSkillPriorityEditor(instructions, skills, null);

    // The tooltip should show the OVERRIDE targeting description in data attribute
    // Expected: "Targets nearest enemy" (from override)
    // Bug: Currently shows "Targets self" (from skill default)
    expect(html).toContain('data-tooltip-targeting="Targets nearest enemy"');
    expect(html).not.toContain('data-tooltip-targeting="Targets self"');
  });

  it('should display default targeting description in tooltip when no override is set', () => {
    // Setup: skill with default targeting, instruction has NO override
    const skills: Skill[] = [
      {
        id: 'heal',
        name: 'Heal',
        baseDuration: 15,
        effects: [{ type: 'heal', value: 20 }],
        targeting: 'self', // Default: "Targets self"
      },
    ];

    const instructions: SkillInstruction[] = [
      {
        skillId: 'heal',
        priority: 100,
        conditions: [],
        enabled: true,
        // No targetingOverride - should use default
      },
    ];

    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Without override, tooltip should show the skill's default targeting in data attribute
    expect(html).toContain('data-tooltip-targeting="Targets self"');
  });

  it('should display correct targeting when override equals default', () => {
    // Edge case: override is explicitly set to same value as default
    // This tests that the override path works even when values match
    const skills: Skill[] = [
      {
        id: 'strike',
        name: 'Strike',
        baseDuration: 10,
        effects: [{ type: 'damage', value: 10 }],
        targeting: 'nearest-enemy',
      },
    ];

    const instructions: SkillInstruction[] = [
      {
        skillId: 'strike',
        priority: 100,
        conditions: [],
        enabled: true,
        targetingOverride: 'nearest-enemy', // Same as default
      },
    ];

    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Should still work correctly (showing the override, which happens to match default)
    expect(html).toContain('data-tooltip-targeting="Targets nearest enemy"');
  });

  it('should display override targeting for each skill when multiple skills have overrides', () => {
    // Multiple skills, each with different overrides
    const skills: Skill[] = [
      {
        id: 'strike',
        name: 'Strike',
        baseDuration: 10,
        effects: [{ type: 'damage', value: 10 }],
        targeting: 'self', // Default: self
      },
      {
        id: 'shield',
        name: 'Shield',
        baseDuration: 5,
        effects: [{ type: 'shield', value: 15 }],
        targeting: 'nearest-enemy', // Default: nearest enemy
      },
    ];

    const instructions: SkillInstruction[] = [
      {
        skillId: 'strike',
        priority: 100,
        conditions: [],
        enabled: true,
        targetingOverride: 'nearest-enemy', // Override: "Targets nearest enemy"
      },
      {
        skillId: 'shield',
        priority: 50,
        conditions: [],
        enabled: true,
        targetingOverride: 'self', // Override: "Targets self"
      },
    ];

    const html = renderSkillPriorityEditor(instructions, skills, null);

    // Each skill's tooltip should show its respective override in data attributes
    expect(html).toContain('data-tooltip-targeting="Targets nearest enemy"');
    expect(html).toContain('data-tooltip-targeting="Targets self"');
    
    // Should NOT show default targeting descriptions (reversed from override)
    expect(html).not.toContain('data-tooltip-targeting="Targets self"' + ' data-skill-id="strike"');
    expect(html).not.toContain('data-tooltip-targeting="Targets nearest enemy"' + ' data-skill-id="shield"');
  });
});

describe('SkillPriorityEditor - Pool Skills for Equip (Merge Panels)', () => {
  /**
   * Tests for merging the "Available Skills" pool into the skill priority editor.
   * The editor now shows:
   * 1. Equipped skills (with priority controls) - some with unequip buttons
   * 2. Pool skills (available to equip) - with equip buttons
   *
   * Innate skills (strike, defend) cannot be unequipped.
   */

  // Helper: Create innate skills (strike and defend)
  function createInnateSkills(): Skill[] {
    return [
      {
        id: 'strike',
        name: 'Strike',
        baseDuration: 2,
        effects: [{ type: 'damage', value: 15 }],
        targeting: 'nearest-enemy',
      },
      {
        id: 'defend',
        name: 'Defend',
        baseDuration: 1,
        effects: [{ type: 'status', statusType: 'defending', duration: 3 }],
        targeting: 'self',
      },
    ];
  }

  // Helper: Create heal skill (non-innate)
  function createHealSkill(): Skill {
    return {
      id: 'heal',
      name: 'Heal',
      baseDuration: 3,
      effects: [{ type: 'heal', value: 30 }],
      targeting: 'self',
    };
  }

  // Helper: Create fireball skill (non-innate)
  function createFireballSkill(): Skill {
    return {
      id: 'fireball',
      name: 'Fireball',
      baseDuration: 4,
      effects: [{ type: 'damage', value: 20 }],
      targeting: 'nearest-enemy',
    };
  }

  // Helper: Create shield skill (non-innate)
  function createShieldSkill(): Skill {
    return {
      id: 'shield',
      name: 'Shield',
      baseDuration: 2,
      effects: [{ type: 'shield', value: 30 }],
      targeting: 'self',
    };
  }

  // Helper: Create all non-innate skills
  function createNonInnateSkills(): Skill[] {
    return [createHealSkill(), createFireballSkill(), createShieldSkill()];
  }

  // Helper: Create pool skills (skills available to equip)
  function createPoolSkills(): Skill[] {
    return [
      {
        id: 'poison',
        name: 'Poison',
        baseDuration: 2,
        effects: [{ type: 'status', statusType: 'poisoned', duration: 6 }],
        targeting: 'nearest-enemy',
      },
      {
        id: 'revive',
        name: 'Revive',
        baseDuration: 4,
        effects: [{ type: 'revive', value: 40 }],
        targeting: 'self',
      },
    ];
  }

  describe('Rendering Pool Skills Section', () => {
    it('should render pool skills section when poolSkills are provided', () => {
      const equippedSkills = [...createInnateSkills(), createNonInnateSkills()[0]];
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 50, conditions: [], enabled: true },
        { skillId: 'heal', priority: 0, conditions: [], enabled: true },
      ];
      const poolSkills = createPoolSkills();

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null, poolSkills);

      // Should have a section for pool skills
      expect(html).toContain('class="pool-skills"');
      // Should show pool skill names
      expect(html).toContain('Poison');
      expect(html).toContain('Revive');
    });

    it('should render pool skills header/title', () => {
      const equippedSkills = createInnateSkills();
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 0, conditions: [], enabled: true },
      ];
      const poolSkills = createPoolSkills();

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null, poolSkills);

      // Should have a header for available skills to equip
      expect(html).toMatch(/Available Skills|Skills to Equip|Unequipped Skills/i);
    });
  });

  describe('Equip Action Data Attributes', () => {
    it('should render pool skills with data-action="equip" attribute', () => {
      const equippedSkills = createInnateSkills();
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 0, conditions: [], enabled: true },
      ];
      const poolSkills = createPoolSkills();

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null, poolSkills);

      // Each pool skill should have data-action="equip"
      expect(html).toContain('data-action="equip"');
      // Should have equip action for each pool skill
      const equipMatches = html.match(/data-action="equip"/g);
      expect(equipMatches).toHaveLength(2); // poison and revive
    });

    it('should render pool skills with data-skill-id for event delegation', () => {
      const equippedSkills = createInnateSkills();
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 0, conditions: [], enabled: true },
      ];
      const poolSkills = createPoolSkills();

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null, poolSkills);

      // Find pool skills section and verify data-skill-id
      // Pool skills should be identifiable by skill ID for equip action
      expect(html).toMatch(/data-action="equip"[^>]*data-skill-id="poison"/);
      expect(html).toMatch(/data-action="equip"[^>]*data-skill-id="revive"/);
    });
  });

  describe('Unequip Action Data Attributes', () => {
    it('should render non-innate equipped skills with data-action="unequip" attribute', () => {
      const equippedSkills: Skill[] = [...createInnateSkills(), createHealSkill(), createFireballSkill()];
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 75, conditions: [], enabled: true },
        { skillId: 'heal', priority: 50, conditions: [], enabled: true },
        { skillId: 'fireball', priority: 0, conditions: [], enabled: true },
      ];

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null);

      // Non-innate skills (heal, fireball) should have unequip action
      expect(html).toContain('data-action="unequip"');
      // Should have unequip for heal and fireball (non-innate)
      const unequipMatches = html.match(/data-action="unequip"/g);
      expect(unequipMatches).toHaveLength(2);
    });

    it('should render equipped non-innate skills with data-skill-id for unequip', () => {
      const equippedSkills: Skill[] = [...createInnateSkills(), createHealSkill()];
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 50, conditions: [], enabled: true },
        { skillId: 'heal', priority: 0, conditions: [], enabled: true },
      ];

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null);

      // Heal skill should have unequip action with skill ID
      expect(html).toMatch(/data-action="unequip"[^>]*data-skill-id="heal"/);
    });
  });

  describe('Innate Skills Protection', () => {
    it('should NOT render unequip button for strike (innate skill)', () => {
      const equippedSkills: Skill[] = [...createInnateSkills(), createHealSkill()];
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 50, conditions: [], enabled: true },
        { skillId: 'heal', priority: 0, conditions: [], enabled: true },
      ];

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null);

      // Find strike skill item - should NOT have unequip action
      const strikeItemMatch = html.match(/<li[^>]*data-skill-id="strike"[^>]*>[\s\S]*?<\/li>/);
      expect(strikeItemMatch).toBeTruthy();
      expect(strikeItemMatch![0]).not.toContain('data-action="unequip"');
    });

    it('should NOT render unequip button for defend (innate skill)', () => {
      const equippedSkills: Skill[] = [...createInnateSkills(), createHealSkill()];
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 50, conditions: [], enabled: true },
        { skillId: 'heal', priority: 0, conditions: [], enabled: true },
      ];

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null);

      // Find defend skill item - should NOT have unequip action
      const defendItemMatch = html.match(/<li[^>]*data-skill-id="defend"[^>]*>[\s\S]*?<\/li>/);
      expect(defendItemMatch).toBeTruthy();
      expect(defendItemMatch![0]).not.toContain('data-action="unequip"');
    });

    it('should render unequip button for non-innate skills', () => {
      const equippedSkills: Skill[] = [...createInnateSkills(), createHealSkill()];
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 50, conditions: [], enabled: true },
        { skillId: 'heal', priority: 0, conditions: [], enabled: true },
      ];

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null);

      // Find heal skill item - SHOULD have unequip action
      const healItemMatch = html.match(/<li[^>]*data-skill-id="heal"[^>]*>[\s\S]*?<\/li>/);
      expect(healItemMatch).toBeTruthy();
      expect(healItemMatch![0]).toContain('data-action="unequip"');
    });
  });

  describe('Edge Cases', () => {
    it('should show "All skills assigned" message when pool is empty', () => {
      const equippedSkills = [...createInnateSkills(), ...createNonInnateSkills()];
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 80, conditions: [], enabled: true },
        { skillId: 'heal', priority: 60, conditions: [], enabled: true },
        { skillId: 'fireball', priority: 40, conditions: [], enabled: true },
        { skillId: 'shield', priority: 0, conditions: [], enabled: true },
      ];
      const poolSkills: Skill[] = []; // Empty pool

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null, poolSkills);

      // Should show message indicating no skills to equip
      expect(html).toMatch(/All skills assigned|No skills available|All skills equipped/i);
    });

    it('should show no unequip buttons when only innate skills are equipped', () => {
      const equippedSkills = createInnateSkills();
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 0, conditions: [], enabled: true },
      ];

      const html = renderSkillPriorityEditor(instructions, equippedSkills, null);

      // Should have NO unequip actions since only innate skills are equipped
      expect(html).not.toContain('data-action="unequip"');
    });

    it('should not render pool section when poolSkills parameter is undefined', () => {
      const equippedSkills = createInnateSkills();
      const instructions: SkillInstruction[] = [
        { skillId: 'strike', priority: 100, conditions: [], enabled: true },
        { skillId: 'defend', priority: 0, conditions: [], enabled: true },
      ];

      // Call without poolSkills parameter (backwards compatible)
      const html = renderSkillPriorityEditor(instructions, equippedSkills, null);

      // Should NOT have pool-skills section
      expect(html).not.toContain('class="pool-skills"');
      // Should NOT have equip actions
      expect(html).not.toContain('data-action="equip"');
    });
  });
});
