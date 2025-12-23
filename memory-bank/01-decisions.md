# Architecture Decision Records

Record significant technical decisions here. New decisions go at the top.

---

## 2025-12-23 UI Layout Redesign - Action Forecast Emphasis

**Status:** Accepted

**Context:** The current 2-column layout positions Instructions Builder as always-visible in the right column alongside Tick Controls. However:
- Action Forecast is the primary "see the future" feature but shares space with instructions
- Instructions editing is contextual (character-specific) but takes permanent screen space
- Tick controls include play/pause/speed that encourage auto-play vs. deliberate analysis
- User feedback indicates preference for manual step-through to understand AI decisions

The request is to redesign the layout to:
1. Emphasize Action Forecast visibility (dedicated right column)
2. Make Instructions Builder contextual (modal triggered by character click)
3. Simplify tick controls to manual navigation only (remove auto-play)

**Industry Standards Compliance:**
- **UI/UX Patterns:** Modal dialogs for contextual editing (standard interaction pattern)
- **UI/UX Patterns:** Progressive disclosure - hide complexity until needed
- **Accessibility:** Keyboard navigation (Escape to close modal)
- **Known Anti-Patterns Avoided:**
  - Not creating parallel instruction UIs (reuses existing InstructionsBuilder component)
  - Not coupling modal to battle state (modal is presentation layer only)
  - Not breaking existing component APIs (non-breaking container change)

**Options Considered:**

1. **Action Forecast Right Column + Floating Instructions Modal - Chosen**
   - Right column entirely dedicated to Action Forecast panel
   - Instructions Builder opens as floating modal when character clicked
   - Remove play/pause/speed controls (keep only step forward/back)
   - **Pros:**
     - Maximum visibility for Action Forecast (primary feature)
     - Instructions editing contextual to character selection
     - Simpler UI encourages deliberate tick analysis
     - Modal provides focus (dark overlay, one character at a time)
     - Clean separation: left=battle state, right=future prediction
   - **Cons:**
     - Modal requires overlay/close button implementation
     - Cannot compare instructions for multiple characters simultaneously
     - Play/pause removal means no automated battle viewing
     - ~15-20 new tests for modal state management

2. **Tabbed Right Column (Forecast vs Instructions)**
   - Right column with tabs: "Action Forecast" | "Instructions"
   - **Pros:** No modal implementation needed
   - **Cons:**
     - Hidden tab loses visibility (user must remember to switch)
     - Still doesn't solve play/pause simplification
     - Character selection unclear (which character's instructions?)

3. **3-Column Layout (Arena | Forecast | Instructions)**
   - Add third column for Instructions Builder
   - **Pros:** Everything always visible
   - **Cons:**
     - Horizontal cramping (too much information density)
     - Requires wider screen resolution
     - Doesn't solve play/pause issue

4. **Keep Current Layout (No Change)**
   - Maintain 2-column with instructions always visible
   - **Pros:** No implementation work
   - **Cons:**
     - Action Forecast remains cramped
     - Instructions take space even when not editing
     - Play/pause encourage skipping over critical decision points

**Decision:** Implement Action Forecast right column + floating Instructions modal (Option 1)

**Key Design Choices:**

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Right Column** | 100% Action Forecast | Emphasizes primary "see the future" feature |
| **Instructions UI** | Floating modal on character click | Contextual editing, reduces clutter |
| **Modal Trigger** | Click character circle in arena | Natural interaction (select → edit) |
| **Modal Dismiss** | Close button, overlay click, Escape | Standard modal UX patterns |
| **Tick Controls** | Remove play/pause/speed selector | Encourages deliberate step-by-step analysis |
| **Auto-Play** | Removed | Manual navigation promotes understanding |
| **Debug/Events Layout** | Full width stacked (Option A) | More horizontal space for trace details |

**Component Changes:**
1. **BattleController Extension** - Add `selectedCharacterId`, `selectCharacter()`, `deselectCharacter()`
2. **HTML Restructure** - Remove play/pause buttons, add modal container
3. **CSS Additions** - Modal overlay, positioning, close button styles
4. **Event Handlers** - Character click, modal close, Escape key

**Data Structure Changes:**
```typescript
interface BattleControllerState {
  selectedCharacterId: string | null; // NEW: tracks open instructions modal
}
```

**Consequences:**

**Positive:**
- Action Forecast gets dedicated space (better visibility)
- Instructions editing feels natural (click character → edit)
- Simplified controls reduce cognitive load
- Modal overlay provides focus (no distraction)
- Clean layout: battle left, forecast right
- Encourages tick-by-tick analysis (better for debugging)
- 8 critical acceptance criteria (AC74-AC81) ensure quality

**Negative:**
- Cannot view multiple characters' instructions simultaneously
- Modal implementation adds ~15-20 tests
- No automated battle viewing (play/pause removed)
- Users who prefer auto-play lose that option
- HTML restructure required (breaking change to layout)

**Out of Scope (Explicitly Deferred):**
- Modal animations (fade in/out)
- Responsive layout for mobile/tablet
- Keyboard navigation within modal (Tab/Shift+Tab)
- Multiple modals open simultaneously
- Modal drag-and-drop repositioning
- Restore play/pause as optional toggle
- Remember last selected character across page reload
- Instructions diff view (comparing two characters)

**Validation Strategy:**
- Unit tests for BattleController modal state management
- Integration tests for character click → modal open flow
- Manual testing for modal close (button, overlay, Escape)
- Snapshot tests for updated layout structure

**Alternatives Rejected:**
- **Tabbed right column** - Hidden tabs lose visibility
- **3-column layout** - Too cramped, doesn't solve play/pause
- **Keep current layout** - Doesn't address feedback

**Full Specification:** See [`specs/ui-layout-redesign-spec.md`](../specs/ui-layout-redesign-spec.md) for complete component details, acceptance criteria (AC74-AC81), and test scenarios.

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

## Completed Phases Summary

### 2025-12-21 Specification Enhancement Decisions

**Phase 5 UI Layer (Vanilla JS Decision):**
- Selected Vanilla JavaScript over React/Vue for simplicity (no build step)
- Prioritized DebugInspector as primary feature (decision trace visibility)
- Added 6 TypeScript interfaces and 9 critical path tests (AC45-AC53)
- Enhanced spec to match Phases 1-4 quality standards
- Result: 161 UI tests, 616/617 total passing

**Phase 4 Run Management (Spec Quality Enhancement):**
- Added missing TypeScript interfaces: RunState, Encounter, SkillUnlockChoice
- Defined 10 critical path tests (AC35-AC44) with input/output/edge case tables
- Added 4 integration scenarios for full run validation
- Clarified component dependencies and state machine transitions
- Result: 95 tests, consistent spec quality across all phases

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
