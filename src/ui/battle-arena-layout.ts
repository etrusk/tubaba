import type { Character } from '../types/character.js';
import type { CharacterPosition } from '../types/visualization.js';

const RADIUS = 40;
const PADDING = 60;

/**
 * Calculate character positions in a battle arena layout
 * Based on spec lines 305-330
 * 
 * Enemies positioned in top row, players in bottom row.
 * Characters evenly spaced horizontally based on team size.
 * 
 * @param players - Array of player characters
 * @param enemies - Array of enemy characters
 * @param arenaDimensions - Arena width and height
 * @returns Array of character positions
 */
export function calculateCharacterPositions(
  players: Character[],
  enemies: Character[],
  arenaDimensions: { width: number; height: number }
): CharacterPosition[] {
  const { width, height } = arenaDimensions;
  const positions: CharacterPosition[] = [];
  
  // Calculate enemy positions (top row)
  // Y position: padding + radius (100px from top)
  const enemyY = PADDING + RADIUS;
  const enemyXPositions = calculateXPositions(enemies.length, width);
  
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    const x = enemyXPositions[i];
    if (enemy && x !== undefined) {
      positions.push({
        characterId: enemy.id,
        x,
        y: enemyY,
        radius: RADIUS,
      });
    }
  }
  
  // Calculate player positions (bottom row)
  // Y position: height - padding - radius (400px from top for 500px height)
  const playerY = height - PADDING - RADIUS;
  const playerXPositions = calculateXPositions(players.length, width);
  
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const x = playerXPositions[i];
    if (player && x !== undefined) {
      positions.push({
        characterId: player.id,
        x,
        y: playerY,
        radius: RADIUS,
      });
    }
  }
  
  return positions;
}

/**
 * Calculate X positions for N characters across arena width
 * 
 * - N = 0: empty array
 * - N = 1: centered
 * - N = 2: centered pair with extra margin
 * - N >= 3: evenly spaced from edge to edge
 * 
 * @param count - Number of characters
 * @param width - Arena width
 * @returns Array of X coordinates
 */
function calculateXPositions(count: number, width: number): number[] {
  if (count === 0) {
    return [];
  }
  
  if (count === 1) {
    // Single character: centered
    return [width / 2];
  }
  
  // For multiple characters, use effective padding
  // This ensures circles don't touch arena edges
  const effectivePadding = count === 2 
    ? PADDING + RADIUS + RADIUS // Extra margin for 2 characters (140px)
    : PADDING + RADIUS;          // Standard margin for 3+ characters (100px)
  
  const availableWidth = width - 2 * effectivePadding;
  const positions: number[] = [];
  
  for (let i = 0; i < count; i++) {
    // Formula: padding + availableWidth * (i / (N-1))
    const x = effectivePadding + availableWidth * (i / (count - 1));
    positions.push(x);
  }
  
  return positions;
}
