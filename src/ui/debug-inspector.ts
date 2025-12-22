import type {
  DebugInfo,
  RuleEvaluation,
  RuleCheckResult,
  ConditionCheckResult,
  TargetingDecision,
  ResolutionSubstep,
  SubstepDetail,
} from '../types/debug.js';

/**
 * Renders the debug inspector panel showing rule evaluations, targeting decisions,
 * and resolution substeps for a combat tick.
 */
export function renderDebugInspector(debugInfo: DebugInfo): string {
  const rulesSection = renderRuleEvaluations(debugInfo.ruleEvaluations);
  const targetingSection = renderTargetingDecisions(debugInfo.targetingDecisions);
  const substepsSection = renderResolutionSubsteps(debugInfo.resolutionSubsteps);

  return `<div class="debug-inspector">
  ${rulesSection}
  ${targetingSection}
  ${substepsSection}
</div>`;
}

/**
 * Renders the rule evaluations section
 */
function renderRuleEvaluations(evaluations: RuleEvaluation[]): string {
  const content = evaluations.length > 0
    ? evaluations.map(renderCharacterEvaluation).join('\n    ')
    : '<div>No rule evaluations this tick</div>';

  return `<div class="rule-evaluations">
    <h3>Rule Evaluations</h3>
    ${content}
  </div>`;
}

/**
 * Renders a single character's rule evaluation
 */
function renderCharacterEvaluation(evaluation: RuleEvaluation): string {
  const rules = evaluation.rulesChecked
    .map((rule) => renderRuleCheck(rule))
    .join('\n      ');

  const selectedAction = evaluation.selectedSkill
    ? `<div class="selected-action">Selected: ${evaluation.selectedSkill} → ${evaluation.selectedTargets.join(', ')}</div>`
    : '<div class="selected-action">No action (waiting)</div>';

  return `<div class="character-eval" data-character-id="${evaluation.characterId}">
      <h4>${evaluation.characterName} (${evaluation.characterId})</h4>
      ${rules}
      ${selectedAction}
    </div>`;
}

/**
 * Renders a single rule check result
 */
function renderRuleCheck(rule: RuleCheckResult): string {
  const icon = rule.matched ? '✓' : '✗';
  const cssClass = rule.matched ? 'matched' : 'failed';
  const matchedText = rule.matched ? ' - Matched' : '';

  const conditionDetails = rule.conditions.length > 0
    ? `\n        <div class="conditions">${rule.conditions
        .map(renderCondition)
        .join(', ')}</div>`
    : '';

  return `<div class="rule ${cssClass}">${icon} rule-${rule.ruleIndex} (Priority: ${rule.priority})${matchedText}</div>${conditionDetails}`;
}

/**
 * Renders a condition check result
 */
function renderCondition(condition: ConditionCheckResult): string {
  const status = condition.passed ? 'passed' : 'failed';
  return `${condition.type}: expected ${condition.expected}, actual ${condition.actual} (${status})`;
}

/**
 * Renders the targeting decisions section
 */
function renderTargetingDecisions(decisions: TargetingDecision[]): string {
  const content = decisions.length > 0
    ? decisions.map(renderTargetingDecision).join('\n    ')
    : '<div>No targeting decisions this tick</div>';

  return `<div class="targeting-decisions">
    <h3>Targeting Decisions</h3>
    ${content}
  </div>`;
}

/**
 * Renders a single targeting decision
 */
function renderTargetingDecision(decision: TargetingDecision): string {
  const filters = decision.filtersApplied.length > 0
    ? decision.filtersApplied
        .map(
          (filter) =>
            `<div>Filters: ${filter.filterType} removed [${filter.removed.join(', ')}]</div>`
        )
        .join('\n      ')
    : '';

  const tieBreaker = decision.tieBreaker
    ? `<div>Tie-Breaker: ${decision.tieBreaker}</div>`
    : '';

  return `<div class="decision">
      <div>Caster: ${decision.casterId} | Skill: ${decision.skillId} | Mode: ${decision.targetingMode}</div>
      <div>Candidates: ${decision.candidates.join(', ')}</div>
      ${filters}
      <div>Final Targets: ${decision.finalTargets.join(', ')}</div>
      ${tieBreaker}
    </div>`;
}

/**
 * Renders the resolution substeps section
 */
function renderResolutionSubsteps(substeps: ResolutionSubstep[]): string {
  const content = substeps.length > 0
    ? `<ol>
      ${substeps.map((substep, index) => renderSubstep(substep, index + 1)).join('\n      ')}
    </ol>`
    : '<div>No resolutions this tick</div>';

  return `<div class="resolution-substeps">
    <h3>Resolution Substeps</h3>
    ${content}
  </div>`;
}

/**
 * Renders a single resolution substep
 */
function renderSubstep(substep: ResolutionSubstep, stepNumber: number): string {
  const details = substep.details
    .map((detail) => renderSubstepDetail(substep.substep, detail))
    .join('<br>');

  return `<li class="substep ${substep.substep}">${stepNumber}. ${details}</li>`;
}

/**
 * Renders a single substep detail
 */
function renderSubstepDetail(substepType: string, detail: SubstepDetail): string {
  const value = detail.value !== undefined ? ` = ${detail.value}` : '';
  return `${substepType}: ${detail.actorId} → ${detail.targetId} (${detail.skillId})${value} - ${detail.description}`;
}
