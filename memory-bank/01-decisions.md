# Architecture Decision Records

Record significant technical decisions here. New decisions go at the top.

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
