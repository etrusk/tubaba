import { describe, it, expect } from 'vitest';
import { renderBattleVisualization } from '../../src/ui/battle-visualization.js';
import type { BattleVisualization, CircleCharacterData, IntentLine } from '../../src/types/visualization.js';

/**
 * Test suite for BattleVisualization renderer
 * Renders complete SVG battle arena from visualization data
 * Based on spec lines 362-390
 */

describe('BattleVisualization Renderer', () => {
  describe('SVG Structure', () => {
    it('should render valid SVG with empty layers when no characters present', () => {
      const visualization: BattleVisualization = {
        characters: [],
        intentLines: [],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('class="intent-lines-layer"');
      expect(svg).toContain('class="characters-layer"');
    });

    it('should render SVG with circles but no lines when characters present with no actions', () => {
      const character: CircleCharacterData = {
        id: 'p1',
        name: 'Hero',
        currentHp: 100,
        maxHp: 100,
        hpPercent: 100,
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
        position: { characterId: 'p1', x: 400, y: 400, radius: 40 },
      };

      const visualization: BattleVisualization = {
        characters: [character],
        intentLines: [],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      expect(svg).toContain('class="character-circle"');
      expect(svg).toContain('data-character-id="p1"');
      expect(svg).not.toContain('class="intent-line"');
    });

    it('should render SVG with both circles and lines for full battle', () => {
      const character1: CircleCharacterData = {
        id: 'p1',
        name: 'Hero',
        currentHp: 100,
        maxHp: 100,
        hpPercent: 100,
        statusEffects: [],
        currentAction: {
          skillId: 'strike',
          casterId: 'p1',
          targets: ['e1'],
          ticksRemaining: 2,
        },
        isPlayer: true,
        position: { characterId: 'p1', x: 400, y: 400, radius: 40 },
      };

      const character2: CircleCharacterData = {
        id: 'e1',
        name: 'Goblin',
        currentHp: 50,
        maxHp: 50,
        hpPercent: 100,
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
        position: { characterId: 'e1', x: 400, y: 100, radius: 40 },
      };

      const intentLine: IntentLine = {
        casterId: 'p1',
        targetId: 'e1',
        skillId: 'strike',
        ticksRemaining: 2,
        lineStyle: 'dashed',
        color: '#f44336',
        startPos: { x: 400, y: 360 },
        endPos: { x: 400, y: 140 },
      };

      const visualization: BattleVisualization = {
        characters: [character1, character2],
        intentLines: [intentLine],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      expect(svg).toContain('class="character-circle"');
      expect(svg).toContain('data-character-id="p1"');
      expect(svg).toContain('data-character-id="e1"');
      expect(svg).toContain('class="intent-line');
      expect(svg).toContain('data-caster-id="p1"');
      expect(svg).toContain('data-target-id="e1"');
    });

    it('should have correct layering with intent lines before characters (lines in background)', () => {
      const character: CircleCharacterData = {
        id: 'p1',
        name: 'Hero',
        currentHp: 100,
        maxHp: 100,
        hpPercent: 100,
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
        position: { characterId: 'p1', x: 400, y: 400, radius: 40 },
      };

      const intentLine: IntentLine = {
        casterId: 'p1',
        targetId: 'e1',
        skillId: 'strike',
        ticksRemaining: 2,
        lineStyle: 'dashed',
        color: '#f44336',
        startPos: { x: 400, y: 360 },
        endPos: { x: 400, y: 140 },
      };

      const visualization: BattleVisualization = {
        characters: [character],
        intentLines: [intentLine],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      // Check that intent-lines-layer appears before characters-layer in SVG
      const linesLayerIndex = svg.indexOf('class="intent-lines-layer"');
      const charactersLayerIndex = svg.indexOf('class="characters-layer"');

      expect(linesLayerIndex).toBeGreaterThan(-1);
      expect(charactersLayerIndex).toBeGreaterThan(-1);
      expect(linesLayerIndex).toBeLessThan(charactersLayerIndex);
    });

    it('should include viewBox attribute with grid-based dimensions (550x550)', () => {
      const visualization: BattleVisualization = {
        characters: [],
        intentLines: [],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      // Grid dimensions: 10 * 50 + 2 * 25 = 550
      expect(svg).toContain('viewBox="0 0 550 550"');
    });

    it('should include width and height attributes from grid configuration', () => {
      const visualization: BattleVisualization = {
        characters: [],
        intentLines: [],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      // Grid dimensions: 10 * 50 + 2 * 25 = 550
      expect(svg).toContain('width="550"');
      expect(svg).toContain('height="550"');
    });

    it('should have class "battle-arena-svg" on root SVG element', () => {
      const visualization: BattleVisualization = {
        characters: [],
        intentLines: [],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      expect(svg).toContain('class="battle-arena-svg"');
    });

    it('should contain intent-lines-layer group element', () => {
      const visualization: BattleVisualization = {
        characters: [],
        intentLines: [],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      expect(svg).toContain('<g class="intent-lines-layer">');
      expect(svg).toContain('</g>');
    });

    it('should contain characters-layer group element', () => {
      const visualization: BattleVisualization = {
        characters: [],
        intentLines: [],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      expect(svg).toContain('<g class="characters-layer">');
      expect(svg).toContain('</g>');
    });

    it('should use fixed grid dimensions regardless of visualization data', () => {
      const customDimensions = { width: 1000, height: 600 };
      
      const visualization: BattleVisualization = {
        characters: [],
        intentLines: [],
        arenaDimensions: customDimensions,
      };

      const svg = renderBattleVisualization(visualization);

      // Should use grid dimensions (550x550), not custom dimensions
      expect(svg).toContain('width="550"');
      expect(svg).toContain('height="550"');
      expect(svg).toContain('viewBox="0 0 550 550"');
    });
  });

  describe('Content Rendering', () => {
    it('should render multiple characters correctly', () => {
      const characters: CircleCharacterData[] = [
        {
          id: 'p1',
          name: 'Hero',
          currentHp: 100,
          maxHp: 100,
          hpPercent: 100,
          statusEffects: [],
          currentAction: null,
          isPlayer: true,
          position: { characterId: 'p1', x: 300, y: 400, radius: 40 },
        },
        {
          id: 'p2',
          name: 'Mage',
          currentHp: 80,
          maxHp: 80,
          hpPercent: 100,
          statusEffects: [],
          currentAction: null,
          isPlayer: true,
          position: { characterId: 'p2', x: 500, y: 400, radius: 40 },
        },
        {
          id: 'e1',
          name: 'Goblin',
          currentHp: 50,
          maxHp: 50,
          hpPercent: 100,
          statusEffects: [],
          currentAction: null,
          isPlayer: false,
          position: { characterId: 'e1', x: 400, y: 100, radius: 40 },
        },
      ];

      const visualization: BattleVisualization = {
        characters,
        intentLines: [],
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      expect(svg).toContain('data-character-id="p1"');
      expect(svg).toContain('data-character-id="p2"');
      expect(svg).toContain('data-character-id="e1"');
      expect(svg).toContain('Hero');
      expect(svg).toContain('Mage');
      expect(svg).toContain('Goblin');
    });

    it('should render multiple intent lines correctly', () => {
      const intentLines: IntentLine[] = [
        {
          casterId: 'p1',
          targetId: 'e1',
          skillId: 'strike',
          ticksRemaining: 2,
          lineStyle: 'dashed',
          color: '#f44336',
          startPos: { x: 300, y: 360 },
          endPos: { x: 400, y: 140 },
        },
        {
          casterId: 'p2',
          targetId: 'e1',
          skillId: 'fireball',
          ticksRemaining: 0,
          lineStyle: 'solid',
          color: '#ff5722',
          startPos: { x: 500, y: 360 },
          endPos: { x: 400, y: 140 },
        },
      ];

      const visualization: BattleVisualization = {
        characters: [],
        intentLines,
        arenaDimensions: { width: 800, height: 500 },
      };

      const svg = renderBattleVisualization(visualization);

      expect(svg).toContain('data-caster-id="p1"');
      expect(svg).toContain('data-caster-id="p2"');
      expect(svg).toContain('data-target-id="e1"');
      expect(svg).toContain('data-skill-id="strike"');
      expect(svg).toContain('data-skill-id="fireball"');
    });
  });
});
