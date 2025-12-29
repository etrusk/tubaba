import type { Character } from '../types/character.js';
import type { CharacterPosition } from '../types/visualization.js';
import type { GridPosition } from '../targeting/grid-position.js';
import { gridToPixel, getPlayerStartPositions, getEnemyStartPositions, CELL_SIZE } from './grid-layout.js';

const RADIUS = CELL_SIZE * 0.4; // 20px for 50px cells

/**
 * Calculate character positions in a battle arena layout using grid-based positioning
 *
 * Characters with explicit position properties use grid-to-pixel conversion.
 * Characters without positions are assigned default starting positions.
 *
 * @param players - Array of player characters
 * @param enemies - Array of enemy characters
 * @param arenaDimensions - Arena width and height (unused, kept for backward compatibility)
 * @returns Array of character positions
 */
export function calculateCharacterPositions(
  players: Character[],
  enemies: Character[],
  arenaDimensions: { width: number; height: number }
): CharacterPosition[] {
  const positions: CharacterPosition[] = [];
  
  // Get default starting positions
  const defaultPlayerPositions = getPlayerStartPositions(players.length);
  const defaultEnemyPositions = getEnemyStartPositions(enemies.length);
  
  // Calculate player positions
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (!player) continue;
    
    // Use character's position if available, otherwise use default
    const gridPos: GridPosition = player.position ?? defaultPlayerPositions[i]!;
    const pixelPos = gridToPixel(gridPos);
    
    positions.push({
      characterId: player.id,
      x: pixelPos.x,
      y: pixelPos.y,
      radius: RADIUS,
    });
  }
  
  // Calculate enemy positions
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy) continue;
    
    // Use character's position if available, otherwise use default
    const gridPos: GridPosition = enemy.position ?? defaultEnemyPositions[i]!;
    const pixelPos = gridToPixel(gridPos);
    
    positions.push({
      characterId: enemy.id,
      x: pixelPos.x,
      y: pixelPos.y,
      radius: RADIUS,
    });
  }
  
  return positions;
}

