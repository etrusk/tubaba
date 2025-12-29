import { describe, it, expect } from 'vitest';
import {
  manhattanDistance,
  euclideanDistance,
  findNearest,
} from '../../src/targeting/grid-position.js';
import type { GridPosition } from '../../src/targeting/grid-position.js';

describe('GridPosition', () => {
  describe('type structure', () => {
    it('should have x and y properties', () => {
      const position: GridPosition = { x: 5, y: 10 };

      expect(position.x).toBe(5);
      expect(position.y).toBe(10);
    });

    it('should support positive coordinates', () => {
      const position: GridPosition = { x: 100, y: 200 };

      expect(position.x).toBe(100);
      expect(position.y).toBe(200);
    });

    it('should support negative coordinates', () => {
      const position: GridPosition = { x: -5, y: -10 };

      expect(position.x).toBe(-5);
      expect(position.y).toBe(-10);
    });

    it('should support mixed positive and negative coordinates', () => {
      const position: GridPosition = { x: -3, y: 7 };

      expect(position.x).toBe(-3);
      expect(position.y).toBe(7);
    });

    it('should support (0, 0) origin', () => {
      const position: GridPosition = { x: 0, y: 0 };

      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
    });
  });
});

describe('manhattanDistance', () => {
  describe('same position', () => {
    it('should return 0 when positions are identical', () => {
      const a: GridPosition = { x: 5, y: 5 };
      const b: GridPosition = { x: 5, y: 5 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(0);
    });

    it('should return 0 at origin', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 0, y: 0 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(0);
    });
  });

  describe('adjacent positions', () => {
    it('should return 1 for adjacent horizontal positions', () => {
      const a: GridPosition = { x: 1, y: 0 };
      const b: GridPosition = { x: 2, y: 0 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(1);
    });

    it('should return 1 for adjacent vertical positions', () => {
      const a: GridPosition = { x: 0, y: 1 };
      const b: GridPosition = { x: 0, y: 2 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(1);
    });

    it('should return 2 for diagonal adjacent positions', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 1, y: 1 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(2);
    });
  });

  describe('larger distances', () => {
    it('should return 7 for (0,0) to (3,4)', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 3, y: 4 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(7);
    });

    it('should return correct distance for larger coordinates', () => {
      const a: GridPosition = { x: 10, y: 20 };
      const b: GridPosition = { x: 15, y: 30 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(15); // |10-15| + |20-30| = 5 + 10 = 15
    });
  });

  describe('negative coordinates', () => {
    it('should handle negative source coordinates', () => {
      const a: GridPosition = { x: -3, y: -4 };
      const b: GridPosition = { x: 0, y: 0 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(7); // |-3-0| + |-4-0| = 3 + 4 = 7
    });

    it('should handle negative target coordinates', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: -5, y: -2 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(7); // |0-(-5)| + |0-(-2)| = 5 + 2 = 7
    });

    it('should handle both negative coordinates', () => {
      const a: GridPosition = { x: -2, y: -3 };
      const b: GridPosition = { x: -5, y: -7 };

      const distance = manhattanDistance(a, b);

      expect(distance).toBe(7); // |-2-(-5)| + |-3-(-7)| = 3 + 4 = 7
    });
  });

  describe('symmetry', () => {
    it('should be symmetric - distance(a,b) equals distance(b,a)', () => {
      const a: GridPosition = { x: 2, y: 5 };
      const b: GridPosition = { x: 8, y: 12 };

      const distanceAB = manhattanDistance(a, b);
      const distanceBA = manhattanDistance(b, a);

      expect(distanceAB).toBe(distanceBA);
    });
  });
});

describe('euclideanDistance', () => {
  describe('same position', () => {
    it('should return 0 when positions are identical', () => {
      const a: GridPosition = { x: 5, y: 5 };
      const b: GridPosition = { x: 5, y: 5 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBe(0);
    });

    it('should return 0 at origin', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 0, y: 0 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBe(0);
    });
  });

  describe('adjacent positions', () => {
    it('should return 1 for adjacent horizontal positions', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 1, y: 0 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBe(1);
    });

    it('should return 1 for adjacent vertical positions', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 0, y: 1 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBe(1);
    });
  });

  describe('pythagorean distances', () => {
    it('should return 5 for 3-4-5 triangle (0,0) to (3,4)', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 3, y: 4 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBe(5);
    });

    it('should return 13 for 5-12-13 triangle', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 5, y: 12 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBe(13);
    });
  });

  describe('irrational results', () => {
    it('should return √2 for diagonal (0,0) to (1,1)', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 1, y: 1 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBeCloseTo(Math.sqrt(2), 10);
    });

    it('should return √2 approximately 1.414 for diagonal', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 1, y: 1 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBeCloseTo(1.4142135623730951, 10);
    });

    it('should return √5 for (0,0) to (1,2)', () => {
      const a: GridPosition = { x: 0, y: 0 };
      const b: GridPosition = { x: 1, y: 2 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBeCloseTo(Math.sqrt(5), 10);
    });
  });

  describe('negative coordinates', () => {
    it('should handle negative coordinates correctly', () => {
      const a: GridPosition = { x: -3, y: -4 };
      const b: GridPosition = { x: 0, y: 0 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBe(5); // sqrt(9 + 16) = 5
    });

    it('should handle mixed positive and negative coordinates', () => {
      const a: GridPosition = { x: -3, y: 0 };
      const b: GridPosition = { x: 0, y: 4 };

      const distance = euclideanDistance(a, b);

      expect(distance).toBe(5); // sqrt(9 + 16) = 5
    });
  });

  describe('symmetry', () => {
    it('should be symmetric - distance(a,b) equals distance(b,a)', () => {
      const a: GridPosition = { x: 2, y: 5 };
      const b: GridPosition = { x: 8, y: 12 };

      const distanceAB = euclideanDistance(a, b);
      const distanceBA = euclideanDistance(b, a);

      expect(distanceAB).toBe(distanceBA);
    });
  });
});

describe('findNearest', () => {
  describe('empty candidates', () => {
    it('should return null for empty candidates array', () => {
      const from: GridPosition = { x: 0, y: 0 };
      const candidates: GridPosition[] = [];

      const nearest = findNearest(from, candidates);

      expect(nearest).toBeNull();
    });
  });

  describe('single candidate', () => {
    it('should return the only candidate', () => {
      const from: GridPosition = { x: 0, y: 0 };
      const candidates: GridPosition[] = [{ x: 5, y: 5 }];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: 5, y: 5 });
    });

    it('should return distant candidate when only one exists', () => {
      const from: GridPosition = { x: 0, y: 0 };
      const candidates: GridPosition[] = [{ x: 100, y: 100 }];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: 100, y: 100 });
    });
  });

  describe('multiple candidates - clear winner', () => {
    it('should return closest candidate', () => {
      const from: GridPosition = { x: 0, y: 0 };
      const candidates: GridPosition[] = [
        { x: 10, y: 10 },
        { x: 2, y: 2 },
        { x: 5, y: 5 },
      ];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: 2, y: 2 });
    });

    it('should find nearest from starting position', () => {
      const from: GridPosition = { x: 5, y: 5 };
      const candidates: GridPosition[] = [
        { x: 0, y: 0 }, // distance = sqrt(50) ≈ 7.07
        { x: 6, y: 6 }, // distance = sqrt(2) ≈ 1.41
        { x: 10, y: 10 }, // distance = sqrt(50) ≈ 7.07
      ];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: 6, y: 6 });
    });

    it('should handle candidates at various distances', () => {
      const from: GridPosition = { x: 0, y: 0 };
      const candidates: GridPosition[] = [
        { x: 3, y: 4 }, // distance = 5
        { x: 1, y: 0 }, // distance = 1
        { x: 0, y: 2 }, // distance = 2
      ];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: 1, y: 0 });
    });
  });

  describe('tie-breaker behavior', () => {
    it('should return first candidate when distances are equal', () => {
      const from: GridPosition = { x: 0, y: 0 };
      const candidates: GridPosition[] = [
        { x: 1, y: 0 }, // distance = 1
        { x: 0, y: 1 }, // distance = 1
        { x: -1, y: 0 }, // distance = 1
      ];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: 1, y: 0 });
    });

    it('should preserve order for equidistant diagonal positions', () => {
      const from: GridPosition = { x: 0, y: 0 };
      const candidates: GridPosition[] = [
        { x: 1, y: 1 }, // distance = sqrt(2)
        { x: -1, y: 1 }, // distance = sqrt(2)
        { x: 1, y: -1 }, // distance = sqrt(2)
      ];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: 1, y: 1 });
    });
  });

  describe('negative coordinates', () => {
    it('should work with from position in negative space', () => {
      const from: GridPosition = { x: -5, y: -5 };
      const candidates: GridPosition[] = [
        { x: 0, y: 0 }, // distance = sqrt(50)
        { x: -4, y: -4 }, // distance = sqrt(2)
        { x: -10, y: -10 }, // distance = sqrt(50)
      ];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: -4, y: -4 });
    });

    it('should work with candidates in negative space', () => {
      const from: GridPosition = { x: 0, y: 0 };
      const candidates: GridPosition[] = [
        { x: -1, y: 0 }, // distance = 1
        { x: -5, y: -5 }, // distance = sqrt(50)
        { x: -2, y: -2 }, // distance = sqrt(8)
      ];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: -1, y: 0 });
    });
  });

  describe('position at origin', () => {
    it('should find nearest to origin correctly', () => {
      const from: GridPosition = { x: 0, y: 0 };
      const candidates: GridPosition[] = [
        { x: 3, y: 4 }, // distance = 5
        { x: 2, y: 2 }, // distance = sqrt(8) ≈ 2.83
        { x: 0, y: 3 }, // distance = 3
      ];

      const nearest = findNearest(from, candidates);

      expect(nearest).toEqual({ x: 2, y: 2 });
    });

    it('should handle candidate at origin when from is elsewhere', () => {
      const from: GridPosition = { x: 5, y: 5 };
      const candidates: GridPosition[] = [
        { x: 0, y: 0 }, // distance = sqrt(50) ≈ 7.07
        { x: 4, y: 5 }, // distance = 1
        { x: 6, y: 5 }, // distance = 1
      ];

      const nearest = findNearest(from, candidates);

      // First candidate at distance 1 wins (tie-breaker: first in array)
      expect(nearest).toEqual({ x: 4, y: 5 });
    });
  });

  describe('deterministic behavior', () => {
    it('should return same result for identical inputs', () => {
      const from: GridPosition = { x: 3, y: 3 };
      const candidates: GridPosition[] = [
        { x: 1, y: 1 },
        { x: 5, y: 5 },
        { x: 2, y: 4 },
      ];

      const result1 = findNearest(from, candidates);
      const result2 = findNearest(from, candidates);

      expect(result1).toEqual(result2);
    });
  });
});
