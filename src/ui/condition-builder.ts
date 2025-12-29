import type { Condition, ConditionGroup } from '../types/skill.js';

/**
 * Maximum number of OR groups allowed in condition builder
 */
const MAX_GROUPS = 4;

/**
 * Maximum number of conditions allowed per group
 */
const MAX_CONDITIONS_PER_GROUP = 4;

/**
 * All possible status types for condition configuration
 */
const STATUS_TYPES: string[] = [
  'poisoned',
  'stunned',
  'shielded',
  'defending',
  'enraged',
  'taunting',
];

/**
 * Get human-readable label for condition type
 */
export function getConditionTypeLabel(type: Condition['type']): string {
  switch (type) {
    case 'hp-below':
      return 'HP Below';
    case 'ally-count':
      return 'Ally Count >=';
    case 'enemy-has-status':
      return 'Enemy Has Status';
    case 'self-has-status':
      return 'Self Has Status';
    case 'ally-has-status':
      return 'Ally Has Status';
  }
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format condition for display summary
 */
function formatConditionSummary(condition: Condition): string {
  switch (condition.type) {
    case 'hp-below':
      return `HP Below ${condition.threshold ?? 50}%`;
    case 'ally-count':
      return `Ally Count >= ${condition.threshold ?? 1}`;
    case 'enemy-has-status':
      return `Enemy Has Status: ${capitalize(condition.statusType ?? 'poisoned')}`;
    case 'self-has-status':
      return `Self Has Status: ${capitalize(condition.statusType ?? 'poisoned')}`;
    case 'ally-has-status':
      return `Ally Has Status: ${capitalize(condition.statusType ?? 'poisoned')}`;
  }
}

/**
 * Validate condition values
 */
function validateCondition(condition: Condition): string | null {
  if (condition.type === 'hp-below') {
    const threshold = condition.threshold ?? 50;
    if (threshold < 0 || threshold > 100) {
      return 'Threshold must be between 0 and 100';
    }
  }

  if (condition.type === 'ally-count') {
    const threshold = condition.threshold ?? 1;
    if (threshold < 0) {
      return 'Count must be 0 or greater';
    }
  }

  return null;
}

/**
 * Render condition type select options
 * @param selectedType - Currently selected type (optional, defaults to hp-below)
 * @returns HTML string for option elements
 */
function renderConditionTypeOptions(selectedType?: Condition['type']): string {
  const types: { value: Condition['type']; label: string }[] = [
    { value: 'hp-below', label: 'HP Below' },
    { value: 'ally-count', label: 'Ally Count' },
    { value: 'enemy-has-status', label: 'Enemy Has Status' },
    { value: 'self-has-status', label: 'Self Has Status' },
    { value: 'ally-has-status', label: 'Ally Has Status' },
  ];

  return types
    .map(({ value, label }) =>
      `<option value="${value}" ${selectedType === value ? 'selected' : ''}>${label}</option>`
    )
    .join('');
}

/**
 * Render the form inputs for a specific condition type
 * @param type - Condition type
 * @param currentValue - Current values (threshold or statusType)
 * @returns HTML string for type-specific inputs
 */
export function renderConditionInputs(
  type: Condition['type'],
  currentValue?: { threshold?: number; statusType?: string }
): string {
  if (type === 'hp-below') {
    const value = currentValue?.threshold ?? 50;
    return `
      <input
        type="number"
        data-input="threshold"
        min="0"
        max="100"
        value="${value}"
        placeholder="Threshold %"
      />
    `;
  }

  if (type === 'ally-count') {
    const value = currentValue?.threshold ?? 1;
    return `
      <input
        type="number"
        data-input="threshold"
        min="0"
        value="${value}"
        placeholder="Count"
      />
    `;
  }

  // Status-based conditions
  if (
    type === 'enemy-has-status' ||
    type === 'self-has-status' ||
    type === 'ally-has-status'
  ) {
    const selectedStatus = currentValue?.statusType ?? 'poisoned';
    return `
      <select data-input="statusType">
        ${STATUS_TYPES.map(
          (status) => `
          <option value="${status}" ${status === selectedStatus ? 'selected' : ''}>
            ${capitalize(status)}
          </option>
        `
        ).join('')}
      </select>
    `;
  }

  return '';
}

/**
 * Render the condition builder component for a skill
 * Shows list of conditions with add/edit/remove controls
 * 
 * @param conditions - Current conditions for the skill
 * @param editingIndex - Index of condition being edited (or null if not editing, -1 for adding new)
 * @returns HTML string for the condition builder
 */
export function renderConditionBuilder(
  conditions: Condition[],
  editingIndex: number | null
): string {
  // Check for validation errors on the editing condition
  let validationError: string | null = null;
  if (editingIndex !== null && editingIndex >= 0 && editingIndex < conditions.length) {
    const condition = conditions[editingIndex];
    if (condition) {
      validationError = validateCondition(condition);
    }
  }

  return `
    <div class="condition-builder">
      <h4>Conditions</h4>
      <p class="help-text">All conditions must be true for skill to trigger (AND logic)</p>
      
      <ul class="condition-list">
        ${
          conditions.length === 0 && editingIndex === null
            ? '<li class="empty-state">No conditions (skill always triggers)</li>'
            : ''
        }
        ${conditions
          .map((condition, index) => {
            if (editingIndex === index) {
              // Render edit form for this condition
              return `
                <li class="condition-item editing" data-index="${index}">
                  <div class="condition-edit-form">
                    <select data-input="type">
                      ${renderConditionTypeOptions(condition.type)}
                    </select>
                    ${renderConditionInputs(condition.type, {
                      threshold: condition.threshold,
                      statusType: condition.statusType,
                    })}
                    <button data-action="save-condition" data-index="${index}">Save</button>
                    <button data-action="cancel-edit">Cancel</button>
                  </div>
                </li>
              `;
            }

            // Render normal condition display
            return `
              <li class="condition-item" data-index="${index}">
                <span class="condition-summary">${formatConditionSummary(condition)}</span>
                <div class="condition-actions">
                  <button data-action="edit-condition" data-index="${index}">Edit</button>
                  <button data-action="remove-condition" data-index="${index}">Remove</button>
                </div>
              </li>
            `;
          })
          .join('')}
        ${
          editingIndex === -1
            ? `
          <li class="condition-item editing" data-index="-1">
            <div class="condition-edit-form">
              <select data-input="type">
                ${renderConditionTypeOptions()}
              </select>
              ${renderConditionInputs('hp-below')}
              <button data-action="save-condition" data-index="-1">Save</button>
              <button data-action="cancel-edit">Cancel</button>
            </div>
          </li>
        `
            : ''
        }
      </ul>
      
      <div class="add-condition-section">
        <button data-action="add-condition">+ Add Condition</button>
      </div>
      
      <div class="validation-errors" data-visible="${validationError !== null}">
        ${validationError ? `<p class="error">${validationError}</p>` : ''}
      </div>
    </div>
  `;
}

/**
 * Render the condition builder with group support (OR between groups, AND within groups)
 *
 * @param conditionGroups - Array of condition groups
 * @param editingGroupIndex - Index of group being edited (or null if not editing)
 * @param editingConditionIndex - Index of condition within group being edited (or -1 for adding new)
 * @returns HTML string for the condition builder with groups
 */
export function renderConditionBuilderWithGroups(
  conditionGroups: ConditionGroup[],
  editingGroupIndex: number | null,
  editingConditionIndex: number | null
): string {
  // If empty, render a single empty group
  const groups = conditionGroups.length === 0
    ? [{ conditions: [] }]
    : conditionGroups;

  const showRemoveGroupButton = groups.length > 1;
  const showAddGroupButton = groups.length < MAX_GROUPS;

  const renderConditionItem = (
    condition: Condition,
    groupIndex: number,
    conditionIndex: number,
    isEditing: boolean
  ): string => {
    if (isEditing) {
      return `
        <li class="condition-item editing" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}">
          <div class="condition-edit-form">
            <select data-input="type">
              ${renderConditionTypeOptions(condition.type)}
            </select>
            ${renderConditionInputs(condition.type, {
              threshold: condition.threshold,
              statusType: condition.statusType,
            })}
            <button data-action="save-condition-to-group" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}">Save</button>
            <button data-action="cancel-edit">Cancel</button>
          </div>
        </li>
      `;
    }

    return `
      <li class="condition-item" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}">
        <span class="condition-summary">${formatConditionSummary(condition)}</span>
        <div class="condition-actions">
          <button data-action="edit-condition-in-group" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}">Edit</button>
          <button data-action="remove-condition-from-group" data-group-index="${groupIndex}" data-condition-index="${conditionIndex}">Remove</button>
        </div>
      </li>
    `;
  };

  const renderAddConditionForm = (groupIndex: number): string => {
    return `
      <li class="condition-item editing" data-group-index="${groupIndex}" data-condition-index="-1">
        <div class="condition-edit-form">
          <select data-input="type">
            ${renderConditionTypeOptions()}
          </select>
          ${renderConditionInputs('hp-below')}
          <button data-action="save-condition-to-group" data-group-index="${groupIndex}">Save</button>
          <button data-action="cancel-edit">Cancel</button>
        </div>
      </li>
    `;
  };

  const renderGroup = (group: ConditionGroup, groupIndex: number): string => {
    const isAddingToThisGroup = editingGroupIndex === groupIndex && editingConditionIndex === -1;
    const showAddConditionButton = group.conditions.length < MAX_CONDITIONS_PER_GROUP && !isAddingToThisGroup;

    return `
      <div class="condition-group" data-group-index="${groupIndex}">
        <div class="group-header">
          <span class="group-title">Group ${groupIndex + 1}</span>
          ${showRemoveGroupButton ? `<button data-action="remove-group" data-group-index="${groupIndex}">Remove Group</button>` : ''}
        </div>
        <p class="group-help-text">All conditions must be true (AND)</p>
        <ul class="condition-list">
          ${group.conditions.length === 0 && !isAddingToThisGroup
            ? '<li class="empty-state">No conditions in this group</li>'
            : ''
          }
          ${group.conditions
            .map((condition, conditionIndex) => {
              const isEditing = editingGroupIndex === groupIndex && editingConditionIndex === conditionIndex;
              return renderConditionItem(condition, groupIndex, conditionIndex, isEditing);
            })
            .join('')}
          ${isAddingToThisGroup ? renderAddConditionForm(groupIndex) : ''}
        </ul>
        ${showAddConditionButton
          ? `<button data-action="add-condition-to-group" data-group-index="${groupIndex}">+ Add condition</button>`
          : ''
        }
      </div>
    `;
  };

  const groupsHtml = groups
    .map((group, index) => {
      const groupHtml = renderGroup(group, index);
      // Add OR divider after each group except the last one
      if (index < groups.length - 1) {
        return groupHtml + '<div class="or-divider">OR</div>';
      }
      return groupHtml;
    })
    .join('');

  return `
    <div class="condition-builder">
      <h4>Use this skill when</h4>
      
      ${groupsHtml}
      
      ${showAddGroupButton
        ? '<button data-action="add-group">+ Add another OR group</button>'
        : ''
      }
    </div>
  `;
}
