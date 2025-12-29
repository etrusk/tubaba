import type { Character } from '../types/character.js';
import type { TargetingMode } from '../types/skill.js';
import { euclideanDistance } from './grid-position.js';

/**
 * Selects targets based on targeting mode
 * @param mode - The targeting mode to use
 * @param caster - The character casting the skill
 * @param _players - Array of player characters (unused in current simplified targeting)
 * @param enemies - Array of enemy characters
 * @returns Array of selected target characters
 */
export function selectTargets(
  mode: TargetingMode,
  caster: Character,
  _players: Character[],
  enemies: Character[]
): Character[] {
  switch (mode) {
    case 'self':
      return [caster];

    case 'nearest-enemy': {
      const living = enemies.filter((e) => e.currentHp > 0);
      if (living.length === 0) return [];
      
      // If positions available, find nearest by distance
      if (caster.position) {
        const withPositions = living.filter(e => e.position);
        if (withPositions.length > 0) {
          let nearest = withPositions[0]!;
          let minDist = euclideanDistance(caster.position, nearest.position!);
          for (const enemy of withPositions) {
            const dist = euclideanDistance(caster.position, enemy.position!);
            if (dist < minDist) {
              minDist = dist;
              nearest = enemy;
            }
          }
          return [nearest];
        }
      }
      
      // Fallback: first living enemy (for backward compatibility)
      return [living[0]!];
    }

    default:
      return [];
  }
}
