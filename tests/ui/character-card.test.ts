import { describe, it, expect } from 'vitest';
import type { Character, StatusEffect, Action } from '../../src/types/index.js';
import { renderCharacterCard } from '../../src/ui/character-card.js';

/**
 * CharacterCard Test Suite
 *
 * TDD tests for CharacterCard renderer (Phase 5 UI Layer)
 *
 * Tests the character card rendering:
 * - HP bar display with correct percentages
 * - Status icon display for active statuses
 * - Action progress bars
 * - General character information rendering
 *
 * Implementation: src/ui/character-card.ts
 */

// Test helpers
function createTestCharacter(
  id: string,
  name: string,
  currentHp: number,
  maxHp: number,
  statusEffects: StatusEffect[] = [],
  currentAction: Action | null = null,
  isPlayer: boolean = true
): Character {
  return {
    id,
    name,
    maxHp,
    currentHp,
    skills: [],
    statusEffects,
    currentAction,
    isPlayer,
  };
}

function createStatusEffect(
  type: 'poisoned' | 'stunned' | 'shielded' | 'taunting' | 'defending' | 'enraged',
  duration: number,
  value?: number
): StatusEffect {
  return {
    type,
    duration,
    value,
  };
}

function createAction(
  skillId: string,
  casterId: string,
  targets: string[],
  ticksRemaining: number
): Action {
  return {
    skillId,
    casterId,
    targets,
    ticksRemaining,
  };
}

describe('CharacterCard - HP Bar Rendering', () => {
  it('should render HP percentage correctly (50/100 = 50%)', () => {
    const character = createTestCharacter('player-1', 'Hero', 50, 100);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('50/100');
    expect(html).toMatch(/width:\s*50%/);
  });

  it('should render 100% HP (full bar)', () => {
    const character = createTestCharacter('player-1', 'Hero', 100, 100);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('100/100');
    expect(html).toMatch(/width:\s*100%/);
  });

  it('should render 0 HP (empty bar, KO state)', () => {
    const character = createTestCharacter('player-1', 'Hero', 0, 100);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('0/100');
    expect(html).toMatch(/width:\s*0%/);
    expect(html).toContain('KO');
  });

  it('should display current/max HP text', () => {
    const character = createTestCharacter('player-1', 'Hero', 75, 150);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('75/150');
  });

  it('should handle edge case: HP > maxHP (overheal)', () => {
    const character = createTestCharacter('player-1', 'Hero', 120, 100);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('120/100');
    expect(html).toMatch(/width:\s*100%/);
  });

  it('should calculate HP percentage correctly for various values', () => {
    const testCases = [
      { current: 1, max: 100, expectedPercent: 1 },
      { current: 33, max: 100, expectedPercent: 33 },
      { current: 99, max: 100, expectedPercent: 99 },
      { current: 25, max: 50, expectedPercent: 50 },
    ];
    
    testCases.forEach(({ current, max, expectedPercent }) => {
      const character = createTestCharacter('test', 'Test', current, max);
      const html = renderCharacterCard(character);
      expect(html).toMatch(new RegExp(`width:\\s*${expectedPercent}%`));
    });
  });
});

describe('CharacterCard - Status Icon Display', () => {
  it('should render icon for poisoned status', () => {
    const poisoned = createStatusEffect('poisoned', 3, 5);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [poisoned]);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('poisoned');
    expect(html).toContain('3');
  });

  it('should render icon for stunned status', () => {
    const stunned = createStatusEffect('stunned', 2);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [stunned]);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('stunned');
    expect(html).toContain('2');
  });

  it('should render icon for shielded status with shield value', () => {
    const shielded = createStatusEffect('shielded', 5, 20);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [shielded]);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('shielded');
    expect(html).toContain('20');
    expect(html).toContain('5');
  });

  it('should render icon for taunting status', () => {
    const taunting = createStatusEffect('taunting', 4);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [taunting]);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('taunting');
  });

  it('should render icon for defending status', () => {
    const defending = createStatusEffect('defending', 1);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [defending]);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('defending');
  });

  it('should render icon for enraged status', () => {
    const enraged = createStatusEffect('enraged', 6);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [enraged]);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('enraged');
  });

  it('should show multiple status icons when character has multiple statuses', () => {
    const poisoned = createStatusEffect('poisoned', 3, 5);
    const shielded = createStatusEffect('shielded', 2, 15);
    const enraged = createStatusEffect('enraged', 4);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [poisoned, shielded, enraged]);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('poisoned');
    expect(html).toContain('shielded');
    expect(html).toContain('enraged');
  });

  it('should show no icons when character has no statuses', () => {
    const character = createTestCharacter('player-1', 'Hero', 100, 100, []);
    const html = renderCharacterCard(character);
    
    expect(html).not.toContain('poisoned');
    expect(html).not.toContain('stunned');
  });

  it('should show status duration text if applicable', () => {
    const stunned = createStatusEffect('stunned', 5);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [stunned]);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('5');
  });

  it('should handle permanent status (duration -1)', () => {
    const permanentShield = createStatusEffect('shielded', -1, 50);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [permanentShield]);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('shielded');
    expect(html).toContain('50');
  });
});

describe('CharacterCard - Action Progress Display', () => {
  it('should show action name when character has queued action', () => {
    const action = createAction('strike', 'player-1', ['enemy-1'], 2);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [], action);
    const html = renderCharacterCard(character);
    
    expect(html).toMatch(/strike/i);
  });

  it('should show progress bar based on ticksRemaining', () => {
    const action = createAction('heal', 'player-1', ['player-1'], 2);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [], action);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('2');
  });

  it('should show "Idle" when character has no action', () => {
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [], null);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('Idle');
  });

  it('should show completed state when ticksRemaining = 0', () => {
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [], action);
    const html = renderCharacterCard(character);
    
    expect(html).toMatch(/strike/i);
    expect(html).toContain('Executing');
  });

  it('should display ticks remaining for action in progress', () => {
    const action = createAction('fireball', 'player-1', ['enemy-1'], 3);
    const character = createTestCharacter('player-1', 'Hero', 100, 100, [], action);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('3');
  });
});

describe('CharacterCard - General Rendering', () => {
  it('should include character name', () => {
    const character = createTestCharacter('player-1', 'Valiant Hero', 100, 100);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('Valiant Hero');
  });

  it('should distinguish player vs enemy styling', () => {
    const player = createTestCharacter('player-1', 'Hero', 100, 100, [], null, true);
    const enemy = createTestCharacter('enemy-1', 'Goblin', 100, 100, [], null, false);
    const playerHtml = renderCharacterCard(player);
    const enemyHtml = renderCharacterCard(enemy);
    
    expect(playerHtml).toContain('player');
    expect(enemyHtml).toContain('enemy');
  });

  it('should return valid HTML string', () => {
    const character = createTestCharacter('player-1', 'Hero', 100, 100);
    const html = renderCharacterCard(character);
    
    expect(typeof html).toBe('string');
    expect(html).toMatch(/<div/);
    expect(html).toMatch(/<\/div>/);
  });

  it('should handle minimal character data gracefully', () => {
    const minimalCharacter = createTestCharacter('test-1', 'Test', 1, 1, [], null, true);
    const html = renderCharacterCard(minimalCharacter);
    
    expect(html).toContain('Test');
    expect(html).toContain('1/1');
  });

  it('should render KO state when currentHp is 0', () => {
    const koCharacter = createTestCharacter('player-1', 'Fallen Hero', 0, 100);
    const html = renderCharacterCard(koCharacter);
    
    expect(html).toMatch(/KO|knocked.?out|defeated/i);
  });

  it('should include character ID for DOM targeting', () => {
    const character = createTestCharacter('player-42', 'Hero', 100, 100);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('player-42');
  });
});

describe('CharacterCard - Edge Cases', () => {
  it('should handle very long character names', () => {
    const longName = 'The Extraordinarily Long Named Character of Extreme Verbosity';
    const character = createTestCharacter('player-1', longName, 100, 100);
    const html = renderCharacterCard(character);
    
    expect(html).toContain(longName);
  });

  it('should handle character with maximum statuses', () => {
    const allStatuses = [
      createStatusEffect('poisoned', 3, 5),
      createStatusEffect('stunned', 2),
      createStatusEffect('shielded', 4, 30),
      createStatusEffect('taunting', 5),
      createStatusEffect('defending', 1),
      createStatusEffect('enraged', 6),
    ];
    const character = createTestCharacter('player-1', 'Hero', 100, 100, allStatuses);
    const html = renderCharacterCard(character);
    
    allStatuses.forEach(status => {
      expect(html).toContain(status.type);
    });
  });

  it('should handle very high HP values', () => {
    const character = createTestCharacter('boss-1', 'Ancient Dragon', 9999, 9999);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('9999/9999');
  });

  it('should handle fractional HP percentages correctly', () => {
    const character = createTestCharacter('player-1', 'Hero', 33, 99);
    const html = renderCharacterCard(character);
    
    expect(html).toContain('33/99');
  });
});
