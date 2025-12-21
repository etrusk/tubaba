# Current Tasks

## In Progress

<!-- Tasks currently being worked on -->

## Ready

<!-- Tasks ready to start, in priority order -->

### Phase 1: Combat Engine Foundation (Segment 1)

- [ ] **Define Combat System Type Definitions**
  - **Acceptance:** All TypeScript interfaces from [`plan.md`](plan.md:104-206) Data Structures section created with strict mode enabled. Includes: `Character`, `Skill`, `SkillEffect`, `Rule`, `Condition`, `StatusEffect`, `Action`, `CombatState`, `TickResult`, `CombatEvent`, plus type unions for `StatusType` and `TargetingMode`.
  - **Files:** `src/types/index.ts`, `src/types/character.ts`, `src/types/combat.ts`, `src/types/skill.ts`
  - **Estimate:** 1 story point

- [ ] **Write SkillLibrary Test Suite**
  - **Acceptance:** Tests written for all 12 skill behaviors covering AC15-AC26 from [`plan.md`](plan.md:343-368). Each skill test validates: damage/healing values, status effects applied, targeting mode, base duration, and edge cases (Execute threshold, Revive on dead target, Interrupt on idle target, etc.).
  - **Files:** `tests/engine/skill-library.test.ts`
  - **Estimate:** 2 story points

- [ ] **Implement SkillLibrary**
  - **Acceptance:** All 12 skill tests passing. Skills defined: Strike, Heavy Strike, Fireball, Execute, Poison, Heal, Shield, Defend, Revive, Taunt, Bash, Interrupt. Each returns correct `SkillEffect[]` based on [`plan.md`](plan.md:343-368) specifications.
  - **Files:** `src/engine/skill-library.ts`
  - **Estimate:** 2 story points

- [ ] **Write StatusEffectProcessor Test Suite**
  - **Acceptance:** Tests written for 6 status types covering AC27-AC34 from [`plan.md`](plan.md:372-393). Tests validate: Poisoned per-tick damage, Stunned action blocking, Shielded absorption (reference ActionResolver AC11), Taunting redirect (reference TargetFilter), Defending damage reduction (reference ActionResolver AC9), Enraged damage doubling, duration decrement, and expiration removal.
  - **Files:** `tests/engine/status-effect-processor.test.ts`
  - **Estimate:** 2 story points

- [ ] **Implement StatusEffectProcessor**
  - **Acceptance:** All status effect tests passing. Processes 6 status types per tick: applies effects (damage, modifiers), decrements durations, removes expired statuses. Handles permanent statuses (duration -1) and multiple statuses per character.
  - **Files:** `src/engine/status-effect-processor.ts`
  - **Estimate:** 2 story points

- [ ] **Write ActionResolver Test Suite**
  - **Acceptance:** Tests written for 6-substep resolution covering AC9-AC14 from [`plan.md`](plan.md:318-339). Tests validate: damage calculation with Defending modifier, healing calculation with max HP cap, shield absorption with breakage, simultaneous health updates (mutual kills), status application with replacement, and action cancellation via Interrupt.
  - **Files:** `tests/engine/action-resolver.test.ts`
  - **Estimate:** 2 story points

- [ ] **Implement ActionResolver**
  - **Acceptance:** All action resolver tests passing. Executes 6 ordered substeps: (1) damage calculation, (2) healing calculation, (3) shield absorption, (4) health updates, (5) status application, (6) action cancellation. Uses `Math.floor()` for rounding, applies Defending/Enraged modifiers, handles simultaneous actions.
  - **Files:** `src/engine/action-resolver.ts`
  - **Estimate:** 3 story points

- [ ] **Write TickExecutor Test Suite**
  - **Acceptance:** Tests written for 5-phase tick cycle covering AC1-AC8 from [`plan.md`](plan.md:292-309). Tests validate: 5-phase execution order, rule evaluation only for idle units, action progress countdown, simultaneous resolution with tie-breaking (players before enemies, left-to-right), status effect processing, cleanup phase knockout detection, victory condition (all enemies down), defeat condition (all players down).
  - **Files:** `tests/engine/tick-executor.test.ts`
  - **Estimate:** 2 story points

- [ ] **Implement TickExecutor**
  - **Acceptance:** All tick executor tests passing. Orchestrates 5 phases per tick: (1) Rule Evaluation, (2) Action Progress, (3) Action Resolution, (4) Status Effects, (5) Cleanup. Increments tick counter, appends to event log, detects victory/defeat, returns `TickResult` with updated `CombatState`.
  - **Files:** `src/engine/tick-executor.ts`
  - **Estimate:** 3 story points

- [ ] **Write Combat Engine Integration Tests**
  - **Acceptance:** Snapshot tests for 5 deterministic battle scenarios from [`plan.md`](plan.md:481-493): "3 Strikers vs 1 Heavy Enemy" (simultaneous damage, knockout, victory), "Poison vs Heal Race" (status effects, healing, DoT), "Taunt Tank Strategy" (Taunt redirect, Defend reduction, multi-turn), "Interrupt Spam" (action cancellation, rule re-evaluation), "Execute Finisher" (conditional damage threshold). Each captures full `eventLog` as JSON snapshot.
  - **Files:** `tests/integration/combat-engine.test.ts`, `tests/integration/__snapshots__/combat-engine.test.ts.snap`
  - **Estimate:** 2 story points

## Blocked

<!-- Tasks waiting on something -->

## Completed

<!-- Recently completed tasks for reference -->

<!--
- [x] **[Task Name]** - Completed [Date]
  - Notes: Any relevant completion notes
-->
