import type { StatusEffect } from './status.js';
import type { Action } from './combat.js';

/**
 * Position data for a character circle in the battle arena
 */
export interface CharacterPosition {
  /** Character ID */
  characterId: string;
  /** X coordinate (center of circle) */
  x: number;
  /** Y coordinate (center of circle) */
  y: number;
  /** Circle radius */
  radius: number;
}

/**
 * Visual rendering data for a character circle
 */
export interface CircleCharacterData {
  /** Character ID */
  id: string;
  /** Display name */
  name: string;
  /** Current HP */
  currentHp: number;
  /** Maximum HP */
  maxHp: number;
  /** HP percentage (0-100) */
  hpPercent: number;
  /** Status effects to display */
  statusEffects: StatusEffect[];
  /** Current action (null if idle) */
  currentAction: Action | null;
  /** Player vs enemy */
  isPlayer: boolean;
  /** Position in arena */
  position: CharacterPosition;
}

/**
 * Intent line data connecting caster to target(s)
 */
export interface IntentLine {
  /** Caster character ID */
  casterId: string;
  /** Target character ID */
  targetId: string;
  /** Skill being used */
  skillId: string;
  /** Ticks remaining (0 = executing, >0 = queued) */
  ticksRemaining: number;
  /** Line style */
  lineStyle: 'solid' | 'dashed';
  /** Line color based on skill type */
  color: string;
  /** Start position (caster circle edge) */
  startPos: { x: number; y: number };
  /** End position (target circle edge) */
  endPos: { x: number; y: number };
}

/**
 * Complete battle visualization data
 */
export interface BattleVisualization {
  /** All character circles */
  characters: CircleCharacterData[];
  /** All intent lines */
  intentLines: IntentLine[];
  /** Arena dimensions */
  arenaDimensions: { width: number; height: number };
}

/**
 * Skill type to color mapping for intent lines
 */
export type SkillColorMap = {
  [skillId: string]: string;
};
