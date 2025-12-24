# Intent Line Overlap Fix - Curved Lines Implementation Plan

## Overview

Replace the fragile Angular Port Allocation algorithm with Quadratic Bezier curves. This eliminates mathematical fragility by ensuring overlapping lines take physically different paths.

**Problem:** Straight lines between two points share the same geometric path. Offsetting endpoints is fragile (sign errors cause total overlap).

**Solution:** Curve overlapping lines in opposite directions so they never share the same path.

---

## Components

### 1. IntentLine Type Extension

**Purpose:** Add optional control point for Bezier curve rendering

**File:** [`src/types/visualization.ts`](../src/types/visualization.ts:45)

**Change:**
```typescript
export interface IntentLine {
  // ... existing fields ...
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  controlPoint?: { x: number; y: number };  // NEW
}
```

**Dependencies:** None

---

### 2. Curve Control Point Calculator

**Purpose:** Replace `allocateAngularPorts()` with `calculateCurveControlPoints()`

**File:** [`src/ui/visualization-analyzer.ts`](../src/ui/visualization-analyzer.ts:248)

**Algorithm:**
1. Group lines by endpoint pair (A-B, regardless of direction)
2. For groups with 1 line: no control point (straight line)
3. For groups with 2+ lines:
   - Calculate midpoint between A and B
   - Calculate perpendicular direction
   - Assign alternating offsets: `+30px`, `-30px`, `+60px`, `-60px`...

**Inputs:** `IntentLine[]`, `Map<string, CharacterPosition>`

**Outputs:** `Map<number, { x: number; y: number }>` (line index → control point)

**Dependencies:** None

---

### 3. Intent Line Renderer Update

**Purpose:** Render `<path>` with quadratic Bezier instead of `<line>`

**File:** [`src/ui/intent-line.ts`](../src/ui/intent-line.ts:42)

**Change:**
```typescript
// BEFORE (straight line)
<line x1="${startPos.x}" y1="${startPos.y}" x2="${endPos.x}" y2="${endPos.y}" ... />

// AFTER (with optional curve)
if (controlPoint) {
  // Quadratic Bezier: M start Q control end
  <path d="M ${startPos.x} ${startPos.y} Q ${controlPoint.x} ${controlPoint.y} ${endPos.x} ${endPos.y}" ... />
} else {
  // Straight line as path for consistency
  <path d="M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}" ... />
}
```

**Dependencies:** IntentLine type change (#1)

---

## Data Flow

```
CombatState
    ↓
analyzeVisualization()
    ↓
[Create IntentLine[] with startPos/endPos]
    ↓
calculateCurveControlPoints()  ← NEW (replaces allocateAngularPorts)
    ↓
[Assign controlPoint to overlapping lines]
    ↓
IntentLine[] (with optional controlPoint)
    ↓
renderIntentLine()  ← MODIFIED (renders <path> instead of <line>)
    ↓
SVG output
```

---

## Implementation Sequence

1. **Add `controlPoint` to IntentLine type** (5 min)
   - No breaking changes (optional field)
   
2. **Implement `calculateCurveControlPoints()`** (30 min)
   - Delete `allocateAngularPorts()` function (~215 lines)
   - Write new function (~50 lines)
   - Simple perpendicular offset math
   
3. **Update `renderIntentLine()`** (15 min)
   - Check for `controlPoint`
   - Render `<path>` with Q (quadratic Bezier) or L (line)
   - Adjust arrowhead marker positioning for path end

4. **Update tests** (30 min)
   - Modify visualization-analyzer tests for new function
   - Modify intent-line tests for path rendering
   - Add test for bidirectional curve separation

5. **Visual verification** (10 min)
   - Load battle-viewer.html
   - Verify bidirectional lines (Mage↔Goblin) curve opposite directions
   - Verify single lines remain straight

---

## Test Scenarios

### calculateCurveControlPoints()

**Critical path:**
| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Bidirectional pair | Mage→Goblin, Goblin→Mage | Opposite control points | Same endpoints, opposite directions |
| Single line | Hero→Goblin alone | No control point | Should remain straight |
| 3 lines same target | Hero→Goblin, Mage→Goblin, Warrior→Goblin | Different control points | Multiple converging |

**Standard coverage:**
- Self-targeting line: no curve (or loop arc?)
- Control point distance scales with line length

**Skip testing:**
- Exact pixel values (visual, not logic)
- SVG path syntax (framework behavior)

### renderIntentLine()

**Critical path:**
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| With controlPoint | `{..., controlPoint: {x: 100, y: 50}}` | `<path d="M...Q...">` |
| Without controlPoint | `{..., controlPoint: undefined}` | `<path d="M...L...">` |

**Skip testing:**
- Marker/arrowhead rendering (existing behavior)

---

## Open Questions

1. **Curve intensity**: Should control point offset be fixed (30px) or proportional to line length?
   - **Proposed default:** Fixed 30px, configurable via constant
   
2. **Self-targeting lines**: How to handle character targeting self?
   - **Proposed default:** Small loop arc (separate concern, not in this plan)

---

## Out of Scope

- Self-targeting loop arcs (character buffs self)
- Animated line drawing
- Edge bundling for 5+ overlapping lines
- Hover/selection highlighting changes

---

## Acceptance Criteria

1. ✅ Bidirectional lines (A→B and B→A) never overlap
2. ✅ Single lines with no conflicts remain straight
3. ✅ All existing tests pass (with updates for new API)
4. ✅ No regression in visual appearance (colors, arrows, dash patterns)
5. ✅ Battle viewer displays correctly with sample encounter
