# Reviewer Workflow Awareness

## Dual-Track Review Process

Reviewer must apply different standards based on workflow type:

| Workflow | Branch Pattern | Review Focus |
|----------|----------------|--------------|
| 🧪 Prototype | `spike/*` | Functionality works, no existing tests broken |
| 📋 Production | `main`, `ai/*` | Full review + drift check |

---

## 🧪 Prototype Review

**When reviewing spike/* branches:**

### Acceptance Criteria
- [ ] Prototype demonstrates the intended idea
- [ ] No existing functionality broken
- [ ] No existing tests failing
- [ ] Basic type safety (no `any` types)

### What to SKIP
- ❌ Comprehensive test coverage requirements
- ❌ Documentation completeness
- ❌ Drift detection against specs/
- ❌ Production-grade error handling

### What to CHECK
- ✅ Security basics (no hardcoded secrets)
- ✅ No breaking changes to existing code
- ✅ Runnable/demoable for human evaluation

### Review Output Format
```markdown
## Prototype Review: [Branch Name]

**Status:** PASS / FAIL / NEEDS_REVISION

**Functionality Check:**
- [x] Prototype demonstrates intended feature
- [x] Existing tests pass
- [x] No existing functionality broken

**Security Check:**
- [x] No hardcoded secrets
- [x] No obvious injection vulnerabilities

**Recommendation:** Ready for human evaluation / Needs fixes before demo
```

---

## 📋 Production Review

**When reviewing main or ai/* branches:**

### Acceptance Criteria
- [ ] Implementation matches specs/plan.md
- [ ] Comprehensive test coverage per plan scenarios
- [ ] No drift between code and documentation
- [ ] Production-grade error handling
- [ ] Security checklist complete
- [ ] Standards checklist complete

### Drift Detection Required

Run verification:
```bash
git diff --name-only origin/main
```

**If src/ changed but specs/ didn't:**
```
🚨 DRIFT RISK: Code changes without spec updates

Changed files:
- src/types/debug.ts (new interface)
- src/engine/tick-executor.ts (modified logic)

Missing documentation:
- specs/plan.md should document new RuleEvaluationStatus type
- memory-bank/01-decisions.md should log decision for status enum

Severity: CRITICAL
Recommendation: BLOCK merge until specs updated
```

### Severity Levels

| Severity | Condition | Action |
|----------|-----------|--------|
| **CRITICAL** | Interface/type mismatch with spec | Block merge |
| **HIGH** | New component not in plan.md | Request spec update |
| **MEDIUM** | Decision made but not logged | Request decision log |
| **LOW** | Minor implementation detail divergence | Note in review, allow merge |

### Review Output Format
```markdown
## Production Review: [Branch Name]

**Status:** APPROVED / CHANGES_REQUESTED / REJECTED

**Spec Compliance:**
- [x] Matches specs/plan.md section [X]
- [ ] DRIFT: New types not documented

**Test Coverage:**
- [x] Critical path scenarios covered
- [x] Edge cases handled

**Security:**
- [x] All security checks pass

**Standards:**
- [x] All standards checks pass

**Drift Findings:**
- CRITICAL: RuleEvaluationStatus type not in specs/plan.md
- HIGH: Decision for status enum not in memory-bank/01-decisions.md

**Recommendation:** BLOCK - Architect must update specs/ before merge
```

---

## Escalation Protocol

### When to Block

Block merge immediately if:
- Security issue found
- Critical drift (interface changes undocumented)
- Tests failing
- Breaking changes without migration plan

### When to Request Changes

Request changes for:
- High drift (new components undocumented)
- Missing test scenarios from plan.md
- Error handling gaps
- Standards violations

### When to Approve

Approve if:
- All checklists pass
- Drift is low/medium and documented in review
- Production: specs match code
- Prototype: functionality works, no breakage

---

## Quick Decision Matrix

| Situation | Prototype | Production |
|-----------|-----------|------------|
| No tests | ✅ Acceptable | ❌ Block |
| New types not in specs/ | ✅ Acceptable | ❌ Block |
| Hardcoded test data | ✅ Acceptable | ⚠️ Request change |
| Console.log debugging | ✅ Acceptable | ⚠️ Request removal |
| Missing error handling | ⚠️ Note in review | ❌ Block |
| Existing tests failing | ❌ Block | ❌ Block |
| Security vulnerability | ❌ Block | ❌ Block |
