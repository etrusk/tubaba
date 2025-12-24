# Orchestrator Workflow Rules

## Hybrid Workflow: Prototype vs. Production

Orchestrator automatically selects workflow based on task characteristics.

### Workflow Selection Decision Tree

```
Does task contain uncertainty signals?
├─ YES → 🧪 Rapid Prototyping Workflow
│         (try → decide → graduate to production if accepted)
└─ NO  → 📋 Spec-First Workflow
          (spec → implement → review → merge)
```

**Uncertainty signals:**
- "try", "experiment", "prototype", "spike"
- "not sure which approach", "explore options"
- "see if this works", "test out"
- Human asks "should we..." or "what if..."

**Certainty signals:**
- "implement [spec reference]", "build per plan"
- Clear acceptance criteria provided
- References existing spec/design
- Bug fixes, refactors of known systems

---

## 🧪 Rapid Prototyping Workflow

**When:** Exploring uncertain ideas, testing approaches, validating gameplay feel

### Phase 1: Lightweight Planning

Delegate to 🏗️ Architect for minimal exploration plan:

```
**Prototype Goal:** [What hypothesis are we testing?]
**Success Criteria:** [How will human evaluate?]
**Time Box:** [1-4 hours max]
**Branch:** spike/[name]
**Constraints:** [What NOT to touch]

Output: Brief approach (~3 paragraphs), not full specs/plan.md
```

### Phase 2: Prototype Implementation

Delegate to 💻 Code with relaxed requirements:

```
**Task:** Build working prototype
**Branch:** spike/[name]
**Acceptance:** Runnable demo for human evaluation
**Shortcuts allowed:**
- Basic smoke tests only (comprehensive tests deferred)
- Placeholder UI/data acceptable
- Inline logic (refactor later if accepted)
- Console logging for debugging

**Minimums required:**
- Does not break existing functionality
- Demonstrates the idea clearly
- Basic type safety (no `any`)
```

### Phase 3: Human Decision Gate

Present to human:
1. Working demo (screenshot/live URL)
2. What works / what doesn't
3. Effort to productionize if accepted

**Human responses:**
- **ACCEPT** → Go to Phase 4
- **DECLINE** → Delete spike branch, optional learning log
- **ITERATE** → Return to Phase 2 with feedback

### Phase 4: Graduate to Production (if ACCEPTED)

Now switch to **Spec-First Workflow**:

1. Delegate to 🏗️ Architect:
   ```
   **Task:** Document accepted prototype
   - Update specs/GAME_SPEC.md with design decisions
   - Create specs/plan.md for production implementation
   - Define test scenarios and acceptance criteria
   - Update memory-bank/01-decisions.md
   ```

2. Delegate to 💻 Code:
   ```
   **Task:** Production-ready implementation
   - Merge spike branch or reimplement cleanly
   - Comprehensive test coverage per plan.md
   - Proper error handling and edge cases
   - Refactor inline logic to maintainable code
   ```

3. Delegate to 🔍 Reviewer:
   ```
   **Task:** Verify production readiness
   - Matches specs/plan.md
   - Test coverage adequate
   - No drift from documented design
   ```

---

## 📋 Spec-First Workflow

**When:** Implementing known requirements, building from accepted designs

### Phase 1: Specification

Before delegating ANY implementation, verify:

1. **specs/GAME_SPEC.md** contains relevant design decisions
2. **specs/plan.md** exists with:
   - Component breakdown
   - Data flow
   - Test scenarios
   - Implementation sequence
3. **Acceptance criteria** are clear and testable

If missing, delegate to 🏗️ Architect first:
```
I see we don't have [missing spec] yet. Let me delegate to Architect
to create this before implementation.
```

### Phase 2: Implementation

Delegate to 💻 Code with full context:

```
**Task:** [Specific component/feature]
**Spec Reference:** specs/plan.md section [X]
**Acceptance Criteria:** [From plan.md]
**Test Scenarios:** [Critical path from plan.md]
**Files:** [Starting points]

**Drift Prevention:**
- [ ] If adding interfaces → update specs/plan.md
- [ ] If making design decision → flag for Architect review
- [ ] If diverging from plan → stop and escalate
```

### Phase 3: Review

Delegate to 🔍 Reviewer:

```
**Task:** Validate implementation against spec
**Changed Files:** [list]
**Spec Reference:** specs/plan.md section [X]
**Drift Check:** Verify code matches documented design
```

---

## Task Breakdown Rules

**Prototypes:** 1-4 hours, focused experiment
**Production:** 1-3 story points, clear outcome, fully tested

❌ BAD: "Add user authentication" (scope unclear)
✅ GOOD (Prototype): "Prototype JWT-based login to validate approach"
✅ GOOD (Production): "Implement login per specs/auth-plan.md"

---

## Delegation Patterns

| Task Type | Delegate To | Context |
|-----------|-------------|---------|
| Exploration planning | 🏗️ Architect | Hypothesis, constraints, options |
| Production design | 🏗️ Architect | Requirements, GAME_SPEC.md, full detail |
| Prototype code | 💻 Code | Goal, acceptance, shortcuts OK |
| Production code | 💻 Code | plan.md reference, test scenarios, no shortcuts |
| Validate work | 🔍 Reviewer | Files, spec reference, drift check |
| Bug fix | 💻 Code | Error, repro, suspected cause |
| Questions | ❓ Ask | Question + context |

---

## Git Strategy

```bash
# Prototyping
git checkout -b spike/[feature-name]
# → Delete if declined
# → Merge if accepted (after production-izing)

# Production work
git checkout -b ai/[mode]/[task-name]
# → Merge when tests pass and reviewer approves
```

---

## Examples

**Prototype scenario:**
```
Human: "Try adding a rewind feature - not sure if it'll feel right"
→ Orchestrator: Detects "try", "not sure"
→ Route: Rapid Prototyping Workflow
→ Architect: Minimal plan (3 paragraphs)
→ Code: Working demo with basic tests
→ Human: Decides if approach is good
```

**Production scenario:**
```
Human: "Implement rule evaluation display per specs/rule-evaluation-display-redesign.md"
→ Orchestrator: Detects spec reference, clear requirement
→ Route: Spec-First Workflow
→ Architect: Verify specs/plan.md exists (or create)
→ Code: Full implementation with comprehensive tests
→ Reviewer: Validate against spec
```
