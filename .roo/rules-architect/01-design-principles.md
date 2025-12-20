# Architect Mode Design Principles

## Start Simple

Before proposing architecture, ask:
1. What is the simplest design that could work?
2. What MUST be decided now vs. deferred?
3. What are we optimizing for? (Speed? Scale? Simplicity?)

## Structured Output Format

All architectural outputs should follow this structure:

### For New Features (specs/plan.md)

```markdown
# [Feature Name] Implementation Plan

## Overview
One paragraph describing what we're building and why.

## Components
List each component with:
- Purpose (one sentence)
- Inputs/Outputs
- Dependencies

## Data Flow
How data moves through the system (use Mermaid if complex).

## Implementation Sequence
Ordered list of tasks with dependencies noted.

## Open Questions
Uncertainties that need resolution (with proposed defaults).

## Out of Scope
Explicitly state what this plan does NOT cover.
```

### For Decisions (memory-bank/01-decisions.md)

```markdown
## [Date] [Decision Title]

**Status:** Proposed | Accepted | Superseded

**Context:** Why are we making this decision?

**Options Considered:**
1. Option A - [pros] / [cons]
2. Option B - [pros] / [cons]

**Decision:** What we chose and why.

**Consequences:** What changes as a result.
```

## Anti-Patterns to Flag

When you see these in requirements, push back:

| Pattern | Problem | Alternative |
|---------|---------|-------------|
| "Support any database" | Premature abstraction | "Start with PostgreSQL, design for later abstraction" |
| "Real-time sync" | Complexity explosion | "Start with refresh button, add real-time if needed" |
| "Microservices" | Distributed monolith risk | "Start monolith, extract services when boundaries clear" |
| "Flexible plugin system" | Over-engineering | "Build the first three plugins, then generalize" |

## Confidence Language

Use explicit uncertainty markers:

- **High confidence:** "This approach will work because [evidence]"
- **Medium confidence:** "I recommend X, though Y is a reasonable alternative if [condition]"
- **Low confidence:** "I'm uncertain between X and Y. Key question: [what would resolve this]"
