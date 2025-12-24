# Architecture Decision Records

New decisions go at the top. Keep only strategic decisions that affect future work.

---

## 2025-12-24 Debug System Simplification - Remove Targeting Decisions and Resolution Substeps

**Status:** Accepted

**Context:** The debug system had three sections:
1. Rule Evaluations - Shows which rules were checked and why actions were selected
2. Targeting Decisions - Showed targeting candidate filtering details
3. Resolution Substeps - Showed damage-calc, healing-calc, shield-absorption, health-update, status-application, action-cancel steps

The Targeting Decisions and Resolution Substeps sections duplicated information already present in Rule Evaluations (which now shows candidates and target selection) and the event log (which shows resolution outcomes).

**Decision:** Remove Targeting Decisions and Resolution Substeps from the debug system, keeping only Rule Evaluations.

**Changes Made:**
- Removed types: `TargetingDecision`, `TargetFilterResult`, `ResolutionSubstep`, `SubstepDetail`
- Updated `DebugInfo` interface to only contain `ruleEvaluations`
- Removed capture logic from `tick-executor.ts`
- Removed render functions from `debug-inspector.ts`
- Removed related tests (AC46, AC47)

**Consequences:**
- Simplified debug output - one focused section instead of three
- Reduced code complexity (~300 lines removed)
- Rule Evaluations section already shows targeting info via `candidatesConsidered` and `targetChosen`
- Event log already shows resolution outcomes

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
