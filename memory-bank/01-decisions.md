# Architecture Decision Records

New decisions go at the top. Keep only strategic decisions that affect future work.

---

## 2025-12-26 Tooltip Z-Index Fix - Fixed Positioning

**Status:** Proposed

**Context:** Skill tooltips have been "fixed" 3 times but still appear behind other UI elements. The root cause is CSS stacking contexts - when ancestors have `backdrop-filter`, `overflow-y: auto`, or explicit `z-index`, child elements' z-index only works within that context.

In [`battle-viewer.html`](../battle-viewer.html):
- [`.panel`](../battle-viewer.html:67) has `backdrop-filter: blur(10px)` → creates stacking context
- [`.instructions-panel`](../battle-viewer.html:369) has `overflow-y: auto` → creates stacking context
- Inline `z-index: 1000` styles → creates stacking context

**Options Considered:**

1. **Fixed positioning + JS coordinates** ✅ - `position: fixed` escapes all stacking contexts
2. **Body-level tooltip container** - DOM restructuring overkill for tooltips
3. **CSS containment audit** - Would break scrolling, fragile to future changes
4. **Popover API** - Limited browser support (Chrome 114+, Firefox 125+, Safari 17+)

**Decision:** Use `position: fixed` with JS-calculated viewport coordinates.

**Rationale:**
- `position: fixed` always positions relative to viewport, escaping ALL stacking contexts
- Simple implementation: `getBoundingClientRect()` on hover, set `top`/`left` inline
- No browser compatibility concerns
- Permanent fix - won't break when CSS changes

**Consequences:**
- Tooltips will ALWAYS appear above other UI elements
- Requires ~30 lines of JS event handling (mouseenter/mouseleave)
- Tooltip positioning is dynamic (calculated fresh on each hover)

**Implementation:** See [`specs/plan.md`](../specs/plan.md) for CSS/JS changes.

---

## 2025-12-25 Debug Battle Builder - Parallel Debug Utilities

**Status:** Proposed

**Context:** The battle-viewer needs to support a "create-your-own-battle debug mode" where:
- Both player and enemy characters can have skills equipped/unequipped
- Characters can be added/removed on the fly
- This is for testing/debugging the battle system

Current architecture has `RunState.playerParty` for character management, which excludes enemies from skill loadout operations.

**Options Considered:**

1. **Extend `RunState` with `allCharacters`** - Clean but adds permanent complexity to production run management
2. **Rename `playerParty` to `characters`** - Breaking change, too invasive for a debug tool
3. **Create parallel debug utilities** ✅ - Non-breaking, clearly scoped to debug mode

**Decision:** Create `DebugBattleState` interface and `debug-character-manager.ts` with separate functions that operate on ANY character regardless of `isPlayer` flag.

**Additional Decision:** Rename `src/ai/enemy-brain.ts` → `src/ai/action-selector.ts` since the `selectAction()` function already works for any AI-controlled character, not just enemies.

**Consequences:**
- Production run management (`RunState`, `skill-loadout-manager.ts`) unchanged
- Debug mode has its own state and utilities
- Clear separation between "game flow" code and "testing tools"
- File rename requires import updates but no behavior changes

**Implementation:** See [`specs/plan.md`](../specs/plan.md) for full specification.

---

## 2025-12-25 SkillDisplay Component with CSS Tooltips

**Status:** Proposed

**Context:** Skills are rendered inconsistently across 6+ UI locations:
- Different capitalization logic (some `charAt(0).toUpperCase()`, some use `skill.name`)
- Different color sources (`SKILL_COLORS` map vs `getSkillColor()`)
- No tooltips anywhere - users can't discover what skills do
- Duration formatting duplicated

**Decision:** Create a unified `renderSkillDisplay()` component and extend `SkillViewModel` with tooltip content.

**Key Components:**
- Extended `SkillViewModel` with `effectsSummary` and `targetingDescription` fields
- `renderSkillDisplay()` function in `src/ui/skill-display.ts`
- CSS-only tooltip (`:hover` based, no JS event handlers)

**Tooltip Approach:** CSS-only with `:hover` pseudo-class.

**Rationale:**
- Simpler than JS event handlers (no state, no listeners)
- Works with current SSR-style string rendering pattern
- Adequate for discovery tooltips (not interactive content)

**Trade-off accepted:** Cannot reposition if tooltip goes off-screen. Acceptable for controlled game UI layout.

**Consequences:**
- All skill displays use consistent styling and colors
- Users can hover to discover skill effects and targeting
- Single formatting point for effects/targeting in `ViewModelFactory`
- Incremental migration (existing components continue working)

**Implementation:** See [`specs/plan.md`](../specs/plan.md) for full specification.

---

## 2025-12-25 View Model Pattern for UI Consistency

**Status:** Accepted

**Context:** UI components display inconsistent data because each component:
1. Receives raw domain objects and transforms them independently
2. Uses different sources for the same data (e.g., `Character.skills` vs `SkillLibrary.getAllSkills()`)
3. Must explicitly call formatting functions (e.g., `formatCharacterName()`)

This caused bugs where skills appeared in one panel but not another, and character name colors were applied inconsistently.

**Decision:** Introduce a **View Model layer** between domain objects and UI components.

**Key Components:**
- `CharacterViewModel` - Pre-formatted character with `formattedName`, `color`, full skill list
- `SkillViewModel` - Presentation-ready skill with duration formatting, type color
- `BattleViewModel` - Complete presentation state with all characters and lookups
- `ViewModelFactory` - Single transformation point from `CombatState` → `BattleViewModel`

**Data Flow:**
```
CombatState → ViewModelFactory → BattleViewModel → All UI Components
```

**Consequences:**
- All UI components receive consistent, pre-formatted data
- No direct calls to formatters or `SkillLibrary` in UI components
- Single place to update when presentation requirements change
- Slightly more memory usage (view model alongside domain model)
- Adds one abstraction layer (justified by consistency benefit)

**Implementation:** See [`specs/plan.md`](../specs/plan.md) for full specification.

---

## 2025-12-24 Per-Tick Rule Re-evaluation (Spike Accepted)

**Status:** Accepted

**Context:** Previously, characters with a pending action (`currentAction !== null`) were skipped during rule evaluation phase. This caused "No rule evaluations this tick" messages and prevented characters from changing intent when conditions changed mid-cast.

**Decision:** Characters now re-evaluate their instruction sets EVERY tick (unless knocked out or stunned). If a different action is selected, the current action is replaced. If the same action would be selected, the current action is preserved (maintaining countdown progress).

**Key Changes:**
1. Removed `hasPendingAction` from idle check in [`tick-executor.ts`](../src/engine/tick-executor.ts)
2. Added `arraysEqual()` helper for target comparison
3. "Same action" detection: `skillId === currentAction.skillId && arraysEqual(targets, currentAction.targets)`
4. If selection returns null, keep current action (don't cancel queued action)

**Consequences:**
- Rule Evaluations debug panel now shows evaluations for all active characters every tick
- Characters can respond dynamically to changing conditions mid-cast
- Action countdown progress is preserved when conditions don't change
- Debug info shows "kept current action" or "switched from previous action"

**Branch:** `spike/per-tick-reevaluation` (to be merged)

---

## 2025-12-24 Skill Labels Under Characters (Spike Accepted)

**Status:** Accepted

**Context:** Explored two approaches for displaying action labels in the battle arena:
1. Labels on intent lines (spike/intent-line-labels) - DECLINED
2. Labels under character circles (spike/skill-labels-under-character) - ACCEPTED

**Decisions:**

### 1. Action Labels Placement
**Decision:** Display skill action labels under character circles, not on intent lines.

**Rationale:** Under-character labels are cleaner and don't clutter the arena. Intent line labels created visual noise and competed with the intent lines themselves for attention.

**Alternative Rejected:** `spike/intent-line-labels` placed labels along or near intent lines, which:
- Cluttered the visual space between characters
- Made overlapping lines harder to distinguish
- Required complex positioning logic to avoid label collisions

### 2. Consistent Skill Colors
**Decision:** Action labels use `SKILL_COLORS` map matching intent line colors.

| Skill Type | Color |
|------------|-------|
| Strike | Red |
| Heal | Green |
| Shield | Blue |

**Rationale:** Visual consistency across the battle UI - the label color matches the intent line color, reinforcing the connection between character and their action.

### 3. Debug Panel Simplification
**Decision:** Removed "Targeting Decisions" and "Resolution Substeps" from debug panel.

**What remains:** Rule Evaluations section only.

**Rationale:** Reduced noise, focused on essential debug info. The removed sections duplicated information available elsewhere or were rarely useful during debugging.

### 4. Tick Countdown Sync Fix
**Decision:** Fixed `ticksRemaining` synchronization to `character.currentAction`.

**Before (bug):** Countdown display was stale, didn't update between ticks.

**After (fix):** Properly shows countdown progression:
- "Strike (2)" → "Strike (1)" → "Strike - Executing!"

**Root cause:** `ticksRemaining` wasn't being synced from the engine state to the character's `currentAction` object during tick processing.

**Consequences:**
- Cleaner battle arena visualization
- Consistent color language for skills throughout UI
- Leaner debug panel with higher signal-to-noise ratio
- Accurate countdown display for pending actions

---

## 2025-12-24 Intent Line Overlap - Curved Lines (Quadratic Bezier)

**Status:** Proposed

**Context:** Angular Port Allocation (see below) was implemented but keeps failing due to mathematical fragility. Sign errors in angle calculations cause complete line overlap. This is the third attempt to fix the same problem, indicating a **design issue** rather than implementation bug.

**Root Cause:** Straight lines between two points share the same geometric path regardless of endpoint position. Offsetting endpoints of straight lines is fragile:
- Small sign errors → total overlap (current state)
- Requires complex grouping logic (bidirectional, convergent, multi-target)
- Each edge case fix introduces new edge case failures

**Industry Standard Solution:** Graph visualization libraries (D3.js, Cytoscape, Graphviz) use **curved lines** for overlapping edges because:
1. Each curve takes a physically different path - mathematically impossible to overlap
2. Control point offset is simple arithmetic (no trig sign errors)
3. Bidirectional pairs are visually distinct by design
4. Scales to N lines between same endpoints

**Decision:** Replace Angular Port Allocation with **Quadratic Bezier Curves**.

**Algorithm:**
1. Detect overlapping line groups (same A↔B endpoints, regardless of direction)
2. For each group with >1 line:
   - Calculate perpendicular direction to the A-B line
   - Assign alternating curve directions (+/- perpendicular)
   - Control point distance = `30px * curveIndex` (configurable)
3. Single lines: straight (control point = midpoint)

**Visual Comparison:**

```
ANGULAR PORTS (fragile - keeps breaking):
   [B]                    [B]
    │  ← same path         │
    │     regardless      /│\  ← endpoints spread but
    │     of offset      / │ \    lines still cross
   [A]                  [A]

CURVED LINES (robust - physically separated):
   [B]
   /│\      ← A→B curves left
  / │ \     ← B→A curves right
 /  │  \    ← impossible to overlap
[A] │  [A]
```

**Data Model Change:**

```typescript
// IntentLine type (add optional controlPoint)
export interface IntentLine {
  // ... existing fields ...
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  controlPoint?: { x: number; y: number }; // NEW: for Bezier curve
}
```

**Implementation Change:**
- Modify: `visualization-analyzer.ts` - `allocateAngularPorts()` → `calculateCurveControlPoints()`
- Modify: `intent-line.ts` - render `<path d="M...Q...">` instead of `<line>`
- Add: Control point calculation (perpendicular offset from midpoint)

**Consequences:**
- Eliminates mathematical fragility (no angle calculations with sign errors)
- Bidirectional lines always visually distinct
- Simpler algorithm (no angle sorting, grouping, or trigonometry)
- Slightly different visual style (curved vs straight) - actually clearer for users

---

## 2025-12-24 Intent Line Overlap - Angular Port Allocation

**Status:** Superseded by Curved Lines

**Context:** Battle viewer intent lines overlap despite two prior fixes. Current approach uses perpendicular offsets applied mid-line. This is fundamentally flawed because:
1. Lines converging from different angles have different perpendicular directions
2. Offsets applied to parallel lines still intersect at endpoints
3. Grouping heuristic (same caster OR target) misses cross-path overlaps

**Industry Standard Solutions Considered:**

| Approach | Pros | Cons | Used By |
|----------|------|------|---------|
| **Angular Port Allocation** | Deterministic, O(n), guaranteed separation | Requires endpoint recalculation | D3.js, Cytoscape, UML tools |
| Bézier Curves | Natural separation, elegant | More complex rendering | Graph editors |
| Force-Directed | Handles any overlap | Iterative, expensive | Gephi, physics sims |
| Perpendicular Offset (current) | Simple | Doesn't actually work | ❌ |

**Decision:** Replace perpendicular offset with **Angular Port Allocation**.

**Algorithm:**
1. For each character, collect all connected lines (as source or target)
2. Sort lines by angle to the "other end" character
3. Allocate angular ports around circle edge with minimum spacing (e.g., 15°)
4. Recalculate line endpoints using allocated port angles

**Key Insight:** Overlaps occur at **endpoints**, not mid-path. Fixing endpoint placement eliminates the problem at its source.

**Visual Comparison:**

```
BEFORE (perpendicular offset - still overlaps):
     [Enemy]
       /|\       ← offsets shift lines but they still meet at center
      / | \
   [P1][P2][P3]

AFTER (angular ports - guaranteed separation):
     [Enemy]
      ╱ │ ╲      ← endpoints spread around circle edge
     ╱  │  ╲
   [P1][P2][P3]
```

**Implementation Change:**
- Delete: `separateOverlappingLines()` function (~100 lines)
- Add: `allocateAngularPorts()` function (~50 lines)
- Modify: `calculateEdgePositions()` to accept allocated angle instead of computing center-to-center

**Consequences:**
- Eliminates recurring overlap bugs permanently
- Slightly more complex initial implementation
- Better visual clarity with many simultaneous actions
- Self-targeting lines need special handling (loop arc instead of angle)

---

## 2025-12-23 Hybrid Workflow Adoption

**Status:** Accepted

**Decision:** Dual-track workflow with automatic detection:
- **🧪 Prototyping track** - For uncertain/exploratory work (spike/* branches)
- **📋 Production track** - For known/specified work (main, ai/* branches)

**Orchestrator Detection:**
- Uncertainty signals ("try", "not sure", "explore") → Prototyping
- Certainty signals ("implement per spec", bug fixes) → Production

**Graduation Protocol:**
- Human accepts prototype → Update GAME_SPEC.md → Create specs/plan.md → Production-quality implementation

**Drift Rules:**
- Prototypes: Drift checks suspended during exploration
- Production: Full drift prevention enforced

See `.roo/rules-orchestrator/01-workflow.md` for full workflow details.

---

## 2025-12-23 Spec Management Protocol Adoption

**Status:** Accepted

**Decision:** Two-document system with maintenance protocol.
- `specs/GAME_SPEC.md` (~1200 words) - Always in context, vision document
- `specs/REFERENCE_TABLES.md` - Load on demand

**Maintenance Protocol:**
- Git: `spike/<feature>` for prototypes, `ai/<role>/<task>` for implementation
- Updates: Only accepted design decisions → GAME_SPEC, Stats → REFERENCE_TABLES
- Drift detection required at production task completion

See GAME_SPEC.md Design Decisions for all active constraints.

---

## Historical Decisions (Implemented)

| Date | Decision | Outcome |
|------|----------|---------|
| 2025-12-23 | UI Layout Redesign - Modal instructions | Implemented, tested |
| 2025-12-22 | Action Forecast feature | Implemented, 60+ tests |
| 2025-12-22 | Instructions Builder UI | Implemented, 102+ tests |
| 2025-12-21 | Phase 5 Vanilla JS UI | Implemented, 161 tests |
| 2025-12-21 | Phase 4 Run Management | Implemented, 95 tests |

Historical specs deleted. Tests are the living specification.

---

<!-- 
Template for new decisions:
## [Date] [Title]
**Status:** Accepted
**Decision:** [One sentence]
**Rationale:** [One sentence]
-->
