import { describe, it, expect } from 'vitest';
import type { Character } from '../../src/types/character.js';
import type { TargetingMode } from '../../src/types/skill.js';

/**
 * Test helper: Create a mock character with minimal required fields
 */
function createTestCharacter(
  id: string,
  name: string,
  currentHp: number,
  maxHp: number,
  isPlayer: boolean
): Character {
  return {
    id,
    name,
    maxHp,
    currentHp,
    skills: [],
    statusEffects: [],
    currentAction: null,
    isPlayer,
  };
}

/**
 * Interface for TargetSelector (implementation to be created)
 */
interface TargetSelector {
  selectTargets(
    mode: TargetingMode,
    caster: Character,
    players: Character[],
    enemies: Character[]
  ): Character[];
}

// Import actual implementation
import { selectTargets } from '../../src/targeting/target-selector.js';

// Use real implementation
const TargetSelectorStub: TargetSelector = {
  selectTargets,
};

describe('TargetSelector', () => {
  describe('self targeting', () => {
    it('should always select the caster', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Player 2', 80, 100, true),
        createTestCharacter('p3', 'Player 3', 60, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy 1', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('self', caster, players, enemies);

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p1');
    });

    it('should work even with no allies or enemies', () => {
      const caster = createTestCharacter('p1', 'Solo Caster', 50, 100, true);

      const targets = TargetSelectorStub.selectTargets('self', caster, [caster], []);

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p1');
    });

    it('should work when caster has low HP', () => {
      const caster = createTestCharacter('p1', 'Dying Caster', 1, 100, true);
      const players = [caster];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('self', caster, players, enemies);

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p1');
    });
  });

  describe('nearest-enemy targeting', () => {
    it('should select first living enemy', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 100, 100, false),
        createTestCharacter('e2', 'Enemy 2', 50, 100, false),
        createTestCharacter('e3', 'Enemy 3', 75, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1');
    });

    it('should select first living enemy regardless of HP', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 10, 100, false),
        createTestCharacter('e2', 'Enemy 2', 100, 100, false),
        createTestCharacter('e3', 'Enemy 3', 50, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1');
      expect(targets[0]!.currentHp).toBe(10);
    });

    it('should exclude knocked-out enemies (HP <= 0)', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Dead Enemy', 0, 100, false),
        createTestCharacter('e2', 'Alive Enemy', 50, 100, false),
        createTestCharacter('e3', 'Negative HP Enemy', -10, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e2');
    });

    it('should return empty array when all enemies are dead', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Dead 1', 0, 100, false),
        createTestCharacter('e2', 'Dead 2', 0, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(0);
    });

    it('should return empty array when no enemies exist', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies: Character[] = [];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(0);
    });

    it('should skip dead enemies at start of array', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Dead 1', 0, 100, false),
        createTestCharacter('e2', 'Dead 2', 0, 100, false),
        createTestCharacter('e3', 'Alive Enemy', 75, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e3');
    });

    it('should handle single enemy', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [createTestCharacter('e1', 'Solo Enemy', 50, 100, false)];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1');
    });

    it('should handle HP exactly at 0 as knocked out', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Zero HP', 0, 100, false),
        createTestCharacter('e2', 'One HP', 1, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e2');
    });

    it('should handle HP exactly at 1 as valid target', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'One HP', 1, 100, false),
        createTestCharacter('e2', 'Full HP', 100, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1');
      expect(targets[0]!.currentHp).toBe(1);
    });
  });

  describe('deterministic behavior', () => {
    it('should return same results for identical inputs (self)', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [createTestCharacter('e1', 'Enemy 1', 50, 100, false)];

      const targets1 = TargetSelectorStub.selectTargets('self', caster, players, enemies);
      const targets2 = TargetSelectorStub.selectTargets('self', caster, players, enemies);

      expect(targets1).toEqual(targets2);
    });

    it('should return same results for identical inputs (nearest-enemy)', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 50, 100, false),
        createTestCharacter('e2', 'Enemy 2', 75, 100, false),
      ];

      const targets1 = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );
      const targets2 = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets1).toEqual(targets2);
    });
  });

  describe('position-based targeting', () => {
    it('should select nearest enemy by Euclidean distance when positions available', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      caster.position = { x: 0, y: 0 };
      
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Far Enemy', 100, 100, false),
        createTestCharacter('e2', 'Near Enemy', 100, 100, false),
        createTestCharacter('e3', 'Medium Enemy', 100, 100, false),
      ];
      enemies[0]!.position = { x: 10, y: 10 }; // Distance: sqrt(200) ≈ 14.14
      enemies[1]!.position = { x: 3, y: 4 };   // Distance: 5
      enemies[2]!.position = { x: 6, y: 8 };   // Distance: 10

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e2');
    });

    it('should fall back to first enemy when no positions', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 100, 100, false),
        createTestCharacter('e2', 'Enemy 2', 100, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1');
    });

    it('should handle mixed (some with positions, some without)', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      caster.position = { x: 0, y: 0 };
      
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'No Position', 100, 100, false),
        createTestCharacter('e2', 'Far Position', 100, 100, false),
        createTestCharacter('e3', 'Near Position', 100, 100, false),
      ];
      // e1 has no position
      enemies[1]!.position = { x: 10, y: 10 }; // Distance: sqrt(200) ≈ 14.14
      enemies[2]!.position = { x: 3, y: 4 };   // Distance: 5

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e3'); // Should select nearest with position
    });

    it('should fall back when caster has no position', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      // No position set
      
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'First Enemy', 100, 100, false),
        createTestCharacter('e2', 'Second Enemy', 100, 100, false),
      ];
      enemies[0]!.position = { x: 10, y: 10 };
      enemies[1]!.position = { x: 1, y: 1 };

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1'); // Fallback to first
    });

    it('should exclude dead enemies even with positions', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      caster.position = { x: 0, y: 0 };
      
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Dead Near', 0, 100, false),
        createTestCharacter('e2', 'Alive Far', 100, 100, false),
      ];
      enemies[0]!.position = { x: 1, y: 1 }; // Distance: sqrt(2) ≈ 1.41
      enemies[1]!.position = { x: 10, y: 10 }; // Distance: sqrt(200) ≈ 14.14

      const targets = TargetSelectorStub.selectTargets(
        'nearest-enemy',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e2'); // Should skip dead enemy
    });
  });
});
