import { describe, it, expect } from 'vitest';
import {
  GRID_SIZE,
  CELL_SIZE,
  GRID_PADDING,
  gridToPixel,
  getPlayerStartPositions,
  getEnemyStartPositions,
  renderGridLines,
} from '../../src/ui/grid-layout.js';

describe('Grid Layout Constants', () => {
  it('should have correct grid size', () => {
    expect(GRID_SIZE).toBe(10);
  });

  it('should have correct cell size', () => {
    expect(CELL_SIZE).toBe(50);
  });

  it('should have correct grid padding', () => {
    expect(GRID_PADDING).toBe(25);
  });
});

describe('gridToPixel', () => {
  it('should convert grid position (0,0) to pixel coordinates', () => {
    const result = gridToPixel({ x: 0, y: 0 });
    expect(result).toEqual({
      x: GRID_PADDING + CELL_SIZE / 2, // 25 + 25 = 50
      y: GRID_PADDING + CELL_SIZE / 2, // 25 + 25 = 50
    });
  });

  it('should convert grid position (3,4) to pixel coordinates', () => {
    const result = gridToPixel({ x: 3, y: 4 });
    expect(result).toEqual({
      x: GRID_PADDING + 3 * CELL_SIZE + CELL_SIZE / 2, // 25 + 150 + 25 = 200
      y: GRID_PADDING + 4 * CELL_SIZE + CELL_SIZE / 2, // 25 + 200 + 25 = 250
    });
  });

  it('should convert grid position (5,4) to pixel coordinates', () => {
    const result = gridToPixel({ x: 5, y: 4 });
    expect(result).toEqual({
      x: GRID_PADDING + 5 * CELL_SIZE + CELL_SIZE / 2, // 25 + 250 + 25 = 300
      y: GRID_PADDING + 4 * CELL_SIZE + CELL_SIZE / 2, // 25 + 200 + 25 = 250
    });
  });

  it('should place pixel at center of grid cell', () => {
    const result = gridToPixel({ x: 0, y: 0 });
    // Center should be at padding + half cell
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });
});

describe('getPlayerStartPositions', () => {
  it('should return 1 position for 1 player', () => {
    const positions = getPlayerStartPositions(1);
    expect(positions).toHaveLength(1);
    expect(positions[0]).toEqual({ x: 3, y: 4 });
  });

  it('should return 2 positions for 2 players in diagonal formation', () => {
    const positions = getPlayerStartPositions(2);
    expect(positions).toHaveLength(2);
    expect(positions[0]).toEqual({ x: 3, y: 4 });
    expect(positions[1]).toEqual({ x: 4, y: 5 });
  });

  it('should return 3 positions for 3 players', () => {
    const positions = getPlayerStartPositions(3);
    expect(positions).toHaveLength(3);
    expect(positions[0]).toEqual({ x: 3, y: 4 });
    expect(positions[1]).toEqual({ x: 4, y: 5 });
    expect(positions[2]).toEqual({ x: 2, y: 4 });
  });

  it('should return 4 positions for 4 players', () => {
    const positions = getPlayerStartPositions(4);
    expect(positions).toHaveLength(4);
    expect(positions[0]).toEqual({ x: 3, y: 4 });
    expect(positions[1]).toEqual({ x: 4, y: 5 });
    expect(positions[2]).toEqual({ x: 2, y: 4 });
    expect(positions[3]).toEqual({ x: 3, y: 5 });
  });

  it('should return empty array for 0 players', () => {
    const positions = getPlayerStartPositions(0);
    expect(positions).toHaveLength(0);
  });
});

describe('getEnemyStartPositions', () => {
  it('should return 1 position for 1 enemy', () => {
    const positions = getEnemyStartPositions(1);
    expect(positions).toHaveLength(1);
    expect(positions[0]).toEqual({ x: 5, y: 4 });
  });

  it('should return 2 positions for 2 enemies in diagonal formation', () => {
    const positions = getEnemyStartPositions(2);
    expect(positions).toHaveLength(2);
    expect(positions[0]).toEqual({ x: 5, y: 4 });
    expect(positions[1]).toEqual({ x: 6, y: 5 });
  });

  it('should return 3 positions for 3 enemies', () => {
    const positions = getEnemyStartPositions(3);
    expect(positions).toHaveLength(3);
    expect(positions[0]).toEqual({ x: 5, y: 4 });
    expect(positions[1]).toEqual({ x: 6, y: 5 });
    expect(positions[2]).toEqual({ x: 6, y: 4 });
  });

  it('should return 4 positions for 4 enemies', () => {
    const positions = getEnemyStartPositions(4);
    expect(positions).toHaveLength(4);
    expect(positions[0]).toEqual({ x: 5, y: 4 });
    expect(positions[1]).toEqual({ x: 6, y: 5 });
    expect(positions[2]).toEqual({ x: 6, y: 4 });
    expect(positions[3]).toEqual({ x: 5, y: 5 });
  });

  it('should return empty array for 0 enemies', () => {
    const positions = getEnemyStartPositions(0);
    expect(positions).toHaveLength(0);
  });

  it('should position enemies adjacent to players', () => {
    const playerPos = getPlayerStartPositions(2);
    const enemyPos = getEnemyStartPositions(2);
    
    // Player at (4,5) should be adjacent to enemy at (5,4)
    const player2 = playerPos[1]!; // (4,5)
    const enemy1 = enemyPos[0]!;   // (5,4)
    
    // Distance should be 1 horizontally and 1 vertically (diagonal)
    expect(Math.abs(player2.x - enemy1.x)).toBe(1);
    expect(Math.abs(player2.y - enemy1.y)).toBe(1);
  });
});

describe('renderGridLines', () => {
  it('should return valid SVG group element', () => {
    const result = renderGridLines();
    expect(result).toContain('<g class="grid-lines">');
    expect(result).toContain('</g>');
  });

  it('should render vertical lines', () => {
    const result = renderGridLines();
    // Total lines should be (GRID_SIZE + 1) for vertical + (GRID_SIZE + 1) for horizontal
    const lineCount = (result.match(/<line/g) || []).length;
    expect(lineCount).toBe((GRID_SIZE + 1) * 2);
  });

  it('should render horizontal lines', () => {
    const result = renderGridLines();
    // Total lines should be (GRID_SIZE + 1) for vertical + (GRID_SIZE + 1) for horizontal
    const lineCount = (result.match(/<line/g) || []).length;
    expect(lineCount).toBe((GRID_SIZE + 1) * 2);
  });

  it('should use correct stroke color and width', () => {
    const result = renderGridLines();
    expect(result).toContain('stroke="#333"');
    expect(result).toContain('stroke-width="1"');
  });

  it('should position first vertical line at padding', () => {
    const result = renderGridLines();
    expect(result).toContain(`x1="${GRID_PADDING}"`);
  });

  it('should position last vertical line at padding + grid size', () => {
    const result = renderGridLines();
    const lastX = GRID_PADDING + GRID_SIZE * CELL_SIZE;
    expect(result).toContain(`x1="${lastX}"`);
  });

  it('should position first horizontal line at padding', () => {
    const result = renderGridLines();
    expect(result).toContain(`y1="${GRID_PADDING}"`);
  });

  it('should position last horizontal line at padding + grid size', () => {
    const result = renderGridLines();
    const lastY = GRID_PADDING + GRID_SIZE * CELL_SIZE;
    expect(result).toContain(`y1="${lastY}"`);
  });
});
