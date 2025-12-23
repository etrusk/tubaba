# Architect Mode Design Principles

## Dual-Track Planning

Architect supports two planning modes:

| Request Type | Output Format | Detail Level |
|--------------|---------------|--------------|
| 🧪 Prototype exploration | Inline response | ~3 paragraphs |
| 📋 Production specification | specs/plan.md | Full structured spec |

**Signal detection:**
- "try", "explore", "prototype", "not sure" → Prototype planning
- "implement", "build per spec", "production" → Full spec
- If uncertain, ask: "Is this exploration or production work?"

---

## Start Simple

Before proposing architecture, ask:
1. What is the simplest design that could work?
2. What MUST be decided now vs. deferred?
3. What are we optimizing for? (Speed? Scale? Simplicity?)

---

## 🧪 Prototype Planning Output

For exploration/uncertain work, provide **inline response only** (~3 paragraphs):

```markdown
## Prototype: [Name]

**Goal:** [One sentence: what hypothesis are we testing?]

**Approach:** [2-3 paragraphs describing how to build the prototype]
- Key implementation steps
- What shortcuts are acceptable
- How human will evaluate success

**Time box:** [1-4 hours]
**Success criteria:** [What human should look for]
**Branch:** spike/[name]
```

**Do NOT create:**
- ❌ specs/plan.md
- ❌ specs/requirements.md
- ❌ Detailed component breakdowns
- ❌ Test scenario tables

---

## 📋 Production Planning Output

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

**When making architectural decisions, update `memory-bank/01-decisions.md`:**
- Add new decisions at the top using the template below
- Keep decisions concise (1-2 sentences each)
- Historical decisions go in the summary table

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

## SOLID Principle Violations to Flag

When reviewing architecture, push back on these patterns:

| Principle | Violation Sign | Example | Alternative |
|-----------|---------------|---------|-------------|
| **Single Responsibility** | Class doing >1 job | UserService handles auth AND email | Split into AuthService + EmailService |
| **Open/Closed** | Switch statements on type | `if (type === 'A') else if (type === 'B')` | Use polymorphism or strategy pattern |
| **Liskov Substitution** | Subclass breaks parent contract | Square extends Rectangle but breaks setWidth | Use composition, not inheritance |
| **Interface Segregation** | Fat interfaces | IRepository with 20 methods, client uses 2 | Split into focused interfaces |
| **Dependency Inversion** | Concrete imports | `import { MySQLDB } from './mysql'` | `import { Database } from './interfaces'` |

### When to Apply SOLID

- **Always apply:** Single Responsibility, Dependency Inversion
- **Apply when extending:** Open/Closed, Liskov Substitution
- **Apply when >3 implementations:** Interface Segregation

Don't over-engineer small projects—SOLID is guidance, not law.

## Complexity Budget Per Feature

Before designing, allocate:
- **New files:** Target ≤3 per feature
- **New abstractions:** Target ≤1 per feature (interface, base class, factory)
- **External dependencies:** Justify each one (why not built-in or existing?)

If design exceeds these targets, split into smaller features or document why the complexity is essential.

## Confidence Language

Use explicit uncertainty markers:

- **High confidence:** "This approach will work because [evidence]"
- **Medium confidence:** "I recommend X, though Y is a reasonable alternative if [condition]"
- **Low confidence:** "I'm uncertain between X and Y. Key question: [what would resolve this]"

## Test Scenario Specification

For each component in specs/plan.md, define test scenarios that Code mode will implement.

### Template

```markdown
## Test Scenarios

### [Component Name]

**Critical path** (test-first required):
| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| [name] | [input] | [output] | [boundary] |

**Standard coverage** (test alongside implementation):
- [Scenario]: [Expected behavior]

**Skip testing** (justify):
- [Item]: [Reason—e.g., trivial getter, framework behavior]
```

### Guidelines

1. **Critical path** = failure here breaks the product or loses money
   - Auth, payments, core business logic, data integrity
   
2. **Standard coverage** = should work but failure is recoverable
   - Secondary features, non-critical validations
   
3. **Skip testing** = testing cost exceeds value
   - Getters/setters, config, UI styling, prototype code

### Example

```markdown
## Test Scenarios

### UserAuth Component

**Critical path:**
| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Valid login | correct email/password | JWT token, user object | case-insensitive email |
| Invalid password | wrong password | 401 error, no token | after 5 fails, lockout |
| Token refresh | valid refresh token | new access token | expired refresh → 401 |

**Standard coverage:**
- Logout: clears tokens from storage
- Remember me: extends token expiry

**Skip testing:**
- Password field masking: browser/framework behavior
- Email format hint: trivial UI
```

Human reviews these scenarios before Code begins implementation. If scenarios look wrong, push back before proceeding.
