/**
 * Skill Priority Editor Component
 *
 * Renders a priority editor that allows users to configure skill priorities
 * using up/down arrows for reordering. Skills are displayed in priority order
 * with auto-calculated priority values using linear interpolation.
 *
 * @module ui/skill-priority-editor
 */

import type { SkillInstruction } from '../types/instructions.js';
import type { Skill } from '../types/skill.js';
import { renderSkillDisplay } from './skill-display.js';
import { ViewModelFactory } from './view-model-factory.js';

/**
 * Calculate priority value based on position in ordered list
 * Uses linear interpolation from 100 (highest) to 0 (lowest)
 *
 * @param index - Position in list (0 = highest priority)
 * @param total - Total number of items
 * @returns Priority value 0-100
 *
 * @example
 * ```typescript
 * calculatePriority(0, 1); // 100 (single item)
 * calculatePriority(0, 2); // 100 (first of two)
 * calculatePriority(1, 2); // 0 (second of two)
 * calculatePriority(0, 3); // 100
 * calculatePriority(1, 3); // 50
 * calculatePriority(2, 3); // 0
 * ```
 */
export function calculatePriority(index: number, total: number): number {
  // Single item always gets priority 100
  if (total === 1) {
    return 100;
  }

  // Linear interpolation from 100 to 0
  // Formula: 100 - (index / (total - 1)) * 100
  const priority = 100 - (index / (total - 1)) * 100;
  
  // Round to 2 decimal places to avoid floating point issues
  return Math.round(priority * 100) / 100;
}

/**
 * Render the skill priority editor component
 * Shows skills ordered by priority with reordering controls
 *
 * @param instructions - Current skill instructions (ordered by priority)
 * @param availableSkills - All skills available to the character
 * @param selectedSkillId - Currently selected skill for editing (or null)
 * @returns HTML string for the skill priority editor
 *
 * @example
 * ```typescript
 * const html = renderSkillPriorityEditor(
 *   [
 *     { skillId: 'heal', priority: 100, conditions: [], enabled: true },
 *     { skillId: 'strike', priority: 50, conditions: [], enabled: true }
 *   ],
 *   [
 *     { id: 'heal', name: 'Heal', ... },
 *     { id: 'strike', name: 'Strike', ... }
 *   ],
 *   'heal'
 * );
 * ```
 */
export function renderSkillPriorityEditor(
  instructions: SkillInstruction[],
  availableSkills: Skill[],
  selectedSkillId: string | null
): string {
  // Create a map of skill IDs to skill objects for quick lookup
  const skillMap = new Map<string, Skill>();
  for (const skill of availableSkills) {
    skillMap.set(skill.id, skill);
  }

  // Render each skill instruction that has a corresponding skill
  const skillItems = instructions
    .filter(instruction => skillMap.has(instruction.skillId))
    .map((instruction, index) => {
      const skill = skillMap.get(instruction.skillId)!;
      const skillViewModel = ViewModelFactory.createSkillViewModel(skill);
      const isFirst = index === 0;
      const isLast = index === instructions.length - 1;
      const isSelected = instruction.skillId === selectedSkillId;
      const isEnabled = instruction.enabled;

      // Build class list for skill item
      const classes: string[] = ['skill-item'];
      if (isSelected) {
        classes.push('selected');
      }
      if (!isEnabled) {
        classes.push('disabled');
      }

      // Determine button disabled states
      const upDisabled = isFirst || instructions.length === 1 ? ' disabled' : '';
      const downDisabled = isLast || instructions.length === 1 ? ' disabled' : '';

      // Checkbox checked state
      const checked = isEnabled ? ' checked' : '';

      return `    <li class="${classes.join(' ')}" data-skill-id="${instruction.skillId}" data-enabled="${isEnabled}">
      <div class="skill-controls">
        <button class="move-btn" data-action="move-up"${upDisabled} title="Move up: This skill will be tried BEFORE the skill above it">↑</button>
        <button class="move-btn" data-action="move-down"${downDisabled} title="Move down: This skill will be tried AFTER the skill below it">↓</button>
      </div>
      <input type="checkbox" class="skill-enable"${checked} data-action="toggle-skill" data-skill-id="${instruction.skillId}" title="Enable/Disable: When disabled, this skill will not be used by the AI" />
      <span class="skill-name">${renderSkillDisplay(skillViewModel)}</span>
      <span class="skill-priority">${instruction.priority}</span>
    </li>`;
    })
    .join('\n');

  return `<div class="skill-priority-editor">
  <h4>Skill Priority</h4>
  <p class="help-text">Higher priority skills are tried first</p>
  
  <ul class="skill-list">
${skillItems}
  </ul>
  
  <div class="action-help">
    <p><strong>How priority works:</strong></p>
    <ul>
      <li>↑ Move up = Skill is tried earlier (higher priority)</li>
      <li>↓ Move down = Skill is tried later (lower priority)</li>
      <li>☐ Checkbox = Enable/disable skill for AI</li>
    </ul>
    <p>The AI tries skills from top to bottom until one's conditions are met.</p>
  </div>
</div>`;
}
