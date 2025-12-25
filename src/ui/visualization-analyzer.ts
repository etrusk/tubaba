import type { CombatState } from '../types/combat.js';
import type {
  BattleVisualization,
  CircleCharacterData,
  IntentLine,
  CharacterPosition,
} from '../types/visualization.js';
import type { ActionForecast } from '../types/forecast.js';
import { calculateCharacterPositions } from './battle-arena-layout.js';
import { SKILL_COLORS } from './intent-line.js';

/**
 * Transform CombatState into BattleVisualization data structure
 * Based on spec lines 334-360
 *
 * Algorithm:
 * 1. Calculate character positions using layout algorithm
 * 2. Build CircleCharacterData[] from players + enemies
 * 3. Build IntentLine[] from character actions
 * 4. Build predicted IntentLine[] from forecast (if provided)
 * 5. Return complete BattleVisualization
 *
 * @param state - Current combat state
 * @param forecast - Optional action forecast for predicted intent lines
 * @returns Battle visualization data ready for rendering
 */
export function analyzeVisualization(
  state: CombatState,
  forecast?: ActionForecast
): BattleVisualization {
  const arenaDimensions = { width: 800, height: 500 };
  
  // Step 1: Calculate character positions
  const positions = calculateCharacterPositions(
    state.players,
    state.enemies,
    arenaDimensions
  );
  
  // Create position lookup map for efficiency
  const positionMap = new Map<string, CharacterPosition>();
  for (const pos of positions) {
    positionMap.set(pos.characterId, pos);
  }
  
  // Step 2: Build CircleCharacterData[] from all characters
  const characters: CircleCharacterData[] = [];
  
  // Add players
  for (const player of state.players) {
    const position = positionMap.get(player.id);
    if (!position) continue; // Defensive: skip if no position found
    
    characters.push({
      id: player.id,
      name: player.name,
      currentHp: player.currentHp,
      maxHp: player.maxHp,
      hpPercent: clampHpPercent((player.currentHp / player.maxHp) * 100),
      statusEffects: player.statusEffects,
      currentAction: player.currentAction,
      isPlayer: true,
      position,
    });
  }
  
  // Add enemies
  for (const enemy of state.enemies) {
    const position = positionMap.get(enemy.id);
    if (!position) continue; // Defensive: skip if no position found
    
    characters.push({
      id: enemy.id,
      name: enemy.name,
      currentHp: enemy.currentHp,
      maxHp: enemy.maxHp,
      hpPercent: clampHpPercent((enemy.currentHp / enemy.maxHp) * 100),
      statusEffects: enemy.statusEffects,
      currentAction: enemy.currentAction,
      isPlayer: false,
      position,
    });
  }
  
  // Step 3: Build IntentLine[] from character actions
  const intentLines: IntentLine[] = [];
  
  // Create character lookup for target validation
  const characterMap = new Map(
    [...state.players, ...state.enemies].map(char => [char.id, char])
  );
  
  // Process all characters with current actions (solid/dashed lines based on ticksRemaining)
  for (const character of [...state.players, ...state.enemies]) {
    // Skip if no action
    if (character.currentAction === null) continue;
    
    // Skip if caster is dead (AC72: Dead character handling)
    if (character.currentHp === 0) continue;
    
    const action = character.currentAction;
    const casterPosition = positionMap.get(character.id);
    if (!casterPosition) continue;
    
    // Create intent line for each target
    for (const targetId of action.targets) {
      const target = characterMap.get(targetId);
      const targetPosition = positionMap.get(targetId);
      
      if (!target || !targetPosition) continue;
      
      // Skip dead targets UNLESS skill is 'revive' (AC72: revive exception)
      if (target.currentHp === 0 && action.skillId !== 'revive') {
        continue;
      }
      
      // Determine line style based on ticksRemaining
      const lineStyle = action.ticksRemaining === 0 ? 'solid' : 'dashed';
      
      // Map skill to color (with fallback to default)
      const color = SKILL_COLORS[action.skillId] ?? SKILL_COLORS['default'] ?? '#ffd700';
      
      // Calculate edge positions (spec lines 275-284)
      const edgePositions = calculateEdgePositions(
        casterPosition,
        targetPosition
      );
      
      intentLines.push({
        casterId: character.id,
        targetId,
        skillId: action.skillId,
        ticksRemaining: action.ticksRemaining,
        lineStyle,
        color,
        startPos: edgePositions.start,
        endPos: edgePositions.end,
      });
    }
  }
  
  // Step 4: Build predicted IntentLine[] from forecast (dashed lines for next actions)
  if (forecast) {
    for (const characterForecast of forecast.characterForecasts) {
      // Only show predicted lines for characters without current actions
      const character = characterMap.get(characterForecast.characterId);
      if (!character || character.currentAction !== null) continue;
      
      // Skip dead characters
      if (character.currentHp === 0) continue;
      
      // Skip if no predicted next action
      if (!characterForecast.nextAction) continue;
      
      const casterPosition = positionMap.get(characterForecast.characterId);
      if (!casterPosition) continue;
      
      // Find skill ID from character's skills by matching name
      const skill = character.skills.find(s => s.name === characterForecast.nextAction!.skillName);
      const skillId = skill?.id ?? 'default';
      
      // Create predicted intent lines for each target
      for (const targetName of characterForecast.nextAction.targetNames) {
        // Find target by name
        const target = [...state.players, ...state.enemies].find(c => c.name === targetName);
        if (!target) continue;
        
        const targetPosition = positionMap.get(target.id);
        if (!targetPosition) continue;
        
        // Skip dead targets UNLESS skill is 'revive'
        if (target.currentHp === 0 && skillId !== 'revive') {
          continue;
        }
        
        // Predicted actions are always dashed
        const lineStyle = 'dashed';
        
        // Map skill to color (with fallback to default)
        const color = SKILL_COLORS[skillId] ?? SKILL_COLORS['default'] ?? '#ffd700';
        
        // Calculate edge positions
        const edgePositions = calculateEdgePositions(
          casterPosition,
          targetPosition
        );
        
        intentLines.push({
          casterId: characterForecast.characterId,
          targetId: target.id,
          skillId,
          ticksRemaining: 1, // Predicted actions will happen next tick
          lineStyle,
          color,
          startPos: edgePositions.start,
          endPos: edgePositions.end,
        });
      }
    }
  }
  
  // Step 5: Calculate curve control points to prevent overlapping lines
  const controlPoints = calculateCurveControlPoints(intentLines, positionMap);
  
  // Apply control points to intent lines
  const curvedLines = intentLines.map((line, index) => {
    const controlPoint = controlPoints.get(index);
    if (!controlPoint) return line;
    
    return {
      ...line,
      controlPoint,
    };
  });
  
  return {
    characters,
    intentLines: curvedLines,
    arenaDimensions,
  };
}

/**
 * Clamp HP percentage to 0-100 range
 * 
 * @param hpPercent - Raw HP percentage
 * @returns Clamped value between 0 and 100
 */
function clampHpPercent(hpPercent: number): number {
  return Math.max(0, Math.min(100, hpPercent));
}

/**
 * Calculate curve control points to prevent overlapping lines.
 * Lines sharing the same endpoints get curved in opposite directions.
 *
 * @param lines - Intent lines to process
 * @param positionMap - Character positions for midpoint/perpendicular calculations
 * @returns Map of line index to control point { x, y }
 */
function calculateCurveControlPoints(
  lines: IntentLine[],
  positionMap: Map<string, CharacterPosition>
): Map<number, { x: number; y: number }> {
  const CURVE_OFFSET = 30; // Perpendicular offset distance in pixels
  const controlPoints = new Map<number, { x: number; y: number }>();
  
  // Group lines by endpoint pair (A-B, regardless of direction)
  const linesByEndpoints = new Map<string, number[]>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Skip self-targeting lines (would need loop arc, different logic)
    if (line.casterId === line.targetId) continue;
    
    // Create sorted pair key so A→B and B→A group together
    const pairKey = [line.casterId, line.targetId].sort().join('-');
    
    if (!linesByEndpoints.has(pairKey)) {
      linesByEndpoints.set(pairKey, []);
    }
    linesByEndpoints.get(pairKey)!.push(i);
  }
  
  // Calculate control points for overlapping line groups
  for (const [_pairKey, lineIndices] of linesByEndpoints) {
    // Single line: no curve needed (stays straight)
    if (lineIndices.length < 2) continue;
    
    // Get the two endpoints (characters)
    const firstLine = lines[lineIndices[0]!];
    if (!firstLine) continue;
    
    const pos1 = positionMap.get(firstLine.casterId);
    const pos2 = positionMap.get(firstLine.targetId);
    if (!pos1 || !pos2) continue;
    
    // Calculate midpoint between the two characters
    const midX = (pos1.x + pos2.x) / 2;
    const midY = (pos1.y + pos2.y) / 2;
    
    // Calculate perpendicular direction
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) continue; // Characters at same position
    
    // Perpendicular vector (rotate 90 degrees)
    const perpX = -dy / length;
    const perpY = dx / length;
    
    // Assign alternating offsets: +offset, -offset, +2*offset, -2*offset, ...
    for (let i = 0; i < lineIndices.length; i++) {
      const lineIndex = lineIndices[i];
      if (lineIndex === undefined) continue;
      
      // Alternate between positive and negative offsets
      const offsetMultiplier = Math.floor((i + 1) / 2) * (i % 2 === 0 ? 1 : -1);
      const offset = CURVE_OFFSET * offsetMultiplier;
      
      const controlPoint = {
        x: midX + perpX * offset,
        y: midY + perpY * offset,
      };
      
      controlPoints.set(lineIndex, controlPoint);
    }
  }
  
  return controlPoints;
}

/**
 * Calculate line start/end positions at circle edges
 * Based on spec lines 275-284 (trigonometry)
 *
 * @param casterPos - Caster circle position
 * @param targetPos - Target circle position
 * @returns Start and end positions at circle edges
 */
function calculateEdgePositions(
  casterPos: CharacterPosition,
  targetPos: CharacterPosition
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const casterX = casterPos.x;
  const casterY = casterPos.y;
  const casterRadius = casterPos.radius;
  
  const targetX = targetPos.x;
  const targetY = targetPos.y;
  const targetRadius = targetPos.radius;
  
  // Calculate angle between centers
  const dx = targetX - casterX;
  const dy = targetY - casterY;
  const angle = Math.atan2(dy, dx);
  
  // Start point: caster circle edge (toward target)
  const startX = casterX + casterRadius * Math.cos(angle);
  const startY = casterY + casterRadius * Math.sin(angle);
  
  // End point: target circle edge (opposite direction)
  const endX = targetX + targetRadius * Math.cos(angle + Math.PI);
  const endY = targetY + targetRadius * Math.sin(angle + Math.PI);
  
  return {
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
  };
}
