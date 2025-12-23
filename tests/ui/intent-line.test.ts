import { describe, it, expect } from 'vitest';
import { renderIntentLine, SKILL_COLORS } from '../../src/ui/intent-line.js';
import type { IntentLine } from '../../src/types/visualization.js';

describe('IntentLine Renderer', () => {
  describe('Line Style Based on Execution State', () => {
    it('should render solid line with 3px width for executing action (ticksRemaining=0)', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 0,
        lineStyle: 'solid',
        color: '#f44336',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 100 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('stroke-width="3"');
      expect(svg).toContain('class="intent-line solid"');
      expect(svg).not.toContain('stroke-dasharray');
    });

    it('should render dashed line with 2px width for queued action (ticksRemaining>0)', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 3,
        lineStyle: 'dashed',
        color: '#f44336',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 100 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('stroke-width="2"');
      expect(svg).toContain('stroke-dasharray="8,4"');
      expect(svg).toContain('class="intent-line dashed"');
    });
  });

  describe('Skill Color Mapping', () => {
    it('should use red color for strike skill', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#f44336',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 100 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('stroke="#f44336"');
      expect(SKILL_COLORS['strike']).toBe('#f44336');
    });

    it('should use darker red for heavy-strike skill', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'heavy-strike',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#d32f2f',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 100 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('stroke="#d32f2f"');
      expect(SKILL_COLORS['heavy-strike']).toBe('#d32f2f');
    });

    it('should use green color for heal skill', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'player2',
        skillId: 'heal',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#4caf50',
        startPos: { x: 100, y: 400 },
        endPos: { x: 300, y: 400 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('stroke="#4caf50"');
      expect(SKILL_COLORS['heal']).toBe('#4caf50');
    });

    it('should use blue color for shield skill', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'player1',
        skillId: 'shield',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#2196f3',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 400 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('stroke="#2196f3"');
      expect(SKILL_COLORS['shield']).toBe('#2196f3');
    });

    it('should use purple color for poison skill', () => {
      const line: IntentLine = {
        casterId: 'enemy1',
        targetId: 'player1',
        skillId: 'poison',
        ticksRemaining: 2,
        lineStyle: 'dashed',
        color: '#9c27b0',
        startPos: { x: 100, y: 100 },
        endPos: { x: 100, y: 400 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('stroke="#9c27b0"');
      expect(SKILL_COLORS['poison']).toBe('#9c27b0');
    });

    it('should use default gold color for unknown skill', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'custom-unknown-skill',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#ffd700',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 100 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('stroke="#ffd700"');
      expect(SKILL_COLORS['default']).toBe('#ffd700');
    });
  });

  describe('SVG Structure and Attributes', () => {
    it('should include arrowhead marker definition', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#f44336',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 100 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('<marker');
      expect(svg).toContain('markerWidth="10"');
      expect(svg).toContain('markerHeight="10"');
      expect(svg).toContain('orient="auto"');
      expect(svg).toContain('<polygon');
      expect(svg).toContain('points="0 0, 10 3, 0 6"');
    });

    it('should include line element with correct coordinates', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#f44336',
        startPos: { x: 100, y: 400 },
        endPos: { x: 200, y: 150 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('x1="100"');
      expect(svg).toContain('y1="400"');
      expect(svg).toContain('x2="200"');
      expect(svg).toContain('y2="150"');
    });

    it('should include data attributes for caster, target, and skill', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#f44336',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 100 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('data-caster-id="player1"');
      expect(svg).toContain('data-target-id="enemy1"');
      expect(svg).toContain('data-skill-id="strike"');
    });

    it('should apply marker-end to point arrowhead toward target', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#f44336',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 100 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('marker-end="url(#arrowhead-');
      expect(svg).toMatch(/marker-end="url\(#arrowhead-[^"]+\)"/);
    });
  });

  describe('Line Endpoint Positioning', () => {
    it('should connect at circle edges for vertical line', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 0,
        lineStyle: 'solid',
        color: '#f44336',
        startPos: { x: 100, y: 360 }, // Caster circle edge (y=400, radius=40, edge at y=360)
        endPos: { x: 100, y: 140 }, // Target circle edge (y=100, radius=40, edge at y=140)
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('y1="360"');
      expect(svg).toContain('y2="140"');
    });

    it('should connect at circle edges for horizontal line', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'player2',
        skillId: 'heal',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#4caf50',
        startPos: { x: 140, y: 400 }, // Caster circle edge (x=100, radius=40, edge at x=140)
        endPos: { x: 260, y: 400 }, // Target circle edge (x=300, radius=40, edge at x=260)
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('x1="140"');
      expect(svg).toContain('x2="260"');
      expect(svg).toContain('y1="400"');
      expect(svg).toContain('y2="400"');
    });

    it('should connect at circle edges for diagonal line', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#f44336',
        startPos: { x: 128, y: 372 }, // Edge of circle toward target
        endPos: { x: 272, y: 128 }, // Edge of circle toward caster
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('x1="128"');
      expect(svg).toContain('y1="372"');
      expect(svg).toContain('x2="272"');
      expect(svg).toContain('y2="128"');
    });
  });

  describe('Self-Targeting Loopback', () => {
    it('should handle self-target (caster = target)', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'player1',
        skillId: 'shield',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#2196f3',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 400 },
      };

      const svg = renderIntentLine(line);

      // For self-target, the line should still render (may be a point or arc)
      expect(svg).toContain('data-caster-id="player1"');
      expect(svg).toContain('data-target-id="player1"');
      expect(svg).toContain('stroke="#2196f3"');
    });
  });

  describe('Additional Skill Colors', () => {
    it('should have color mappings for all common damage skills', () => {
      expect(SKILL_COLORS['fireball']).toBe('#ff5722');
      expect(SKILL_COLORS['execute']).toBe('#b71c1c');
      expect(SKILL_COLORS['bash']).toBe('#e91e63');
    });

    it('should have color mappings for defensive skills', () => {
      expect(SKILL_COLORS['defend']).toBe('#1976d2');
    });

    it('should have color mappings for debuff skills', () => {
      expect(SKILL_COLORS['stun']).toBe('#673ab7');
    });

    it('should have color mappings for utility skills', () => {
      expect(SKILL_COLORS['taunt']).toBe('#ff9800');
      expect(SKILL_COLORS['interrupt']).toBe('#ffc107');
    });

    it('should have color mapping for revive skill', () => {
      expect(SKILL_COLORS['revive']).toBe('#66bb6a');
    });
  });

  describe('Edge Cases', () => {
    it('should handle floating point coordinates', () => {
      const line: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 0,
        lineStyle: 'solid',
        color: '#f44336',
        startPos: { x: 100.5, y: 400.75 },
        endPos: { x: 200.25, y: 150.33 },
      };

      const svg = renderIntentLine(line);

      expect(svg).toContain('x1="100.5"');
      expect(svg).toContain('y1="400.75"');
      expect(svg).toContain('x2="200.25"');
      expect(svg).toContain('y2="150.33"');
    });

    it('should create unique marker IDs for different lines', () => {
      const line1: IntentLine = {
        casterId: 'player1',
        targetId: 'enemy1',
        skillId: 'strike',
        ticksRemaining: 0,
        lineStyle: 'solid',
        color: '#f44336',
        startPos: { x: 100, y: 400 },
        endPos: { x: 100, y: 100 },
      };

      const line2: IntentLine = {
        casterId: 'player2',
        targetId: 'enemy2',
        skillId: 'heal',
        ticksRemaining: 1,
        lineStyle: 'dashed',
        color: '#4caf50',
        startPos: { x: 300, y: 400 },
        endPos: { x: 300, y: 100 },
      };

      const svg1 = renderIntentLine(line1);
      const svg2 = renderIntentLine(line2);

      // Extract marker IDs (they should be unique)
      const markerId1Match = svg1.match(/id="(arrowhead-[^"]+)"/);
      const markerId2Match = svg2.match(/id="(arrowhead-[^"]+)"/);

      expect(markerId1Match).not.toBeNull();
      expect(markerId2Match).not.toBeNull();
      expect(markerId1Match![1]).not.toBe(markerId2Match![1]);
    });
  });
});
