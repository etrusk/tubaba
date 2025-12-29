import type { CombatState } from '../types/combat.js';
import type { Character } from '../types/character.js';
import type { CharacterInstructions, SkillInstruction } from '../types/instructions.js';
import type { ActionForecast, ActionTimelineEntry, CharacterForecast, RuleSummary } from '../types/forecast.js';
import type { Condition, TargetingMode } from '../types/skill.js';
import { selectAction } from '../ai/action-selector.js';

/**
 * Forecast next actions for all characters
 * Combines queued actions with predictions based on AI instructions
 */
export function forecastNextActions(
  state: CombatState,
  instructions: Map<string, CharacterInstructions>
): ActionForecast {
  const timeline: ActionTimelineEntry[] = [];
  const characterForecasts: CharacterForecast[] = [];
  
  const allCharacters = [...state.players, ...state.enemies];
  
  // Build character forecasts and collect timeline entries
  for (const character of allCharacters) {
    // Skip dead characters
    if (character.currentHp <= 0) {
      continue;
    }
    
    const characterInstructions = instructions.get(character.id);
    
    // Add current action to timeline if exists
    if (character.currentAction) {
      const timelineEntry = buildTimelineEntryFromQueuedAction(
        character,
        character.currentAction,
        state.tickNumber,
        allCharacters
      );
      timeline.push(timelineEntry);
    }
    
    // Build character forecast
    const forecast = buildCharacterForecast(
      character,
      characterInstructions,
      state,
      allCharacters
    );
    characterForecasts.push(forecast);
    
    // Add prediction to timeline if exists and character is idle
    if (!character.currentAction && forecast.nextAction) {
      const timelineEntry: ActionTimelineEntry = {
        tickNumber: state.tickNumber + 1, // Next tick
        characterId: character.id,
        characterName: character.name,
        skillName: forecast.nextAction.skillName,
        targetNames: forecast.nextAction.targetNames,
        isQueued: false,
      };
      timeline.push(timelineEntry);
    }
  }
  
  // Sort timeline by tick number, then by character type (players first), then by ID
  timeline.sort((a, b) => {
    if (a.tickNumber !== b.tickNumber) {
      return a.tickNumber - b.tickNumber;
    }
    // For same tick, players come before enemies
    const aChar = allCharacters.find(c => c.id === a.characterId);
    const bChar = allCharacters.find(c => c.id === b.characterId);
    if (aChar && bChar && aChar.isPlayer !== bChar.isPlayer) {
      return aChar.isPlayer ? -1 : 1;
    }
    // Same type, use character ID for deterministic ordering
    return a.characterId.localeCompare(b.characterId);
  });
  
  // Limit to next 5 actions
  const limitedTimeline = timeline.slice(0, 5);
  
  return {
    timeline: limitedTimeline,
    characterForecasts,
  };
}

/**
 * Build timeline entry from a queued action
 */
function buildTimelineEntryFromQueuedAction(
  character: Character,
  action: NonNullable<Character['currentAction']>,
  currentTick: number,
  allCharacters: Character[]
): ActionTimelineEntry {
  const skill = character.skills.find(s => s.id === action.skillId);
  const targetNames = action.targets.map((targetId: string) => {
    const target = allCharacters.find(c => c.id === targetId);
    return target?.name ?? 'Unknown';
  });
  
  return {
    tickNumber: currentTick + action.ticksRemaining,
    characterId: character.id,
    characterName: character.name,
    skillName: skill?.name ?? 'Unknown',
    targetNames,
    isQueued: true,
  };
}

/**
 * Build forecast for a single character
 */
function buildCharacterForecast(
  character: Character,
  instructions: CharacterInstructions | undefined,
  state: CombatState,
  allCharacters: Character[]
): CharacterForecast {
  const currentAction = character.currentAction
    ? buildCurrentActionInfo(character, character.currentAction, allCharacters)
    : null;
  
  const nextAction = predictNextAction(character, instructions, state, allCharacters);
  
  const rulesSummary = instructions
    ? buildRuleSummaries(character, instructions)
    : [];
  
  return {
    characterId: character.id,
    characterName: character.name,
    isPlayer: character.isPlayer,
    currentAction,
    nextAction,
    rulesSummary,
  };
}

/**
 * Build current action info from queued action
 */
function buildCurrentActionInfo(
  character: Character,
  action: NonNullable<Character['currentAction']>,
  allCharacters: Character[]
): NonNullable<CharacterForecast['currentAction']> {
  const skill = character.skills.find(s => s.id === action.skillId);
  const targetNames = action.targets.map((targetId: string) => {
    const target = allCharacters.find(c => c.id === targetId);
    return target?.name ?? 'Unknown';
  });
  
  return {
    skillName: skill?.name ?? 'Unknown',
    targetNames,
    ticksRemaining: action.ticksRemaining,
  };
}

/**
 * Predict next action using actual AI logic
 */
function predictNextAction(
  character: Character,
  instructions: CharacterInstructions | undefined,
  state: CombatState,
  _allCharacters: Character[]
): NonNullable<CharacterForecast['nextAction']> | null {
  // No prediction for human mode
  if (!instructions || instructions.controlMode === 'human') {
    return null;
  }
  
  // Check if stunned
  const isStunned = character.statusEffects.some(se => se.type === 'stunned');
  if (isStunned) {
    return null;
  }
  
  // selectAction expects enemies perspective (enemies array = allies, players array = enemies)
  // For player characters, we need to swap the arrays
  const adjustedState = character.isPlayer
    ? {
        ...state,
        players: state.enemies,  // Player's enemies become the "players" param
        enemies: state.players,  // Player's allies become the "enemies" param
      }
    : state;
  
  // Use actual selectAction logic with instructions
  const selection = selectAction(character, adjustedState, instructions);
  
  if (!selection) {
    return null;
  }
  
  // Find the matching rule to get the reason
  const matchingInstruction = findMatchingInstruction(
    instructions,
    selection.skill.id
  );
  
  const reason = matchingInstruction
    ? formatRuleName(matchingInstruction)
    : 'Always';
  
  const targetNames = selection.targets.map(t => t.name);
  
  return {
    skillName: selection.skill.name,
    targetNames,
    reason,
  };
}

/**
 * Find the matching instruction for a skill
 */
function findMatchingInstruction(
  instructions: CharacterInstructions,
  skillId: string
): SkillInstruction | undefined {
  return instructions.skillInstructions.find(
    si => si.skillId === skillId && si.enabled
  );
}

/**
 * Format rule name for display
 */
function formatRuleName(instruction: SkillInstruction): string {
  if (instruction.conditions.length === 0) {
    return 'Always';
  }
  
  const conditionTexts = instruction.conditions.map(formatCondition);
  return conditionTexts.join(' AND ');
}

/**
 * Format a single condition as human-readable text
 */
function formatCondition(condition: Condition): string {
  switch (condition.type) {
    case 'hp-below':
      return `HP < ${condition.threshold}%`;
    case 'ally-count':
      return `Ally Count > ${condition.threshold}`;
    case 'ally-has-status':
      return `Ally Has ${formatStatusType(condition.statusType ?? 'unknown')}`;
    case 'enemy-has-status':
      return `Enemy Has ${formatStatusType(condition.statusType ?? 'unknown')}`;
    case 'self-has-status':
      return `Self Has ${formatStatusType(condition.statusType ?? 'unknown')}`;
    default:
      return 'Unknown Condition';
  }
}

/**
 * Format status type for display
 */
function formatStatusType(statusType: string): string {
  return statusType.charAt(0).toUpperCase() + statusType.slice(1);
}

/**
 * Build rule summaries for a character
 */
function buildRuleSummaries(
  character: Character,
  instructions: CharacterInstructions
): RuleSummary[] {
  if (instructions.controlMode === 'human') {
    return [];
  }
  
  return instructions.skillInstructions.map(instruction => {
    const skill = character.skills.find(s => s.id === instruction.skillId);
    const conditionsText = instruction.conditions.length === 0
      ? 'Always'
      : 'If ' + instruction.conditions.map(formatCondition).join(' AND ');
    
    const targetingMode = instruction.targetingOverride
      ?? skill?.targeting
      ?? 'self';
    
    return {
      priority: instruction.priority,
      skillName: skill?.name ?? 'Unknown',
      tickCost: skill?.baseDuration ?? 0,
      conditionsText,
      targetingMode: formatTargetingMode(targetingMode),
      enabled: instruction.enabled,
    };
  });
}

/**
 * Format targeting mode for display
 */
function formatTargetingMode(mode: TargetingMode): string {
  switch (mode) {
    case 'self':
      return 'Self';
    case 'nearest-enemy':
      return 'Nearest Enemy';
    default:
      return 'Unknown';
  }
}
