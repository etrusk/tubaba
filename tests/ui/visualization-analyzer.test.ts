import { describe, it, expect } from 'vitest';
import { analyzeVisualization } from '../../src/ui/visualization-analyzer.js';
import type { CombatState } from '../../src/types/combat.js';
import type { Character } from '../../src/types/character.js';
import type { IntentLine, CircleCharacterData } from '../../src/types/visualization.js';

/**
 * Test suite for VisualizationAnalyzer
 * Transforms CombatState into BattleVisualization data
 * Based on spec lines 334-360
 */

describe('VisualizationAnalyzer', () => {
  describe('Intent Line Generation', () => {
    it('should return empty intentLines array when no actions are queued (idle battle)', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toEqual([]);
    });

    it('should generate 1 intent line for single action with 1 target', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'strike',
          casterId: 'p1',
          targets: ['e1'],
          ticksRemaining: 2,
        },
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [player.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toHaveLength(1);
      expect(result.intentLines[0]).toMatchObject({
        casterId: 'p1',
        targetId: 'e1',
        skillId: 'strike',
        ticksRemaining: 2,
        lineStyle: 'dashed',
      });
    });

    it('should generate 3 intent lines for 3 different casters', () => {
      const player1: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'strike',
          casterId: 'p1',
          targets: ['e1'],
          ticksRemaining: 2,
        },
        isPlayer: true,
      };

      const player2: Character = {
        id: 'p2',
        name: 'Mage',
        maxHp: 80,
        currentHp: 80,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'heal',
          casterId: 'p2',
          targets: ['p1'],
          ticksRemaining: 1,
        },
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'bash',
          casterId: 'e1',
          targets: ['p1'],
          ticksRemaining: 3,
        },
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player1, player2],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [player1.currentAction!, player2.currentAction!, enemy.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toHaveLength(3);
      expect(result.intentLines.map((line: IntentLine) => line.casterId)).toEqual(['p1', 'p2', 'e1']);
    });

    it('should generate 3 intent lines for 1 action with 3 targets (multi-target)', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'fireball',
          casterId: 'p1',
          targets: ['e1', 'e2', 'e3'],
          ticksRemaining: 2,
        },
        isPlayer: true,
      };

      const enemies: Character[] = [
        {
          id: 'e1',
          name: 'Goblin1',
          maxHp: 50,
          currentHp: 50,
          skills: [],
          statusEffects: [],
          currentAction: null,
          isPlayer: false,
        },
        {
          id: 'e2',
          name: 'Goblin2',
          maxHp: 50,
          currentHp: 50,
          skills: [],
          statusEffects: [],
          currentAction: null,
          isPlayer: false,
        },
        {
          id: 'e3',
          name: 'Goblin3',
          maxHp: 50,
          currentHp: 50,
          skills: [],
          statusEffects: [],
          currentAction: null,
          isPlayer: false,
        },
      ];

      const state: CombatState = {
        players: [player],
        enemies,
        tickNumber: 0,
        actionQueue: [player.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toHaveLength(3);
      expect(result.intentLines.map((line: IntentLine) => line.targetId)).toEqual(['e1', 'e2', 'e3']);
      expect(result.intentLines.every((line: IntentLine) => line.casterId === 'p1')).toBe(true);
    });

    it('should generate correct line styles for mixed queue states (dashed vs solid)', () => {
      const player1: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'strike',
          casterId: 'p1',
          targets: ['e1'],
          ticksRemaining: 2,
        },
        isPlayer: true,
      };

      const player2: Character = {
        id: 'p2',
        name: 'Mage',
        maxHp: 80,
        currentHp: 80,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'heal',
          casterId: 'p2',
          targets: ['p1'],
          ticksRemaining: 3,
        },
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'bash',
          casterId: 'e1',
          targets: ['p1'],
          ticksRemaining: 0, // Executing now
        },
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player1, player2],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [player1.currentAction!, player2.currentAction!, enemy.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toHaveLength(3);
      
      const p1Line = result.intentLines.find((line: IntentLine) => line.casterId === 'p1');
      const p2Line = result.intentLines.find((line: IntentLine) => line.casterId === 'p2');
      const e1Line = result.intentLines.find((line: IntentLine) => line.casterId === 'e1');

      expect(p1Line?.lineStyle).toBe('dashed');
      expect(p2Line?.lineStyle).toBe('dashed');
      expect(e1Line?.lineStyle).toBe('solid'); // Executing
    });

    it('should generate loopback line for self-targeting action', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'defend',
          casterId: 'p1',
          targets: ['p1'], // Self-target
          ticksRemaining: 1,
        },
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [player.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toHaveLength(1);
      expect(result.intentLines[0]).toMatchObject({
        casterId: 'p1',
        targetId: 'p1',
        skillId: 'defend',
      });
    });

    it('should not generate intent line when caster is dead (currentHp = 0)', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 0, // Dead
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'strike',
          casterId: 'p1',
          targets: ['e1'],
          ticksRemaining: 2,
        },
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [player.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toEqual([]);
    });

    it('should not generate intent line when target is dead (attack skill)', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'strike',
          casterId: 'p1',
          targets: ['e1'],
          ticksRemaining: 2,
        },
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 0, // Dead
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [player.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toEqual([]);
    });

    it('should generate intent line when target is dead BUT skill is revive', () => {
      const player1: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'revive',
          casterId: 'p1',
          targets: ['p2'], // Dead ally
          ticksRemaining: 3,
        },
        isPlayer: true,
      };

      const player2: Character = {
        id: 'p2',
        name: 'Mage',
        maxHp: 80,
        currentHp: 0, // Dead
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player1, player2],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [player1.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toHaveLength(1);
      expect(result.intentLines[0]).toMatchObject({
        casterId: 'p1',
        targetId: 'p2',
        skillId: 'revive',
      });
    });
  });

  describe('Character Data Transformation', () => {
    it('should assign correct character positions from layout algorithm', () => {
      const players: Character[] = [
        {
          id: 'p1',
          name: 'Hero',
          maxHp: 100,
          currentHp: 100,
          skills: [],
          statusEffects: [],
          currentAction: null,
          isPlayer: true,
        },
        {
          id: 'p2',
          name: 'Mage',
          maxHp: 80,
          currentHp: 80,
          skills: [],
          statusEffects: [],
          currentAction: null,
          isPlayer: true,
        },
      ];

      const enemies: Character[] = [
        {
          id: 'e1',
          name: 'Goblin1',
          maxHp: 50,
          currentHp: 50,
          skills: [],
          statusEffects: [],
          currentAction: null,
          isPlayer: false,
        },
        {
          id: 'e2',
          name: 'Goblin2',
          maxHp: 50,
          currentHp: 50,
          skills: [],
          statusEffects: [],
          currentAction: null,
          isPlayer: false,
        },
      ];

      const state: CombatState = {
        players,
        enemies,
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.characters).toHaveLength(4);
      
      // Verify all characters have valid positions
      result.characters.forEach((char: CircleCharacterData) => {
        expect(char.position).toBeDefined();
        expect(char.position.x).toBeGreaterThan(0);
        expect(char.position.y).toBeGreaterThan(0);
        expect(char.position.radius).toBe(40); // Standard radius
      });

      // Verify players are in bottom row (y = 400) and enemies in top row (y = 100)
      const playerChars = result.characters.filter((c: CircleCharacterData) => c.isPlayer);
      const enemyChars = result.characters.filter((c: CircleCharacterData) => !c.isPlayer);

      expect(playerChars.every((c: CircleCharacterData) => c.position.y === 400)).toBe(true);
      expect(enemyChars.every((c: CircleCharacterData) => c.position.y === 100)).toBe(true);
    });

    it('should correctly calculate HP percentages from currentHp/maxHp', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 75,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 10,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      const playerChar = result.characters.find((c: CircleCharacterData) => c.id === 'p1');
      const enemyChar = result.characters.find((c: CircleCharacterData) => c.id === 'e1');

      expect(playerChar?.hpPercent).toBe(75);
      expect(enemyChar?.hpPercent).toBe(20);
    });

    it('should copy status effects to visualization data', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [
          { type: 'shielded', duration: 3, value: 50 },
          { type: 'defending', duration: 2 },
        ],
        currentAction: null,
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      const playerChar = result.characters.find((c: CircleCharacterData) => c.id === 'p1');

      expect(playerChar?.statusEffects).toHaveLength(2);
      expect(playerChar?.statusEffects[0]).toMatchObject({
        type: 'shielded',
        duration: 3,
        value: 50,
      });
      expect(playerChar?.statusEffects[1]).toMatchObject({
        type: 'defending',
        duration: 2,
      });
    });

    it('should pass through arena dimensions correctly', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.arenaDimensions).toEqual({ width: 800, height: 500 });
    });

    it('should clamp HP percentage to 0-100 range', () => {
      const player1: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 120, // Overheal
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      const player2: Character = {
        id: 'p2',
        name: 'Mage',
        maxHp: 100,
        currentHp: 0, // Dead
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player1, player2],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      const overhealedChar = result.characters.find((c: CircleCharacterData) => c.id === 'p1');
      const deadChar = result.characters.find((c: CircleCharacterData) => c.id === 'p2');

      expect(overhealedChar?.hpPercent).toBe(100); // Clamped to 100
      expect(deadChar?.hpPercent).toBe(0);
    });
  });

  describe('Intent Line Positioning', () => {
    it('should calculate correct start and end positions at circle edges', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'strike',
          casterId: 'p1',
          targets: ['e1'],
          ticksRemaining: 1,
        },
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [player.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toHaveLength(1);
      
      const line = result.intentLines[0];
      
      // Start and end positions should be defined
      expect(line.startPos).toBeDefined();
      expect(line.endPos).toBeDefined();
      expect(line.startPos.x).toBeGreaterThan(0);
      expect(line.startPos.y).toBeGreaterThan(0);
      expect(line.endPos.x).toBeGreaterThan(0);
      expect(line.endPos.y).toBeGreaterThan(0);

      // Line should not start/end at character centers (should be at edges)
      // Player is at y=400, enemy at y=100
      // Start should be near player position but not exactly at center
      // End should be near enemy position but not exactly at center
    });

    it('should apply correct skill colors to intent lines', () => {
      const player: Character = {
        id: 'p1',
        name: 'Hero',
        maxHp: 100,
        currentHp: 100,
        skills: [],
        statusEffects: [],
        currentAction: {
          skillId: 'heal',
          casterId: 'p1',
          targets: ['p1'],
          ticksRemaining: 1,
        },
        isPlayer: true,
      };

      const enemy: Character = {
        id: 'e1',
        name: 'Goblin',
        maxHp: 50,
        currentHp: 50,
        skills: [],
        statusEffects: [],
        currentAction: null,
        isPlayer: false,
      };

      const state: CombatState = {
        players: [player],
        enemies: [enemy],
        tickNumber: 0,
        actionQueue: [player.currentAction!],
        eventLog: [],
        battleStatus: 'ongoing',
      };

      const result = analyzeVisualization(state);

      expect(result.intentLines).toHaveLength(1);
      
      // Heal skill should have green color
      expect(result.intentLines[0].color).toBe('#4caf50');
    });
  });
});
