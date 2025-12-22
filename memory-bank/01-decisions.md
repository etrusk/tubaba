# Architecture Decision Records

Record significant technical decisions here. New decisions go at the top.

---

## 2025-12-22 Action Forecast Feature

**Status:** Accepted

**Context:** The battle viewer currently shows what happened in past ticks (via DebugInspector and EventLog) and what's happening now (via CharacterCards), but players cannot see what will happen next. This creates difficulty:
- Understanding AI behavior patterns before they execute
- Validating instruction configurations work as intended
- Anticipating battle flow for strategic planning
- Debugging unexpected future actions

The request is for a "see the future" feature that shows:
1. **Action Timeline** - When each character will act (queued + predicted)
2. **Next Action Forecast** - What idle characters will do when they act
3. **Rule Summary** - Complete AI decision tree for each character

**Industry Standards Compliance:**
- **SOLID:** Single Responsibility - ActionForecastAnalyzer (prediction) separate from ActionForecastRenderer (display)
- **SOLID:** Open/Closed - Reuses existing `selectAction()` from enemy-brain.ts (no duplicate prediction logic)
- **SOLID:** Dependency Inversion - Analyzer depends on AI interface, not implementation details
- **UI Patterns:** Read-only analysis pattern - forecast never modifies combat state
- **Known Anti-Patterns Avoided:**
  - Not creating parallel prediction logic (reuses selectAction)
  - Not coupling forecast to combat engine (read-only observer)
  - Not deep-copying state for prediction (structural sharing via immutability)

**Options Considered:**

1. **Full Forecast (Timeline + Next Actions + Rule Summary) - Chosen**
   - Display all three components: ordered timeline, immediate predictions, complete rules
   - Always visible panel updated every tick
   - Uses actual `selectAction()` for 100% accurate predictions
   - **Pros:**
     - Complete visibility into AI decision-making
     - Players can verify instructions work before battle
     - Timeline shows exactly when actions will execute
     - Rule summary explains WHY each action was chosen
     - Zero performance cost (<5ms per tick)
     - Reuses battle-tested enemy AI logic
   - **Cons:**
     - ~60-80 new tests for analyzer + renderer + integration
     - Reveals enemy AI rules (reduces mystery)
     - Timeline only shows next immediate action (not multi-turn lookahead)
     - Requires BattleController extension for instruction tracking

2. **Timeline Only (Minimal)**
   - Show only action timeline (queued actions + next predicted action)
   - **Pros:** Simpler implementation (~20 tests)
   - **Cons:**
     - No explanation of WHY actions chosen
     - Cannot validate instruction configuration
     - Less useful for debugging AI behavior

3. **Rule Summary Only**
   - Display static rule lists without predictions
   - **Pros:** Simple static display (~10 lines of code)
   - **Cons:**
     - No dynamic feedback (which rule will trigger?)
     - Cannot see action timing
     - No validation that rules work as expected

4. **What-If Simulator (Complex)**
   - Allow modifying state variables to see how predictions change
   - **Pros:** Maximum flexibility for testing
   - **Cons:**
     - Requires state mutation UI (sliders for HP, status toggles)
     - Confusing distinction between actual and hypothetical state
     - Significant complexity increase (100+ tests)
     - Out of scope for prototype

**Decision:** Implement full Action Forecast with Timeline + Next Actions + Rule Summary (Option 1)

**Key Design Choices:**

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Prediction Logic** | Reuse `selectAction()` from enemy-brain.ts | Ensures 100% accuracy, no duplicate logic, battle-tested |
| **Update Frequency** | Every tick + instruction change | Real-time accuracy with minimal cost |
| **Timeline Depth** | Next 5 actions | Balances visibility with UI clutter |
| **Rule Text Format** | Human-readable strings | Better UX than condition objects |
| **Enemy Rules** | Visible | Prototype focus is understanding mechanics, not mystery |
| **State Coupling** | Read-only analysis | No side effects, can't corrupt combat state |
| **Performance** | <5ms per tick | Acceptable for real-time updates |

**Data Structures Defined:**
1. `ActionForecast` - Complete forecast with timeline + per-character details
2. `ActionTimelineEntry` - Single action in timeline with timing
3. `CharacterForecast` - Current action, next prediction, rule summary
4. `RuleSummary` - Human-readable rule representation

**Component Breakdown:**
1. **ActionForecastAnalyzer** - Prediction engine using selectAction()
2. **ActionForecastRenderer** - Pure render function for HTML generation
3. **BattleController Extension** - Forecast state management and updates

**Integration Approach:**
- Analyzer calls `selectAction()` for each idle character
- Predictions combined with queued actions to build timeline
- Rule summaries generated from CharacterInstructions
- Renderer transforms forecast data to HTML
- BattleController updates forecast on every tick/instruction change

**Consequences:**

**Positive:**
- Players can validate instructions before battle starts
- Complete transparency into AI decision-making
- Zero duplicate prediction logic (DRY principle)
- Read-only analysis prevents state corruption
- Timeline shows exact execution order
- Rule summaries provide learning/debugging aid
- 4 critical path acceptance criteria (AC62-AC65) ensure quality

**Negative:**
- Test suite grows by ~60-80 tests (~7% increase from current 886)
- Reveals enemy AI strategies (reduces mystery)
- Timeline only shows immediate next action (not multi-turn lookahead)
- Requires BattleController to track instruction map
- Enemy rule visibility may feel like "cheating" (can toggle later)

**Out of Scope (Explicitly Deferred):**
- Multi-turn lookahead (predicting 2+ actions ahead requires simulating full ticks)
- Alternative timeline branches ("what if" scenarios)
- Manual action override from forecast (would require human control mode UI)
- Forecast accuracy metrics (tracking prediction vs actual)
- Forecast export/sharing
- Historical forecast vs actual comparison
- Enemy rule hiding toggle (show all for prototype)
- Conditional formatting (highlighting risky actions)
- Forecast confidence scores

**Validation Strategy:**
- Unit tests verify prediction matches actual `selectAction()` output
- Integration tests verify timeline ordering matches tick execution
- Snapshot tests capture complete forecast state
- Performance tests ensure <5ms update time

**Alternatives Rejected:**
- **Timeline only** - Insufficient visibility for validation
- **Rule summary only** - No dynamic feedback
- **What-if simulator** - Too complex for prototype scope

**Full Specification:** See [`specs/action-forecast-spec.md`](../specs/action-forecast-spec.md) for complete component details, acceptance criteria (AC62-AC65), and test scenarios.

---

## 2025-12-22 Instructions Builder UI Architecture

**Status:** Accepted

**Context:** The battle viewer currently shows automated enemy AI using the [`EnemyBrain`](../src/ai/enemy-brain.ts) system with rule-based decision-making. Player characters require manual skill selection, but there's no UI for configuring player AI or understanding why AI makes decisions. The request is to add an instructions builder that allows:
1. Configuring player characters to use AI automation (vs manual control)
2. Building rules using existing `Rule`/`Condition` types from [`src/types/skill.ts`](../src/types/skill.ts)
3. 2-column layout with battle visualization left, controls/instructions right

**Industry Standards Compliance:**
- **SOLID:** Single Responsibility Principle - each component (ControlModeToggle, SkillPriorityEditor, ConditionBuilder, TargetingOverrideSelector) handles one concern
- **SOLID:** Open/Closed - reuses existing Rule/Condition types rather than creating parallel system
- **UI Patterns:** Container/Presenter pattern - InstructionsBuilder coordinates, sub-components are pure render functions
- **Known Anti-Patterns Avoided:**
  - Not creating duplicate rule evaluation logic (reuses EnemyBrain)
  - Not building custom DSL for rules (uses existing type system)
  - Not coupling instructions to battle state (persists independently)

**Options Considered:**

1. **Full Instructions Builder with Layout Redesign (Chosen)**
   - Add 5 new UI components for instruction configuration
   - Transform battle-viewer.html from 3-column to 2-column layout
   - Character cards clickable to open instructions panel
   - Instructions converted to `Rule[]` arrays on "Apply"
   - **Pros:**
     - Reuses existing EnemyBrain system (no duplicate logic)
     - Player and enemy AI use same underlying mechanics
     - Visual UI for rule configuration (more accessible than JSON editing)
     - Explicit "Apply" prevents accidental mid-battle changes
     - Layout groups related controls (battle left, controls right)
   - **Cons:**
     - ~102-128 new tests for UI components
     - Requires battle-viewer.html restructure
     - Manual control mode defined but requires future in-battle UI work
     - Complexity: 5 sub-components + container + BattleController extensions

2. **JSON Editor for Rules**
   - Provide text area for editing `Character.skills[].rules` as JSON
   - **Pros:** Minimal implementation (~20 lines)
   - **Cons:**
     - Poor UX (requires understanding JSON and type structures)
     - Error-prone (invalid JSON, type mismatches)
     - No validation until runtime
     - Doesn't address layout request

3. **Separate Configuration Phase**
   - Pre-battle screen for setting up rules before starting encounter
   - **Pros:** Cleaner separation of setup vs battle
   - **Cons:**
     - Doesn't allow runtime inspection/adjustment
     - Requires additional routing/state management
     - User can't see battle context while configuring

4. **Live Rule Editing (Real-time Apply)**
   - Changes to instructions immediately update `Character.skills[].rules` without "Apply" button
   - **Pros:** Fewer clicks, instant feedback
   - **Cons:**
     - Mid-battle changes could corrupt ongoing actions
     - Incomplete configurations could cause AI to fail
     - No undo mechanism (every edit is permanent)
     - Violates expectation that battle state is stable

**Decision:** Implement full Instructions Builder with layout redesign (Option 1)

**Key Design Choices:**

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Layout** | 2-column: Battle (left) + Controls/Instructions (right) | Groups related elements, provides space for instructions panel |
| **Rule Reuse** | Convert `SkillInstruction[]` to existing `Rule[]` type | Leverages tested EnemyBrain system, no duplicate logic |
| **Control Mode** | Per-character 'human' \| 'ai' toggle | Allows mixing manual and automated characters in same party |
| **Apply Timing** | Explicit "Apply" button, not real-time | Prevents incomplete configurations, gives user control |
| **Priority UI** | Auto-calculated 0-100 from skill order | Simpler than manual entry, prevents priority conflicts |
| **Reordering** | Up/down arrows (defer drag-and-drop) | Accessible, simpler to implement, drag enhancement later |
| **Persistence** | In-memory only (not localStorage) | Prototype scope, persists across battle resets but not page reload |
| **Multiple Rules** | Single rule per skill in UI | Engine supports multiple, UI simplifies (can extend later) |

**Data Structures Defined:**
1. `CharacterInstructions` - per-character control mode + skill instructions
2. `SkillInstruction` - priority, conditions, targeting override, enabled flag
3. `InstructionsBuilderState` - selected character, instructions map, dirty state
4. `InstructionsPanelData` - props for rendering builder

**Component Breakdown:**
1. **InstructionsBuilder (Container)** - coordinates sub-components, handles apply/cancel
2. **ControlModeToggle** - human vs AI mode switch
3. **SkillPriorityEditor** - skill ordering with up/down arrows
4. **ConditionBuilder** - add/edit/remove conditions with type-specific inputs
5. **TargetingOverrideSelector** - dropdown for targeting mode override

**Integration Approach:**
- Converter utility transforms `SkillInstruction[]` → `Rule[]`
- `BattleController` extended with instruction management methods
- Character cards emit click events to select for editing
- `applyInstructions()` attaches rules to `Character.skills` before battle starts

**Consequences:**

**Positive:**
- Player characters can use same rule-based AI as enemies
- Visual debugging: see exactly what rules AI will follow
- No duplicate rule evaluation logic (DRY principle)
- Explicit apply prevents mid-battle corruption
- Layout provides dedicated space for configuration
- 8 critical path acceptance criteria (AC54-AC61) ensure quality

**Negative:**
- Test suite grows by ~102-128 tests (15% increase from current 525-550)
- Manual control mode requires future in-battle skill selection UI (deferred)
- battle-viewer.html restructure needed (3-column → 2-column)
- 5 new UI components to maintain
- No drag-and-drop for skill reordering (deferred to future enhancement)

**Out of Scope (Explicitly Deferred):**
- Manual skill selection during battle (human mode defined but no in-battle UI)
- Drag-and-drop reordering (using up/down arrows)
- Instruction templates/presets (e.g., "Tank", "Healer")
- Import/export to JSON or localStorage
- Multiple rules per skill (UI creates one rule, engine supports multiple)
- OR logic or nested conditions (AND-only)
- Real-time rule simulation ("what would AI do now")
- Undo/redo for instruction changes
- Instruction sharing between characters

**Validation Strategy:**
- Client-side validation before save (threshold ranges, required fields)
- Type safety through TypeScript (reusing existing `Condition`, `TargetingMode` types)
- Integration tests verify converted rules work with EnemyBrain
- Snapshot tests capture configured instructions → AI battle log

**Alternatives Rejected:**
- **JSON editor** - Poor UX, error-prone, doesn't address layout
- **Separate config phase** - Loses runtime context, extra complexity
- **Real-time apply** - Risky mid-battle changes, no undo

**Full Specification:** See [`specs/instructions-builder-spec.md`](../specs/instructions-builder-spec.md) for complete component details, acceptance criteria, and test scenarios.

---

## 2025-12-21 Phase 5 UI Layer Gap Analysis

**Status:** Accepted

**Context:** Phase 5 (UI Layer) specification in [`specs/plan.md`](specs/plan.md:279-286) has significant quality gaps compared to Phases 1-4, which raises a fundamental question: Should we build UI at all for a combat engine prototype?

**Gap Analysis:**

Current Phase 5 spec lacks:
1. **Data structures** - 0 TypeScript interfaces (Phases 1-4 have 10+ each)
2. **Critical path tests** - 0 acceptance criteria (Phases 1-4 have 44 total)
3. **Test detail** - 4 vague bullets vs. input/output/edge case tables
4. **Integration scenarios** - 0 scenarios (Phases 1-4 have 3-4 each)
5. **Architectural decisions** - No framework selection, state binding, or communication protocol
6. **Component details** - "Renders combat state" vs. state machines and data flow diagrams

**Fundamental Question:** The prototype's core value is the **deterministic combat engine** (455 tests validating mechanics). UI was marked "Standard Coverage" (not critical path). Should we invest in UI complexity or focus on engine demonstration?

**Options Considered:**

1. **Full UI Layer (Current Plan)**
   - Implement CombatRenderer, EventLogDisplay, VictoryScreen
   - Estimated: 60-80 tests, 3-5 integration scenarios
   - **Pros:** Visual demo, complete user experience
   - **Cons:**
     - Large scope increase (UI ≈ engine complexity)
     - Framework decision blocks progress (React? Vanilla? Preact?)
     - UI bugs obscure engine quality
     - Testing UI is slower and more brittle
     - Requires resolving missing specs (data structures, 30+ critical tests, architectural decisions)

2. **CLI Battle Viewer (Console-based)**
   - Replace Phase 5 with simple CLI simulator using existing event log system
   - Example output:
     ```
     === Tick 1 ===
     PlayerA queued Strike → EnemyA (3 ticks)
     
     === Tick 4 ===
     PlayerA Strike resolves → EnemyA takes 30 damage (70/100 HP)
     ```
   - **Pros:**
     - Already have deterministic event logs (tested in Phases 1-4)
     - Simple implementation (~50 lines, no dependencies)
     - Focuses on engine quality (the actual innovation)
     - Easy to script/automate for testing
     - Fast to implement (30 minutes vs. days for UI)
   - **Cons:**
     - Less impressive demo
     - No interactive skill selection (could use CLI prompts)

3. **Export Replay JSON (Visualization Separate)**
   - Export battle logs as JSON for external visualization
   - **Pros:** Clean separation, portable replays, multiple viewers possible
   - **Cons:** No integrated experience, requires separate viewer project

4. **Minimal Web UI (Hybrid - Vanilla JS)**
   - Single HTML file with vanilla JavaScript, no build step
   - **Pros:** Visual feedback without framework complexity
   - **Cons:** Manual DOM management, limited interactivity

**Decision Made:** **Minimal Vanilla JS Web UI with Debug Inspector as primary feature**

**Key choices:**
- **Framework:** Vanilla JavaScript (single HTML file, no build step)
- **Primary Feature:** DebugInspector (see all rule/targeting/resolution decisions)
- **Interaction:** Watch-only with play/pause/step controls
- **State Management:** BattleController with state history for step-back

**Rationale:**
- Provides visual feedback without framework complexity
- Debug visibility critical for validating engine correctness
- Play/pause/step controls give tactile feedback during development
- State history enables time-travel debugging
- No build step maintains simplicity

**Consequences:**

- Phase 5 enhanced to 12 implementation steps (25-36)
- ~70-95 new tests for UI components
- TickExecutor needs debug instrumentation enhancement
- Total project test count will reach 525-550
- Spec enhanced to match Phases 1-4 quality:
  - 6 TypeScript interfaces defined (DebugInfo, TickResultWithDebug, BattleController, CharacterCardData, DebugInspectorData, EventLogData)
  - 9 critical path tests specified (AC45-AC53)
  - 4 integration scenarios for full battle playthrough

**Full Analysis:** See [`specs/phase-5-analysis.md`](specs/phase-5-analysis.md) for detailed gap comparison, missing data structures, and test specifications.

---

## 2025-12-21 Phase 4 Specification Enhancement

**Status:** Accepted

**Context:** Phase 4 (Run Management) specifications in [`specs/plan.md`](specs/plan.md) were incomplete compared to Phases 1-3. Missing data structures, vague test descriptions, and unclear dependencies would have created implementation ambiguity.

**Gap Analysis:**
1. No TypeScript interfaces for `RunState`, `Encounter`, `SkillUnlockChoice`
2. All tests marked "Standard Coverage" vs. Phase 1's 54 critical path tests
3. Vague descriptions (4 bullets) vs. Phase 1's 20+ detailed test tables
4. No integration test strategy for full run scenarios
5. Dependencies stated as "depends on: 10" without explaining HOW components interact

**Decision:** Enhanced Phase 4 specifications to match Phase 1-3 quality:

1. **Added Data Structures** (lines 207-232):
   - `RunState` - tracks encounter progression, run status, unlocked skills
   - `Encounter` - defines enemy composition and skill rewards
   - `SkillUnlockChoice` - player skill selection input

2. **Defined Critical Path Tests** (AC35-AC44):
   - 10 critical scenarios covering state transitions, skill unlocks, run completion
   - Input/output/edge case tables matching Phase 1 format
   - Explicit acceptance criteria numbering continuing from AC34

3. **Added Integration Scenarios**:
   - "Three Encounter Victory Run" - full run flow validation
   - "Early Defeat Run" - defeat handling validation
   - "Skill Persistence Across Encounters" - unlock persistence validation
   - "Loadout Swap Between Battles" - loadout management validation

4. **Clarified Dependencies**:
   - RunStateManager consumes `TickResult.battleEnded` and `battleStatus`
   - CharacterProgression uses SkillLibrary for validation
   - Explicit state machine documented for RunStateManager

5. **Enhanced Component Descriptions**:
   - Added state transition diagrams
   - Documented validation rules
   - Specified data flow between components

**Consequences:**
- Code mode will have same level of guidance as Phases 1-3
- Test coverage consistency across all phases (critical/standard/skip classifications)
- Integration testing follows deterministic snapshot pattern
- Implementation risk reduced through explicit specifications

**Alternatives Considered:**
1. **Proceed with current spec** - Rejected: Would create inconsistency and require Code mode to invent structures
2. **Simplify Phase 1-3 specs to match Phase 4** - Rejected: Phase 1-3 quality is the proven standard

---

<!--
## [Date] [Decision Title]

**Status:** Proposed | Accepted | Superseded by [link]

**Context:** Why we're making this decision

**Industry Standards Compliance:**
- OWASP: [Relevant security considerations or "N/A"]
- SOLID: [Which principles apply or "N/A"]
- Framework: [Official pattern alignment or "N/A"]
- Known Anti-Patterns: [What we're avoiding or "None identified"]

**Options Considered:**
1. **Option A** - Description
   - Pros: ...
   - Cons: ...

2. **Option B** - Description
   - Pros: ...
   - Cons: ...

**Decision:** What we chose

**Consequences:** What changes as a result

---
-->

<!-- Add new decisions above this line -->
