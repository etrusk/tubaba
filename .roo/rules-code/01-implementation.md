# Code Mode Implementation Rules

## Pre-Implementation Checklist

Before writing any code:

1. [ ] Read specs/plan.md for this task
2. [ ] Check specs/tasks.md for acceptance criteria
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

## Completion Checklist

Before marking task complete:

1. [ ] Code compiles/runs without errors
2. [ ] Basic happy path works
3. [ ] Error cases handled
4. [ ] No hardcoded secrets or credentials
5. [ ] Follows existing project patterns
6. [ ] Ready for review (no TODOs blocking functionality)
