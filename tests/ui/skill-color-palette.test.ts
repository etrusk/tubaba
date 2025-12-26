/**
 * Tests for skill-color-palette module
 *
 * Specifies behavior for getSkillColor(skillId: string): string
 * - Returns unique hex color for each known skill
 * - Returns same color deterministically for a given skill ID
 * - Returns valid hex fallback for unknown skill IDs
 * - Never has two skills share the same color
 */
import { describe, it, expect } from 'vitest';
import { getSkillColor } from '../../src/ui/skill-color-palette.js';

/**
 * Designated color palette from architect design
 */
const EXPECTED_COLORS: Record<string, string> = {
  'strike': '#FF6B6B',       // Coral
  'heavy-strike': '#E53935', // Crimson
  'fireball': '#FF5722',     // Orange-Red
  'execute': '#B71C1C',      // Dark Red
  'bash': '#FFC107',         // Amber
  'interrupt': '#00BCD4',    // Cyan
  'poison': '#AEEA00',       // Lime
  'heal': '#4CAF50',         // Emerald
  'shield': '#2196F3',       // Sky Blue
  'defend': '#607D8B',       // Steel Blue
  'revive': '#E040FB',       // Magenta
  'taunt': '#FFD700',        // Gold
};

const ALL_SKILL_IDS = Object.keys(EXPECTED_COLORS);
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

describe('getSkillColor', () => {
  describe('happy path - each known skill returns designated color', () => {
    it('should return coral (#FF6B6B) for strike', () => {
      expect(getSkillColor('strike')).toBe('#FF6B6B');
    });

    it('should return crimson (#E53935) for heavy-strike', () => {
      expect(getSkillColor('heavy-strike')).toBe('#E53935');
    });

    it('should return orange-red (#FF5722) for fireball', () => {
      expect(getSkillColor('fireball')).toBe('#FF5722');
    });

    it('should return dark red (#B71C1C) for execute', () => {
      expect(getSkillColor('execute')).toBe('#B71C1C');
    });

    it('should return amber (#FFC107) for bash', () => {
      expect(getSkillColor('bash')).toBe('#FFC107');
    });

    it('should return cyan (#00BCD4) for interrupt', () => {
      expect(getSkillColor('interrupt')).toBe('#00BCD4');
    });

    it('should return lime (#AEEA00) for poison', () => {
      expect(getSkillColor('poison')).toBe('#AEEA00');
    });

    it('should return emerald (#4CAF50) for heal', () => {
      expect(getSkillColor('heal')).toBe('#4CAF50');
    });

    it('should return sky blue (#2196F3) for shield', () => {
      expect(getSkillColor('shield')).toBe('#2196F3');
    });

    it('should return steel blue (#607D8B) for defend', () => {
      expect(getSkillColor('defend')).toBe('#607D8B');
    });

    it('should return magenta (#E040FB) for revive', () => {
      expect(getSkillColor('revive')).toBe('#E040FB');
    });

    it('should return gold (#FFD700) for taunt', () => {
      expect(getSkillColor('taunt')).toBe('#FFD700');
    });
  });

  describe('uniqueness - no two skills share the same color', () => {
    it('should assign unique colors to all 12 skills', () => {
      const colors = ALL_SKILL_IDS.map((skillId) => getSkillColor(skillId));
      const uniqueColors = new Set(colors);

      expect(uniqueColors.size).toBe(colors.length);
      expect(uniqueColors.size).toBe(12);
    });

    it('should return 12 different colors for 12 different skills', () => {
      const colorSet = new Set<string>();

      for (const skillId of ALL_SKILL_IDS) {
        const color = getSkillColor(skillId);
        expect(colorSet.has(color)).toBe(false);
        colorSet.add(color);
      }

      expect(colorSet.size).toBe(12);
    });
  });

  describe('stability - same skill ID always returns same color', () => {
    it('should return identical color across multiple calls for strike', () => {
      const firstCall = getSkillColor('strike');
      const secondCall = getSkillColor('strike');
      const thirdCall = getSkillColor('strike');

      expect(firstCall).toBe(secondCall);
      expect(secondCall).toBe(thirdCall);
    });

    it('should return identical color across multiple calls for each skill', () => {
      for (const skillId of ALL_SKILL_IDS) {
        const firstCall = getSkillColor(skillId);
        const secondCall = getSkillColor(skillId);

        expect(firstCall).toBe(secondCall);
      }
    });

    it('should return same colors in different call orders', () => {
      // Call in one order
      const healFirst = getSkillColor('heal');
      const strikeFirst = getSkillColor('strike');

      // Call in reversed order
      const strikeSecond = getSkillColor('strike');
      const healSecond = getSkillColor('heal');

      expect(healFirst).toBe(healSecond);
      expect(strikeFirst).toBe(strikeSecond);
    });
  });

  describe('edge cases - unknown and empty skill IDs', () => {
    it('should return a valid hex color for unknown skill ID', () => {
      const unknownColor = getSkillColor('unknown-skill');

      expect(unknownColor).toMatch(HEX_COLOR_PATTERN);
    });

    it('should return a valid hex color for empty string skill ID', () => {
      const emptyColor = getSkillColor('');

      expect(emptyColor).toMatch(HEX_COLOR_PATTERN);
    });

    it('should return a valid hex color for skill ID with special characters', () => {
      const specialColor = getSkillColor('fire@ball#2');

      expect(specialColor).toMatch(HEX_COLOR_PATTERN);
    });

    it('should return consistent fallback for same unknown skill ID', () => {
      const firstCall = getSkillColor('nonexistent-ability');
      const secondCall = getSkillColor('nonexistent-ability');

      expect(firstCall).toBe(secondCall);
    });

    it('should return potentially different fallbacks for different unknown IDs', () => {
      const unknownA = getSkillColor('unknown-a');
      const unknownB = getSkillColor('unknown-b');

      // Both should be valid hex colors
      expect(unknownA).toMatch(HEX_COLOR_PATTERN);
      expect(unknownB).toMatch(HEX_COLOR_PATTERN);

      // Note: They MAY be different (hash-based) but this is not required
      // This test just verifies both are valid
    });
  });

  describe('format validation - all colors are valid hex', () => {
    it('should return hex format for all known skills', () => {
      for (const skillId of ALL_SKILL_IDS) {
        const color = getSkillColor(skillId);

        expect(color).toMatch(HEX_COLOR_PATTERN);
      }
    });

    it('should return 7-character hex strings (# + 6 hex digits)', () => {
      for (const skillId of ALL_SKILL_IDS) {
        const color = getSkillColor(skillId);

        expect(color).toHaveLength(7);
        expect(color[0]).toBe('#');
      }
    });

    it('should return uppercase hex digits for known skills', () => {
      // Verify the exact format from the design spec uses uppercase
      for (const skillId of ALL_SKILL_IDS) {
        const color = getSkillColor(skillId);
        const hexPart = color.slice(1);

        expect(hexPart).toBe(hexPart.toUpperCase());
      }
    });
  });
});
