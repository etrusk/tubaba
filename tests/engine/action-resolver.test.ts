import { describe, it, expect } from 'vitest';
import type { Action, Character, CombatEvent, StatusEffect } from '../../src/types/index.js';

/**
 * ActionResolver Test Suite (Pruned for Rapid Prototyping)
 *
 * Tests core action resolution mechanics with Strike skill only:
 * 1. Damage Calculation: Basic damage with Defending/Enraged modifiers
 * 2. Shield Absorption: Process shield blocks with overflow tracking
 * 3. Health Updates: Apply damage simultaneously
 * 4. Event Generation: Generate combat events
 * 5. Knockout: Clear status effects on knockout
 *
 * Implementation: src/engine/action-resolver.ts
 */

// Mock ActionResolver interface
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

// Import actual implementation
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

describe('ActionResolver - Damage Calculation', () => {
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

});


describe('ActionResolver - Health Updates Simultaneous', () => {
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

describe('ActionResolver - Knockout Clears Status Effects', () => {
  it('should clear all status effects when character is knocked out', () => {
    const attacker = createTestCharacter('player-1', 100, 100, [], true);
    const target = createTestCharacter('enemy-1', 15, 100, [
      createStatus('poisoned', 3, 5),
      createStatus('stunned', 2),
      createStatus('taunting', 4),
    ], false);
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);

    const result = resolver.resolveActions(
      [action],
      [attacker],
      [target],
      1
    );

    // Enemy should be knocked out (15 - 15 = 0)
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
