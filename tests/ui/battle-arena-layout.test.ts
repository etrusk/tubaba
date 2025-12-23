import { describe, it, expect } from 'vitest';
import { calculateCharacterPositions } from '../../src/ui/battle-arena-layout.js';
import type { Character } from '../../src/types/character.js';
import type { CharacterPosition } from '../../src/types/visualization.js';

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
  const RADIUS = 40;
  const PADDING = 60;

  describe('Character Positioning', () => {
    it('should position both characters centered horizontally in 1v1 battle', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(2);
      
      // Both should be centered at x = 400 (half of 800)
      const playerPos = positions.find(p => p.characterId === 'p1');
      const enemyPos = positions.find(p => p.characterId === 'e1');
      
      expect(playerPos?.x).toBe(400);
      expect(enemyPos?.x).toBe(400);
      
      // Player at bottom, enemy at top
      expect(playerPos?.y).toBe(400); // height - padding - radius
      expect(enemyPos?.y).toBe(100); // padding + radius
    });

    it('should evenly space characters in 2v2 battle', () => {
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
      
      // Players should be evenly spaced
      const playerPositions = positions.filter(p => p.characterId.startsWith('p'));
      expect(playerPositions[0].x).toBe(140); // padding + 0 * spacing
      expect(playerPositions[1].x).toBe(660); // padding + 1 * spacing
      
      // Enemies should be evenly spaced
      const enemyPositions = positions.filter(p => p.characterId.startsWith('e'));
      expect(enemyPositions[0].x).toBe(140);
      expect(enemyPositions[1].x).toBe(660);
    });

    it('should utilize full width in 3v3 battle', () => {
      const players = [
        createCharacter('p1', 'Player 1', true),
        createCharacter('p2', 'Player 2', true),
        createCharacter('p3', 'Player 3', true),
      ];
      const enemies = [
        createCharacter('e1', 'Enemy 1', false),
        createCharacter('e2', 'Enemy 2', false),
        createCharacter('e3', 'Enemy 3', false),
      ];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(6);
      
      // Players should span from padding to width-padding
      const playerPositions = positions.filter(p => p.characterId.startsWith('p')).sort((a, b) => a.x - b.x);
      expect(playerPositions[0].x).toBe(100); // padding
      expect(playerPositions[1].x).toBe(400); // center
      expect(playerPositions[2].x).toBe(700); // width - padding
      
      // Enemies should have same spacing
      const enemyPositions = positions.filter(p => p.characterId.startsWith('e')).sort((a, b) => a.x - b.x);
      expect(enemyPositions[0].x).toBe(100);
      expect(enemyPositions[1].x).toBe(400);
      expect(enemyPositions[2].x).toBe(700);
    });

    it('should center player with enemies spread in 1v3 battle', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [
        createCharacter('e1', 'Enemy 1', false),
        createCharacter('e2', 'Enemy 2', false),
        createCharacter('e3', 'Enemy 3', false),
      ];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(4);
      
      // Single player centered
      const playerPos = positions.find(p => p.characterId === 'p1');
      expect(playerPos?.x).toBe(400);
      
      // Enemies spread across width
      const enemyPositions = positions.filter(p => p.characterId.startsWith('e')).sort((a, b) => a.x - b.x);
      expect(enemyPositions[0].x).toBe(100);
      expect(enemyPositions[1].x).toBe(400);
      expect(enemyPositions[2].x).toBe(700);
    });

    it('should center enemy with players spread in 3v1 battle', () => {
      const players = [
        createCharacter('p1', 'Player 1', true),
        createCharacter('p2', 'Player 2', true),
        createCharacter('p3', 'Player 3', true),
      ];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(4);
      
      // Players spread across width
      const playerPositions = positions.filter(p => p.characterId.startsWith('p')).sort((a, b) => a.x - b.x);
      expect(playerPositions[0].x).toBe(100);
      expect(playerPositions[1].x).toBe(400);
      expect(playerPositions[2].x).toBe(700);
      
      // Single enemy centered
      const enemyPos = positions.find(p => p.characterId === 'e1');
      expect(enemyPos?.x).toBe(400);
    });
  });

  describe('Row Positioning', () => {
    it('should position enemies in top row (y = padding + radius)', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [
        createCharacter('e1', 'Enemy 1', false),
        createCharacter('e2', 'Enemy 2', false),
      ];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const enemyPositions = positions.filter(p => p.characterId.startsWith('e'));
      
      // All enemies should have same Y position at top
      expect(enemyPositions[0].y).toBe(100); // padding + radius = 60 + 40
      expect(enemyPositions[1].y).toBe(100);
    });

    it('should position players in bottom row (y = height - padding - radius)', () => {
      const players = [
        createCharacter('p1', 'Player 1', true),
        createCharacter('p2', 'Player 2', true),
      ];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const playerPositions = positions.filter(p => p.characterId.startsWith('p'));
      
      // All players should have same Y position at bottom
      expect(playerPositions[0].y).toBe(400); // 500 - 60 - 40
      expect(playerPositions[1].y).toBe(400);
    });
  });

  describe('Spacing and Overlap Prevention', () => {
    it('should ensure no circle overlap (min 80px apart center-to-center)', () => {
      const players = [
        createCharacter('p1', 'Player 1', true),
        createCharacter('p2', 'Player 2', true),
        createCharacter('p3', 'Player 3', true),
      ];
      const enemies = [
        createCharacter('e1', 'Enemy 1', false),
        createCharacter('e2', 'Enemy 2', false),
        createCharacter('e3', 'Enemy 3', false),
      ];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      const playerPositions = positions.filter(p => p.characterId.startsWith('p')).sort((a, b) => a.x - b.x);
      
      // Check spacing between adjacent characters (radius=40, so min distance = 80)
      const spacing1 = playerPositions[1].x - playerPositions[0].x;
      const spacing2 = playerPositions[2].x - playerPositions[1].x;
      
      expect(spacing1).toBeGreaterThanOrEqual(80);
      expect(spacing2).toBeGreaterThanOrEqual(80);
    });

    it('should include radius in position data', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      positions.forEach(pos => {
        expect(pos.radius).toBe(40);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero enemies without crashing', () => {
      const players = [createCharacter('p1', 'Player 1', true)];
      const enemies: Character[] = [];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(1);
      expect(positions[0].characterId).toBe('p1');
      expect(positions[0].x).toBe(400); // Centered
      expect(positions[0].y).toBe(400); // Bottom row
    });

    it('should handle zero players without crashing', () => {
      const players: Character[] = [];
      const enemies = [createCharacter('e1', 'Enemy 1', false)];

      const positions = calculateCharacterPositions(players, enemies, DEFAULT_ARENA);

      expect(positions).toHaveLength(1);
      expect(positions[0].characterId).toBe('e1');
      expect(positions[0].x).toBe(400); // Centered
      expect(positions[0].y).toBe(100); // Top row
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
});
