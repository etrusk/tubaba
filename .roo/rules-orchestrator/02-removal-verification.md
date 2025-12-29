# Removal Task Protocol

When any task involves removal, deletion, deprecation, or cleanup of code, features, dependencies, or patterns, apply this protocol.

## Detecting Removal Tasks

Trigger words: remove, delete, deprecate, clean up, eliminate, strip out, get rid of, no longer needed, dead code, unused

## Verification Requirements

Before marking ANY removal task complete, require the executing agent to provide:

### 1. Pre-Removal Inventory
```
Files containing [term]: [count]
[list of file paths]
```

### 2. Removal Scope Confirmation
```
Will remove from:
- [ ] Type definitions
- [ ] Implementation files
- [ ] Test files
- [ ] Configuration/defaults
- [ ] Documentation
- [ ] UI/display code
```

### 3. Post-Removal Verification
```
grep -r "[term]" src/ tests/ --include="*.ts" --include="*.tsx"
Result: [empty / N remaining hits]
```

### 4. Test Suite Status
```
Tests run: [count]
Tests removed: [count] (tests for removed feature)
Tests passing: [count]
Tests failing: [count]
```

## Orchestrator Behavior

**On receiving removal request:**
1. Acknowledge the removal scope explicitly
2. Delegate to appropriate mode (Code or Cleanup if available)
3. Include in delegation: "Apply removal verification protocol"

**On receiving completion report:**
1. Reject if missing grep verification
2. Reject if grep shows remaining references
3. Reject if tests fail (unless expected—removed tests)
4. Accept only when: grep empty + tests green

**Rejection template:**
```
Removal incomplete. [N] references remain:
[file:line snippets]

Continue removal. Report again with verification when grep returns empty.
```

## Edge Cases

**Term appears in unrelated context:**
If grep hits include false positives (e.g., "strike" in "striking" or comments explaining removal), agent must:
- List each hit with context
- Explain why each is acceptable or requires action
- Orchestrator judges acceptability

**Cascading removals:**
If removing X requires removing Y (dependency), expand scope:
```
Removing [X] requires also removing [Y] because [reason].
Updated removal scope: X, Y
Proceeding with expanded scope.
```

**Partial removal not possible:**
If removal would break functionality without replacement:
```
Cannot fully remove [X]. Still required by:
- [component]: [reason]

Options:
1. Also remove [component]
2. Replace [X] with [alternative]
3. Abort removal

Awaiting guidance.
```
