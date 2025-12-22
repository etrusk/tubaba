import type { Condition } from '../types/skill.js';
import type { StatusType } from '../types/status.js';

/**
 * All possible status types for condition configuration
 */
const STATUS_TYPES: StatusType[] = [
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
 * Render the form inputs for a specific condition type
 * @param type - Condition type
 * @param currentValue - Current values (threshold or statusType)
 * @returns HTML string for type-specific inputs
 */
export function renderConditionInputs(
  type: Condition['type'],
  currentValue?: { threshold?: number; statusType?: StatusType }
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
                      <option value="hp-below" ${condition.type === 'hp-below' ? 'selected' : ''}>HP Below</option>
                      <option value="ally-count" ${condition.type === 'ally-count' ? 'selected' : ''}>Ally Count</option>
                      <option value="enemy-has-status" ${condition.type === 'enemy-has-status' ? 'selected' : ''}>Enemy Has Status</option>
                      <option value="self-has-status" ${condition.type === 'self-has-status' ? 'selected' : ''}>Self Has Status</option>
                      <option value="ally-has-status" ${condition.type === 'ally-has-status' ? 'selected' : ''}>Ally Has Status</option>
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
                <option value="hp-below">HP Below</option>
                <option value="ally-count">Ally Count</option>
                <option value="enemy-has-status">Enemy Has Status</option>
                <option value="self-has-status">Self Has Status</option>
                <option value="ally-has-status">Ally Has Status</option>
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
