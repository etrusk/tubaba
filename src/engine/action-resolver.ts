import type { Action, Character, CombatEvent } from '../types/index.js';
import { SkillLibrary } from './skill-library.js';

/**
 * ActionResolver - Executes simplified action resolution
 *
 * Process:
 * 1. Damage Calculation: Calculate base damage from skills
 * 2. Health Updates: Apply damage to targets
 * 3. Event Generation: Create combat events for UI
 */

export interface ResolverResult {
  updatedPlayers: Character[];
  updatedEnemies: Character[];
  events: CombatEvent[];
  cancelledActions: Action[];
}

interface DamageInstance {
  action: Action;
  targetId: string;
  damage: number;
}

/**
 * Resolve all actions completing this tick
 * 
 * @param actions - Actions with ticksRemaining === 0
 * @param players - Current player party
 * @param enemies - Current enemy units
 * @param tickNumber - Current tick for event logging
 * @returns Updated characters, events, and cancelled actions
 */
function resolveActions(
  actions: Action[],
  players: Character[],
  enemies: Character[],
  tickNumber: number
): ResolverResult {
  // Create immutable copies
  const workingPlayers = players.map(p => ({ 
    ...p, 
    statusEffects: [...p.statusEffects.map(s => ({ ...s }))]
  }));
  const workingEnemies = enemies.map(e => ({ 
    ...e, 
    statusEffects: [...e.statusEffects.map(s => ({ ...s }))]
  }));
  
  const events: CombatEvent[] = [];
  const cancelledActions: Action[] = [];
  
  // Helper to find character by ID
  const findChar = (id: string): Character | undefined => {
    return workingPlayers.find(c => c.id === id) || workingEnemies.find(c => c.id === id);
  };
  
  // Track damage instances
  const damageInstances: DamageInstance[] = [];
  
  // Track initial HP for knockout detection
  const initialHpMap = new Map<string, number>();
  [...workingPlayers, ...workingEnemies].forEach(c => initialHpMap.set(c.id, c.currentHp));
  
  // Damage Calculation
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    const caster = findChar(action.casterId);
    if (!caster) continue;
    
    const damageEffect = skill.effects.find(e => e.type === 'damage');
    if (damageEffect && damageEffect.value !== undefined) {
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        if (!target) continue;
        
        damageInstances.push({
          action,
          targetId,
          damage: damageEffect.value,
        });
      }
    }
  }
  
  // Health Updates
  const damageMap = new Map<string, number>();
  for (const instance of damageInstances) {
    const current = damageMap.get(instance.targetId) ?? 0;
    damageMap.set(instance.targetId, current + instance.damage);
  }
  
  for (const char of [...workingPlayers, ...workingEnemies]) {
    const damage = damageMap.get(char.id) ?? 0;
    
    let newHp = char.currentHp - damage;
    
    // Floor at 0
    newHp = Math.max(newHp, 0);
    
    char.currentHp = newHp;
  }
  
  // Generate Events
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    const caster = findChar(action.casterId);
    
    // Action-resolved event
    events.push({
      tick: tickNumber,
      type: 'action-resolved',
      actorId: action.casterId,
      skillName: skill.name,
      message: `${caster?.name ?? action.casterId} used ${skill.name}`,
    });
    
    // Damage events
    for (const instance of damageInstances) {
      if (instance.action === action) {
        const target = findChar(instance.targetId);
        events.push({
          tick: tickNumber,
          type: 'damage',
          actorId: action.casterId,
          targetId: instance.targetId,
          value: instance.damage,
          message: `${target?.name ?? instance.targetId} takes ${instance.damage} damage`,
        });
      }
    }
  }
  
  // Knockout events (only for newly knocked out characters)
  for (const char of [...workingPlayers, ...workingEnemies]) {
    const wasAlive = (initialHpMap.get(char.id) ?? 0) > 0;
    const isKnockedOut = char.currentHp === 0;
    
    if (wasAlive && isKnockedOut) {
      // Clear all status effects on knockout (AC23)
      char.statusEffects = [];
      
      events.push({
        tick: tickNumber,
        type: 'knockout',
        targetId: char.id,
        message: `${char.name} was knocked out`,
      });
    }
  }
  
  return {
    updatedPlayers: workingPlayers,
    updatedEnemies: workingEnemies,
    events,
    cancelledActions,
  };
}

export const ActionResolver = {
  resolveActions,
};
