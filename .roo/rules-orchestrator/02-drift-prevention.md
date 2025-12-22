# Drift Prevention Protocol

## Task Completion Verification

Before accepting ANY task as complete, verify documentation sync:

### Delegation to Reviewer MUST Include

When delegating to 🔍 Reviewer, add this mandatory check:

```
**Additional Verification Required:**
Run drift check before approving:
1. `git diff --name-only` — list changed files
2. If src/ changed but specs/ didn't → FLAG: "DRIFT RISK: Code changed without spec update"
3. If new types/interfaces added → verify specs/plan.md lists them
4. If design decision made → verify memory-bank/01-decisions.md updated

Report drift findings with severity:
- CRITICAL: Interface/type mismatch between code and spec
- HIGH: New component not in plan.md
- MEDIUM: Decision made but not logged
- LOW: Minor implementation detail diverged
```

### Post-Review Gate

If Reviewer reports drift:
1. Do NOT mark task complete
2. Delegate spec update to 🏗️ Architect:
   ```
   **Task:** Sync documentation with implementation
   **Drift detected:** [Reviewer's finding]
   **Files to update:** [specific files]
   **Acceptance:** specs/ matches src/ for changed components
   ```
3. Only after Architect confirms sync → mark original task complete

---

## Phase Transition Protocol

When a phase completes (all phase tasks done, tests passing):

### Step 1: Archive Progress

Delegate to 🏗️ Architect or 💻 Code:

```
**Task:** Archive Phase [N] progress

1. Create `memory-bank/archive/phase-[N]-progress.md`
2. Move all Phase [N] session entries from `memory-bank/02-progress.md` to archive
3. Leave only:
   - Current phase section
   - "Phase [N] Complete" summary line (date, test count, key artifacts)

4. In `memory-bank/01-decisions.md`:
   - Collapse Phase [N] decisions to summary block
   - Keep only decisions still relevant to future phases

**Acceptance:** 
- 02-progress.md contains only current/next phase
- Archive file exists with full history
- 01-decisions.md has Phase [N] summary, not full entries
```

### Step 2: Spec Freeze Check

Before starting next phase, verify:
```
Delegate to 🔍 Reviewer:

**Task:** Phase [N] freeze verification
**Scope:** Confirm implementation matches spec for completed phase

Run:
- All Phase [N] tests pass
- No TODO/FIXME comments in Phase [N] code
- Type definitions in src/types/ match specs/plan.md interfaces

Report any mismatches as CRITICAL drift.
```

---

## Delegation Checklist Update

Add to every Code mode delegation:

```
**Drift Prevention:**
- [ ] If you add/change interfaces → update specs/plan.md
- [ ] If you make a design decision → log to memory-bank/01-decisions.md
- [ ] If implementation differs from plan → flag for Architect review before proceeding
```

Add to every Architect mode delegation:

```
**Spec Maintenance:**
- [ ] If code exists → verify spec matches before proposing changes
- [ ] If proposing new component → add to specs/plan.md component list
- [ ] Update specs/tasks.md if scope changes
```

---

## Lightweight Mode (Prototype Stage)

During rapid prototyping, reduce ceremony:

### Skip These Checks When:
- Task is < 1 story point
- No new types/interfaces created
- No architectural decisions made
- Pure refactoring with no API changes

### Always Require These Checks When:
- New file created
- Public interface changed
- Test added for new behavior
- Phase boundary crossed

### Quick Drift Heuristic

If `git diff --stat` shows:
- Only test files → skip drift check
- Only implementation files (no new exports) → skip drift check  
- New .ts files in src/types/ → REQUIRE drift check
- Changes to function signatures → REQUIRE drift check
