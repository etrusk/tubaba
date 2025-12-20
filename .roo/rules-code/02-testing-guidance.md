# Testing Guidance

## Test-First Protocol (Critical Code)

For business logic, payments, auth, complex algorithms, and public APIs:

1. Read test scenarios from `specs/plan.md` (defined by Architect)
2. For items marked **"critical path"**:
   - Write failing test BEFORE implementation
   - Verify test fails for the right reason
   - Implement minimal code to pass
   - Refactor while green
3. For items marked **"standard coverage"**:
   - Implement first, then write tests
4. For items marked **"skip testing"**:
   - Implement without tests (Reviewer may flag if misjudged)

## AI-Assisted TDD Pattern

When implementing from Architect's test scenarios:

1. Read the scenario specification (inputs, expected outputs, edge cases)
2. Generate test file with descriptive test names matching scenarios
3. Run test—confirm it fails
4. Implement code to pass
5. If scenario seems wrong, STOP and ask—don't silently deviate

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

## Quality Gates for AI-Generated Tests

Before committing AI-generated tests:
- [ ] Run the test—does it pass/fail appropriately?
- [ ] Assertions check behavior, not implementation details
- [ ] No hallucinated edge cases (inputs that don't make sense)
- [ ] Tests are independent (no shared state)
- [ ] Mocking is minimal (prefer real implementations)
