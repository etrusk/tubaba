# Current Tasks

## In Progress

<!-- Tasks currently being worked on -->

## Ready

<!-- Tasks ready to start, in priority order -->

### Phase 7: Action Forecast Feature

**Overview:** Add "see the future" feature showing action timeline, next action predictions, and complete AI rule summaries for all characters.

**Dependencies:** Phase 6 (Instructions Builder) complete, BattleController with instruction tracking

**Estimated Tests:** ~60-80 tests (20 analyzer + 25 renderer + 10 controller + 15 integration)

**Acceptance Criteria:** AC62-AC65 (Action Timeline, Next Action Prediction, Rule Summary, Real-time Updates)

1. **Define Action Forecast Type Definitions**
   - Create `src/types/forecast.ts`
   - Define: `ActionForecast`, `ActionTimelineEntry`, `CharacterForecast`, `RuleSummary`
   - Depends on: Existing type definitions
   - Estimated: 30 minutes, no tests (type definitions)

2. **Write ActionForecastAnalyzer Test Suite** (AC62-AC63)
   - Tests for `forecastNextActions()` - prediction using selectAction()
   - Tests for `buildTimeline()` - action ordering with queued + predicted
   - Tests for `summarizeRules()` - human-readable rule formatting
   - Edge cases: all idle, all queued, no matching rules, stunned characters
   - Depends on: Forecast type definitions
   - Estimated: ~20 tests

3. **Implement ActionForecastAnalyzer**
   - `forecastNextActions(state, instructions)` - main analysis function
   - Reuse `selectAction()` from enemy-brain.ts for predictions
   - Build ordered timeline combining queued actions + predictions
   - Generate human-readable rule summaries from instructions
   - Depends on: ActionForecastAnalyzer tests
   - Files: `src/ui/action-forecast-analyzer.ts`

4. **Write ActionForecastRenderer Test Suite** (AC64)
   - Tests for `renderActionForecast()` - complete forecast HTML
   - Tests for `renderTimeline()` - timeline section with tick numbers
   - Tests for `renderCharacterForecast()` - per-character forecast section
   - Tests for `renderRuleSummary()` - rule list formatting
   - Edge cases: empty forecast, all disabled rules, no timeline entries
   - Depends on: Forecast type definitions
   - Estimated: ~25 tests

5. **Implement ActionForecastRenderer**
   - Pure render function generating HTML from forecast data
   - Timeline: ordered list with tick numbers, character → skill → targets
   - Character forecasts: current action, next prediction, rule list
   - Rule summaries: priority, conditions text, targeting mode
   - Depends on: ActionForecastRenderer tests
   - Files: `src/ui/action-forecast.ts`

6. **Write BattleController Forecast Extension Tests**
   - Tests for `getForecast()` - returns current forecast
   - Tests for forecast update on `step()` - rebuilds after tick
   - Tests for forecast update on `play()` - updates during playback
   - Tests for forecast update on instruction change
   - Edge cases: battle ended, empty instructions, all characters dead
   - Depends on: ActionForecastAnalyzer implementation
   - Estimated: ~10 tests

7. **Implement BattleController Forecast Extension**
   - Add `private forecastCache: ActionForecast | null` property
   - Add `getForecast(): ActionForecast` method
   - Call analyzer in `step()` and `play()` to update cache
   - Pass instructions map to analyzer
   - Invalidate cache on instruction changes
   - Depends on: BattleController forecast tests
   - Files: `src/ui/battle-controller.ts` (extend existing)

8. **Update battle-viewer.html with Forecast Panel**
   - Add forecast panel below instructions panel (right column)
   - Wire up forecast rendering on tick updates
   - Add CSS styling for timeline and rule summaries
   - Visual distinction between queued (bold) and predicted (normal) actions
   - Depends on: ActionForecastRenderer implementation
   - Files: `battle-viewer.html` (extend existing layout)

9. **Write Action Forecast Integration Tests** (AC65)
   - Full battle with forecast updates at each tick
   - Verify timeline accuracy (queued actions execute when predicted)
   - Verify next action prediction matches actual selectAction() result
   - Verify rule summaries reflect instruction configuration
   - Verify real-time updates on state/instruction changes
   - Snapshot tests capturing complete forecast state
   - Depends on: All forecast component implementations
   - Estimated: ~15 tests

**Phase 7 Success Criteria:**
- All 60-80 tests passing
- AC62-AC65 acceptance criteria met
- Forecast updates <5ms per tick
- Timeline shows next 5 actions in deterministic order
- Predictions match actual AI behavior (100% accuracy)
- Rule summaries human-readable and complete

---

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

### Phase 8: Circle-Based Character Visualization & Intent Signaling - Completed 2025-12-23

- [x] **Define Visualization Type Definitions** - 5 new types in [`src/types/visualization.ts`](src/types/visualization.ts)
- [x] **Write CharacterCircle Test Suite** - 20 tests (AC66-AC67)
- [x] **Implement CharacterCircle Renderer** - [`src/ui/character-circle.ts`](src/ui/character-circle.ts) - SVG circle with HP liquid drain
- [x] **Write IntentLine Test Suite** - 23 tests (AC68-AC70)
- [x] **Implement IntentLine Renderer** - [`src/ui/intent-line.ts`](src/ui/intent-line.ts) - SVG lines with skill color mapping
- [x] **Write BattleArenaLayout Test Suite** - 13 tests (AC71)
- [x] **Implement BattleArenaLayout** - [`src/ui/battle-arena-layout.ts`](src/ui/battle-arena-layout.ts) - Position calculator
- [x] **Write VisualizationAnalyzer Test Suite** - 16 tests
- [x] **Implement VisualizationAnalyzer** - [`src/ui/visualization-analyzer.ts`](src/ui/visualization-analyzer.ts) - CombatState transformer
- [x] **Write BattleVisualization Test Suite** - 12 tests (AC73)
- [x] **Implement BattleVisualization Renderer** - [`src/ui/battle-visualization.ts`](src/ui/battle-visualization.ts) - Main SVG renderer
- [x] **Update battle-viewer.html with Arena Panel** - Replaced character cards with SVG arena
- [x] **Write Circle Visualization Integration Tests** - Integration with full battle flow

**Phase 8 Summary:** 84/84 tests passing (20 CharacterCircle + 23 IntentLine + 13 BattleArenaLayout + 16 VisualizationAnalyzer + 12 BattleVisualization). Total project: 1046/1046 tests.

---

### Phase 6: Instructions Builder UI (Segment 6) - Completed 2025-12-22

- [x] **Define Instructions Data Structures** - 4 new types in `src/types/instructions.ts`
- [x] **Write Instructions Converter Test Suite** - 23 tests for SkillInstruction → Rule conversion
- [x] **Implement Instructions Converter Utilities** - `src/ui/instructions-converter.ts` with conversion logic
- [x] **Write InstructionsBuilder Test Suite** - 34 tests (AC54-AC61)
- [x] **Implement InstructionsBuilder Container** - `src/ui/instructions-builder.ts` main component
- [x] **Write ControlModeToggle Test Suite** - 22 tests for Human/AI mode toggle
- [x] **Implement ControlModeToggle** - `src/ui/control-mode-toggle.ts` mode switcher
- [x] **Write SkillPriorityEditor Test Suite** - 39 tests for priority reordering
- [x] **Implement SkillPriorityEditor** - `src/ui/skill-priority-editor.ts` with up/down arrows
- [x] **Write ConditionBuilder Test Suite** - 51 tests for 5 condition types
- [x] **Implement ConditionBuilder** - `src/ui/condition-builder.ts` with validation
- [x] **Write TargetingOverrideSelector Test Suite** - 40 tests for targeting mode selection
- [x] **Implement TargetingOverrideSelector** - `src/ui/targeting-override-selector.ts` dropdown
- [x] **Write BattleController Instructions Extension Tests** - 37 tests for 16 new methods
- [x] **Implement BattleController Instructions Extension** - Extended BattleController with instructions state
- [x] **Update battle-viewer.html Layout** - Restructured to 2-column layout
- [x] **Write Instructions Integration Tests** - 16 tests for full workflow validation

**Phase 6 Summary:** 262/262 tests passing (23 Converter + 34 InstructionsBuilder + 22 ControlModeToggle + 39 SkillPriorityEditor + 51 ConditionBuilder + 40 TargetingOverrideSelector + 37 BattleController + 16 Integration). Total project: 886/886 tests.

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
