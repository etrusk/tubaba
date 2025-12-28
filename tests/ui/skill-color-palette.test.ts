/**
 * Tests for skill-color-palette module (Pruned for Rapid Prototyping)
 *
 * Specifies behavior for getSkillColor(skillId: string): string
 * - Returns unique hex color for Strike skill
 * - Returns same color deterministically for a given skill ID
 * - Returns valid hex fallback for unknown skill IDs
 */
import { describe, it, expect } from 'vitest';
import { getSkillColor } from '../../src/ui/skill-color-palette.js';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

describe('getSkillColor', () => {
  describe('happy path - Strike skill returns designated color', () => {
    it('should return coral (#FF6B6B) for strike', () => {
      expect(getSkillColor('strike')).toBe('#FF6B6B');
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

  describe('format validation - colors are valid hex', () => {
    it('should return hex format for strike', () => {
      const color = getSkillColor('strike');
      expect(color).toMatch(HEX_COLOR_PATTERN);
    });

    it('should return 7-character hex string (# + 6 hex digits) for strike', () => {
      const color = getSkillColor('strike');

      expect(color).toHaveLength(7);
      expect(color[0]).toBe('#');
    });

    it('should return uppercase hex digits for strike', () => {
      const color = getSkillColor('strike');
      const hexPart = color.slice(1);

      expect(hexPart).toBe(hexPart.toUpperCase());
    });
  });
});
