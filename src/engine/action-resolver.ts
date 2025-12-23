import type { Action, Character, CombatEvent } from '../types/index.js';
import { SkillLibrary } from './skill-library.js';
import { StatusEffectProcessor } from './status-effect-processor.js';

/**
 * ActionResolver - Executes the 6-substep action resolution process
 * 
 * Substeps:
 * 1. Damage Calculation: Calculate damage with modifiers (Defending, Enraged)
 * 2. Healing Calculation: Calculate healing capped at max HP
 * 3. Shield Absorption: Process shield blocks with overflow
 * 4. Health Updates: Apply damage and healing simultaneously
 * 5. Status Application: Apply status effects from resolved skills
 * 6. Action Cancellation: Process interrupts and stuns
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
  baseDamage: number;
  finalDamage: number; // After all modifiers and shields
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
  
  // Track damage instances for shield processing
  const damageInstances: DamageInstance[] = [];
  const healingMap = new Map<string, number>();
  const statusesToApply: Array<{ targetId: string; status: any; actorId: string }> = [];
  const cancellationTargets = new Set<string>();
  
  // Track initial HP for knockout detection
  const initialHpMap = new Map<string, number>();
  [...workingPlayers, ...workingEnemies].forEach(c => initialHpMap.set(c.id, c.currentHp));
  
  // SUBSTEP 1: Damage Calculation
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    const caster = findChar(action.casterId);
    if (!caster) continue;
    
    const damageEffect = skill.effects.find(e => e.type === 'damage');
    if (damageEffect && damageEffect.value !== undefined) {
      const baseDamage = damageEffect.value;
      
      // Check for Enraged status on caster
      const enragedStatus = caster.statusEffects.find(s => s.type === 'enraged');
      const enragedBonus = enragedStatus?.value ?? 0;
      
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        if (!target) continue;
        
        // Calculate damage: base + enraged bonus
        let damage = baseDamage + enragedBonus;
        
        // Apply Defending reduction (50%, floored)
        const isDefending = target.statusEffects.some(s => s.type === 'defending');
        if (isDefending) {
          damage = Math.floor(damage * 0.5);
        }
        
        damageInstances.push({
          action,
          targetId,
          baseDamage: damage,
          finalDamage: damage, // Will be modified by shields
        });
      }
    }
  }
  
  // SUBSTEP 2: Healing Calculation
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    
    const healEffect = skill.effects.find(e => e.type === 'heal');
    if (healEffect && healEffect.value !== undefined) {
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        if (!target) continue;
        
        // Don't heal knocked out targets
        if (target.currentHp === 0) continue;
        
        const currentHealing = healingMap.get(targetId) ?? 0;
        healingMap.set(targetId, currentHealing + healEffect.value);
      }
    }
    
    const reviveEffect = skill.effects.find(e => e.type === 'revive');
    if (reviveEffect && reviveEffect.value !== undefined) {
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        if (!target) continue;
        
        // Only revive knocked out targets
        if (target.currentHp === 0) {
          healingMap.set(targetId, reviveEffect.value);
        } else {
          // Target is alive - log target-lost event
          events.push({
            tick: tickNumber,
            type: 'target-lost',
            actorId: action.casterId,
            targetId,
            message: `Revive failed: ${target.name} is not knocked out`,
          });
        }
      }
    }
  }
  
  // SUBSTEP 3: Shield Absorption
  // Sort damage instances by attacker: players left-to-right, then enemies alphabetically
  damageInstances.sort((a, b) => {
    const charA = findChar(a.action.casterId);
    const charB = findChar(b.action.casterId);
    if (!charA || !charB) return 0;
    
    // Players before enemies
    if (charA.isPlayer && !charB.isPlayer) return -1;
    if (!charA.isPlayer && charB.isPlayer) return 1;
    
    // Within same group, sort by caster ID
    return a.action.casterId.localeCompare(b.action.casterId);
  });
  
  for (const instance of damageInstances) {
    const target = findChar(instance.targetId);
    if (!target) continue;
    
    const shieldStatus = target.statusEffects.find(s => s.type === 'shielded');
    if (shieldStatus && shieldStatus.value !== undefined && shieldStatus.value > 0) {
      const shieldValue = shieldStatus.value;
      
      if (shieldValue >= instance.finalDamage) {
        // Shield absorbs all damage
        shieldStatus.value = shieldValue - instance.finalDamage;
        instance.finalDamage = 0;
      } else {
        // Shield breaks, overflow to HP
        instance.finalDamage = instance.finalDamage - shieldValue;
        shieldStatus.value = 0;
      }
    }
  }
  
  // SUBSTEP 4: Health Updates (Simultaneous)
  const damageMap = new Map<string, number>();
  for (const instance of damageInstances) {
    const current = damageMap.get(instance.targetId) ?? 0;
    damageMap.set(instance.targetId, current + instance.finalDamage);
  }
  
  for (const char of [...workingPlayers, ...workingEnemies]) {
    const damage = damageMap.get(char.id) ?? 0;
    const healing = healingMap.get(char.id) ?? 0;
    
    let newHp = char.currentHp - damage + healing;
    
    // Cap at maxHp
    newHp = Math.min(newHp, char.maxHp);
    
    // Floor at 0
    newHp = Math.max(newHp, 0);
    
    char.currentHp = newHp;
  }
  
  // SUBSTEP 5: Status Application
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    
    for (const effect of skill.effects) {
      if (effect.type === 'status' && effect.statusType && effect.duration !== undefined) {
        for (const targetId of action.targets) {
          statusesToApply.push({
            targetId,
            status: {
              type: effect.statusType,
              duration: effect.duration,
              value: effect.statusType === 'poisoned' ? 5 : undefined, // Poison deals 5 damage per tick
            },
            actorId: action.casterId,
          });
        }
      }
      
      if (effect.type === 'shield' && effect.value !== undefined) {
        for (const targetId of action.targets) {
          statusesToApply.push({
            targetId,
            status: {
              type: 'shielded',
              duration: 4,
              value: effect.value,
            },
            actorId: action.casterId,
          });
        }
      }
    }
  }
  
  // Apply all statuses
  for (const { targetId, status } of statusesToApply) {
    const char = findChar(targetId);
    if (!char) continue;
    
    const updated = StatusEffectProcessor.applyStatus(char, status);
    // Update character in place (we're working with copies)
    Object.assign(char, updated);
  }
  
  // SUBSTEP 6: Action Cancellation
  for (const action of actions) {
    const skill = SkillLibrary.getSkill(action.skillId);
    
    const hasCancelEffect = skill.effects.some(e => e.type === 'cancel');
    const hasStunEffect = skill.effects.some(e => e.type === 'status' && e.statusType === 'stunned');
    
    if (hasCancelEffect || hasStunEffect) {
      for (const targetId of action.targets) {
        cancellationTargets.add(targetId);
      }
    }
  }
  
  // Cancel actions
  for (const targetId of cancellationTargets) {
    const char = findChar(targetId);
    if (char?.currentAction) {
      cancelledActions.push(char.currentAction);
      char.currentAction = null;
    }
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
          value: instance.baseDamage, // Report pre-shield damage
          message: `${target?.name ?? instance.targetId} takes ${instance.baseDamage} damage`,
        });
      }
    }
    
    // Healing events
    const healEffect = skill.effects.find(e => e.type === 'heal');
    const reviveEffect = skill.effects.find(e => e.type === 'revive');
    
    if (healEffect && healEffect.value !== undefined) {
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        const healing = healEffect.value;
        
        events.push({
          tick: tickNumber,
          type: 'healing',
          actorId: action.casterId,
          targetId,
          value: healing,
          message: `${target?.name ?? targetId} healed for ${healing}`,
        });
      }
    }
    
    if (reviveEffect && reviveEffect.value !== undefined) {
      for (const targetId of action.targets) {
        const target = findChar(targetId);
        const healing = reviveEffect.value;
        
        events.push({
          tick: tickNumber,
          type: 'healing',
          actorId: action.casterId,
          targetId,
          value: healing,
          message: `${target?.name ?? targetId} revived for ${healing}`,
        });
      }
    }
  }
  
  // Status-applied events
  for (const { targetId, status, actorId } of statusesToApply) {
    const target = findChar(targetId);
    events.push({
      tick: tickNumber,
      type: 'status-applied',
      actorId,
      targetId,
      statusType: status.type,
      message: `${status.type} applied to ${target?.name ?? targetId}`,
    });
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
