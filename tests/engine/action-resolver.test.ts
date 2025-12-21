import { describe, it, expect } from 'vitest';
import type { Action, Character, CombatEvent, StatusEffect } from '../../src/types/index.js';

/**
 * ActionResolver Test Suite (TDD - Tests First)
 *
 * Tests the 6-substep action resolution process before implementation:
 * 1. Damage Calculation: Calculate damage with Defending reduction (50%)
 * 2. Healing Calculation: Calculate healing capped at max HP
 * 3. Shield Absorption: Process shield blocks with overflow tracking
 * 4. Health Updates: Apply damage and healing simultaneously
 * 5. Status Application: Apply status effects from resolved skills
 * 6. Action Cancellation: Process interrupts and stuns
 *
 * Implementation: src/engine/action-resolver.ts (Task 7)
 */

// Mock ActionResolver interface (will be implemented in Task 7)
interface ResolverResult {
  updatedPlayers: Character[];
  updatedEnemies: Character[];
  events: CombatEvent[];
  cancelledActions: Action[];
}

interface ActionResolverType {
  resolveActions(
    actions: Action[],
    players: Character[],
    enemies: Character[],
    tickNumber: number
  ): ResolverResult;
}

// Import actual implementation (will fail until implemented)
import { ActionResolver } from '../../src/engine/action-resolver.js';

// Use real implementation
const resolver: ActionResolverType = ActionResolver;

// Test helpers
function createTestCharacter(
  id: string,
  currentHp: number = 100,
  maxHp: number = 100,
  statusEffects: StatusEffect[] = [],
  isPlayer: boolean = true
): Character {
  return {
    id,
    name: `Character ${id}`,
    maxHp,
    currentHp,
    skills: [],
    statusEffects,
    currentAction: null,
    isPlayer,
  };
}

function createAction(
  skillId: string,
  casterId: string,
  targets: string[],
  ticksRemaining: number = 0
): Action {
  return {
    skillId,
    casterId,
    targets,
    ticksRemaining,
  };
}

function createStatus(
  type: 'poisoned' | 'stunned' | 'shielded' | 'taunting' | 'defending' | 'enraged',
  duration: number,
  value?: number
): StatusEffect {
  return { type, duration, value };
}

describe('ActionResolver - Substep 1: Damage Calculation (AC9)', () => {
  it('should calculate basic damage without modifiers', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    // Strike deals 15 damage
    expect(result.updatedEnemies[0]!.currentHp).toBe(85); // 100 - 15
  });

  it('should apply Defending damage reduction (50%, floored)', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const defender = createTestCharacter('enemy-1', 100, 100, [
      createStatus('defending', 2),
    ], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [defender],
      1
    );

    // Strike deals 15 damage, reduced by 50% = 7.5, floored to 7
    expect(result.updatedEnemies[0]!.currentHp).toBe(93); // 100 - 7
  });

  it('should calculate damage from multiple attackers', () => {
    const attacker1 = createTestCharacter('player-1', 100, 100, [], true);
    const attacker2 = createTestCharacter('player-2', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const actions = [
      createAction('strike', 'player-1', ['enemy-1'], 0),
      createAction('strike', 'player-2', ['enemy-1'], 0),
    ];

    const result = resolver.resolveActions(
      actions,
      [attacker1, attacker2],
      [target],
      1
    );

    // Two strikes: 15 + 15 = 30 total damage
    expect(result.updatedEnemies[0]!.currentHp).toBe(70); // 100 - 30
  });

  it('should calculate damage for multi-target skills', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 100, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 100, 100, [], false);
    
    const action = createAction('fireball', 'player-1', ['enemy-1', 'enemy-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [enemy1, enemy2],
      1
    );

    // Fireball deals 20 damage to each target
    expect(result.updatedEnemies[0]!.currentHp).toBe(80); // 100 - 20
    expect(result.updatedEnemies[1]!.currentHp).toBe(80); // 100 - 20
  });

  it('should add Enraged bonus damage (+15 per target)', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [
      createStatus('enraged', -1, 15),
    ], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    // Strike (15) + Enraged bonus (15) = 30 damage
    expect(result.updatedEnemies[0]!.currentHp).toBe(70); // 100 - 30
  });

  it('should add Enraged bonus to each target in multi-target attack', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [
      createStatus('enraged', -1, 15),
    ], true);
    const enemy1 = createTestCharacter('enemy-1', 100, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 100, 100, [], false);
    
    const action = createAction('fireball', 'player-1', ['enemy-1', 'enemy-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [enemy1, enemy2],
      1
    );

    // Fireball (20) + Enraged (15) = 35 damage to each target
    expect(result.updatedEnemies[0]!.currentHp).toBe(65); // 100 - 35
    expect(result.updatedEnemies[1]!.currentHp).toBe(65); // 100 - 35
  });

  it('should apply Defending reduction before Enraged bonus', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [
      createStatus('enraged', -1, 15),
    ], true);
    const defender = createTestCharacter('enemy-1', 100, 100, [
      createStatus('defending', 2),
    ], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [defender],
      1
    );

    // Strike (15) + Enraged (15) = 30 damage
    // Defending reduces by 50%: 30 * 0.5 = 15
    expect(result.updatedEnemies[0]!.currentHp).toBe(85); // 100 - 15
  });

  it('should not calculate damage for non-damage skills', () => {
    const healer = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('player-2', 60, 100, [], true);
    const action = createAction('heal', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [healer, target],
      [],
      1
    );

    // Heal skill should not damage the target
    expect(result.updatedPlayers[1]!.currentHp).toBe(90); // 60 + 30 (healing)
  });
});

describe('ActionResolver - Substep 2: Healing Calculation (AC10)', () => {
  it('should calculate basic healing', () => {
    const healer = createTestCharacter('player-1', 100, 100, [], true);
    const wounded = createTestCharacter('player-2', 60, 100, [], true);
    const action = createAction('heal', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [healer, wounded],
      [],
      1
    );

    // Heal restores 30 HP
    expect(result.updatedPlayers[1]!.currentHp).toBe(90); // 60 + 30
  });

  it('should cap healing at maximum HP', () => {
    const healer = createTestCharacter('player-1', 100, 100, [], true);
    const wounded = createTestCharacter('player-2', 85, 100, [], true);
    const action = createAction('heal', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [healer, wounded],
      [],
      1
    );

    // Heal would restore 30 HP, but capped at max (100)
    expect(result.updatedPlayers[1]!.currentHp).toBe(100); // 85 + 15 (capped)
  });

  it('should do nothing when healing full HP target', () => {
    const healer = createTestCharacter('player-1', 100, 100, [], true);
    const healthy = createTestCharacter('player-2', 100, 100, [], true);
    const action = createAction('heal', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [healer, healthy],
      [],
      1
    );

    // Healing full HP target has no effect
    expect(result.updatedPlayers[1]!.currentHp).toBe(100);
  });

  it('should fail on dead target (0 HP) unless Revive', () => {
    const healer = createTestCharacter('player-1', 100, 100, [], true);
    const dead = createTestCharacter('player-2', 0, 100, [], true);
    const action = createAction('heal', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [healer, dead],
      [],
      1
    );

    // Normal healing does not affect knocked out targets
    expect(result.updatedPlayers[1]!.currentHp).toBe(0);
  });

  it('should restore knocked out ally with Revive skill', () => {
    const healer = createTestCharacter('player-1', 100, 100, [], true);
    const dead = createTestCharacter('player-2', 0, 100, [], true);
    const action = createAction('revive', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [healer, dead],
      [],
      1
    );

    // Revive restores 40 HP to knocked out ally
    expect(result.updatedPlayers[1]!.currentHp).toBe(40);
  });

  it('should calculate healing from multiple healers', () => {
    const healer1 = createTestCharacter('player-1', 100, 100, [], true);
    const healer2 = createTestCharacter('player-2', 100, 100, [], true);
    const wounded = createTestCharacter('player-3', 40, 100, [], true);
    
    const actions = [
      createAction('heal', 'player-1', ['player-3'], 0),
      createAction('heal', 'player-2', ['player-3'], 0),
    ];

    const result = resolver.resolveActions(
      actions,
      [healer1, healer2, wounded],
      [],
      1
    );

    // Two heals: 30 + 30 = 60 healing
    expect(result.updatedPlayers[2]!.currentHp).toBe(100); // 40 + 60
  });
});

describe('ActionResolver - Substep 3: Shield Absorption (AC11)', () => {
  it('should absorb damage with shield (partial)', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const shielded = createTestCharacter('enemy-1', 100, 100, [
      createStatus('shielded', 3, 20), // 20 shield
    ], false);
    const action = createAction('heavy-strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [shielded],
      1
    );

    // Heavy Strike deals 35 damage
    // Shield absorbs 20, overflow 15 to HP
    expect(result.updatedEnemies[0]!.currentHp).toBe(85); // 100 - 15
    
    // Shield should be broken (0 or removed)
    const shield = result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'shielded');
    if (shield) {
      expect(shield.value).toBe(0);
    }
  });

  it('should absorb damage completely when shield equals damage', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const shielded = createTestCharacter('enemy-1', 100, 100, [
      createStatus('shielded', 3, 15), // 15 shield
    ], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [shielded],
      1
    );

    // Strike deals 15 damage
    // Shield absorbs all 15, no overflow
    expect(result.updatedEnemies[0]!.currentHp).toBe(100); // No HP damage
    
    // Shield should be broken
    const shield = result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'shielded');
    if (shield) {
      expect(shield.value).toBe(0);
    }
  });

  it('should absorb damage completely when shield exceeds damage', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const shielded = createTestCharacter('enemy-1', 100, 100, [
      createStatus('shielded', 3, 30), // 30 shield
    ], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [shielded],
      1
    );

    // Strike deals 15 damage
    // Shield absorbs all 15, shield reduced to 15
    expect(result.updatedEnemies[0]!.currentHp).toBe(100); // No HP damage
    
    const shield = result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'shielded');
    expect(shield).toBeDefined();
    expect(shield!.value).toBe(15); // 30 - 15
  });

  it('should process multiple damage sources against shield in order', () => {
    const attacker1 = createTestCharacter('player-1', 100, 100, [], true);
    const attacker2 = createTestCharacter('player-2', 100, 100, [], true);
    const shielded = createTestCharacter('enemy-1', 100, 100, [
      createStatus('shielded', 3, 20), // 20 shield
    ], false);
    
    const actions = [
      createAction('strike', 'player-1', ['enemy-1'], 0), // 15 damage
      createAction('strike', 'player-2', ['enemy-1'], 0), // 15 damage
    ];

    const result = resolver.resolveActions(
      actions,
      [attacker1, attacker2],
      [shielded],
      1
    );

    // First strike: shield 20 → 5, no HP damage
    // Second strike: shield 5 → 0, overflow 10 to HP
    // Total HP damage: 10
    expect(result.updatedEnemies[0]!.currentHp).toBe(90); // 100 - 10
    
    const shield = result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'shielded');
    if (shield) {
      expect(shield.value).toBe(0);
    }
  });

  it('should apply shield absorption before applying Defending reduction', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const defender = createTestCharacter('enemy-1', 100, 100, [
      createStatus('shielded', 3, 10),
      createStatus('defending', 2),
    ], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [defender],
      1
    );

    // Strike deals 15 damage, reduced to 7 by Defending
    // Shield absorbs 7 damage completely
    expect(result.updatedEnemies[0]!.currentHp).toBe(100); // No HP damage
    
    const shield = result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'shielded');
    expect(shield).toBeDefined();
    expect(shield!.value).toBe(3); // 10 - 7
  });
});

describe('ActionResolver - Substep 4: Health Updates Simultaneous (AC12)', () => {
  it('should apply damage simultaneously (mutual damage)', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const actions = [
      createAction('strike', 'player-1', ['enemy-1'], 0), // Player attacks enemy for 15
      createAction('strike', 'enemy-1', ['player-1'], 0), // Enemy attacks player for 15
    ];

    const result = resolver.resolveActions(
      actions,
      [player],
      [enemy],
      1
    );

    // Both should take damage simultaneously
    expect(result.updatedPlayers[0]!.currentHp).toBe(85); // 100 - 15
    expect(result.updatedEnemies[0]!.currentHp).toBe(85); // 100 - 15
  });

  it('should apply damage from dying unit (death does not prevent damage)', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 10, 100, [], false); // Low HP
    
    const actions = [
      createAction('heavy-strike', 'player-1', ['enemy-1'], 0), // Player kills enemy (35 damage)
      createAction('strike', 'enemy-1', ['player-1'], 0), // Enemy's attack still resolves
    ];

    const result = resolver.resolveActions(
      actions,
      [player],
      [enemy],
      1
    );

    // Enemy dies but damage still applies
    expect(result.updatedEnemies[0]!.currentHp).toBe(0); // Enemy knocked out
    expect(result.updatedPlayers[0]!.currentHp).toBe(85); // Player still takes damage
  });

  it('should apply healing and damage simultaneously', () => {
    const player = createTestCharacter('player-1', 60, 100, [], true);
    const healer = createTestCharacter('player-2', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const actions = [
      createAction('heal', 'player-2', ['player-1'], 0), // Heal player for 30
      createAction('strike', 'enemy-1', ['player-1'], 0), // Enemy attacks player for 15
    ];

    const result = resolver.resolveActions(
      actions,
      [player, healer],
      [enemy],
      1
    );

    // Net: 60 + 30 - 15 = 75
    expect(result.updatedPlayers[0]!.currentHp).toBe(75);
  });

  it('should not exceed max HP even with simultaneous healing', () => {
    const player = createTestCharacter('player-1', 85, 100, [], true);
    const healer1 = createTestCharacter('player-2', 100, 100, [], true);
    const healer2 = createTestCharacter('player-3', 100, 100, [], true);
    
    const actions = [
      createAction('heal', 'player-2', ['player-1'], 0), // 30 healing
      createAction('heal', 'player-3', ['player-1'], 0), // 30 healing
    ];

    const result = resolver.resolveActions(
      actions,
      [player, healer1, healer2],
      [],
      1
    );

    // 85 + 30 + 30 = 145, but capped at 100
    expect(result.updatedPlayers[0]!.currentHp).toBe(100);
  });

  it('should floor HP at 0 (no negative HP)', () => {
    const player = createTestCharacter('player-1', 5, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    
    const action = createAction('heavy-strike', 'enemy-1', ['player-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [player],
      [enemy],
      1
    );

    // 5 - 35 = -30, but floored to 0
    expect(result.updatedPlayers[0]!.currentHp).toBe(0);
  });
});

describe('ActionResolver - Substep 5: Status Application (AC13)', () => {
  it('should apply Poison status from Poison skill', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('poison', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    const poisonStatus = result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'poisoned');
    expect(poisonStatus).toBeDefined();
    expect(poisonStatus!.duration).toBe(6);
  });

  it('should apply Stunned status from Bash skill', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('bash', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    const stunnedStatus = result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'stunned');
    expect(stunnedStatus).toBeDefined();
    expect(stunnedStatus!.duration).toBe(2);
    
    // Bash also deals damage
    expect(result.updatedEnemies[0]!.currentHp).toBe(90); // 100 - 10
  });

  it('should replace existing status of same type', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [
      createStatus('poisoned', 2, 5), // Old poison
    ], false);
    const action = createAction('poison', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    const poisonStatuses = result.updatedEnemies[0]!.statusEffects.filter(s => s.type === 'poisoned');
    expect(poisonStatuses).toHaveLength(1);
    expect(poisonStatuses[0]!.duration).toBe(6); // New poison duration
  });

  it('should apply Shielded status from Shield skill', () => {
    const caster = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('player-2', 60, 100, [], true);
    const action = createAction('shield', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [caster, target],
      [],
      1
    );

    const shieldStatus = result.updatedPlayers[1]!.statusEffects.find(s => s.type === 'shielded');
    expect(shieldStatus).toBeDefined();
    expect(shieldStatus!.value).toBe(30);
  });

  it('should apply Defending status from Defend skill', () => {
    const defender = createTestCharacter('player-1', 100, 100, [], true);
    const action = createAction('defend', 'player-1', ['player-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [defender],
      [],
      1
    );

    const defendingStatus = result.updatedPlayers[0]!.statusEffects.find(s => s.type === 'defending');
    expect(defendingStatus).toBeDefined();
    expect(defendingStatus!.duration).toBe(3);
  });

  it('should apply Taunting status from Taunt skill', () => {
    const taunter = createTestCharacter('player-1', 100, 100, [], true);
    const action = createAction('taunt', 'player-1', ['player-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [taunter],
      [],
      1
    );

    const tauntingStatus = result.updatedPlayers[0]!.statusEffects.find(s => s.type === 'taunting');
    expect(tauntingStatus).toBeDefined();
    expect(tauntingStatus!.duration).toBe(4);
  });

  it('should apply status to multiple targets from multi-target skill', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 100, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 100, 100, [], false);
    
    // Note: Poison targets single enemy, but this tests the concept
    const actions = [
      createAction('poison', 'player-1', ['enemy-1'], 0),
      createAction('poison', 'player-1', ['enemy-2'], 0),
    ];

    const result = resolver.resolveActions(
      actions,
      [attacker],
      [enemy1, enemy2],
      1
    );

    expect(result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'poisoned')).toBeDefined();
    expect(result.updatedEnemies[1]!.statusEffects.find(s => s.type === 'poisoned')).toBeDefined();
  });
});

describe('ActionResolver - Substep 6: Action Cancellation (AC14)', () => {
  it('should cancel action with Interrupt skill', () => {
    const interrupter = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    enemy.currentAction = {
      skillId: 'heavy-strike',
      casterId: 'enemy-1',
      targets: ['player-1'],
      ticksRemaining: 2,
    };
    
    const action = createAction('interrupt', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [interrupter],
      [enemy],
      1
    );

    // Enemy's action should be cancelled
    expect(result.cancelledActions).toHaveLength(1);
    expect(result.cancelledActions[0]!.casterId).toBe('enemy-1');
    
    // Interrupt also deals minor damage
    expect(result.updatedEnemies[0]!.currentHp).toBe(95); // 100 - 5
  });

  it('should cancel action with 1 tick remaining', () => {
    const interrupter = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    enemy.currentAction = {
      skillId: 'heavy-strike',
      casterId: 'enemy-1',
      targets: ['player-1'],
      ticksRemaining: 1, // About to resolve
    };
    
    const action = createAction('interrupt', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [interrupter],
      [enemy],
      1
    );

    // Action cancelled before it could resolve
    expect(result.cancelledActions).toHaveLength(1);
  });

  it('should have no effect on idle target (no queued action)', () => {
    const interrupter = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    // No currentAction set
    
    const action = createAction('interrupt', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [interrupter],
      [enemy],
      1
    );

    // No action to cancel
    expect(result.cancelledActions).toHaveLength(0);
    
    // Interrupt still deals damage
    expect(result.updatedEnemies[0]!.currentHp).toBe(95);
  });

  it('should handle Stun cancelling queued action', () => {
    const basher = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    enemy.currentAction = {
      skillId: 'strike',
      casterId: 'enemy-1',
      targets: ['player-1'],
      ticksRemaining: 1,
    };
    
    const action = createAction('bash', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [basher],
      [enemy],
      1
    );

    // Bash applies stun, which should cancel the action
    expect(result.cancelledActions).toHaveLength(1);
    expect(result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'stunned')).toBeDefined();
  });

  it('should cancel multiple actions from different targets', () => {
    const interrupter1 = createTestCharacter('player-1', 100, 100, [], true);
    const interrupter2 = createTestCharacter('player-2', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 100, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 100, 100, [], false);
    
    enemy1.currentAction = createAction('strike', 'enemy-1', ['player-1'], 1);
    enemy2.currentAction = createAction('strike', 'enemy-2', ['player-2'], 1);
    
    const actions = [
      createAction('interrupt', 'player-1', ['enemy-1'], 0),
      createAction('interrupt', 'player-2', ['enemy-2'], 0),
    ];

    const result = resolver.resolveActions(
      actions,
      [interrupter1, interrupter2],
      [enemy1, enemy2],
      1
    );

    expect(result.cancelledActions).toHaveLength(2);
  });
});

describe('ActionResolver - Event Generation', () => {
  it('should generate damage event', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'damage',
        actorId: 'player-1',
        targetId: 'enemy-1',
        value: 15,
      })
    );
  });

  it('should generate healing event', () => {
    const healer = createTestCharacter('player-1', 100, 100, [], true);
    const wounded = createTestCharacter('player-2', 60, 100, [], true);
    const action = createAction('heal', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [healer, wounded],
      [],
      1
    );

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'healing',
        actorId: 'player-1',
        targetId: 'player-2',
        value: 30,
      })
    );
  });

  it('should generate status-applied event', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('poison', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'status-applied',
        actorId: 'player-1',
        targetId: 'enemy-1',
        statusType: 'poisoned',
      })
    );
  });

  it('should generate knockout event when HP reaches 0', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 10, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'knockout',
        targetId: 'enemy-1',
      })
    );
  });

  it('should generate action-resolved event', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: 'action-resolved',
        actorId: 'player-1',
        skillName: 'Strike',
      })
    );
  });

  it('should include tick number in all events', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      5
    );

    result.events.forEach(event => {
      expect(event.tick).toBe(5);
    });
  });
});

describe('ActionResolver - Complex Scenarios', () => {
  it('should handle Bash (damage + stun) correctly', () => {
    const basher = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('bash', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [basher],
      [target],
      1
    );

    // Bash deals 10 damage
    expect(result.updatedEnemies[0]!.currentHp).toBe(90);
    
    // Bash applies 2-tick stun
    const stunnedStatus = result.updatedEnemies[0]!.statusEffects.find(s => s.type === 'stunned');
    expect(stunnedStatus).toBeDefined();
    expect(stunnedStatus!.duration).toBe(2);
  });

  it('should handle Interrupt (damage + cancel) correctly', () => {
    const interrupter = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    enemy.currentAction = createAction('heavy-strike', 'enemy-1', ['player-1'], 2);
    
    const action = createAction('interrupt', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [interrupter],
      [enemy],
      1
    );

    // Interrupt deals 5 damage
    expect(result.updatedEnemies[0]!.currentHp).toBe(95);
    
    // Interrupt cancels action
    expect(result.cancelledActions).toHaveLength(1);
  });

  it('should handle empty actions array', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);

    const result = resolver.resolveActions(
      [],
      [player],
      [enemy],
      1
    );

    // No changes expected
    expect(result.updatedPlayers[0]!.currentHp).toBe(100);
    expect(result.updatedEnemies[0]!.currentHp).toBe(100);
    expect(result.events).toHaveLength(0);
    expect(result.cancelledActions).toHaveLength(0);
  });

  it('should handle multiple simultaneous complex actions', () => {
    const player1 = createTestCharacter('player-1', 60, 100, [], true);
    const player2 = createTestCharacter('player-2', 100, 100, [], true);
    const player3 = createTestCharacter('player-3', 100, 100, [], true);
    const enemy1 = createTestCharacter('enemy-1', 100, 100, [], false);
    const enemy2 = createTestCharacter('enemy-2', 100, 100, [], false);
    
    const actions = [
      createAction('heal', 'player-2', ['player-1'], 0),      // Heal player-1
      createAction('strike', 'player-3', ['enemy-1'], 0),      // Attack enemy-1
      createAction('bash', 'enemy-1', ['player-1'], 0),        // Enemy bashes player-1
      createAction('poison', 'enemy-2', ['player-3'], 0),      // Enemy poisons player-3
    ];

    const result = resolver.resolveActions(
      actions,
      [player1, player2, player3],
      [enemy1, enemy2],
      1
    );

    // Player-1: 60 + 30 (heal) - 10 (bash) = 80
    expect(result.updatedPlayers[0]!.currentHp).toBe(80);
    expect(result.updatedPlayers[0]!.statusEffects.find(s => s.type === 'stunned')).toBeDefined();
    
    // Player-3: 100, poisoned
    expect(result.updatedPlayers[2]!.currentHp).toBe(100);
    expect(result.updatedPlayers[2]!.statusEffects.find(s => s.type === 'poisoned')).toBeDefined();
    
    // Enemy-1: 100 - 15 (strike) = 85
    expect(result.updatedEnemies[0]!.currentHp).toBe(85);
  });
});

describe('ActionResolver - Immutability', () => {
  it('should not mutate input actions array', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const actions = [action];

    resolver.resolveActions(actions, [attacker], [target], 1);

    expect(actions).toHaveLength(1);
    expect(actions[0]).toBe(action);
  });

  it('should not mutate input players array', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const originalHp = player.currentHp;

    resolver.resolveActions([action], [player], [enemy], 1);

    expect(player.currentHp).toBe(originalHp);
  });

  it('should not mutate input enemies array', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const originalHp = enemy.currentHp;

    resolver.resolveActions([action], [player], [enemy], 1);

    expect(enemy.currentHp).toBe(originalHp);
  });

  it('should return new character objects', () => {
    const player = createTestCharacter('player-1', 100, 100, [], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions([action], [player], [enemy], 1);

    expect(result.updatedPlayers[0]).not.toBe(player);
    expect(result.updatedEnemies[0]).not.toBe(enemy);
  });
});

describe('ActionResolver - AC23: Knockout Clears Status Effects', () => {
  it('should clear all status effects when character is knocked out', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 20, 100, [
      createStatus('poisoned', 3, 5),
      createStatus('stunned', 2),
      createStatus('taunting', 4),
    ], false);
    const action = createAction('heavy-strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    // Enemy should be knocked out (20 - 35 = 0)
    expect(result.updatedEnemies[0]!.currentHp).toBe(0);
    
    // All status effects should be cleared
    expect(result.updatedEnemies[0]!.statusEffects).toHaveLength(0);
  });

  it('should clear status effects on player knockout', () => {
    const player = createTestCharacter('player-1', 10, 100, [
      createStatus('shielded', 3, 5),
      createStatus('taunting', 4),
    ], true);
    const enemy = createTestCharacter('enemy-1', 100, 100, [], false);
    const action = createAction('strike', 'enemy-1', ['player-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [player],
      [enemy],
      1
    );

    // Player should be knocked out
    expect(result.updatedPlayers[0]!.currentHp).toBe(0);
    
    // All status effects should be cleared
    expect(result.updatedPlayers[0]!.statusEffects).toHaveLength(0);
  });

  it('should not affect status effects of characters that survive', () => {
    const player = createTestCharacter('player-1', 100, 100, [
      createStatus('defending', 2),
    ], true);
    const enemy = createTestCharacter('enemy-1', 15, 100, [
      createStatus('poisoned', 2, 5),
    ], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [player],
      [enemy],
      1
    );

    // Enemy knocked out, status cleared
    expect(result.updatedEnemies[0]!.currentHp).toBe(0);
    expect(result.updatedEnemies[0]!.statusEffects).toHaveLength(0);
    
    // Player alive, status preserved
    expect(result.updatedPlayers[0]!.currentHp).toBe(100);
    expect(result.updatedPlayers[0]!.statusEffects).toHaveLength(1);
    expect(result.updatedPlayers[0]!.statusEffects[0]!.type).toBe('defending');
  });
});

describe('ActionResolver - AC26: Revive Target Lost Event', () => {
  it('should generate target-lost event when Revive targets alive character', () => {
    const healer = createTestCharacter('player-1', 100, 100, [], true);
    const aliveAlly = createTestCharacter('player-2', 50, 100, [], true);
    const action = createAction('revive', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [healer, aliveAlly],
      [],
      1
    );

    // Target should remain unchanged
    expect(result.updatedPlayers[1]!.currentHp).toBe(50);
    
    // Should have a target-lost event
    const targetLostEvent = result.events.find(e => e.type === 'target-lost');
    expect(targetLostEvent).toBeDefined();
    expect(targetLostEvent?.targetId).toBe('player-2');
    expect(targetLostEvent?.message).toContain('not knocked out');
  });

  it('should still revive when target is actually knocked out', () => {
    const healer = createTestCharacter('player-1', 100, 100, [], true);
    const deadAlly = createTestCharacter('player-2', 0, 100, [], true);
    const action = createAction('revive', 'player-1', ['player-2'], 0);

    const result = resolver.resolveActions(
      [action],
      [healer, deadAlly],
      [],
      1
    );

    // Target should be revived
    expect(result.updatedPlayers[1]!.currentHp).toBe(40);
    
    // Should have healing event, not target-lost
    const healingEvent = result.events.find(e => e.type === 'healing');
    expect(healingEvent).toBeDefined();
    
    const targetLostEvent = result.events.find(e => e.type === 'target-lost');
    expect(targetLostEvent).toBeUndefined();
  });
});
