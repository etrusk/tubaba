import type { GridPosition } from '../targeting/grid-position.js';

// Grid configuration
export const GRID_SIZE = 10;  // 10x10 grid
export const CELL_SIZE = 50;  // Pixels per cell
export const GRID_PADDING = 25; // Padding around grid

/**
 * Convert grid position to pixel coordinates (center of cell)
 */
export function gridToPixel(pos: GridPosition): { x: number; y: number } {
  return {
    x: GRID_PADDING + pos.x * CELL_SIZE + CELL_SIZE / 2,
    y: GRID_PADDING + pos.y * CELL_SIZE + CELL_SIZE / 2,
  };
}

/**
 * Get default starting positions for players (middle row, left side)
 * For 2 players: (3,4) and (4,5) - diagonal formation
 */
export function getPlayerStartPositions(count: number): GridPosition[] {
  // Middle row is 4-5 (0-indexed)
  // Players on left diagonal: (3,4), (4,5), (3,5), (4,4)...
  const positions: GridPosition[] = [
    { x: 3, y: 4 },
    { x: 4, y: 5 },
    { x: 2, y: 4 },
    { x: 3, y: 5 },
  ];
  return positions.slice(0, count);
}

/**
 * Get default starting positions for enemies (middle row, right side)
 * For 2 enemies: (5,4) and (6,5) - diagonal formation, adjacent to players
 */
export function getEnemyStartPositions(count: number): GridPosition[] {
  // Enemies on right diagonal: (5,4), (6,5), (6,4), (5,5)...
  const positions: GridPosition[] = [
    { x: 5, y: 4 },
    { x: 6, y: 5 },
    { x: 6, y: 4 },
    { x: 5, y: 5 },
  ];
  return positions.slice(0, count);
}

/**
 * Render the grid lines SVG
 */
export function renderGridLines(): string {
  const gridSize = GRID_SIZE * CELL_SIZE;
  const lines: string[] = [];
  
  // Vertical lines
  for (let i = 0; i <= GRID_SIZE; i++) {
    const x = GRID_PADDING + i * CELL_SIZE;
    lines.push(`<line x1="${x}" y1="${GRID_PADDING}" x2="${x}" y2="${GRID_PADDING + gridSize}" stroke="#333" stroke-width="1" />`);
  }
  
  // Horizontal lines
  for (let i = 0; i <= GRID_SIZE; i++) {
    const y = GRID_PADDING + i * CELL_SIZE;
    lines.push(`<line x1="${GRID_PADDING}" y1="${y}" x2="${GRID_PADDING + gridSize}" y2="${y}" stroke="#333" stroke-width="1" />`);
  }
  
  return `<g class="grid-lines">\n  ${lines.join('\n  ')}\n</g>`;
}
