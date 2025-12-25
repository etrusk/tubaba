# Code Mode Implementation Rules

## Pre-Implementation Checklist

Before writing any code:

1. [ ] For production: Read specs/plan.md for this task
2. [ ] For prototypes: Understand goal and success criteria from handoff
3. [ ] Understand existing patterns in the codebase
4. [ ] Identify files that will be modified

## Implementation Standards

### Write Obvious Code
```typescript
// ❌ Clever
const result = data.reduce((a, b) => ({...a, [b.id]: b}), {});

// ✅ Obvious
const result: Record<string, Item> = {};
for (const item of data) {
  result[item.id] = item;
}
```

### Error Handling
Every external call needs error handling:
```typescript
// ❌ Optimistic
const data = await fetch(url).then(r => r.json());

// ✅ Defensive
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
} catch (error) {
  // Handle or rethrow with context
}
```

### Input Validation
Validate at boundaries:
```typescript
function processUser(input: unknown): User {
  // Validate structure
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Expected object');
  }
  // Validate required fields
  if (!('email' in input) || typeof input.email !== 'string') {
    throw new ValidationError('Missing or invalid email');
  }
  // ... continue validation
}
```

## Red Flags - Stop and Ask

If you encounter these, STOP and request clarification:

- Requirements that seem contradictory
- Need to modify files not mentioned in the task
- Existing code that doesn't match the plan
- Missing types/interfaces you expected to exist
- Test failures you don't understand
- Architecture decisions needed (see Escalation Protocol below)

## Escalation Protocol

When implementation reveals architecture issues, escalate rather than work around them.

### Escalate to Architect Mode

Use `switch_mode` to Architect when you discover:

| Issue | Example | Why Escalate |
|-------|---------|--------------|
| **Design violation found** | Implementing reveals circular dependency | Architecture decision needed |
| **SOLID principle conflict** | Following plan requires god object | Design pattern change needed |
| **Standards violation in plan** | Specified approach violates OWASP/TypeScript best practices | Plan revision needed |
| **Missing abstraction** | Same code needed in 3+ places with no shared interface | Interface design needed |
| **Scope mismatch** | Task requires changes to unrelated components | Boundary clarification needed |

### Escalation Format

When escalating, provide:

```markdown
## Escalation: [Issue Type]

**Discovered during:** [Task/file you were working on]

**Issue:** [What you found that requires architecture decision]

**Standard violated:** [OWASP/SOLID/TypeScript/etc. with reference]

**Options I see:**
1. [Option A] - [tradeoffs]
2. [Option B] - [tradeoffs]

**Blocked until:** [What decision is needed to proceed]
```

### Escalate to Orchestrator

Use `switch_mode` to Orchestrator when:
- Task scope unclear or appears larger than specified
- Dependencies on other incomplete tasks discovered
- Multiple mode switches needed to complete task

### DO NOT Escalate

Handle these yourself:
- Implementation details within approved design
- Minor refactoring within current file
- Test writing for specified components
- Bug fixes in code you're implementing

## Completion Checklist

Before marking task complete:

1. [ ] Code compiles/runs without errors
2. [ ] Basic happy path works
3. [ ] Error cases handled
4. [ ] No hardcoded secrets or credentials
5. [ ] Follows existing project patterns
6. [ ] Ready for review (no TODOs blocking functionality)

## Post-Completion Protocol

After marking task complete, execute these steps:

### 1. Build Verification
```bash
npm run build
```
Ensure build succeeds before presenting completion to user.

### 2. Commit Prompt
Ask the user: "Should I commit and push these changes?"
- Wait for explicit approval before any git operations
- If approved, use conventional commit format
