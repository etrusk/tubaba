import type { Character } from '../types/character.js';
import type { TargetingMode } from '../types/skill.js';

/**
 * Selects targets based on targeting mode
 * @param mode - The targeting mode to use
 * @param caster - The character casting the skill
 * @param players - Array of player characters
 * @param enemies - Array of enemy characters
 * @returns Array of selected target characters
 */
export function selectTargets(
  mode: TargetingMode,
  caster: Character,
  players: Character[],
  enemies: Character[]
): Character[] {
  switch (mode) {
    case 'self':
      return [caster];

    case 'single-enemy-lowest-hp': {
      const living = enemies.filter((e) => e.currentHp > 0);
      if (living.length === 0) return [];
      
      let lowest = living[0]!;
      for (const enemy of living) {
        if (enemy.currentHp < lowest.currentHp) {
          lowest = enemy;
        }
      }
      return [lowest];
    }

    case 'single-enemy-highest-hp': {
      const living = enemies.filter((e) => e.currentHp > 0);
      if (living.length === 0) return [];
      
      let highest = living[0]!;
      for (const enemy of living) {
        if (enemy.currentHp > highest.currentHp) {
          highest = enemy;
        }
      }
      return [highest];
    }

    case 'all-enemies':
      return enemies.filter((e) => e.currentHp > 0);

    case 'ally-lowest-hp': {
      const livingAllies = players.filter(
        (p) => p.currentHp > 0
      );
      if (livingAllies.length === 0) return [];
      
      let lowest = livingAllies[0]!;
      for (const ally of livingAllies) {
        if (ally.currentHp < lowest.currentHp) {
          lowest = ally;
        }
      }
      return [lowest];
    }

    case 'ally-lowest-hp-damaged': {
      const damagedAllies = players.filter(
        (p) => p.currentHp > 0 && p.currentHp < p.maxHp
      );
      if (damagedAllies.length === 0) return [];
      
      let lowest = damagedAllies[0]!;
      for (const ally of damagedAllies) {
        if (ally.currentHp < lowest.currentHp) {
          lowest = ally;
        }
      }
      return [lowest];
    }

    case 'ally-dead': {
      const deadAllies = players.filter((p) => p.currentHp <= 0);
      if (deadAllies.length === 0) return [];
      return [deadAllies[0]!];
    }

    case 'all-allies':
      return players.filter((p) => p.currentHp > 0);

    default:
      return [];
  }
}
