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

  describe('single-enemy-lowest-hp targeting', () => {
    it('should select enemy with lowest HP', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 100, 100, false),
        createTestCharacter('e2', 'Enemy 2', 50, 100, false),
        createTestCharacter('e3', 'Enemy 3', 75, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'single-enemy-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e2');
      expect(targets[0]!.currentHp).toBe(50);
    });

    it('should break ties by selecting leftmost in array', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 50, 100, false),
        createTestCharacter('e2', 'Enemy 2', 50, 100, false),
        createTestCharacter('e3', 'Enemy 3', 50, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'single-enemy-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1'); // Leftmost with 50 HP
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
        'single-enemy-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e2');
      expect(targets[0]!.currentHp).toBe(50);
    });

    it('should return empty array when all enemies are dead', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Dead 1', 0, 100, false),
        createTestCharacter('e2', 'Dead 2', 0, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'single-enemy-lowest-hp',
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
        'single-enemy-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(0);
    });
  });

  describe('single-enemy-highest-hp targeting', () => {
    it('should select enemy with highest HP', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 100, 100, false),
        createTestCharacter('e2', 'Enemy 2', 50, 100, false),
        createTestCharacter('e3', 'Enemy 3', 75, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'single-enemy-highest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1');
      expect(targets[0]!.currentHp).toBe(100);
    });

    it('should break ties by selecting leftmost in array', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 100, 100, false),
        createTestCharacter('e2', 'Enemy 2', 100, 100, false),
        createTestCharacter('e3', 'Enemy 3', 50, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'single-enemy-highest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1'); // Leftmost with 100 HP
    });

    it('should exclude knocked-out enemies', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Dead Enemy', 0, 100, false),
        createTestCharacter('e2', 'Alive Enemy', 75, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'single-enemy-highest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e2');
    });

    it('should return empty array when no valid enemies exist', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies: Character[] = [];

      const targets = TargetSelectorStub.selectTargets(
        'single-enemy-highest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(0);
    });
  });

  describe('all-enemies targeting', () => {
    it('should select all living enemies', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 100, 100, false),
        createTestCharacter('e2', 'Enemy 2', 50, 100, false),
        createTestCharacter('e3', 'Enemy 3', 75, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets('all-enemies', caster, players, enemies);

      expect(targets).toHaveLength(3);
      expect(targets.map((t) => t.id)).toEqual(['e1', 'e2', 'e3']);
    });

    it('should exclude dead enemies', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Alive Enemy 1', 100, 100, false),
        createTestCharacter('e2', 'Dead Enemy', 0, 100, false),
        createTestCharacter('e3', 'Alive Enemy 2', 75, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets('all-enemies', caster, players, enemies);

      expect(targets).toHaveLength(2);
      expect(targets.map((t) => t.id)).toEqual(['e1', 'e3']);
    });

    it('should return empty array when all enemies are dead', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Dead 1', 0, 100, false),
        createTestCharacter('e2', 'Dead 2', 0, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets('all-enemies', caster, players, enemies);

      expect(targets).toHaveLength(0);
    });

    it('should return empty array when no enemies exist', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies: Character[] = [];

      const targets = TargetSelectorStub.selectTargets('all-enemies', caster, players, enemies);

      expect(targets).toHaveLength(0);
    });

    it('should maintain original array order', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'First', 50, 100, false),
        createTestCharacter('e2', 'Second', 100, 100, false),
        createTestCharacter('e3', 'Third', 25, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets('all-enemies', caster, players, enemies);

      expect(targets).toHaveLength(3);
      expect(targets.map((t) => t.id)).toEqual(['e1', 'e2', 'e3']);
    });
  });

  describe('ally-lowest-hp targeting', () => {
    it('should select ally with lowest HP', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Player 2', 80, 100, true),
        createTestCharacter('p3', 'Player 3', 30, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets(
        'ally-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p3');
      expect(targets[0]!.currentHp).toBe(30);
    });

    it('should exclude the caster from selection', () => {
      const caster = createTestCharacter('p1', 'Caster', 10, 100, true); // Lowest HP
      const players = [
        caster,
        createTestCharacter('p2', 'Player 2', 50, 100, true),
        createTestCharacter('p3', 'Player 3', 75, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets(
        'ally-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p2'); // Should NOT select caster despite lowest HP
    });

    it('should break ties by selecting leftmost in array', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Player 2', 50, 100, true),
        createTestCharacter('p3', 'Player 3', 50, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets(
        'ally-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p2'); // Leftmost with 50 HP (excluding caster)
    });

    it('should exclude knocked-out allies', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Dead Ally', 0, 100, true),
        createTestCharacter('p3', 'Alive Ally', 60, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets(
        'ally-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p3');
    });

    it('should return empty array when no valid allies exist (only caster alive)', () => {
      const caster = createTestCharacter('p1', 'Solo Caster', 100, 100, true);
      const players = [caster];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets(
        'ally-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(0); // No allies other than caster
    });

    it('should return empty array when all other allies are dead', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Dead 1', 0, 100, true),
        createTestCharacter('p3', 'Dead 2', 0, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets(
        'ally-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(0);
    });
  });

  describe('ally-dead targeting', () => {
    it('should select dead ally (HP = 0)', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Alive', 50, 100, true),
        createTestCharacter('p3', 'Dead', 0, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('ally-dead', caster, players, enemies);

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p3');
      expect(targets[0]!.currentHp).toBe(0);
    });

    it('should handle negative HP as dead', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Alive', 50, 100, true),
        createTestCharacter('p3', 'Overkilled', -10, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('ally-dead', caster, players, enemies);

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p3');
    });

    it('should return empty array when no dead allies exist', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Alive 1', 80, 100, true),
        createTestCharacter('p3', 'Alive 2', 60, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('ally-dead', caster, players, enemies);

      expect(targets).toHaveLength(0);
    });

    it('should select leftmost dead ally when multiple are dead', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        createTestCharacter('p2', 'Dead 1', 0, 100, true),
        createTestCharacter('p3', 'Dead 2', 0, 100, true),
        caster,
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('ally-dead', caster, players, enemies);

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p2'); // Leftmost dead ally
    });

    it('should include caster if caster is dead (edge case for resurrection mechanics)', () => {
      const caster = createTestCharacter('p1', 'Dead Caster', 0, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Alive', 100, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('ally-dead', caster, players, enemies);

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p1'); // Dead caster can be targeted
    });
  });

  describe('all-allies targeting', () => {
    it('should select all living allies including caster', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Player 2', 80, 100, true),
        createTestCharacter('p3', 'Player 3', 60, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('all-allies', caster, players, enemies);

      expect(targets).toHaveLength(3);
      expect(targets.map((t) => t.id)).toEqual(['p1', 'p2', 'p3']);
    });

    it('should exclude dead allies', () => {
      const caster = createTestCharacter('p1', 'Caster', 100, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Alive', 80, 100, true),
        createTestCharacter('p3', 'Dead', 0, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('all-allies', caster, players, enemies);

      expect(targets).toHaveLength(2);
      expect(targets.map((t) => t.id)).toEqual(['p1', 'p2']);
    });

    it('should return only caster when all other allies are dead', () => {
      const caster = createTestCharacter('p1', 'Solo Survivor', 50, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Dead 1', 0, 100, true),
        createTestCharacter('p3', 'Dead 2', 0, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('all-allies', caster, players, enemies);

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('p1');
    });

    it('should maintain original array order', () => {
      const caster = createTestCharacter('p1', 'Caster', 50, 100, true);
      const players = [
        caster,
        createTestCharacter('p2', 'Second', 100, 100, true),
        createTestCharacter('p3', 'Third', 25, 100, true),
      ];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('all-allies', caster, players, enemies);

      expect(targets).toHaveLength(3);
      expect(targets.map((t) => t.id)).toEqual(['p1', 'p2', 'p3']);
    });

    it('should return empty array if caster is dead and alone', () => {
      const caster = createTestCharacter('p1', 'Dead Solo', 0, 100, true);
      const players = [caster];
      const enemies = [createTestCharacter('e1', 'Enemy', 100, 100, false)];

      const targets = TargetSelectorStub.selectTargets('all-allies', caster, players, enemies);

      expect(targets).toHaveLength(0); // Dead caster excluded
    });
  });

  describe('deterministic behavior', () => {
    it('should return same results for identical inputs (single-enemy-lowest-hp)', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 50, 100, false),
        createTestCharacter('e2', 'Enemy 2', 75, 100, false),
      ];

      const targets1 = TargetSelectorStub.selectTargets(
        'single-enemy-lowest-hp',
        caster,
        players,
        enemies
      );
      const targets2 = TargetSelectorStub.selectTargets(
        'single-enemy-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets1).toEqual(targets2);
    });

    it('should return same results for identical inputs (all-enemies)', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Enemy 1', 50, 100, false),
        createTestCharacter('e2', 'Enemy 2', 75, 100, false),
        createTestCharacter('e3', 'Enemy 3', 100, 100, false),
      ];

      const targets1 = TargetSelectorStub.selectTargets('all-enemies', caster, players, enemies);
      const targets2 = TargetSelectorStub.selectTargets('all-enemies', caster, players, enemies);

      expect(targets1).toEqual(targets2);
      expect(targets1.map((t) => t.id)).toEqual(targets2.map((t) => t.id));
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle single enemy for all targeting modes', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [createTestCharacter('e1', 'Solo Enemy', 50, 100, false)];

      const lowestHp = TargetSelectorStub.selectTargets(
        'single-enemy-lowest-hp',
        caster,
        players,
        enemies
      );
      const highestHp = TargetSelectorStub.selectTargets(
        'single-enemy-highest-hp',
        caster,
        players,
        enemies
      );
      const allEnemies = TargetSelectorStub.selectTargets('all-enemies', caster, players, enemies);

      expect(lowestHp).toHaveLength(1);
      expect(highestHp).toHaveLength(1);
      expect(allEnemies).toHaveLength(1);
      expect(lowestHp[0]!.id).toBe('e1');
      expect(highestHp[0]!.id).toBe('e1');
      expect(allEnemies[0]!.id).toBe('e1');
    });

    it('should handle HP exactly at 0 as knocked out', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'Zero HP', 0, 100, false),
        createTestCharacter('e2', 'One HP', 1, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'single-enemy-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e2'); // Should skip 0 HP enemy
    });

    it('should handle HP exactly at 1 as valid target', () => {
      const caster = createTestCharacter('p1', 'Player', 100, 100, true);
      const players = [caster];
      const enemies = [
        createTestCharacter('e1', 'One HP', 1, 100, false),
        createTestCharacter('e2', 'Full HP', 100, 100, false),
      ];

      const targets = TargetSelectorStub.selectTargets(
        'single-enemy-lowest-hp',
        caster,
        players,
        enemies
      );

      expect(targets).toHaveLength(1);
      expect(targets[0]!.id).toBe('e1');
      expect(targets[0]!.currentHp).toBe(1);
    });
  });
});
