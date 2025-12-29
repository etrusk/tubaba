import type { Character } from '../types/character.js';
import type { TargetingMode } from '../types/skill.js';

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
      return living.length > 0 ? [living[0]!] : [];
    }

    default:
      return [];
  }
}
