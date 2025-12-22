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
      targeting: 'ally-lowest-hp',
    },
    {
      id: 'strike',
      name: 'Strike',
      baseDuration: 10,
      effects: [{ type: 'damage', value: 10 }],
      targeting: 'single-enemy-lowest-hp',
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
    expect(html).toContain('>Heal<');
    expect(html).toContain('>Strike<');
    expect(html).toContain('>Shield<');
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

    // Should have 3 <li> elements
    const liMatches = html.match(/<li/g);
    expect(liMatches).toHaveLength(3);
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
