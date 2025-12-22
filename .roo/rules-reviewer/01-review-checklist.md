# Reviewer Mode Checklist

## Review Protocol

You are reviewing with FRESH CONTEXT. You have no knowledge of why decisions were made—only what the code does now.

## Mandatory Checks

### Security (CRITICAL)
- [ ] No hardcoded secrets, API keys, passwords
- [ ] SQL queries use parameterization (no string concatenation)
- [ ] User input is validated before use
- [ ] No path traversal vulnerabilities (../)
- [ ] Authentication/authorization checks present where needed

### Correctness
- [ ] Logic matches requirements in specs/requirements.md
- [ ] Edge cases handled (null, empty, boundary values)
- [ ] Error messages are helpful (not generic "Something went wrong")
- [ ] Async operations handle failure cases

### Quality
- [ ] No unnecessary complexity (could simpler code do this?)
- [ ] No dead code or commented-out blocks
- [ ] Names are descriptive (not `data`, `temp`, `x`)
- [ ] Functions do one thing

### Complexity (Fail if exceeded without documented justification)
- [ ] Abstraction depth ≤3 layers
- [ ] No function with >4 parameters (unless options object)
- [ ] No file >300 lines
- [ ] No generic gymnastics (>2 type params per function/class)
- [ ] Cyclomatic complexity ≤10 per function

### Maintainability
- [ ] Uses existing project patterns consistently
- [ ] No duplicated logic (DRY principle)
- [ ] Dependencies are necessary (no unused imports)
- [ ] Would a new team member understand this?

### Industry Standards (Validate Against Best Practices)
- [ ] TypeScript: No `any` types without `@ts-expect-error` justification
- [ ] TypeScript: Explicit return types on public functions
- [ ] SOLID: Single responsibility (no god objects doing >3 things)
- [ ] SOLID: Dependency injection over concrete imports where appropriate
- [ ] OWASP: See security-checklist.md for detailed checks
- [ ] Node.js: No sync I/O in async contexts
- [ ] REST: Proper HTTP verbs if applicable (GET safe, PUT idempotent)

**If violated:** Report as "Recommendations (Should Fix)" with standard reference.

## Output Format

```markdown
# Code Review: [File/Feature]

## Summary
[One sentence: Pass / Pass with minor issues / Needs changes / Critical issues]

## Critical Issues (Must Fix)
- [ ] Issue description
  - Location: `file:line`
  - Problem: What's wrong
  - Suggestion: How to fix

## Recommendations (Should Fix)
- [ ] Issue description
  - Location: `file:line`
  - Reason: Why it matters

## Observations (Consider)
- Note about pattern or style choice

## Security Checklist
- [x] No hardcoded secrets
- [x] Input validation present
- [ ] ⚠️ SQL query on line 45 needs review
```

## What NOT to Review

- Style preferences (let linters handle this)
- "I would have done it differently" (unless objectively better)
- Performance optimizations without evidence of need
