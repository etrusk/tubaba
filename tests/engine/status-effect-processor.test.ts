import { describe, it, expect } from 'vitest';
import type { Character, StatusEffect, StatusType, CombatEvent } from '../../src/types/index.js';

/**
 * StatusEffectProcessor Test Suite (TDD - Tests First)
 *
 * Tests all 6 status effect types before implementation:
 * - Poisoned: 5 damage per tick, 6 tick duration
 * - Stunned: Blocks action queueing, 2 tick duration
 * - Shielded: Absorbs damage, 4 tick duration, reapply resets to 30
 * - Taunting: Forces targeting, 4 tick duration, reapply refreshes
 * - Defending: 50% damage reduction, 3 tick duration, reapply refreshes
 * - Enraged: +15 damage per target, permanent until consumed
 *
 * Implementation: src/engine/status-effect-processor.ts (Task 5)
 */

// Mock StatusEffectProcessor interface (will be implemented in Task 5)
interface StatusEffectProcessor {
  processStatusEffects(character: Character): {
    updatedCharacter: Character;
    events: CombatEvent[]
  };
  hasStatus(character: Character, statusType: StatusType): boolean;
  getStatusDuration(character: Character, statusType: StatusType): number;
  applyStatus(character: Character, status: StatusEffect): Character;
  removeStatus(character: Character, statusType: StatusType): Character;
}

// Import actual implementation
import { StatusEffectProcessor } from '../../src/engine/status-effect-processor.js';

// Use real implementation
const processor: StatusEffectProcessor = StatusEffectProcessor;

// Test helper: Create a test character
function createTestCharacter(
  id: string = 'char-1',
  currentHp: number = 100,
  maxHp: number = 100,
  statusEffects: StatusEffect[] = []
): Character {
  return {
    id,
    name: `Character ${id}`,
    maxHp,
    currentHp,
    skills: [],
    statusEffects,
    currentAction: null,
    isPlayer: true,
  };
}

// Test helper: Create a status effect
function createStatus(
  type: StatusType,
  duration: number,
  value?: number
): StatusEffect {
  return { type, duration, value };
}

describe('StatusEffectProcessor - Helper API', () => {
  describe('hasStatus', () => {
    it('should return true when character has the specified status', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('poisoned', 3, 5),
      ]);

      const result = processor.hasStatus(character, 'poisoned');

      expect(result).toBe(true);
    });

    it('should return false when character does not have the specified status', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('poisoned', 3, 5),
      ]);

      const result = processor.hasStatus(character, 'stunned');

      expect(result).toBe(false);
    });

    it('should return false when character has no status effects', () => {
      const character = createTestCharacter('char-1', 100, 100, []);

      const result = processor.hasStatus(character, 'poisoned');

      expect(result).toBe(false);
    });

    it('should correctly identify status when character has multiple statuses', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('poisoned', 3, 5),
        createStatus('defending', 2),
        createStatus('shielded', 4, 30),
      ]);

      expect(processor.hasStatus(character, 'poisoned')).toBe(true);
      expect(processor.hasStatus(character, 'defending')).toBe(true);
      expect(processor.hasStatus(character, 'shielded')).toBe(true);
      expect(processor.hasStatus(character, 'stunned')).toBe(false);
    });
  });

  describe('getStatusDuration', () => {
    it('should return correct duration for active status', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('poisoned', 3, 5),
      ]);

      const duration = processor.getStatusDuration(character, 'poisoned');

      expect(duration).toBe(3);
    });

    it('should return -1 when status is not present', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('poisoned', 3, 5),
      ]);

      const duration = processor.getStatusDuration(character, 'stunned');

      expect(duration).toBe(-1);
    });

    it('should return -1 when character has no status effects', () => {
      const character = createTestCharacter('char-1', 100, 100, []);

      const duration = processor.getStatusDuration(character, 'poisoned');

      expect(duration).toBe(-1);
    });

    it('should return permanent duration (-1) for enraged status', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('enraged', -1, 15),
      ]);

      const duration = processor.getStatusDuration(character, 'enraged');

      expect(duration).toBe(-1);
    });
  });

  describe('applyStatus', () => {
    it('should add new status to character with no existing statuses', () => {
      const character = createTestCharacter('char-1', 100, 100, []);
      const newStatus = createStatus('poisoned', 6, 5);

      const updated = processor.applyStatus(character, newStatus);

      expect(updated.statusEffects).toHaveLength(1);
      expect(updated.statusEffects[0]).toEqual(newStatus);
    });

    it('should add new status to character with existing different statuses', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('defending', 3),
      ]);
      const newStatus = createStatus('poisoned', 6, 5);

      const updated = processor.applyStatus(character, newStatus);

      expect(updated.statusEffects).toHaveLength(2);
      expect(updated.statusEffects).toContainEqual(createStatus('defending', 3));
      expect(updated.statusEffects).toContainEqual(newStatus);
    });

    it('should replace existing status of same type (poison reapply)', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('poisoned', 2, 5), // Old poison with 2 ticks
      ]);
      const newStatus = createStatus('poisoned', 6, 5); // New poison with 6 ticks

      const updated = processor.applyStatus(character, newStatus);

      expect(updated.statusEffects).toHaveLength(1);
      expect(updated.statusEffects[0]).toEqual(newStatus);
    });

    it('should reset shielded value to 30 on reapply', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('shielded', 2, 10), // Depleted shield
      ]);
      const newStatus = createStatus('shielded', 4, 30); // Fresh shield

      const updated = processor.applyStatus(character, newStatus);

      expect(updated.statusEffects).toHaveLength(1);
      expect(updated.statusEffects[0]!.duration).toBe(4);
      expect(updated.statusEffects[0]!.value).toBe(30);
    });

    it('should refresh taunting duration on reapply', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('taunting', 1), // About to expire
      ]);
      const newStatus = createStatus('taunting', 4); // Refreshed

      const updated = processor.applyStatus(character, newStatus);

      expect(updated.statusEffects).toHaveLength(1);
      expect(updated.statusEffects[0]!.duration).toBe(4);
    });

    it('should refresh defending duration on reapply', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('defending', 1), // About to expire
      ]);
      const newStatus = createStatus('defending', 3); // Refreshed

      const updated = processor.applyStatus(character, newStatus);

      expect(updated.statusEffects).toHaveLength(1);
      expect(updated.statusEffects[0]!.duration).toBe(3);
    });

    it('should not stack enraged (replace existing)', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('enraged', -1, 15), // Existing enraged
      ]);
      const newStatus = createStatus('enraged', -1, 15); // Attempt to stack

      const updated = processor.applyStatus(character, newStatus);

      expect(updated.statusEffects).toHaveLength(1);
      expect(updated.statusEffects[0]!.duration).toBe(-1);
    });

    it('should not mutate original character object', () => {
      const character = createTestCharacter('char-1', 100, 100, []);
      const newStatus = createStatus('poisoned', 6, 5);

      const updated = processor.applyStatus(character, newStatus);

      expect(character.statusEffects).toHaveLength(0);
      expect(updated.statusEffects).toHaveLength(1);
      expect(updated).not.toBe(character);
    });
  });

  describe('removeStatus', () => {
    it('should remove specific status from character', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('poisoned', 3, 5),
        createStatus('defending', 2),
      ]);

      const updated = processor.removeStatus(character, 'poisoned');

      expect(updated.statusEffects).toHaveLength(1);
      expect(updated.statusEffects[0]!.type).toBe('defending');
    });

    it('should have no effect if status is not present', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('defending', 2),
      ]);

      const updated = processor.removeStatus(character, 'poisoned');

      expect(updated.statusEffects).toHaveLength(1);
      expect(updated.statusEffects[0]!.type).toBe('defending');
    });

    it('should handle removing status when character has no statuses', () => {
      const character = createTestCharacter('char-1', 100, 100, []);

      const updated = processor.removeStatus(character, 'poisoned');

      expect(updated.statusEffects).toHaveLength(0);
    });

    it('should remove only specified status when multiple exist', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('poisoned', 3, 5),
        createStatus('defending', 2),
        createStatus('shielded', 4, 30),
      ]);

      const updated = processor.removeStatus(character, 'defending');

      expect(updated.statusEffects).toHaveLength(2);
      expect(updated.statusEffects.find(s => s.type === 'poisoned')).toBeDefined();
      expect(updated.statusEffects.find(s => s.type === 'shielded')).toBeDefined();
      expect(updated.statusEffects.find(s => s.type === 'defending')).toBeUndefined();
    });

    it('should not mutate original character object', () => {
      const character = createTestCharacter('char-1', 100, 100, [
        createStatus('poisoned', 3, 5),
      ]);

      const updated = processor.removeStatus(character, 'poisoned');

      expect(character.statusEffects).toHaveLength(1);
      expect(updated.statusEffects).toHaveLength(0);
      expect(updated).not.toBe(character);
    });
  });
});

describe('StatusEffectProcessor - Poisoned Status (AC27)', () => {
  it('should apply poison damage per tick', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 3, 5), // 5 damage per tick
    ]);

    const { updatedCharacter, events } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(95); // 100 - 5
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'damage',
        targetId: 'char-1',
        value: 5,
        message: expect.stringContaining('poison'),
      })
    );
  });

  it('should decrement poison duration after applying damage', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 3, 5),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    const poisonStatus = updatedCharacter.statusEffects.find(s => s.type === 'poisoned');
    expect(poisonStatus).toBeDefined();
    expect(poisonStatus!.duration).toBe(2); // 3 - 1
  });

  it('should remove poison when duration reaches 0', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 1, 5), // Last tick
    ]);

    const { updatedCharacter, events } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(95); // Damage still applied
    expect(updatedCharacter.statusEffects.find(s => s.type === 'poisoned')).toBeUndefined();
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'status-expired',
        targetId: 'char-1',
        statusType: 'poisoned',
      })
    );
  });

  it('should knock out character if poison damage reduces HP to 0', () => {
    const character = createTestCharacter('char-1', 5, 100, [ // Only 5 HP left
      createStatus('poisoned', 2, 5), // 5 damage will KO
    ]);

    const { updatedCharacter, events } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(0);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'knockout',
        targetId: 'char-1',
      })
    );
  });

  it('should knock out character if poison damage reduces HP below 0', () => {
    const character = createTestCharacter('char-1', 3, 100, [ // Only 3 HP left
      createStatus('poisoned', 2, 5), // 5 damage exceeds remaining HP
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(0); // Floor at 0, not negative
  });
});

describe('StatusEffectProcessor - Stunned Status (AC28)', () => {
  it('should decrement stunned duration', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('stunned', 2),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    const stunnedStatus = updatedCharacter.statusEffects.find(s => s.type === 'stunned');
    expect(stunnedStatus).toBeDefined();
    expect(stunnedStatus!.duration).toBe(1); // 2 - 1
  });

  it('should remove stunned when duration reaches 0', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('stunned', 1), // Last tick
    ]);

    const { updatedCharacter, events } = processor.processStatusEffects(character);

    expect(updatedCharacter.statusEffects.find(s => s.type === 'stunned')).toBeUndefined();
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'status-expired',
        targetId: 'char-1',
        statusType: 'stunned',
      })
    );
  });

  it('should not modify character HP (stunned has no per-tick damage)', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('stunned', 2),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(100); // No damage from stun
  });

  it('should preserve existing queued action (cancellation happens during application, not processing)', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('stunned', 2),
    ]);
    character.currentAction = {
      skillId: 'strike',
      casterId: 'char-1',
      targets: ['enemy-1'],
      ticksRemaining: 2,
    };

    const { updatedCharacter } = processor.processStatusEffects(character);

    // StatusEffectProcessor does NOT cancel actions (that's ActionResolver's job)
    expect(updatedCharacter.currentAction).toBeDefined();
    expect(updatedCharacter.currentAction!.skillId).toBe('strike');
  });
});

describe('StatusEffectProcessor - Shielded Status', () => {
  it('should decrement shielded duration', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('shielded', 4, 30),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    const shieldedStatus = updatedCharacter.statusEffects.find(s => s.type === 'shielded');
    expect(shieldedStatus).toBeDefined();
    expect(shieldedStatus!.duration).toBe(3); // 4 - 1
    expect(shieldedStatus!.value).toBe(30); // Shield value unchanged by time
  });

  it('should remove shielded when duration reaches 0', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('shielded', 1, 30), // Last tick
    ]);

    const { updatedCharacter, events } = processor.processStatusEffects(character);

    expect(updatedCharacter.statusEffects.find(s => s.type === 'shielded')).toBeUndefined();
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'status-expired',
        targetId: 'char-1',
        statusType: 'shielded',
      })
    );
  });

  it('should not modify character HP (shield absorption tested in ActionResolver)', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('shielded', 4, 30),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(100); // No HP change from shield ticking
  });

  it('should preserve shield value across ticks until duration expires', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('shielded', 2, 15), // Partially depleted shield
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    const shieldedStatus = updatedCharacter.statusEffects.find(s => s.type === 'shielded');
    expect(shieldedStatus!.value).toBe(15); // Value persists
    expect(shieldedStatus!.duration).toBe(1);
  });
});

describe('StatusEffectProcessor - Taunting Status', () => {
  it('should decrement taunting duration', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('taunting', 4),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    const tauntingStatus = updatedCharacter.statusEffects.find(s => s.type === 'taunting');
    expect(tauntingStatus).toBeDefined();
    expect(tauntingStatus!.duration).toBe(3); // 4 - 1
  });

  it('should remove taunting when duration reaches 0', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('taunting', 1), // Last tick
    ]);

    const { updatedCharacter, events } = processor.processStatusEffects(character);

    expect(updatedCharacter.statusEffects.find(s => s.type === 'taunting')).toBeUndefined();
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'status-expired',
        targetId: 'char-1',
        statusType: 'taunting',
      })
    );
  });

  it('should not modify character HP (taunt redirect tested in TargetFilter)', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('taunting', 4),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(100); // No HP change
  });
});

describe('StatusEffectProcessor - Defending Status', () => {
  it('should decrement defending duration', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('defending', 3),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    const defendingStatus = updatedCharacter.statusEffects.find(s => s.type === 'defending');
    expect(defendingStatus).toBeDefined();
    expect(defendingStatus!.duration).toBe(2); // 3 - 1
  });

  it('should remove defending when duration reaches 0', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('defending', 1), // Last tick
    ]);

    const { updatedCharacter, events } = processor.processStatusEffects(character);

    expect(updatedCharacter.statusEffects.find(s => s.type === 'defending')).toBeUndefined();
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'status-expired',
        targetId: 'char-1',
        statusType: 'defending',
      })
    );
  });

  it('should not modify character HP (damage reduction tested in ActionResolver)', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('defending', 3),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(100); // No HP change
  });
});

describe('StatusEffectProcessor - Enraged Status', () => {
  it('should NOT decrement enraged duration (permanent until consumed)', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('enraged', -1, 15),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    const enragedStatus = updatedCharacter.statusEffects.find(s => s.type === 'enraged');
    expect(enragedStatus).toBeDefined();
    expect(enragedStatus!.duration).toBe(-1); // Still permanent
  });

  it('should persist enraged across multiple ticks', () => {
    let character = createTestCharacter('char-1', 100, 100, [
      createStatus('enraged', -1, 15),
    ]);

    // Process 3 ticks
    for (let i = 0; i < 3; i++) {
      const result = processor.processStatusEffects(character);
      character = result.updatedCharacter;
    }

    const enragedStatus = character.statusEffects.find(s => s.type === 'enraged');
    expect(enragedStatus).toBeDefined();
    expect(enragedStatus!.duration).toBe(-1);
  });

  it('should not modify character HP (damage boost tested in ActionResolver)', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('enraged', -1, 15),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(100); // No HP change
  });

  it('should not generate expiration event for permanent status', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('enraged', -1, 15),
    ]);

    const { events } = processor.processStatusEffects(character);

    expect(events.find(e => e.type === 'status-expired' && e.statusType === 'enraged')).toBeUndefined();
  });
});

describe('StatusEffectProcessor - Duration Decrement (AC33)', () => {
  it('should decrement duration for all non-permanent statuses', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 6, 5),
      createStatus('stunned', 2),
      createStatus('shielded', 4, 30),
      createStatus('taunting', 4),
      createStatus('defending', 3),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.statusEffects.find(s => s.type === 'poisoned')!.duration).toBe(5);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'stunned')!.duration).toBe(1);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'shielded')!.duration).toBe(3);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'taunting')!.duration).toBe(3);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'defending')!.duration).toBe(2);
  });

  it('should not decrement permanent status (enraged)', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('enraged', -1, 15),
      createStatus('defending', 3),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.statusEffects.find(s => s.type === 'enraged')!.duration).toBe(-1);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'defending')!.duration).toBe(2);
  });
});

describe('StatusEffectProcessor - Expiration Removal (AC34)', () => {
  it('should remove single status when duration reaches 0', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('defending', 1), // Expires this tick
      createStatus('poisoned', 3, 5), // Still active
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.statusEffects).toHaveLength(1);
    expect(updatedCharacter.statusEffects[0]!.type).toBe('poisoned');
  });

  it('should remove multiple statuses that expire on same tick', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('stunned', 1), // Expires
      createStatus('defending', 1), // Expires
      createStatus('poisoned', 1, 5), // Expires
      createStatus('taunting', 3), // Persists
    ]);

    const { updatedCharacter, events } = processor.processStatusEffects(character);

    expect(updatedCharacter.statusEffects).toHaveLength(1);
    expect(updatedCharacter.statusEffects[0]!.type).toBe('taunting');
    
    // Should generate expiration events for all expired statuses
    const expirationEvents = events.filter(e => e.type === 'status-expired');
    expect(expirationEvents).toHaveLength(3);
    expect(expirationEvents.map(e => e.statusType).sort()).toEqual(['defending', 'poisoned', 'stunned']);
  });

  it('should handle all statuses expiring simultaneously', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('stunned', 1),
      createStatus('defending', 1),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.statusEffects).toHaveLength(0);
  });
});

describe('StatusEffectProcessor - Multiple Statuses', () => {
  it('should process poison damage and decrement all statuses in same tick', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 3, 5),
      createStatus('defending', 2),
      createStatus('shielded', 4, 30),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(95); // Poison damage applied
    expect(updatedCharacter.statusEffects.find(s => s.type === 'poisoned')!.duration).toBe(2);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'defending')!.duration).toBe(1);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'shielded')!.duration).toBe(3);
  });

  it('should handle multiple poison ticks reducing HP gradually', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 3, 5),
    ]);

    // Tick 1
    const result1 = processor.processStatusEffects(character);
    expect(result1.updatedCharacter.currentHp).toBe(95);

    // Tick 2
    const result2 = processor.processStatusEffects(result1.updatedCharacter);
    expect(result2.updatedCharacter.currentHp).toBe(90);

    // Tick 3 (poison expires)
    const result3 = processor.processStatusEffects(result2.updatedCharacter);
    expect(result3.updatedCharacter.currentHp).toBe(85);
    expect(result3.updatedCharacter.statusEffects.find(s => s.type === 'poisoned')).toBeUndefined();
  });

  it('should handle character with all 6 status types simultaneously', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 6, 5),
      createStatus('stunned', 2),
      createStatus('shielded', 4, 30),
      createStatus('taunting', 4),
      createStatus('defending', 3),
      createStatus('enraged', -1, 15),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter.currentHp).toBe(95); // Poison damage
    expect(updatedCharacter.statusEffects).toHaveLength(6);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'poisoned')!.duration).toBe(5);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'stunned')!.duration).toBe(1);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'shielded')!.duration).toBe(3);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'taunting')!.duration).toBe(3);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'defending')!.duration).toBe(2);
    expect(updatedCharacter.statusEffects.find(s => s.type === 'enraged')!.duration).toBe(-1);
  });
});

describe('StatusEffectProcessor - Event Generation', () => {
  it('should generate damage event for poison tick', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 3, 5),
    ]);

    const { events } = processor.processStatusEffects(character);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'damage',
        targetId: 'char-1',
        value: 5,
      })
    );
  });

  it('should generate expiration events for expired statuses', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('stunned', 1),
    ]);

    const { events } = processor.processStatusEffects(character);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'status-expired',
        targetId: 'char-1',
        statusType: 'stunned',
      })
    );
  });

  it('should generate knockout event when poison reduces HP to 0', () => {
    const character = createTestCharacter('char-1', 5, 100, [
      createStatus('poisoned', 2, 5),
    ]);

    const { events } = processor.processStatusEffects(character);

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'knockout',
        targetId: 'char-1',
      })
    );
  });

  it('should generate multiple events in single processing call', () => {
    const character = createTestCharacter('char-1', 5, 100, [
      createStatus('poisoned', 1, 5), // Will damage, expire, and KO
    ]);

    const { events } = processor.processStatusEffects(character);

    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.some(e => e.type === 'damage')).toBe(true);
    expect(events.some(e => e.type === 'status-expired')).toBe(true);
    expect(events.some(e => e.type === 'knockout')).toBe(true);
  });

  it('should not generate events for statuses that just tick down', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('defending', 3), // Just decrements, no special event
    ]);

    const { events } = processor.processStatusEffects(character);

    // Should not generate events for non-expiring, non-damaging statuses
    expect(events).toHaveLength(0);
  });
});

describe('StatusEffectProcessor - Immutability', () => {
  it('should not mutate input character object', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 3, 5),
    ]);
    const originalHp = character.currentHp;
    const originalStatusCount = character.statusEffects.length;

    processor.processStatusEffects(character);

    expect(character.currentHp).toBe(originalHp);
    expect(character.statusEffects.length).toBe(originalStatusCount);
  });

  it('should return new character object with updated state', () => {
    const character = createTestCharacter('char-1', 100, 100, [
      createStatus('poisoned', 3, 5),
    ]);

    const { updatedCharacter } = processor.processStatusEffects(character);

    expect(updatedCharacter).not.toBe(character);
    expect(updatedCharacter.statusEffects).not.toBe(character.statusEffects);
  });
});
