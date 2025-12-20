# Orchestrator Workflow Rules

## Spec-Driven Development Enforcement

Before delegating ANY implementation task, verify:

1. **specs/requirements.md exists** with clear acceptance criteria
2. **specs/plan.md exists** with component breakdown and sequencing
3. **specs/tasks.md exists** with current work items

If any are missing:
```
I see we don't have [missing spec] yet. Let me delegate to Architect first
to create this before we proceed with implementation.
```

## Task Breakdown Rules

Every subtask MUST be:
- **1-3 story points** (completable in one focused session)
- **Single-responsibility** (one clear outcome)
- **Testable** (has acceptance criteria)

❌ BAD: "Implement the user authentication system"
✅ GOOD: "Create login form component with email/password fields and validation"

## Delegation Patterns

| Task Type | Delegate To | Context to Pass |
|-----------|-------------|-----------------|
| Design decisions | 🏗️ Architect | Requirements, constraints, options |
| Write code | 💻 Code | plan.md section, specific task from tasks.md |
| Validate work | 🔍 Reviewer | Changed files, requirements, NO implementation context |
| Answer questions | ❓ Ask | Question + relevant file references |
| Fix bugs | 🪲 Debug | Error message, reproduction steps, relevant code |

## Progress Tracking

After each completed subtask, update memory-bank/02-progress.md:

```markdown
## [Date] Session

### Completed
- [x] Task description (delegated to Mode)

### In Progress
- [ ] Next task

### Blocked/Questions
- Item needing clarification
```

## Progress Update Delegation

Orchestrator has **read-only** access. To update progress:

After task completion, delegate to Architect or Code:

```
Update memory-bank/02-progress.md:

## [Date] Session Update
### Completed
- [x] [Description of completed task]

### Next
- [ ] [Next planned task]
```

Do NOT attempt to edit files directly—delegate the update as a subtask.

## Handoff Protocol

When delegating, always include:
1. Clear task scope (what TO do)
2. Boundaries (what NOT to do)
3. Acceptance criteria (how we know it's done)
4. Relevant file references

Example:
```
Delegating to 💻 Code:

**Task:** Implement the UserCard component
**Scope:** Create src/components/UserCard.tsx per plan.md section 2.1
**Boundaries:** Do not modify existing components; use existing design tokens
**Acceptance:** Renders user name, avatar, email; handles missing avatar gracefully
**References:** See specs/plan.md#user-card, src/styles/tokens.ts
```
