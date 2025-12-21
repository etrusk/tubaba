import { describe, it, expect } from 'vitest';
import type { Character } from '../../src/types/character.js';
import type { StatusEffect } from '../../src/types/status.js';
import TargetFilter from '../../src/targeting/target-filter.js';

/**
 * Test helper: Create a mock character with minimal required fields
 */
function createTestCharacter(
  id: string,
  name: string,
  currentHp: number,
  maxHp: number,
  isPlayer: boolean,
  statusEffects: StatusEffect[] = []
): Character {
  return {
    id,
    name,
    maxHp,
    currentHp,
    skills: [],
    statusEffects,
    currentAction: null,
    isPlayer,
  };
}

/**
 * Test helper: Create a taunting status effect
 */
function createTauntStatus(duration: number = 2): StatusEffect {
  return {
    type: 'taunting',
    duration,
  };
}


describe('TargetFilter', () => {
  describe('dead exclusion', () => {
    it('should remove characters with HP <= 0 from target list', () => {
      const players = [
        createTestCharacter('p1', 'Player 1', 100, 100, true),
        createTestCharacter('p2', 'Player 2', 0, 100, true), // Dead
        createTestCharacter('p3', 'Player 3', 50, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[0]!, players[1]!, players[2]!]; // All 3 players

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id)).toEqual(['p1', 'p3']);
    });

    it('should remove characters with negative HP from target list', () => {
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 100, 100, false),
        createTestCharacter('e2', 'Enemy 2', -10, 100, false), // Overkilled
        createTestCharacter('e3', 'Enemy 3', 50, 100, false),
      ];
      const players = [createTestCharacter('p1', 'Player', 100, 100, true)];

      const targets = [enemies[0]!, enemies[1]!, enemies[2]!];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, false);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id)).toEqual(['e1', 'e3']);
    });

    it('should return empty array when all targets are dead', () => {
      const players = [
        createTestCharacter('p1', 'Dead Player 1', 0, 100, true),
        createTestCharacter('p2', 'Dead Player 2', 0, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[0]!, players[1]!];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(0);
    });

    it('should preserve original array order after filtering dead', () => {
      const enemies = [
        createTestCharacter('e1', 'First Alive', 50, 100, false),
        createTestCharacter('e2', 'Dead', 0, 100, false),
        createTestCharacter('e3', 'Second Alive', 75, 100, false),
        createTestCharacter('e4', 'Another Dead', 0, 100, false),
        createTestCharacter('e5', 'Third Alive', 100, 100, false),
      ];
      const players = [createTestCharacter('p1', 'Player', 100, 100, true)];

      const targets = [...enemies];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, false);

      expect(filtered).toHaveLength(3);
      expect(filtered.map((t) => t.id)).toEqual(['e1', 'e3', 'e5']);
    });
  });

  describe('taunt forcing (single taunter)', () => {
    it('should redirect enemy attack to taunting player', () => {
      const players = [
        createTestCharacter('p1', 'Taunter', 100, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'Original Target', 50, 100, true),
        createTestCharacter('p3', 'Player 3', 80, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[1]!]; // Enemy originally selected p2 (lowest HP)

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p1'); // Forced to taunting player
    });

    it('should replace entire target list with taunter when taunt is active', () => {
      const players = [
        createTestCharacter('p1', 'Player 1', 80, 100, true),
        createTestCharacter('p2', 'Taunter', 100, 100, true, [createTauntStatus()]),
        createTestCharacter('p3', 'Player 3', 60, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[0]!, players[2]!]; // Multiple original targets

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p2');
    });

    it('should only apply taunt to enemy attacks (casterIsEnemy = true)', () => {
      const players = [
        createTestCharacter('p1', 'Taunter', 100, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'Player 2', 80, 100, true),
      ];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 50, 100, false),
        createTestCharacter('e2', 'Enemy 2', 100, 100, false),
      ];

      const targets = [enemies[0]!]; // Player targeting enemy

      const filtered = TargetFilter.applyFilters(targets, players, enemies, false);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('e1'); // Original target unchanged
    });
  });

  describe('multiple taunters', () => {
    it('should select leftmost taunting player when multiple are taunting', () => {
      const players = [
        createTestCharacter('p1', 'First Taunter', 50, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'Second Taunter', 100, 100, true, [createTauntStatus()]),
        createTestCharacter('p3', 'Third Taunter', 80, 100, true, [createTauntStatus()]),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[1]!]; // Enemy originally selected p2

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p1'); // Leftmost taunter selected
    });

    it('should select leftmost taunter regardless of original target', () => {
      const players = [
        createTestCharacter('p1', 'Player 1', 90, 100, true),
        createTestCharacter('p2', 'Second Taunter', 100, 100, true, [createTauntStatus()]),
        createTestCharacter('p3', 'First Taunter', 80, 100, true, [createTauntStatus()]),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[0]!]; // Enemy originally selected p1

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p2'); // Leftmost taunter (p2 is before p3)
    });
  });

  describe('dead taunter handling', () => {
    it('should ignore taunt from dead character', () => {
      const players = [
        createTestCharacter('p1', 'Dead Taunter', 0, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'Original Target', 50, 100, true),
        createTestCharacter('p3', 'Player 3', 80, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[1]!]; // Enemy selected p2

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p2'); // Original target kept (dead taunter ignored)
    });

    it('should use alive taunter when one is dead and one is alive', () => {
      const players = [
        createTestCharacter('p1', 'Dead Taunter', 0, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'Alive Taunter', 100, 100, true, [createTauntStatus()]),
        createTestCharacter('p3', 'Original Target', 50, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[2]!]; // Enemy selected p3

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p2'); // Alive taunter selected (dead one ignored)
    });

    it('should select leftmost alive taunter when multiple alive and dead taunters exist', () => {
      const players = [
        createTestCharacter('p1', 'Dead Taunter', 0, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'First Alive Taunter', 80, 100, true, [createTauntStatus()]),
        createTestCharacter('p3', 'Second Alive Taunter', 90, 100, true, [createTauntStatus()]),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[2]!];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p2'); // First alive taunter
    });
  });

  describe('player attacks (taunt should not affect)', () => {
    it('should not apply enemy taunt to player attacks', () => {
      const players = [createTestCharacter('p1', 'Player', 100, 100, true)];
      const enemies = [
        createTestCharacter('e1', 'Taunting Enemy', 100, 100, false, [createTauntStatus()]),
        createTestCharacter('e2', 'Target Enemy', 50, 100, false),
      ];

      const targets = [enemies[1]!]; // Player targeting e2

      const filtered = TargetFilter.applyFilters(targets, players, enemies, false);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('e2'); // Original target unchanged (enemy taunt ignored)
    });

    it('should still filter dead enemies from player attacks', () => {
      const players = [createTestCharacter('p1', 'Player', 100, 100, true)];
      const enemies = [
        createTestCharacter('e1', 'Dead Enemy', 0, 100, false),
        createTestCharacter('e2', 'Alive Enemy', 50, 100, false),
      ];

      const targets = [enemies[0]!, enemies[1]!];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, false);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('e2');
    });
  });

  describe('no filters active (pass-through)', () => {
    it('should return original targets when no taunt and all targets alive', () => {
      const players = [
        createTestCharacter('p1', 'Player 1', 100, 100, true),
        createTestCharacter('p2', 'Player 2', 80, 100, true),
        createTestCharacter('p3', 'Player 3', 60, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[0]!, players[2]!];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id)).toEqual(['p1', 'p3']);
    });

    it('should return empty array when input is empty', () => {
      const players = [createTestCharacter('p1', 'Player', 100, 100, true)];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets: Character[] = [];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('combined filters (taunt + dead exclusion)', () => {
    it('should filter dead targets first, then apply taunt', () => {
      const players = [
        createTestCharacter('p1', 'Taunter', 100, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'Dead Target', 0, 100, true),
        createTestCharacter('p3', 'Alive Target', 50, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[1]!, players[2]!]; // Both dead and alive targets

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p1'); // Taunt applied after filtering dead
    });

    it('should return empty if taunt would redirect but taunter is in dead targets', () => {
      const players = [
        createTestCharacter('p1', 'Dead Taunter', 0, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'Target', 50, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[0]!, players[1]!]; // Including dead taunter in targets

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p2'); // Dead taunter filtered out, p2 remains
    });
  });

  describe('edge cases', () => {
    it('should handle single target with no filters', () => {
      const players = [createTestCharacter('p1', 'Player', 100, 100, true)];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[0]!];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p1');
    });

    it('should handle taunt with duration 1 (about to expire)', () => {
      const players = [
        createTestCharacter('p1', 'Taunter', 100, 100, true, [createTauntStatus(1)]),
        createTestCharacter('p2', 'Target', 50, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[1]!];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p1'); // Taunt still active with 1 tick remaining
    });

    it('should not apply taunt when duration is 0 (expired)', () => {
      const players = [
        createTestCharacter('p1', 'Expired Taunter', 100, 100, true, [createTauntStatus(0)]),
        createTestCharacter('p2', 'Target', 50, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[1]!];

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p2'); // Expired taunt ignored
    });

    it('should handle all players dead except taunter', () => {
      const players = [
        createTestCharacter('p1', 'Taunter', 100, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'Dead', 0, 100, true),
        createTestCharacter('p3', 'Dead', 0, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[0]!, players[1]!, players[2]!]; // All players

      const filtered = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.id).toBe('p1'); // Only alive taunter remains
    });

    it('should handle deterministic behavior (same input = same output)', () => {
      const players = [
        createTestCharacter('p1', 'Taunter', 100, 100, true, [createTauntStatus()]),
        createTestCharacter('p2', 'Dead', 0, 100, true),
        createTestCharacter('p3', 'Target', 50, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = [players[1]!, players[2]!];

      const filtered1 = TargetFilter.applyFilters(targets, players, enemies, true);
      const filtered2 = TargetFilter.applyFilters(targets, players, enemies, true);

      expect(filtered1).toEqual(filtered2);
      expect(filtered1.map((t) => t.id)).toEqual(filtered2.map((t) => t.id));
    });
  });
});
