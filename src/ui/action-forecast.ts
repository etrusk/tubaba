import type { ActionForecast, ActionTimelineEntry, CharacterForecast, RuleSummary } from '../types/forecast.js';

/**
 * Renders the action forecast panel showing timeline, character predictions, and AI rules.
 */
export function renderActionForecast(forecast: ActionForecast): string {
  const timelineSection = renderTimeline(forecast.timeline);
  const characterSection = renderCharacterForecasts(forecast.characterForecasts);

  return `<div class="action-forecast">
  ${timelineSection}
  ${characterSection}
</div>`;
}

/**
 * Renders the action timeline section
 */
function renderTimeline(timeline: ActionTimelineEntry[]): string {
  const content = timeline.length > 0
    ? timeline.map(renderTimelineEntry).join('\n    ')
    : '<div class="empty-timeline">No actions in timeline</div>';

  return `<div class="timeline-section">
    <h3>⏱️ Next Actions (Timeline)</h3>
    ${content}
  </div>`;
}

/**
 * Renders a single timeline entry
 */
function renderTimelineEntry(entry: ActionTimelineEntry): string {
  const statusClass = entry.isQueued ? 'queued' : 'predicted';
  const statusLabel = entry.isQueued ? '[Queued]' : '[Predicted]';
  const targetText = entry.targetNames.join(', ');
  
  return `<div class="timeline-entry ${statusClass}">
      <span class="tick-number">Tick ${entry.tickNumber}:</span>
      <span class="character-name">${entry.characterName}</span> →
      <span class="skill-name">${entry.skillName}</span> →
      <span class="target-names">${targetText}</span>
      <span class="status-label">${statusLabel}</span>
    </div>`;
}

/**
 * Renders all character forecasts
 */
function renderCharacterForecasts(characters: CharacterForecast[]): string {
  const content = characters.length > 0
    ? characters.map(renderCharacterForecast).join('\n    ')
    : '<div>No character forecasts</div>';

  return `<div class="character-forecasts-section">
    <h3>🎯 Character Forecasts</h3>
    ${content}
  </div>`;
}

/**
 * Renders a single character forecast
 */
function renderCharacterForecast(character: CharacterForecast): string {
  const roleIcon = character.isPlayer ? '🛡️' : '👹';
  const roleLabel = character.isPlayer ? 'Player' : 'Enemy';
  
  const currentActionSection = renderCurrentAction(character.currentAction);
  const nextActionSection = renderNextAction(character.nextAction);
  const rulesSection = renderRulesSummary(character.rulesSummary);

  return `<div class="character-forecast" data-character-id="${character.characterId}">
      <h4>${roleIcon} ${character.characterName} (${roleLabel})</h4>
      ${currentActionSection}
      ${nextActionSection}
      ${rulesSection}
    </div>`;
}

/**
 * Renders current action info
 */
function renderCurrentAction(currentAction: CharacterForecast['currentAction']): string {
  if (!currentAction) {
    return '<div class="current-action">Current: <em>Idle</em></div>';
  }

  const targetText = currentAction.targetNames.join(', ');
  return `<div class="current-action">
      Current: <strong>${currentAction.skillName}</strong> → ${targetText} (${currentAction.ticksRemaining} ticks remaining)
    </div>`;
}

/**
 * Renders next action prediction
 */
function renderNextAction(nextAction: CharacterForecast['nextAction']): string {
  if (!nextAction) {
    return '<div class="next-action">Next: <em>No valid action</em></div>';
  }

  const targetText = nextAction.targetNames.join(', ');
  return `<div class="next-action">
      Next: <strong>${nextAction.skillName}</strong> → ${targetText} (${nextAction.reason})
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
  
  return `<li class="rule-item${disabledClass}">
          [P${rule.priority}] ${rule.conditionsText}: <strong>${rule.skillName}</strong> → ${rule.targetingMode}${disabledLabel}
        </li>`;
}
