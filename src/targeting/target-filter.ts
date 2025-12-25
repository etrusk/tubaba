import type { Character } from '../types/character.js';

/**
 * TargetFilter - Applies filters to target selections
 * 
 * Filters include:
 * 1. Dead exclusion - Remove characters with HP <= 0
 * 2. Taunt forcing - Enemy attacks redirect to taunting players
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
    allPlayers: Character[],
    _allEnemies: Character[],
    casterIsEnemy: boolean
  ): Character[] {
    // 1. Filter out dead targets (HP <= 0)
    const aliveTargets = targets.filter(target => target.currentHp > 0);
    
    // 2. Apply taunt forcing (only for enemy attacks on players)
    if (casterIsEnemy) {
      // Find leftmost alive player with active taunting status (duration > 0)
      const taunter = allPlayers.find(player => 
        player.currentHp > 0 && 
        player.statusEffects.some(effect => effect.type === 'taunting' && effect.duration > 0)
      );
      
      // If a taunter exists, replace entire target list with just that taunter
      if (taunter) {
        return [taunter];
      }
    }
    
    // 3. Pass-through - return filtered living targets
    return aliveTargets;
  }
};

export default TargetFilter;
