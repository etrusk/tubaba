import { describe, it, expect } from 'vitest';
import { calculateCharacterPositions } from '../../src/ui/battle-arena-layout.js';
import type { Character } from '../../src/types/character.js';

// Helper function to create minimal character for testing
function createCharacter(id: string, name: string, isPlayer: boolean): Character {
  return {
    id,
    name,
    maxHp: 100,
    currentHp: 100,
    skills: [],
    statusEffects: [],
    currentAction: null,
    isPlayer,
  };
}

describe('BattleArenaLayout', () => {
  const DEFAULT_ARENA = { width: 800, height: 500 };

  describe('Grid-Based Character Positioning', () => {
    it('should position 1 player at default grid position (3,4) = pixel (200, 250)', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(2);
      
      const playerPos = positions.find(p => p.characterId === 'p1');
      
      // Grid position (3,4) converts to pixel (200, 250)
      // x = 25 + 3 * 50 + 25 = 200
      // y = 25 + 4 * 50 + 25 = 250
      expect(playerPos?.x).toBe(200);
      expect(playerPos?.y).toBe(250);
    });

    it('should position 1 enemy at default grid position (5,4) = pixel (300, 250)', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const enemyPos = positions.find(p => p.characterId === 'e1');
      
      // Grid position (5,4) converts to pixel (300, 250)
      // x = 25 + 5 * 50 + 25 = 300
      // y = 25 + 4 * 50 + 25 = 250
      expect(enemyPos?.x).toBe(300);
      expect(enemyPos?.y).toBe(250);
    });

    it('should position 2 players at default diagonal positions', () => {
      const players = [
        createCharacter('p1', 'Player 1', true),
        createCharacter('p2', 'Player 2', true),
      ];
      const enemies = [
        createCharacter('e1', 'Enemy 1', false),
        createCharacter('e2', 'Enemy 2', false),
      ];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(4);
      
      const playerPositions = positions.filter(p => p.characterId.startsWith('p'));
      
      // Player 1 at grid (3,4) = pixel (200, 250)
      expect(playerPositions[0]!.x).toBe(200);
      expect(playerPositions[0]!.y).toBe(250);
      
      // Player 2 at grid (4,5) = pixel (250, 300)
      expect(playerPositions[1]!.x).toBe(250);
      expect(playerPositions[1]!.y).toBe(300);
    });

    it('should position 2 enemies at default diagonal positions', () => {
      const players = [
        createCharacter('p1', 'Player 1', true),
        createCharacter('p2', 'Player 2', true),
      ];
      const enemies = [
        createCharacter('e1', 'Enemy 1', false),
        createCharacter('e2', 'Enemy 2', false),
      ];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const enemyPositions = positions.filter(p => p.characterId.startsWith('e'));
      
      // Enemy 1 at grid (5,4) = pixel (300, 250)
      expect(enemyPositions[0]!.x).toBe(300);
      expect(enemyPositions[0]!.y).toBe(250);
      
      // Enemy 2 at grid (6,5) = pixel (350, 300)
      expect(enemyPositions[1]!.x).toBe(350);
      expect(enemyPositions[1]!.y).toBe(300);
    });

    it('should position 3 players at default grid positions', () => {
      const players = [
        createCharacter('p1', 'Player 1', true),
        createCharacter('p2', 'Player 2', true),
        createCharacter('p3', 'Player 3', true),
      ];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const playerPositions = positions.filter(p => p.characterId.startsWith('p'));
      
      // Player 1 at grid (3,4) = pixel (200, 250)
      expect(playerPositions[0]!.x).toBe(200);
      expect(playerPositions[0]!.y).toBe(250);
      
      // Player 2 at grid (4,5) = pixel (250, 300)
      expect(playerPositions[1]!.x).toBe(250);
      expect(playerPositions[1]!.y).toBe(300);
      
      // Player 3 at grid (2,4) = pixel (150, 250)
      expect(playerPositions[2]!.x).toBe(150);
      expect(playerPositions[2]!.y).toBe(250);
    });

    it('should position 4 players at default grid positions', () => {
      const players = [
        createCharacter('p1', 'Player 1', true),
        createCharacter('p2', 'Player 2', true),
        createCharacter('p3', 'Player 3', true),
        createCharacter('p4', 'Player 4', true),
      ];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const playerPositions = positions.filter(p => p.characterId.startsWith('p'));
      
      expect(playerPositions).toHaveLength(4);
      
      // Player 1 at grid (3,4) = pixel (200, 250)
      expect(playerPositions[0]!.x).toBe(200);
      expect(playerPositions[0]!.y).toBe(250);
      
      // Player 2 at grid (4,5) = pixel (250, 300)
      expect(playerPositions[1]!.x).toBe(250);
      expect(playerPositions[1]!.y).toBe(300);
      
      // Player 3 at grid (2,4) = pixel (150, 250)
      expect(playerPositions[2]!.x).toBe(150);
      expect(playerPositions[2]!.y).toBe(250);
      
      // Player 4 at grid (3,5) = pixel (200, 300)
      expect(playerPositions[3]!.x).toBe(200);
      expect(playerPositions[3]!.y).toBe(300);
    });
  });

  describe('Custom Grid Positions', () => {
    it('should use character position property if available', () => {
      const players = [
        {
          ...createCharacter('p1', 'Player 1', true),
          position: { x: 1, y: 1 },
        },
      ];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const playerPos = positions.find(p => p.characterId === 'p1');
      
      // Custom grid position (1,1) converts to pixel (100, 100)
      // x = 25 + 1 * 50 + 25 = 100 (padding + grid_x * cell_size + half_cell)
      // y = 25 + 1 * 50 + 25 = 100
      expect(playerPos?.x).toBe(100);
      expect(playerPos?.y).toBe(100);
    });

    it('should use default positions when no custom position provided', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const playerPos = positions.find(p => p.characterId === 'p1');
      const enemyPos = positions.find(p => p.characterId === 'e1');
      
      // Should use default grid positions
      expect(playerPos?.x).toBe(200); // grid (3,4)
      expect(playerPos?.y).toBe(250);
      expect(enemyPos?.x).toBe(300); // grid (5,4)
      expect(enemyPos?.y).toBe(250);
    });
  });

  describe('Radius and Circle Properties', () => {
    it('should set radius to 20px (CELL_SIZE * 0.4)', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      positions.forEach(pos => {
        expect(pos.radius).toBe(20); // 50 * 0.4
      });
    });

    it('should include radius in position data', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      positions.forEach(pos => {
        expect(pos).toHaveProperty('radius');
        expect(typeof pos.radius).toBe('number');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero enemies without crashing', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies: Character[] = [];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(1);
      expect(positions[0]!.characterId).toBe('p1');
      expect(positions[0]!.x).toBe(200); // Default grid position
      expect(positions[0]!.y).toBe(250);
    });

    it('should handle zero players without crashing', () => {
      const players: Character[] = [];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(1);
      expect(positions[0]!.characterId).toBe('e1');
      expect(positions[0]!.x).toBe(300); // Default grid position
      expect(positions[0]!.y).toBe(250);
    });

    it('should handle both empty arrays without crashing', () => {
      const players: Character[] = [];
      const enemies: Character[] = [];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(0);
      expect(Array.isArray(positions)).toBe(true);
    });
  });

  describe('Position Data Structure', () => {
    it('should return CharacterPosition objects with all required fields', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      positions.forEach(pos => {
        expect(pos).toHaveProperty('characterId');
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
        expect(pos).toHaveProperty('radius');
        
        expect(typeof pos.characterId).toBe('string');
        expect(typeof pos.x).toBe('number');
        expect(typeof pos.y).toBe('number');
        expect(typeof pos.radius).toBe('number');
      });
    });
  });

  describe('Diagonal Formation', () => {
    it('should place players in diagonal formation', () => {
      const players = [
        createCharacter('p1', 'Player 1', true),
        createCharacter('p2', 'Player 2', true),
      ];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const playerPositions = positions.filter(p => p.characterId.startsWith('p'));
      
      // Check diagonal formation: p1(3,4) and p2(4,5)
      // They should differ in both x and y
      const xDiff = Math.abs(playerPositions[1]!.x - playerPositions[0]!.x);
      const yDiff = Math.abs(playerPositions[1]!.y - playerPositions[0]!.y);
      
      expect(xDiff).toBeGreaterThan(0);
      expect(yDiff).toBeGreaterThan(0);
    });

    it('should place enemies in diagonal formation', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [
        createCharacter('e1', 'Enemy 1', false),
        createCharacter('e2', 'Enemy 2', false),
      ];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const enemyPositions = positions.filter(p => p.characterId.startsWith('e'));
      
      // Check diagonal formation: e1(5,4) and e2(6,5)
      // They should differ in both x and y
      const xDiff = Math.abs(enemyPositions[1]!.x - enemyPositions[0]!.x);
      const yDiff = Math.abs(enemyPositions[1]!.y - enemyPositions[0]!.y);
      
      expect(xDiff).toBeGreaterThan(0);
      expect(yDiff).toBeGreaterThan(0);
    });
  });
});
