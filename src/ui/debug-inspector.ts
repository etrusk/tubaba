import type {
  DebugInfo,
  RuleEvaluation,
  ConditionCheckResult,
} from '../types/debug.js';
import { formatCharacterName } from './character-name-formatter.js';

/**
 * Renders the debug inspector panel showing rule evaluations for a combat tick.
 */
export function renderDebugInspector(debugInfo: DebugInfo): string {
  const rulesSection = renderRuleEvaluations(debugInfo.ruleEvaluations);

  return `<div class="debug-inspector">
  ${rulesSection}
</div>`;
}

/**
 * Renders the rule evaluations section
 */
function renderRuleEvaluations(evaluations: RuleEvaluation[]): string {
  const turnOrderExplanation = evaluations.length > 0
    ? `<div style="margin-bottom: 10px; padding: 8px; background: rgba(255, 215, 0, 0.1); border-radius: 4px; font-size: 0.9rem;">
         <strong>Turn Order:</strong> Players act before enemies. Within each side, ordered by slot position.
       </div>`
    : '';

  const content = evaluations.length > 0
    ? evaluations.map(renderCharacterEvaluation).join('\n    ')
    : '<div>No rule evaluations this tick</div>';

  return `<div class="rule-evaluations">
    <h3>Rule Evaluations</h3>
    ${turnOrderExplanation}
    ${content}
  </div>`;
}

/**
 * Renders a single character's rule evaluation
 */
function renderCharacterEvaluation(evaluation: RuleEvaluation): string {
  const rules = evaluation.rulesChecked;
  let rulesHtml = '';
  let stepNumber = 1;
  
  // Render rules that were evaluated (not 'not-reached')
  for (const rule of rules) {
    if (rule.status === 'not-reached') continue;
    
    const statusBadge = rule.status === 'selected' ? '✓ SELECTED'
                      : rule.status === 'skipped' ? 'SKIPPED'
                      : '✗ FAILED';
    const cssClass = rule.status;
    
    // Build condition details if present
    const conditionDetails = rule.conditions.length > 0
      ? `<div class="conditions">Conditions: ${rule.conditions
          .map(renderCondition)
          .join(' AND ')}</div>`
      : '';
    
    rulesHtml += `<div class="rule-step ${cssClass}">
      <div class="step-header">
        <span class="step-number">${stepNumber}.</span>
        <strong>${rule.skillName}</strong> (Priority ${rule.priority})
        <span class="status-badge ${cssClass}">${statusBadge}</span>
      </div>
      <div class="step-details">
        ${rule.reason}
        ${rule.candidatesConsidered ? `<br>Candidates: ${rule.candidatesConsidered.join(', ')}` : ''}
        ${rule.targetChosen ? `<br>→ Target: <strong>${rule.targetChosen}</strong>` : ''}
      </div>
      ${conditionDetails}
    </div>`;
    
    stepNumber++;
  }
  
  // Collapsible not-reached section
  const notReached = rules.filter(r => r.status === 'not-reached');
  if (notReached.length > 0) {
    rulesHtml += `<details class="not-reached-section">
      <summary>${notReached.length} lower-priority rule(s) not evaluated</summary>
      ${notReached.map(r => `<div class="not-reached-rule">${r.skillName} (Priority ${r.priority})</div>`).join('')}
    </details>`;
  }
  
  // Final action line
  const finalAction = evaluation.selectedSkill
    ? `<div class="final-action">→ <strong>Action:</strong> ${evaluation.selectedSkill} targeting ${evaluation.selectedTargets.join(', ')}</div>`
    : '<div class="final-action">→ <strong>No action</strong> (waiting for conditions to be met)</div>';
  
  return `<div class="character-eval" data-character-id="${evaluation.characterId}">
    <h4>${formatCharacterName(evaluation.characterName, evaluation.characterId)}</h4>
    ${rulesHtml}
    ${finalAction}
  </div>`;
}

/**
 * Renders a condition check result
 */
function renderCondition(condition: ConditionCheckResult): string {
  const icon = condition.passed ? '✓' : '✗';
  return `${icon} ${condition.type} (expected: ${condition.expected}, actual: ${condition.actual})`;
}
