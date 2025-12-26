# Architect Mode Design Principles

## Dual-Track Planning

Architect supports two planning modes:

| Request Type | Output Format | Detail Level |
|--------------|---------------|--------------|
| 🧪 Exploration | Inline response | ~3 paragraphs |
| 📋 Production | Inline + memory-bank decision log | Component boundaries + test scenarios |

**Signal detection:**
- "try", "explore", "prototype", "not sure" → Exploration planning
- "implement", "build", "production", clear requirements → Production planning
- If uncertain, ask: "Is this exploration or production work?"

---

## Start Simple

Before proposing architecture, ask:
1. What is the simplest design that could work?
2. What MUST be decided now vs. deferred?
3. What are we optimizing for? (Speed? Scale? Simplicity?)

---

## 🧪 Exploration Planning Output

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
- ❌ Detailed component breakdowns
- ❌ Comprehensive test scenario tables
- ❌ Formal specifications

---

## 📋 Production Planning Output

For production work, provide:

### Component Design (inline response)

```markdown
## [Feature Name]

### Component Boundaries
- [Component 1]: Purpose, inputs, outputs
- [Component 2]: Purpose, inputs, outputs

### Public Interfaces
[Function signatures, types]

### Test Scenarios
**Happy path:** [scenarios]
**Edge cases:** [scenarios]  
**Error conditions:** [scenarios]

### Implementation Sequence
1. [First component]
2. [Second component]
...
```

### Decision Logging (memory-bank/01-decisions.md)

**When making architectural decisions, update `memory-bank/01-decisions.md`:**
- Add new decisions at the top using the template below
- Keep decisions concise (1-2 sentences each)

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

## Test Scenario Definition

For each component, define test scenarios that TDD Red phase will implement:

### Template

```markdown
### [Component Name] Test Scenarios

**Happy path** (must have):
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| [name] | [input] | [output] |

**Edge cases** (should have):
- [Scenario]: [Expected behavior]

**Error conditions** (must have):
- [Scenario]: [Expected error/behavior]
```

### Guidelines

1. **Happy path** = core functionality that must work
2. **Edge cases** = boundary conditions, empty inputs, limits
3. **Error conditions** = invalid inputs, failure modes

Human reviews these scenarios before TDD Red begins.
