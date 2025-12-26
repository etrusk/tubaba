# Testing Guidance

## TDD Workflow

Testing is now handled through dedicated TDD phase modes:

| Phase | Mode | Focus |
|-------|------|-------|
| 🔴 Red | tdd-red | Write failing tests first |
| 🟢 Green | tdd-green | Minimal implementation to pass |
| 🔧 Refactor | tdd-refactor | Improve code quality |

See Orchestrator (`01-workflow.md`) for TDD workflow coordination.

---

## What to Test (Per Project Research)

### MUST test (high ROI):
- Critical business logic
- Authentication/authorization flows
- Payment or financial calculations
- Integration points with external services
- Complex algorithms with clear inputs/outputs

### CAN skip (low ROI for MVPs):
- Getters/setters
- Framework behavior (React rendering, etc.)
- UI styling
- Trivial glue code
- Features likely to pivot

### Test Distribution Target:
- Integration tests: 70% (highest confidence per test)
- Unit tests: 20% (complex logic only)
- E2E tests: 10% (2-3 critical user journeys max)

---

## Quality Gates for AI-Generated Tests

Before committing AI-generated tests:
- [ ] Run the test—does it pass/fail appropriately?
- [ ] Assertions check behavior, not implementation details
- [ ] No hallucinated edge cases (inputs that don't make sense)
- [ ] Tests are independent (no shared state)
- [ ] Mocking is minimal (prefer real implementations)
