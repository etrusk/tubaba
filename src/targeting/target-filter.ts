import type { Character } from '../types/character.js';

/**
 * TargetFilter - Applies filters to target selections
 *
 * Filters include:
 * 1. Dead exclusion - Remove characters with HP <= 0
 */
export interface TargetFilter {
  applyFilters(
    targets: Character[],
    allPlayers: Character[],
    _allEnemies: Character[],
    casterIsEnemy: boolean
  ): Character[];
}

const TargetFilter: TargetFilter = {
  applyFilters(
    targets: Character[],
    _allPlayers: Character[],
    _allEnemies: Character[],
    _casterIsEnemy: boolean
  ): Character[] {
    // Filter out dead targets (HP <= 0)
    return targets.filter(target => target.currentHp > 0);
  }
};

export default TargetFilter;
