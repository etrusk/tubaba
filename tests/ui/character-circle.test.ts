import { describe, it, expect } from 'vitest';
import type { CircleCharacterData, CharacterPosition } from '../../src/types/index.js';
import type { StatusEffect, Action } from '../../src/types/index.js';
import { renderCharacterCircle } from '../../src/ui/character-circle.js';
import { getCharacterColor } from '../../src/ui/character-name-formatter.js';

/**
 * CharacterCircle Test Suite
 *
 * TDD tests for CharacterCircle SVG renderer (Phase 8 Circle Visualization)
 *
 * Tests the character circle rendering:
 * - HP fill visualization (liquid drain effect from top)
 * - Border colors for player/enemy distinction
 * - Status effects displayed below circle
 * - Current action display
 * - Character name above circle
 * - SVG structure validation
 *
 * Implementation: src/ui/character-circle.ts
 */

// Test helpers
function createPosition(
  characterId: string,
  x: number = 100,
  y: number = 100,
  radius: number = 40
): CharacterPosition {
  return {
    characterId,
    x,
    y,
    radius,
  };
}

function createCircleCharacterData(
  id: string,
  name: string,
  currentHp: number,
  maxHp: number,
  hpPercent: number,
  isPlayer: boolean = true,
  statusEffects: StatusEffect[] = [],
  currentAction: Action | null = null,
  position?: CharacterPosition
): CircleCharacterData {
  return {
    id,
    name,
    currentHp,
    maxHp,
    hpPercent,
    statusEffects,
    currentAction,
    isPlayer,
    position: position || createPosition(id),
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

describe('CharacterCircle - HP Fill Visualization', () => {
  it('should render full HP (100%) with circle fully filled', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100);
    const svg = renderCharacterCircle(data);
    
    // Should show 100/100 text
    expect(svg).toContain('100/100');
    
    // Fill height should be full (100% of diameter = radius * 2)
    // At 100%, the rect should fill the entire circle height
    expect(svg).toContain('height="80"'); // 40 * 2
  });

  it('should render half HP (50%) with bottom half filled', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 50, 100, 50);
    const svg = renderCharacterCircle(data);
    
    // Should show 50/100 text
    expect(svg).toContain('50/100');
    
    // Fill height should be 50% of diameter (40 pixels for radius 40)
    expect(svg).toContain('height="40"'); // (50/100) * 40 * 2
  });

  it('should render low HP (10%) with small bottom section filled', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 10, 100, 10);
    const svg = renderCharacterCircle(data);
    
    // Should show 10/100 text
    expect(svg).toContain('10/100');
    
    // Fill height should be 10% of diameter (8 pixels for radius 40)
    expect(svg).toContain('height="8"'); // (10/100) * 40 * 2
  });

  it('should render zero HP (KO) with empty gray circle and dashed border', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 0, 100, 0);
    const svg = renderCharacterCircle(data);
    
    // Should show KO text or 0/100
    expect(svg).toMatch(/KO|0\/100/);
    
    // Should have dashed border
    expect(svg).toContain('stroke-dasharray');
    
    // Fill should be gray
    expect(svg).toContain('#424242');
  });

  it('should clamp overheal (>100%) to 100% fill but show actual HP text', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 120, 100, 120);
    const svg = renderCharacterCircle(data);
    
    // Should show actual HP text
    expect(svg).toContain('120/100');
    
    // Fill height should be clamped to 100% (80 pixels for radius 40)
    expect(svg).toContain('height="80"'); // Clamped to (100/100) * 40 * 2
  });

  it('should position fill rect to anchor at bottom and grow upward', () => {
    const position = createPosition('player-1', 200, 300, 40);
    const data = createCircleCharacterData('player-1', 'Hero', 50, 100, 50, true, [], null, position);
    const svg = renderCharacterCircle(data);
    
    // For 50% HP at y=300, radius=40:
    // Fill should start at y = 300 - 40 + (1 - 0.5) * 80 = 260 + 40 = 300
    // rect y should be at the midpoint for 50% fill
    expect(svg).toMatch(/y="300"/);
  });
});

describe('CharacterCircle - Border Colors', () => {
  it('should render player border in green (#4caf50)', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100, true);
    const svg = renderCharacterCircle(data);
    
    // Should have green border
    expect(svg).toContain('#4caf50');
    expect(svg).toContain('class="circle-border player"');
  });

  it('should render enemy border in red (#f44336)', () => {
    const data = createCircleCharacterData('enemy-1', 'Goblin', 100, 100, 100, false);
    const svg = renderCharacterCircle(data);
    
    // Should have red border
    expect(svg).toContain('#f44336');
    expect(svg).toContain('class="circle-border enemy"');
  });
});

describe('CharacterCircle - Status Effects Display', () => {
  it('should display status effects below circle', () => {
    const statuses = [
      createStatusEffect('shielded', 3, 20),
      createStatusEffect('poisoned', 2, 5),
    ];
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100, true, statuses);
    const svg = renderCharacterCircle(data);
    
    // Should show status effects
    expect(svg).toMatch(/shielded/i);
    expect(svg).toMatch(/poisoned/i);
    
    // Positioned below circle (y + radius + offset)
    const position = data.position;
    const expectedY = position.y + position.radius + 20;
    expect(svg).toContain(`y="${expectedY}"`);
  });

  it('should handle no status effects gracefully', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100, true, []);
    const svg = renderCharacterCircle(data);
    
    // Should not crash
    expect(svg).toBeTruthy();
  });
});

describe('CharacterCircle - Current Action Display', () => {
  it('should show action as "SkillName (ticks)" when queued', () => {
    const action = createAction('strike', 'player-1', ['enemy-1'], 3);
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100, true, [], action);
    const svg = renderCharacterCircle(data);
    
    // Should show skill name and ticks
    expect(svg).toMatch(/strike.*\(3\)/i);
  });

  it('should show "Executing!" when ticksRemaining is 0', () => {
    const action = createAction('strike', 'player-1', ['enemy-1'], 0);
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100, true, [], action);
    const svg = renderCharacterCircle(data);
    
    // Should show executing state
    expect(svg).toMatch(/executing/i);
  });

  it('should handle no action (idle state)', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100, true, [], null);
    const svg = renderCharacterCircle(data);
    
    // Should not crash and should not show action text
    expect(svg).toBeTruthy();
  });
});

describe('CharacterCircle - Character Name and HP Text', () => {
  it('should display character name above circle with unique color', () => {
    const position = createPosition('player-1', 100, 100, 40);
    const data = createCircleCharacterData('player-1', 'Valiant Hero', 100, 100, 100, true, [], null, position);
    const svg = renderCharacterCircle(data);
    
    // Should show name
    expect(svg).toContain('Valiant Hero');
    
    // Positioned above circle (y - radius - offset)
    const expectedY = position.y - position.radius - 10;
    expect(svg).toContain(`y="${expectedY}"`);
    
    // Should use unique color from getCharacterColor
    const expectedColor = getCharacterColor('player-1');
    expect(svg).toContain(`fill="${expectedColor}"`);
  });

  it('should display HP text centered in circle', () => {
    const position = createPosition('player-1', 100, 100, 40);
    const data = createCircleCharacterData('player-1', 'Hero', 75, 100, 75, true, [], null, position);
    const svg = renderCharacterCircle(data);
    
    // Should show HP text at circle center
    expect(svg).toContain('75/100');
    expect(svg).toContain(`x="${position.x}"`);
    expect(svg).toContain(`y="${position.y}"`);
  });
});

describe('CharacterCircle - SVG Structure', () => {
  it('should contain SVG group element with character ID', () => {
    const data = createCircleCharacterData('player-42', 'Hero', 100, 100, 100);
    const svg = renderCharacterCircle(data);
    
    // Should have group with data attribute
    expect(svg).toContain('<g');
    expect(svg).toContain('data-character-id="player-42"');
  });

  it('should contain circle element for border', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100);
    const svg = renderCharacterCircle(data);
    
    // Should have circle element
    expect(svg).toContain('<circle');
    expect(svg).toContain('class="circle-border');
  });

  it('should contain rect element for HP fill with clipPath', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 50, 100, 50);
    const svg = renderCharacterCircle(data);
    
    // Should have rect for fill
    expect(svg).toContain('<rect');
    expect(svg).toContain('class="hp-fill');
    
    // Should use clipPath
    expect(svg).toContain('clip-path');
    expect(svg).toContain('clipPath');
  });

  it('should contain text elements for HP, name, and status', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100);
    const svg = renderCharacterCircle(data);
    
    // Should have multiple text elements
    expect(svg).toContain('<text');
    expect(svg).toContain('class="hp-text"');
    expect(svg).toContain('class="character-name"');
  });

  it('should return valid SVG string', () => {
    const data = createCircleCharacterData('player-1', 'Hero', 100, 100, 100);
    const svg = renderCharacterCircle(data);
    
    // Should be a string
    expect(typeof svg).toBe('string');
    
    // Should have proper structure
    expect(svg).toMatch(/<g/);
    expect(svg).toMatch(/<\/g>/);
  });
});
