import type { ActionForecast, ActionTimelineEntry, CharacterForecast, RuleSummary } from '../types/forecast.js';
import { formatCharacterName } from './character-name-formatter.js';

/**
 * Renders the action forecast panel showing timeline, character predictions, and AI rules.
 */
export function renderActionForecast(forecast: ActionForecast): string {
  // Build character name to ID map for colorizing names with unique colors
  const nameToIdMap = buildCharacterNameToIdMap(forecast.characterForecasts);
  
  const timelineSection = renderTimeline(forecast.timeline, nameToIdMap);
  const characterSection = renderCharacterForecasts(forecast.characterForecasts, nameToIdMap);

  return `<div class="action-forecast">
  ${timelineSection}
  ${characterSection}
</div>`;
}

/**
 * Builds a map of character names to their IDs for color assignment
 */
function buildCharacterNameToIdMap(characters: CharacterForecast[]): Map<string, string> {
  const nameToIdMap = new Map<string, string>();
  for (const character of characters) {
    nameToIdMap.set(character.characterName, character.characterId);
  }
  return nameToIdMap;
}

/**
 * Renders the action timeline section
 */
function renderTimeline(timeline: ActionTimelineEntry[], nameToIdMap: Map<string, string>): string {
  const content = timeline.length > 0
    ? timeline.map(entry => renderTimelineEntry(entry, nameToIdMap)).join('\n    ')
    : '<div class="empty-timeline">No actions in timeline</div>';

  return `<div class="timeline-section">
    <h3>⏱️ Next Actions (Timeline)</h3>
    ${content}
  </div>`;
}

/**
 * Renders a single timeline entry
 */
function renderTimelineEntry(entry: ActionTimelineEntry, nameToIdMap: Map<string, string>): string {
  const statusClass = entry.isQueued ? 'queued' : 'predicted';
  const statusLabel = entry.isQueued ? '[Queued]' : '[Predicted]';
  
  // Color code character name and targets using unique colors
  const characterId = entry.characterId;
  const formattedCharacterName = formatCharacterName(entry.characterName, characterId);
  const formattedTargets = entry.targetNames.map(name => {
    const targetId = nameToIdMap.get(name) ?? name; // Fallback to name as ID if not found
    return formatCharacterName(name, targetId);
  }).join(', ');
  
  return `<div class="timeline-entry ${statusClass}">
      <span class="tick-number">Tick ${entry.tickNumber}:</span>
      ${formattedCharacterName} →
      <span class="skill-name">${entry.skillName}</span> →
      ${formattedTargets}
      <span class="status-label">${statusLabel}</span>
    </div>`;
}

/**
 * Renders all character forecasts
 */
function renderCharacterForecasts(characters: CharacterForecast[], nameToIdMap: Map<string, string>): string {
  const content = characters.length > 0
    ? characters.map(character => renderCharacterForecast(character, nameToIdMap)).join('\n    ')
    : '<div>No character forecasts</div>';

  return `<div class="character-forecasts-section">
    <h3>🎯 Character Forecasts</h3>
    ${content}
  </div>`;
}

/**
 * Renders a single character forecast
 */
function renderCharacterForecast(character: CharacterForecast, nameToIdMap: Map<string, string>): string {
  const currentActionSection = renderCurrentAction(character.currentAction, nameToIdMap);
  const nextActionSection = renderNextAction(character.nextAction, nameToIdMap);
  const rulesSection = renderRulesSummary(character.rulesSummary);

  return `<div class="character-forecast" data-character-id="${character.characterId}">
      <h4>${formatCharacterName(character.characterName, character.characterId)}</h4>
      ${currentActionSection}
      ${nextActionSection}
      ${rulesSection}
    </div>`;
}

/**
 * Renders current action info
 */
function renderCurrentAction(currentAction: CharacterForecast['currentAction'], nameToIdMap: Map<string, string>): string {
  if (!currentAction) {
    return '<div class="current-action">Current: <em>Idle</em></div>';
  }

  const formattedTargets = currentAction.targetNames.map(name => {
    const targetId = nameToIdMap.get(name) ?? name; // Fallback to name as ID if not found
    return formatCharacterName(name, targetId);
  }).join(', ');
  
  return `<div class="current-action">
      Current: <strong>${currentAction.skillName}</strong> → ${formattedTargets} (${currentAction.ticksRemaining} ticks remaining)
    </div>`;
}

/**
 * Renders next action prediction
 */
function renderNextAction(nextAction: CharacterForecast['nextAction'], nameToIdMap: Map<string, string>): string {
  if (!nextAction) {
    return '<div class="next-action">Next: <em>No valid action</em></div>';
  }

  const formattedTargets = nextAction.targetNames.map(name => {
    const targetId = nameToIdMap.get(name) ?? name; // Fallback to name as ID if not found
    return formatCharacterName(name, targetId);
  }).join(', ');
  
  return `<div class="next-action">
      Next: <strong>${nextAction.skillName}</strong> → ${formattedTargets} (${nextAction.reason})
    </div>`;
}

/**
 * Renders AI rules summary
 */
function renderRulesSummary(rules: RuleSummary[]): string {
  if (rules.length === 0) {
    return '<div class="rules-summary"><strong>AI Rules:</strong> <em>No rules configured</em></div>';
  }

  const rulesList = rules.map(renderRuleSummaryItem).join('\n        ');

  return `<div class="rules-summary">
      <strong>AI Rules:</strong>
      <ul class="rules-list">
        ${rulesList}
      </ul>
    </div>`;
}

/**
 * Renders a single rule summary item
 */
function renderRuleSummaryItem(rule: RuleSummary): string {
  const disabledClass = rule.enabled ? '' : ' disabled';
  const disabledLabel = rule.enabled ? '' : ' <span class="disabled-label">[Disabled]</span>';
  const tickCostText = rule.tickCost > 0 ? ` (${rule.tickCost} ticks)` : '';
  
  return `<li class="rule-item${disabledClass}">
          ${rule.conditionsText}: <strong>${rule.skillName}${tickCostText}</strong> → ${rule.targetingMode}${disabledLabel}
        </li>`;
}
