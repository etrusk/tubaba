import type {
  DebugInfo,
  RuleEvaluation,
  RuleCheckResult,
  ConditionCheckResult,
  TargetingDecision,
  ResolutionSubstep,
  SubstepDetail,
} from '../types/debug.js';
import { formatCharacterName } from './character-name-formatter.js';

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
  // Removed: Targeting Decisions and Resolution Substeps sections
  // const targetingSection = renderTargetingDecisions(debugInfo.targetingDecisions, characterNameMap);
  // const substepsSection = renderResolutionSubsteps(debugInfo.resolutionSubsteps, characterNameMap);

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
    : evaluation.rulesChecked.length === 0
      ? '<div class="final-action">→ <strong>No action</strong> (no skills configured)</div>'
      : '<div class="final-action">→ <strong>No action</strong> (waiting for conditions to be met)</div>';
  
  return `<div class="character-eval" data-character-id="${evaluation.characterId}">
    <h4>${formatCharacterName(evaluation.characterName, evaluation.characterId)}</h4>
    ${rulesHtml}
    ${finalAction}
  </div>`;
}

/**
 * Renders a single rule check result
 */
function _renderRuleCheck(rule: RuleCheckResult): string {
  // Use the new status field instead of matched
  const icon = rule.status === 'selected' ? '✓' : '✗';
  const cssClass = rule.status === 'selected' ? 'matched' :
                   rule.status === 'skipped' ? 'skipped' :
                   rule.status === 'not-reached' ? 'not-reached' :
                   'failed';
  
  // Use the skillName field from the rule (now always populated)
  const skillName = rule.skillName;
  
  let statusText = '';
  if (rule.status === 'selected') {
    statusText = ' - <strong>Selected:</strong> ' + rule.reason;
    if (rule.targetChosen) {
      statusText += ` → Target: ${rule.targetChosen}`;
    }
  } else if (rule.status === 'skipped') {
    statusText = ` - <strong>Skipped:</strong> ${rule.reason}`;
  } else if (rule.status === 'not-reached') {
    statusText = ` - <strong>Not Reached:</strong> ${rule.reason}`;
  } else {
    // Failed status
    statusText = ` - <strong>Failed:</strong> ${rule.reason}`;
  }

  const conditionDetails = rule.conditions.length > 0
    ? `\n        <div class="conditions">Conditions: ${rule.conditions
        .map(renderCondition)
        .join(' AND ')}</div>`
    : '';

  return `<div class="rule ${cssClass}">${icon} <strong>${skillName}</strong>${statusText}</div>${conditionDetails}`;
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
function _renderTargetingDecisions(decisions: TargetingDecision[], characterNameMap: Map<string, string>): string {
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
  const formattedCasterName = formatCharacterName(casterName, decision.casterId);
  
  const candidateNames = decision.candidates.map(id => {
    const name = characterNameMap.get(id) || id;
    return formatCharacterName(name, id);
  });
  
  const finalTargetNames = decision.finalTargets.map(id => {
    const name = characterNameMap.get(id) || id;
    return formatCharacterName(name, id);
  });
  
  // Explain targeting mode in human-readable terms
  const modeExplanations: Record<string, string> = {
    'self': 'targeting self',
    'single-enemy-lowest-hp': 'targeting lowest HP enemy',
    'single-enemy-highest-hp': 'targeting highest HP enemy',
    'all-enemies': 'targeting all enemies',
    'ally-lowest-hp': 'targeting ally/self with lowest HP',
    'ally-lowest-hp-damaged': 'targeting damaged ally/self with lowest HP',
    'ally-dead': 'targeting dead ally',
    'all-allies': 'targeting all allies'
  };
  
  const modeExplanation = modeExplanations[decision.targetingMode] || decision.targetingMode;
  
  const filters = decision.filtersApplied.length > 0
    ? decision.filtersApplied
        .map(
          (filter) => {
            const removedNames = filter.removed.map(id => {
              const name = characterNameMap.get(id) || id;
              return formatCharacterName(name, id);
            });
            return `<div>  → Filter applied: <strong>${filter.filterType}</strong> removed [${removedNames.join(', ')}]</div>`;
          }
        )
        .join('\n      ')
    : '';

  const tieBreaker = decision.tieBreaker
    ? `<div>  → Tie-breaker used: ${decision.tieBreaker}</div>`
    : '';

  return `<div class="decision">
      <div>${formattedCasterName} uses <strong>${decision.skillId}</strong> ${modeExplanation}</div>
      <div>  → Initial candidates: [${candidateNames.join(', ')}]</div>
      ${filters}
      <div>  → <strong>Final targets:</strong> [${finalTargetNames.join(', ')}]</div>
      ${tieBreaker}
    </div>`;
}

/**
 * Renders the resolution substeps section
 */
function _renderResolutionSubsteps(substeps: ResolutionSubstep[], characterNameMap: Map<string, string>): string {
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
  const formattedActorName = formatCharacterName(actorName, detail.actorId);
  
  const targetName = characterNameMap.get(detail.targetId) || detail.targetId;
  const formattedTargetName = formatCharacterName(targetName, detail.targetId);
  
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
  return `<strong>${typeLabel}:</strong> ${formattedActorName}'s <strong>${detail.skillId}</strong> → ${formattedTargetName}${value} - ${detail.description}`;
}
