# Drift Prevention Protocol

## Workflow-Aware Drift Rules

Drift prevention depends on which workflow is active:

| Workflow | Drift Rules |
|----------|-------------|
| 🧪 **Prototyping** (spike/* branches) | Drift checks DISABLED during exploration |
| 📋 **Production** (main, ai/* branches) | Full drift prevention ENFORCED |

---

## 🧪 Prototype Workflow: Drift Suspended

**On spike/* branches:**
- **NO drift checks** during prototype iterations
- specs/ updates **NOT required** until acceptance
- memory-bank/ updates **NOT required** until acceptance
- Focus: validate idea, not document it

**Exception:** If prototype breaks existing tests or functionality, must fix before human review.

---

## 📋 Production Workflow: Drift Enforced

### Task Completion Verification

Before accepting ANY production task as complete, verify documentation sync.

---

## Prototype Graduation Protocol

When human **ACCEPTS** a prototype, trigger drift prevention:

### Step 1: Documentation Catchup

Delegate to 🏗️ Architect:

```
**Task:** Document accepted prototype for production

1. Update specs/GAME_SPEC.md:
   - Section 2 (Design Decisions): Add design constraints validated by prototype
   - Section 3 (Working Notes): Add tactical implications discovered
   - Section 4 (Current State): Update capabilities if changed

2. Create/update specs/plan.md:
   - Component breakdown for production implementation
   - Test scenarios (critical path + standard coverage)
   - Implementation sequence

3. Update memory-bank/01-decisions.md:
   - Log architectural decision with rationale
   - Include what was tried, why this approach was accepted

**Acceptance:** New work can start from specs/ as source of truth
```

### Step 2: Production-Ready Implementation

Then delegate to 💻 Code:

```
**Task:** Production-ready implementation per specs/plan.md
**Branch:** main or ai/code/[task]
**Acceptance:**
- Comprehensive tests per plan.md scenarios
- Proper error handling
- Refactored from prototype if needed
- No shortcuts or TODOs
```

---

## Delegation Checklist

### To Code (Production Work):

```
**Drift Prevention:**
- [ ] If you add/change interfaces → update specs/plan.md
- [ ] If you make a design decision → log to memory-bank/01-decisions.md
- [ ] If diverging from plan → flag for Architect review
```

### To Code (Prototype Work):

```
**Prototype Mode:**
- [ ] Working on spike/* branch (confirm)
- [ ] Drift checks suspended until acceptance
- [ ] Do not break existing functionality
```

### To Architect (Production Design):

```
**Spec Maintenance:**
- [ ] Verify code matches spec before proposing changes
- [ ] New components go in specs/plan.md
- [ ] Design decisions go in memory-bank/01-decisions.md
```

### To Architect (Prototype Planning):

```
**Minimal Planning:**
- [ ] Do NOT create full specs/plan.md
- [ ] Output: ~3 paragraph exploration approach
- [ ] Time box and success criteria clear
```

---

## Quick Drift Heuristic (Production Only)

If `git diff --stat` shows:

**Skip drift check:**
- Only test files changed
- Only implementation internals (no new exports)
- Refactoring with no API changes

**Require drift check:**
- New .ts files in src/types/
- Function signature changes
- New public interfaces/exports
- Design decisions made
