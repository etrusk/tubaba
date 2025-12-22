# Current Tasks

## In Progress

<!-- Tasks currently being worked on -->

## Ready

<!-- Tasks ready to start, in priority order -->

### Phase 5: UI Layer (Segment 5)

1. **Write TickExecutor Debug Enhancement Test Suite** (AC45-AC47)
   - Tests for rule evaluation capture
   - Tests for targeting decision capture
   - Tests for resolution substep capture
   - Depends on: Existing TickExecutor (Phase 1)

2. **Implement TickExecutor Debug Enhancement**
   - Add DebugInfo generation to executeTick()
   - Capture RuleEvaluation, TargetingDecision, ResolutionSubstep
   - Returns TickResultWithDebug
   - Depends on: Debug enhancement tests

3. **Write BattleController Test Suite** (AC48-AC50)
   - Tests for step forward/back
   - Tests for play/pause/speed control
   - Tests for state history management
   - Depends on: Debug enhancement implementation

4. **Implement BattleController**
   - State history array for step-back
   - Timer management for play/pause
   - Speed multiplier support
   - Depends on: BattleController tests

5. **Write CharacterCard Test Suite**
   - Tests for HP bar percentage rendering
   - Tests for status icon display
   - Tests for action progress display
   - Depends on: Type definitions

6. **Implement CharacterCard**
   - Pure render function returning HTML string
   - HP bar, status icons, action timer
   - Depends on: CharacterCard tests

7. **Write DebugInspector Test Suite** (AC51-AC53)
   - Tests for rule evaluation display (matched/failed)
   - Tests for targeting decision display (candidates, filters, final)
   - Tests for resolution substep display
   - Depends on: Debug enhancement implementation

8. **Implement DebugInspector**
   - Render RuleEvaluation list with ✓/✗ indicators
   - Render TargetingDecision with filter explanation
   - Render ResolutionSubstep numbered list
   - Depends on: DebugInspector tests

9. **Write EventLog Test Suite**
   - Tests for event formatting (tick, message, type)
   - Tests for newest-first ordering
   - Tests for empty log handling
   - Depends on: CombatEvent type definitions

10. **Implement EventLog**
    - Pure render function returning HTML string
    - Event list with tick numbers, color-coded by type
    - Depends on: EventLog tests

11. **Write BattleViewer Integration Tests**
    - Full battle playthrough with tick stepping
    - Debug info displayed at each tick
    - Event log accumulation
    - Depends on: All component implementations

12. **Create BattleViewer HTML**
    - Single file: battle-viewer.html
    - Three-panel layout: players, controls, enemies
    - DebugInspector and EventLog panels
    - ES module imports from src/
    - Depends on: Integration tests

## Blocked

<!-- Tasks waiting on something -->

## Completed

<!-- Recently completed tasks for reference -->

### Phase 4: Run Management (Segment 4) - Completed 2025-12-21
- [x] **Write RunStateManager Test Suite** - 43 tests (AC35-AC40)
- [x] **Implement RunStateManager** - Run state machine with state transitions
- [x] **Write CharacterProgression Test Suite** - 42 tests (AC41-AC44)
- [x] **Implement CharacterProgression** - Skill unlock and loadout management
- [x] **Write Run Management Integration Tests** - 10 tests, 9 snapshots

**Phase 4 Summary:** 95/95 tests passing (43 RunStateManager + 42 CharacterProgression + 10 Integration). Total project: 455/455 tests.

### Phase 3: Enemy AI (Segment 3) - Completed 2025-12-21
- [x] **Write RuleConditionEvaluator Test Suite** - 41 tests
- [x] **Implement RuleConditionEvaluator** - 5 condition types
- [x] **Write EnemyBrain Test Suite** - 27 tests
- [x] **Implement EnemyBrain** - Rule-based skill selection
- [x] **Write Enemy AI Integration Tests** - 16 integration tests

**Phase 3 Summary:** 84/84 tests passing (41 RuleConditionEvaluator + 27 EnemyBrain + 16 Integration). Total project: 360/360 tests.

### Phase 2: Targeting System (Segment 2) - Completed 2025-12-21
- [x] **Write TargetSelector Test Suite** - 38 tests
- [x] **Implement TargetSelector** - 7 targeting modes
- [x] **Write TargetFilter Test Suite** - 23 tests
- [x] **Implement TargetFilter** - Taunt forcing, dead exclusion

**Phase 2 Summary:** 61/61 tests passing (38 TargetSelector + 23 TargetFilter). Total project: 276/276 tests.

### Phase 1: Combat Engine Foundation - Completed 2025-12-21

- [x] **Define Combat System Type Definitions** - Completed 2025-12-21
  - All TypeScript interfaces implemented in `src/types/`
  - Includes: `Character`, `Skill`, `SkillEffect`, `Rule`, `Condition`, `StatusEffect`, `Action`, `CombatState`, `TickResult`, `CombatEvent`
  - Type unions for `StatusType` and `TargetingMode` defined
  - **Files:** `src/types/index.ts`, `src/types/character.ts`, `src/types/combat.ts`, `src/types/skill.ts`, `src/types/status.ts`

- [x] **Write SkillLibrary Test Suite** - Completed 2025-12-21
  - 56 tests covering all 12 skill behaviors (AC15-AC26)
  - **Files:** `tests/engine/skill-library.test.ts`

- [x] **Implement SkillLibrary** - Completed 2025-12-21
  - All 12 skills implemented: Strike, Heavy Strike, Fireball, Execute, Poison, Heal, Shield, Defend, Revive, Taunt, Bash, Interrupt
  - 56/56 tests passing
  - **Files:** `src/engine/skill-library.ts`

- [x] **Write StatusEffectProcessor Test Suite** - Completed 2025-12-21
  - 59 tests covering 6 status types (AC27-AC34)
  - **Files:** `tests/engine/status-effect-processor.test.ts`

- [x] **Implement StatusEffectProcessor** - Completed 2025-12-21
  - Processes 6 status types: Poisoned, Stunned, Shielded, Taunting, Defending, Enraged
  - 59/59 tests passing
  - **Files:** `src/engine/status-effect-processor.ts`

- [x] **Write ActionResolver Test Suite** - Completed 2025-12-21
  - 55 tests covering 6-substep resolution (AC9-AC14)
  - **Files:** `tests/engine/action-resolver.test.ts`

- [x] **Implement ActionResolver** - Completed 2025-12-21
  - 6-substep resolution: damage calc, healing calc, shield absorption, health updates, status application, action cancellation
  - 55/55 tests passing
  - **Files:** `src/engine/action-resolver.ts`

- [x] **Write TickExecutor Test Suite** - Completed 2025-12-21
  - 40 tests covering 5-phase tick cycle (AC1-AC8)
  - **Files:** `tests/engine/tick-executor.test.ts`

- [x] **Implement TickExecutor** - Completed 2025-12-21
  - 5-phase orchestration: Rule Evaluation, Action Progress, Action Resolution, Status Effects, Cleanup
  - 40/40 tests passing
  - **Files:** `src/engine/tick-executor.ts`

- [x] **Write Combat Engine Integration Tests** - Completed 2025-12-21
  - 5 snapshot tests for deterministic battle scenarios
  - 5/5 tests passing
  - **Files:** `tests/integration/combat-engine.test.ts`, `tests/integration/__snapshots__/combat-engine.test.ts.snap`

**Phase 1 Summary:** 215/215 tests passing across 5 test suites. All acceptance criteria met.
