# Rule Evaluation Display Redesign Specification

## Overview

Redesign the Debug Inspector's Rule Evaluation panel to explain **WHY** characters take specific actions by showing the decision-making flow rather than a flat list of matched/failed rules.

## Current Problem

The current display shows all rules checked with matched/failed status but doesn't explain the decision reasoning:

```
Mage
✓ heal - Matched: All conditions met
✗ strike - Failed: all conditions met
✓ Selected Action: heal targeting ally
```

**Issues:**
1. Shows "matched" rules that weren't actually used
2. Doesn't explain why higher-priority actions were skipped
3. Doesn't show targeting reasoning (why target X vs target Y)
4. Confusing when conditions pass but action isn't selected

## User's Vision

Show decision flow with reasoning:

```
Mage
1. Heal (Priority 100) - SKIPPED
   Reason: All allies above 50% HP threshold
   
2. Fireball (Priority 50) - SKIPPED  
   Reason: No valid targets (no enemies grouped)
   
3. Strike (Priority 10) - SELECTED
   Candidates: Goblin (30/50 HP), Orc (45/50 HP)
   Target: Goblin (lowest HP)
   
→ Final Action: Strike targeting Goblin
```

## Architecture Analysis

### Current Data Flow

1. **Rule Evaluation** ([`tick-executor.ts:319-528`](src/engine/tick-executor.ts:319))
   - Collects all rule-skill pairs
   - Sorts by priority (descending)
   - Evaluates conditions sequentially
   - Stops at first match with valid targets
   - Records all evaluations in `RuleEvaluation`

2. **Data Capture** ([`debug.ts:44-68`](src/types/debug.ts:44))
   ```typescript
   interface RuleEvaluation {
     characterId: string;
     characterName: string;
     rulesChecked: RuleCheckResult[];  // ALL rules, not just relevant ones
     selectedRule: string | null;
     selectedSkill: string | null;
     selectedTargets: string[];
   }
   
   interface RuleCheckResult {
     ruleIndex: number;
     priority: number;
     conditions: ConditionCheckResult[];
     matched: boolean;  // ❌ Ambiguous: conditions passed OR action selected?
     reason: string;    // ❌ Generic failure reason, no skip context
   }
   ```

3. **Display Rendering** ([`debug-inspector.ts:58-106`](src/ui/debug-inspector.ts:58))
   - Renders flat list of all rules
   - Shows ✓/✗ based on `matched` field
   - Shows selected action separately
   - No decision flow context

### Critical Issue

**Line 426 in tick-executor.ts:**
```typescript
matched: allConditionsMet && !foundMatch
```

This creates ambiguity:
- A rule with passing conditions is marked `matched: false` if a higher-priority rule was already selected
- A rule with passing conditions but no valid targets is marked `matched: true` but action isn't queued
- Display can't distinguish "failed conditions" from "skipped for other reasons"

## Design Solution

### 1. Enhanced Data Types (Lean Approach)

**Updated RuleCheckResult** ([`debug.ts`](src/types/debug.ts)):

```typescript
export type RuleEvaluationStatus =
  | 'selected'      // Conditions passed, targets found, action queued
  | 'skipped'       // Conditions passed but no valid targets
  | 'not-reached'   // Never evaluated (higher priority action selected)
  | 'failed';       // Conditions did not pass

export interface RuleCheckResult {
  ruleIndex: number;
  skillId: string;              // ✨ NEW: Which skill this rule belongs to
  skillName: string;            // ✨ NEW: Human-readable skill name
  priority: number;
  conditions: ConditionCheckResult[];
  status: RuleEvaluationStatus; // ✨ CHANGED: from boolean 'matched'
  reason: string;               // ✨ ENHANCED: Now includes skip/target reasoning
  // Optional: only populated when targets were evaluated
  candidatesConsidered?: string[]; // ✨ NEW: ["Goblin (30/50)", "Orc (45/50)"]
  targetChosen?: string;        // ✨ NEW: "Goblin - lowest HP"
}
```

**No new complex types** - just enhanced strings and optional arrays for candidates.

### 2. Data Collection Changes (Lean Implementation)

**Update tick-executor.ts:319-528:**

```typescript
// Track evaluation state
let foundMatch = false;

for (const { ruleIndex, rule, skill, skillId } of ruleSkillPairs) {
  // If already found match, mark remaining as not-reached
  if (foundMatch) {
    evaluation.rulesChecked.push({
      ruleIndex,
      skillId,
      skillName: skill.name,
      priority: rule.priority,
      conditions: [],
      status: 'not-reached',
      reason: `Higher priority action already selected`,
    });
    continue;
  }
  
  // Evaluate conditions (existing code)
  const conditionResults: ConditionCheckResult[] = [];
  let allConditionsMet = true;
  
  for (const condition of rule.conditions || []) {
    const passed = evaluateCondition(condition, character, currentState);
    // ... existing expected/actual building ...
    conditionResults.push({ type, expected, actual, passed });
    if (!passed) allConditionsMet = false;
  }
  
  // If conditions failed
  if (!allConditionsMet) {
    const failedConds = conditionResults.filter(c => !c.passed);
    evaluation.rulesChecked.push({
      ruleIndex,
      skillId,
      skillName: skill.name,
      priority: rule.priority,
      conditions: conditionResults,
      status: 'failed',
      reason: failedConds.map(c => `${c.type}: ${c.actual} vs ${c.expected}`).join(', '),
    });
    continue;
  }
  
  // Conditions passed - try to select targets (existing code)
  const targetingMode = rule.targetingOverride ?? skill.targeting;
  const candidates = selectTargets(...); // existing
  
  // Build simple candidate list for debug
  const candidateList = candidates.map(c => `${c.name} (${c.currentHp}/${c.maxHp})`);
  
  // Apply filters (existing code)
  const finalTargets = applyFilters(candidates, ...);
  
  // No valid targets - skipped
  if (finalTargets.length === 0) {
    evaluation.rulesChecked.push({
      ruleIndex,
      skillId,
      skillName: skill.name,
      priority: rule.priority,
      conditions: conditionResults,
      status: 'skipped',
      reason: candidates.length === 0
        ? 'No valid targets available'
        : `All ${candidates.length} candidates filtered out`,
      candidatesConsidered: candidateList,
    });
    continue;
  }
  
  // Valid targets - SELECTED
  foundMatch = true;
  const chosen = finalTargets[0];
  
  // Build target choice reasoning inline
  let targetReason = chosen.name;
  if (targetingMode === 'single-enemy-lowest-hp') {
    targetReason += ` - lowest HP (${chosen.currentHp}/${chosen.maxHp})`;
  } else if (targetingMode === 'single-enemy-highest-hp') {
    targetReason += ` - highest HP (${chosen.currentHp}/${chosen.maxHp})`;
  } else if (targetingMode === 'ally-lowest-hp') {
    targetReason += ` - ally lowest HP`;
  } else if (targetingMode === 'self') {
    targetReason = 'self';
  }
  
  // Check for tie-breaker (inline, no helper)
  const tied = candidates.filter(c => c.currentHp === chosen.currentHp);
  if (tied.length > 1) {
    targetReason += ` (${tied.length} tied, chose first)`;
  }
  
  evaluation.rulesChecked.push({
    ruleIndex,
    skillId,
    skillName: skill.name,
    priority: rule.priority,
    conditions: conditionResults,
    status: 'selected',
    reason: `All conditions met`,
    candidatesConsidered: candidateList,
    targetChosen: targetReason,
  });
  
  // Queue action (existing code)
  const action: Action = {
    casterId: character.id,
    skillId,
    targets: finalTargets.map(t => t.id),
    ticksRemaining: skill.baseDuration,
  };
  
  character.currentAction = action;
  workingActionQueue.push(action);
}
```

**No helper functions** - reasoning built inline where it's generated.

### 3. Display Rendering Changes (Simplified)

**Update debug-inspector.ts:58-106:**

```typescript
function renderCharacterEvaluation(evaluation: RuleEvaluation): string {
  const rules = evaluation.rulesChecked;
  let rulesHtml = '';
  let stepNumber = 1;
  
  // Render each rule in priority order
  for (const rule of rules) {
    if (rule.status === 'not-reached') {
      // Don't show not-reached inline, collapse them at bottom
      continue;
    }
    
    const statusBadge = rule.status === 'selected' ? '✓ SELECTED'
                      : rule.status === 'skipped' ? 'SKIPPED'
                      : 'FAILED';
    const cssClass = rule.status;
    
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
    </div>`;
    
    stepNumber++;
  }
  
  // Show not-reached rules collapsed
  const notReached = rules.filter(r => r.status === 'not-reached');
  if (notReached.length > 0) {
    rulesHtml += `<details class="not-reached-section">
      <summary>${notReached.length} lower-priority rules not evaluated</summary>
      ${notReached.map(r => `<div>${r.skillName} (Priority ${r.priority})</div>`).join('')}
    </details>`;
  }
  
  const finalAction = evaluation.selectedSkill
    ? `<div class="final-action">→ <strong>Action:</strong> ${evaluation.selectedSkill} targeting ${evaluation.selectedTargets.join(', ')}</div>`
    : '<div class="final-action">→ <strong>Action:</strong> None</div>';
  
  return `<div class="character-eval" data-character-id="${evaluation.characterId}">
    <h4>${formatCharacterName(evaluation.characterName, evaluation.characterId)}</h4>
    ${rulesHtml}
    ${finalAction}
  </div>`;
}
```

**No separate render functions** - everything inline, minimal abstraction.

### 4. Visual Design

**CSS Updates** (add to battle-viewer.html or separate CSS):

```css
.decision-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 10px 0;
}

.rule-step {
  border-left: 3px solid #666;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.rule-step.selected {
  border-left-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}

.rule-step.skipped {
  border-left-color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.step-number {
  color: #888;
  font-weight: bold;
  min-width: 20px;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.status-badge.selected {
  background: #4ade80;
  color: #000;
}

.status-badge.skipped {
  background: #fbbf24;
  color: #000;
}

.step-details {
  font-size: 0.9rem;
  color: #ccc;
  margin-left: 28px;
}

.skip-reason {
  color: #fbbf24;
  font-style: italic;
}

.candidates,
.target-chosen {
  margin-top: 4px;
}

.tie-breaker {
  margin-top: 4px;
  color: #888;
  font-size: 0.85rem;
}

.final-action {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(59, 130, 246, 0.2);
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
}

.failed-rules-section,
.not-reached-rules-section {
  margin-top: 8px;
  font-size: 0.9rem;
  color: #888;
}

.rule-failed,
.rule-not-reached {
  padding: 4px 0;
}
```

## Example Output Comparison

### Before (Current)

```
Mage
✓ heal - Matched: All conditions met
  Conditions: ✓ ally-count (expected: >0, actual: 2)
✗ strike - Failed: all conditions met
  Conditions: (empty)
✓ Selected Action: heal targeting wizard
```

**Issues:** Why was heal matched but strike failed if "all conditions met"?

### After (Proposed)

```
Mage
1. Fireball (Priority 100) - SKIPPED
   Reason: All allies above 75% HP threshold
   Candidates checked: Warrior (80/100 HP), Wizard (90/100 HP)

2. Strike (Priority 50) - ✓ SELECTED
   Candidates: Goblin (30/50 HP), Orc (45/50 HP), Troll (50/50 HP)
   Target: Goblin - Lowest HP (30/50)
   
▼ 1 lower-priority rule(s) not evaluated

→ Action: Strike targeting Goblin
```

**Clear reasoning:** Fireball was higher priority but skipped, Strike chosen, specific target explained.

## Implementation Sequence

1. **Phase 1: Type Definitions** (1-2 files)
   - Update [`debug.ts`](src/types/debug.ts) with new types
   - Add `RuleEvaluationStatus`, `SkipReason`, `TargetingReasoning`
   - Update `RuleCheckResult` interface

2. **Phase 2: Data Collection** (1 file)
   - Update [`tick-executor.ts:319-528`](src/engine/tick-executor.ts:319)
   - Implement status tracking ('selected', 'skipped', 'not-reached', 'failed')
   - Add helper functions for reason building
   - Capture targeting reasoning details

3. **Phase 3: Display Rendering** (1 file)
   - Update [`debug-inspector.ts:58-106`](src/ui/debug-inspector.ts:58)
   - Implement decision flow rendering
   - Add step-by-step display with reasoning
   - Add collapsible sections for failed/not-reached rules

4. **Phase 4: Styling** (1 file)
   - Add CSS to [`battle-viewer.html`](battle-viewer.html)
   - Style decision flow, status badges, step numbers
   - Add visual hierarchy (selected = green, skipped = yellow)

5. **Phase 5: Testing** (1 file)
   - Update [`debug-inspector.test.ts`](tests/ui/debug-inspector.test.ts)
   - Test all rule statuses render correctly
   - Test targeting reasoning display
   - Test collapsible sections
   - Verify decision flow clarity

## Acceptance Criteria

### AC1: Rule Status Clarity
- [ ] Each rule shows exactly one status: SELECTED, SKIPPED, FAILED, or NOT REACHED
- [ ] Status is visually distinct (color coding, badges)
- [ ] No ambiguity between "conditions passed" and "action selected"

### AC2: Skip Reasoning
- [ ] Skipped rules show WHY they weren't used (no targets, threshold not met, etc.)
- [ ] Shows what was checked (candidate list with HP/status)
- [ ] Clear distinction between "no candidates" vs "all filtered out"

### AC3: Target Selection Explanation
- [ ] Shows all candidates evaluated
- [ ] Explains why specific target chosen (lowest HP, only valid target, etc.)
- [ ] Shows tie-breaker logic when multiple targets have same stats

### AC4: Decision Flow
- [ ] Rules displayed in evaluation order (priority descending)
- [ ] Clear visual flow: skipped rules → selected rule → lower-priority rules
- [ ] Final action clearly separated and highlighted

### AC5: Information Density
- [ ] Primary information visible (selected rule, skip reasons)
- [ ] Secondary information collapsible (failed conditions, not-reached rules)
- [ ] No clutter for simple cases (single rule, single target)

### AC6: Backward Compatibility
- [ ] Existing tests continue to pass (or updated appropriately)
- [ ] No breaking changes to `DebugInfo` structure (additive only)
- [ ] Display gracefully handles old data (missing new fields)

## Test Scenarios

### Scenario 1: Multiple Skipped Rules
**Setup:** Mage with Heal (priority 100), Fireball (priority 50), Strike (priority 10)
- All allies above 50% HP (Heal condition fails)
- No grouped enemies (Fireball targeting returns empty)
- Enemies available (Strike succeeds)

**Expected Output:**
```
1. Heal (Priority 100) - SKIPPED
   Reason: All allies above 50% HP threshold
2. Fireball (Priority 50) - SKIPPED
   Reason: No valid targets
3. Strike (Priority 10) - SELECTED
   Target: Goblin - Lowest HP
```

### Scenario 2: Target Selection Reasoning
**Setup:** Warrior with Strike, 3 enemies at different HP

**Expected Output:**
```
1. Strike (Priority 10) - SELECTED
   Candidates: Goblin (30/50 HP), Orc (45/50 HP), Troll (50/50 HP)
   Target: Goblin - Lowest HP (30/50)
```

### Scenario 3: Tie-Breaker
**Setup:** Ranger with Strike, 2 enemies at same HP

**Expected Output:**
```
1. Strike (Priority 10) - SELECTED
   Candidates: Goblin (30/50 HP), Orc (30/50 HP)
   Target: Goblin - Lowest HP (30/50)
   2 targets tied at 30 HP - chose leftmost
```

### Scenario 4: Failed Conditions
**Setup:** Cleric with Heal (requires ally below 50% HP), all allies healthy

**Expected Output:**
```
1. Heal (Priority 100) - SKIPPED
   Reason: All allies above 50% HP threshold
   Candidates checked: Warrior (90/100 HP), Mage (80/90 HP)

▼ 0 lower-priority rules

→ Action: None (no rules matched)
```

### Scenario 5: Not Reached Rules
**Setup:** Character with 5 skills, first one matches

**Expected Output:**
```
1. Strike (Priority 100) - SELECTED
   Target: Goblin

▼ 4 lower-priority rule(s) not evaluated

→ Action: Strike targeting Goblin
```

## Out of Scope

- Real-time condition evaluation (showing "live" values as battle progresses)
- Interactive rule editing from debug panel
- Historical comparison (showing rule evaluations across multiple ticks)
- AI explanation of "optimal" vs "actual" choices
- Targeting override display in rule evaluation (already handled in targeting section)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data structure changes break existing code | **Low** | Only adding optional fields to `RuleCheckResult` |
| Performance impact | **Low** | Simple string construction, no complex lookups |
| Display cluttered | **Low** | Collapsible sections for not-reached rules |
| Reasoning drift from actual logic | **Low** | Built inline in same evaluation loop |
| Test maintenance | **Low** | Optional fields can be omitted in tests |

## Open Questions

1. **Q:** Show HP as absolute or percentage?
   **A:** Absolute only - `"Goblin (30/50)"` - simpler, clear enough for debug

2. **Q:** Handle all-enemies targeting display?
   **A:** Just show count in candidate list - `["All 3 enemies"]`

3. **Q:** Failed conditions collapsed by default?
   **A:** Show inline - dev needs to see why rule didn't match

## Success Metrics

- **Clarity:** User can answer "Why did character X do action Y?" in <5 seconds
- **Debuggability:** Can identify misconfigured rules without reading code
- **Performance:** <10ms overhead for debug rendering per character
- **Maintainability:** Adding new skip reasons requires ≤3 lines of code

## Conclusion

This redesign transforms the Rule Evaluation panel from a passive rule dump into an active decision explanation tool. By distinguishing between 'selected', 'skipped', 'not-reached', and 'failed' statuses, and providing detailed targeting reasoning, users gain clear insight into **why** characters behave as they do, not just **what** they're doing.

The implementation is scoped to be additive (minimal breaking changes), performant (only in debug mode), and maintainable (reasoning generated alongside actual logic).
