import { describe, it, expect } from 'vitest';
import type { Condition } from '../../src/types/skill.js';
import {
  renderConditionBuilder,
  renderConditionInputs,
  getConditionTypeLabel,
} from '../../src/ui/condition-builder.js';

describe('ConditionBuilder', () => {
  describe('renderConditionBuilder', () => {
    describe('AC57: Condition list rendering', () => {
      it('renders all conditions for a skill', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 30 },
          { type: 'enemy-has-status', statusType: 'stunned' },
          { type: 'ally-count', threshold: 2 },
        ];

        const html = renderConditionBuilder(conditions, null);

        // Should render all three conditions
        expect(html).toContain('HP Below 30%');
        expect(html).toContain('Enemy Has Status: Stunned');
        expect(html).toContain('Ally Count >= 2');
      });

      it('each condition shows type and values', () => {
        const conditions: Condition[] = [
          { type: 'self-has-status', statusType: 'defending' },
        ];

        const html = renderConditionBuilder(conditions, null);

        expect(html).toContain('Self Has Status: Defending');
        expect(html).toContain('condition-summary');
      });

      it('each condition has edit and delete buttons', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 50 },
        ];

        const html = renderConditionBuilder(conditions, null);

        expect(html).toContain('data-action="edit-condition"');
        expect(html).toContain('data-action="remove-condition"');
        expect(html).toContain('data-index="0"');
      });

      it('renders multiple conditions with correct indices', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 30 },
          { type: 'ally-count', threshold: 1 },
          { type: 'enemy-has-status', statusType: 'poisoned' },
        ];

        const html = renderConditionBuilder(conditions, null);

        expect(html).toContain('data-index="0"');
        expect(html).toContain('data-index="1"');
        expect(html).toContain('data-index="2"');
      });
    });

    describe('AC57: Adding conditions', () => {
      it('renders "Add Condition" button', () => {
        const html = renderConditionBuilder([], null);

        expect(html).toContain('data-action="add-condition"');
        expect(html).toContain('Add Condition');
      });

      it('Add button present even with existing conditions', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 30 },
        ];

        const html = renderConditionBuilder(conditions, null);

        expect(html).toContain('data-action="add-condition"');
      });

      it('type selector dropdown with all 5 types when adding', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 30 },
        ];

        // Editing index -1 means adding new condition
        const html = renderConditionBuilder(conditions, -1);

        expect(html).toContain('data-input="type"');
        expect(html).toContain('value="hp-below"');
        expect(html).toContain('value="ally-count"');
        expect(html).toContain('value="enemy-has-status"');
        expect(html).toContain('value="self-has-status"');
        expect(html).toContain('value="ally-has-status"');
      });

      it('adding new condition shows edit form with save button', () => {
        const html = renderConditionBuilder([], -1);

        expect(html).toContain('condition-edit-form');
        expect(html).toContain('data-action="save-condition"');
        expect(html).toContain('data-action="cancel-edit"');
      });
    });

    describe('Type-specific inputs', () => {
      it('hp-below: shows number input for threshold (0-100)', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 30 },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('data-input="threshold"');
        expect(html).toContain('type="number"');
        expect(html).toContain('min="0"');
        expect(html).toContain('max="100"');
        expect(html).toContain('value="30"');
      });

      it('ally-count: shows number input for count', () => {
        const conditions: Condition[] = [
          { type: 'ally-count', threshold: 2 },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('data-input="threshold"');
        expect(html).toContain('type="number"');
        expect(html).toContain('min="0"');
        expect(html).toContain('value="2"');
      });

      it('enemy-has-status: shows select dropdown with StatusType options', () => {
        const conditions: Condition[] = [
          { type: 'enemy-has-status', statusType: 'stunned' },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('data-input="statusType"');
        expect(html).toContain('<select');
        expect(html).toContain('value="poisoned"');
        expect(html).toContain('value="stunned"');
        expect(html).toContain('value="shielded"');
        expect(html).toContain('value="defending"');
        expect(html).toContain('value="enraged"');
        expect(html).toContain('value="taunting"');
        expect(html).toContain('selected');
      });

      it('self-has-status: shows select dropdown with StatusType', () => {
        const conditions: Condition[] = [
          { type: 'self-has-status', statusType: 'defending' },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('data-input="statusType"');
        expect(html).toContain('value="defending"');
        expect(html).toContain('selected');
      });

      it('ally-has-status: shows select dropdown with StatusType', () => {
        const conditions: Condition[] = [
          { type: 'ally-has-status', statusType: 'shielded' },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('data-input="statusType"');
        expect(html).toContain('value="shielded"');
        expect(html).toContain('selected');
      });
    });

    describe('AC58: Editing conditions', () => {
      it('clicking edit shows form with current values', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 30 },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('condition-edit-form');
        expect(html).toContain('value="30"');
        expect(html).toContain('selected');
      });

      it('edit form shows save and cancel buttons', () => {
        const conditions: Condition[] = [
          { type: 'ally-count', threshold: 2 },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('data-action="save-condition"');
        expect(html).toContain('data-index="0"');
        expect(html).toContain('data-action="cancel-edit"');
      });

      it('non-editing conditions show normally', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 30 },
          { type: 'ally-count', threshold: 2 },
        ];

        // Editing index 0, index 1 should be normal
        const html = renderConditionBuilder(conditions, 0);

        // Condition 0 is in edit form (no summary text)
        expect(html).toContain('condition-edit-form');
        expect(html).toContain('value="30"'); // Edit input has the value
        // Condition 1 shows normally with summary
        expect(html).toContain('Ally Count >= 2');
        // Only one edit form
        expect(html.match(/condition-edit-form/g)?.length).toBe(1);
      });

      it('condition being edited has editing class', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 50 },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('class="condition-item editing"');
      });
    });

    describe('Removing conditions', () => {
      it('delete button has remove-condition action with index', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 30 },
          { type: 'ally-count', threshold: 1 },
        ];

        const html = renderConditionBuilder(conditions, null);

        expect(html).toContain('data-action="remove-condition"');
        expect(html).toContain('data-index="0"');
        expect(html).toContain('data-index="1"');
      });

      it('each condition has its own delete button', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 30 },
          { type: 'ally-count', threshold: 1 },
          { type: 'enemy-has-status', statusType: 'stunned' },
        ];

        const html = renderConditionBuilder(conditions, null);

        const deleteButtons = html.match(/data-action="remove-condition"/g);
        expect(deleteButtons).toHaveLength(3);
      });
    });

    describe('AC58: Validation', () => {
      it('shows validation error for hp-below threshold > 100', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 150 }, // Invalid
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('validation-errors');
        expect(html).toContain('Threshold must be between 0 and 100');
      });

      it('shows validation error for hp-below threshold < 0', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: -10 }, // Invalid
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('validation-errors');
        expect(html).toContain('Threshold must be between 0 and 100');
      });

      it('shows validation error for ally-count < 0', () => {
        const conditions: Condition[] = [
          { type: 'ally-count', threshold: -1 }, // Invalid
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('validation-errors');
        expect(html).toContain('Count must be 0 or greater');
      });

      it('no validation errors for valid hp-below threshold', () => {
        const conditions: Condition[] = [
          { type: 'hp-below', threshold: 50 },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('data-visible="false"');
      });

      it('no validation errors for valid ally-count', () => {
        const conditions: Condition[] = [
          { type: 'ally-count', threshold: 3 },
        ];

        const html = renderConditionBuilder(conditions, 0);

        expect(html).toContain('data-visible="false"');
      });

      it('validates status selectors have valid StatusType', () => {
        const conditions: Condition[] = [
          { type: 'enemy-has-status', statusType: 'stunned' },
        ];

        const html = renderConditionBuilder(conditions, 0);

        // Should have no validation errors for valid status
        expect(html).toContain('data-visible="false"');
      });
    });

    describe('Empty state', () => {
      it('no conditions shows "No conditions" message', () => {
        const html = renderConditionBuilder([], null);

        expect(html).toContain('No conditions');
        expect(html).toContain('skill always triggers');
      });

      it('add button still visible in empty state', () => {
        const html = renderConditionBuilder([], null);

        expect(html).toContain('data-action="add-condition"');
      });

      it('empty condition list still renders list element', () => {
        const html = renderConditionBuilder([], null);

        expect(html).toContain('condition-list');
      });
    });

    describe('Component structure', () => {
      it('renders main container with condition-builder class', () => {
        const html = renderConditionBuilder([], null);

        expect(html).toContain('class="condition-builder"');
      });

      it('includes heading', () => {
        const html = renderConditionBuilder([], null);

        expect(html).toContain('<h4>Conditions</h4>');
      });

      it('includes help text about AND logic', () => {
        const html = renderConditionBuilder([], null);

        expect(html).toContain('All conditions must be true');
        expect(html).toContain('AND logic');
      });
    });
  });

  describe('renderConditionInputs', () => {
    it('hp-below renders threshold number input', () => {
      const html = renderConditionInputs('hp-below', { threshold: 30 });

      expect(html).toContain('type="number"');
      expect(html).toContain('data-input="threshold"');
      expect(html).toContain('min="0"');
      expect(html).toContain('max="100"');
      expect(html).toContain('value="30"');
    });

    it('hp-below with no value uses default', () => {
      const html = renderConditionInputs('hp-below');

      expect(html).toContain('value="50"'); // Default
    });

    it('ally-count renders threshold number input without max', () => {
      const html = renderConditionInputs('ally-count', { threshold: 2 });

      expect(html).toContain('type="number"');
      expect(html).toContain('data-input="threshold"');
      expect(html).toContain('min="0"');
      expect(html).not.toContain('max=');
      expect(html).toContain('value="2"');
    });

    it('ally-count with no value uses default', () => {
      const html = renderConditionInputs('ally-count');

      expect(html).toContain('value="1"'); // Default
    });

    it('enemy-has-status renders statusType select', () => {
      const html = renderConditionInputs('enemy-has-status', { statusType: 'stunned' });

      expect(html).toContain('<select');
      expect(html).toContain('data-input="statusType"');
      expect(html).toContain('value="poisoned"');
      expect(html).toContain('value="stunned"');
      expect(html).toContain('value="shielded"');
      expect(html).toContain('value="defending"');
      expect(html).toContain('value="enraged"');
      expect(html).toContain('value="taunting"');
    });

    it('enemy-has-status selects current value', () => {
      const html = renderConditionInputs('enemy-has-status', { statusType: 'poisoned' });

      // Check that poisoned option has selected attribute
      expect(html).toMatch(/<option[^>]*value="poisoned"[^>]*selected/);
    });

    it('self-has-status renders statusType select', () => {
      const html = renderConditionInputs('self-has-status', { statusType: 'defending' });

      expect(html).toContain('data-input="statusType"');
      expect(html).toMatch(/<option[^>]*value="defending"[^>]*selected/);
    });

    it('ally-has-status renders statusType select', () => {
      const html = renderConditionInputs('ally-has-status', { statusType: 'shielded' });

      expect(html).toContain('data-input="statusType"');
      expect(html).toMatch(/<option[^>]*value="shielded"[^>]*selected/);
    });

    it('status selects default to first option if no value', () => {
      const html = renderConditionInputs('enemy-has-status');

      // Should default to 'poisoned' (first in list)
      expect(html).toMatch(/<option[^>]*value="poisoned"[^>]*selected/);
    });
  });

  describe('getConditionTypeLabel', () => {
    it('returns "HP Below" for hp-below', () => {
      expect(getConditionTypeLabel('hp-below')).toBe('HP Below');
    });

    it('returns "Ally Count >=" for ally-count', () => {
      expect(getConditionTypeLabel('ally-count')).toBe('Ally Count >=');
    });

    it('returns "Enemy Has Status" for enemy-has-status', () => {
      expect(getConditionTypeLabel('enemy-has-status')).toBe('Enemy Has Status');
    });

    it('returns "Self Has Status" for self-has-status', () => {
      expect(getConditionTypeLabel('self-has-status')).toBe('Self Has Status');
    });

    it('returns "Ally Has Status" for ally-has-status', () => {
      expect(getConditionTypeLabel('ally-has-status')).toBe('Ally Has Status');
    });
  });

  describe('Condition summary rendering', () => {
    it('formats hp-below with percentage', () => {
      const conditions: Condition[] = [
        { type: 'hp-below', threshold: 30 },
      ];

      const html = renderConditionBuilder(conditions, null);

      expect(html).toContain('HP Below 30%');
    });

    it('formats ally-count with threshold', () => {
      const conditions: Condition[] = [
        { type: 'ally-count', threshold: 2 },
      ];

      const html = renderConditionBuilder(conditions, null);

      expect(html).toContain('Ally Count >= 2');
    });

    it('formats enemy-has-status with status name', () => {
      const conditions: Condition[] = [
        { type: 'enemy-has-status', statusType: 'stunned' },
      ];

      const html = renderConditionBuilder(conditions, null);

      expect(html).toContain('Enemy Has Status: Stunned');
    });

    it('formats self-has-status with status name', () => {
      const conditions: Condition[] = [
        { type: 'self-has-status', statusType: 'defending' },
      ];

      const html = renderConditionBuilder(conditions, null);

      expect(html).toContain('Self Has Status: Defending');
    });

    it('formats ally-has-status with status name', () => {
      const conditions: Condition[] = [
        { type: 'ally-has-status', statusType: 'shielded' },
      ];

      const html = renderConditionBuilder(conditions, null);

      expect(html).toContain('Ally Has Status: Shielded');
    });

    it('capitalizes status names properly', () => {
      const conditions: Condition[] = [
        { type: 'enemy-has-status', statusType: 'poisoned' },
      ];

      const html = renderConditionBuilder(conditions, null);

      expect(html).toContain('Poisoned');
      expect(html).not.toContain('poisoned'); // Should be capitalized
    });
  });
});
