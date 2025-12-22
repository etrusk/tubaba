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
  // Build character ID to name mapping for use in targeting and substeps
  const characterNameMap = new Map<string, string>();
  for (const evaluation of debugInfo.ruleEvaluations) {
    characterNameMap.set(evaluation.characterId, evaluation.characterName);
  }

  const rulesSection = renderRuleEvaluations(debugInfo.ruleEvaluations);
  const targetingSection = renderTargetingDecisions(debugInfo.targetingDecisions, characterNameMap);
  const substepsSection = renderResolutionSubsteps(debugInfo.resolutionSubsteps, characterNameMap);

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
  // Determine character role icon and label
  const isPlayer = evaluation.characterId.startsWith('player');
  const roleIcon = isPlayer ? '🛡️' : '👹';
  const roleLabel = isPlayer ? 'Player' : 'Enemy';
  
  const rules = evaluation.rulesChecked
    .map((rule, index) => renderRuleCheck(rule, evaluation.selectedSkill, index))
    .join('\n      ');

  const selectedAction = evaluation.selectedSkill
    ? `<div class="selected-action">✓ Selected Action: <strong>${evaluation.selectedSkill}</strong> targeting ${evaluation.selectedTargets.join(', ')}</div>`
    : '<div class="selected-action">⏸ No action selected (waiting for conditions to be met)</div>';

  return `<div class="character-eval" data-character-id="${evaluation.characterId}">
      <h4>${roleIcon} ${evaluation.characterName} (${roleLabel})</h4>
      ${rules}
      ${selectedAction}
    </div>`;
}

/**
 * Renders a single rule check result
 */
function renderRuleCheck(rule: RuleCheckResult, selectedSkill: string | null, ruleIndex: number): string {
  const icon = rule.matched ? '✓' : '✗';
  const cssClass = rule.matched ? 'matched' : 'failed';
  
  // Use the selected skill as the skill name if this rule matched
  // Otherwise, use a generic label
  const skillName = selectedSkill || `Skill-${ruleIndex}`;
  
  let statusText = '';
  if (rule.matched) {
    statusText = ' - <strong>Matched:</strong> All conditions met';
  } else {
    // Provide detailed failure reason
    const failedConditions = rule.conditions.filter(c => !c.passed);
    if (failedConditions.length > 0) {
      const reasons = failedConditions.map(c => `${c.type} (expected ${c.expected}, actual ${c.actual})`).join(', ');
      statusText = ` - <strong>Failed:</strong> ${reasons}`;
    } else {
      statusText = ` - <strong>Failed:</strong> ${rule.reason || 'Conditions not met'}`;
    }
  }

  const conditionDetails = rule.conditions.length > 0
    ? `\n        <div class="conditions">Conditions: ${rule.conditions
        .map(renderCondition)
        .join(' AND ')}</div>`
    : '';

  return `<div class="rule ${cssClass}">${icon} <strong>${skillName}</strong> (Priority: ${rule.priority})${statusText}</div>${conditionDetails}`;
}

/**
 * Renders a condition check result
 */
function renderCondition(condition: ConditionCheckResult): string {
  const icon = condition.passed ? '✓' : '✗';
  return `${icon} ${condition.type} (expected: ${condition.expected}, actual: ${condition.actual})`;
}

/**
 * Renders the targeting decisions section
 */
function renderTargetingDecisions(decisions: TargetingDecision[], characterNameMap: Map<string, string>): string {
  const content = decisions.length > 0
    ? decisions.map(d => renderTargetingDecision(d, characterNameMap)).join('\n    ')
    : '<div>No targeting decisions this tick</div>';

  return `<div class="targeting-decisions">
    <h3>Targeting Decisions</h3>
    ${content}
  </div>`;
}

/**
 * Renders a single targeting decision
 */
function renderTargetingDecision(decision: TargetingDecision, characterNameMap: Map<string, string>): string {
  const casterName = characterNameMap.get(decision.casterId) || decision.casterId;
  const candidateNames = decision.candidates.map(id => characterNameMap.get(id) || id);
  const finalTargetNames = decision.finalTargets.map(id => characterNameMap.get(id) || id);
  
  // Explain targeting mode in human-readable terms
  const modeExplanations: Record<string, string> = {
    'self': 'targeting self',
    'single-enemy-lowest-hp': 'targeting lowest HP enemy',
    'single-enemy-highest-hp': 'targeting highest HP enemy',
    'all-enemies': 'targeting all enemies',
    'ally-lowest-hp': 'targeting ally with lowest HP',
    'ally-dead': 'targeting dead ally',
    'all-allies': 'targeting all allies'
  };
  
  const modeExplanation = modeExplanations[decision.targetingMode] || decision.targetingMode;
  
  const filters = decision.filtersApplied.length > 0
    ? decision.filtersApplied
        .map(
          (filter) => {
            const removedNames = filter.removed.map(id => characterNameMap.get(id) || id);
            return `<div>  → Filter applied: <strong>${filter.filterType}</strong> removed [${removedNames.join(', ')}]</div>`;
          }
        )
        .join('\n      ')
    : '';

  const tieBreaker = decision.tieBreaker
    ? `<div>  → Tie-breaker used: ${decision.tieBreaker}</div>`
    : '';

  return `<div class="decision">
      <div><strong>${casterName}</strong> uses <strong>${decision.skillId}</strong> ${modeExplanation}</div>
      <div>  → Initial candidates: [${candidateNames.join(', ')}]</div>
      ${filters}
      <div>  → <strong>Final targets:</strong> [${finalTargetNames.join(', ')}]</div>
      ${tieBreaker}
    </div>`;
}

/**
 * Renders the resolution substeps section
 */
function renderResolutionSubsteps(substeps: ResolutionSubstep[], characterNameMap: Map<string, string>): string {
  const content = substeps.length > 0
    ? `<ol>
      ${substeps.map((substep, index) => renderSubstep(substep, index + 1, characterNameMap)).join('\n      ')}
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
function renderSubstep(substep: ResolutionSubstep, stepNumber: number, characterNameMap: Map<string, string>): string {
  const details = substep.details
    .map((detail) => renderSubstepDetail(substep.substep, detail, characterNameMap))
    .join('<br>');

  return `<li class="substep ${substep.substep}">${stepNumber}. ${details}</li>`;
}

/**
 * Renders a single substep detail
 */
function renderSubstepDetail(substepType: string, detail: SubstepDetail, characterNameMap: Map<string, string>): string {
  const actorName = characterNameMap.get(detail.actorId) || detail.actorId;
  const targetName = characterNameMap.get(detail.targetId) || detail.targetId;
  
  // Create verbose, descriptive output based on substep type
  const typeLabels: Record<string, string> = {
    'damage-calc': 'DAMAGE CALCULATION',
    'healing-calc': 'HEALING CALCULATION',
    'shield-absorption': 'SHIELD ABSORPTION',
    'health-update': 'HEALTH UPDATE',
    'status-application': 'STATUS APPLIED',
    'action-cancel': 'ACTION CANCELLED'
  };
  
  const typeLabel = typeLabels[substepType] || substepType.toUpperCase();
  const value = detail.value !== undefined ? ` (${detail.value})` : '';
  
  // Enhanced description with before/after context where applicable
  return `<strong>${typeLabel}:</strong> ${actorName}'s <strong>${detail.skillId}</strong> → ${targetName}${value} - ${detail.description}`;
}
