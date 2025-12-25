# Ally Targeting Self-Inclusion Analysis

## Problem Statement

**User Request**: Characters should be able to target themselves in ANY ally targeting situation (not just when solo). The current design explicitly excludes the caster from all ally-targeting modes.

**Current Spec** ([`GAME_SPEC.md:85-87`](specs/GAME_SPEC.md:85)):
> "Self excluded from ally targeting when teammates alive:
> - Prevents heal/shield self-loops
> - Self-targeting allowed when solo or via explicit 'self' targeting mode"

**Proposed Change**: Always include caster as a valid candidate in ally targeting. Let the HP-based selection logic determine the best target naturally.

---

## Current State

### Targeting Modes Behavior

| Mode | Caster Inclusion | Code Pattern |
|------|-----------------|--------------|
| `self` | Only caster | `return [caster]` |
| `ally-lowest-hp` | **EXCLUDES** caster | `p.id !== caster.id` |
| `ally-lowest-hp-damaged` | **EXCLUDES** caster | `p.id !== caster.id` |
| `ally-dead` | Includes caster | No exclusion filter |
| `all-allies` | Includes caster | No exclusion filter |

### Skills Affected

| Skill | Targeting Mode | Current Behavior | Proposed Behavior |
|-------|---------------|------------------|-------------------|
| [`heal`](src/engine/skill-library.ts:80) | `ally-lowest-hp-damaged` | Cannot target self | Can target self if damaged and lowest HP |
| [`shield`](src/engine/skill-library.ts:91) | `ally-lowest-hp` | Cannot target self | Can target self if lowest HP |
| [`revive`](src/engine/skill-library.ts:117) | `ally-dead` | Can target self (already) | No change |

---

## Friction Points Identified

### 1. Target Selector (Code Change Required)

**File**: [`src/targeting/target-selector.ts`](src/targeting/target-selector.ts)

**Lines 51-63** (`ally-lowest-hp`):
```typescript
const livingAllies = players.filter(
  (p) => p.currentHp > 0 && p.id !== caster.id  // ← Remove exclusion
);
```

**Lines 66-78** (`ally-lowest-hp-damaged`):
```typescript
const damagedAllies = players.filter(
  (p) => p.currentHp > 0 && p.id !== caster.id && p.currentHp < p.maxHp  // ← Remove exclusion
);
```

**Change**: Remove `&& p.id !== caster.id` from both filters.

---

### 2. Intent Lines - Self-Targeting Visualization (CRITICAL)

**File**: [`src/ui/visualization-analyzer.ts`](src/ui/visualization-analyzer.ts)

**Lines 255-256**:
```typescript
// Skip self-targeting lines (would need loop arc, different logic)
if (line.casterId === line.targetId) continue;
```

**Problem**: If a character targets themselves (e.g., Shield on self), the intent line is **not rendered**.

**Options**:

| Option | Description | Complexity |
|--------|-------------|------------|
| **A. Loop Arc** | Draw a small circular arc above the character | Medium - requires new path calculation |
| **B. No Line** | Accept that self-targeting shows no arrow | Low - but inconsistent UX |
| **C. Glow Indicator** | Show a glow/highlight around character when self-targeting | Low - CSS/SVG overlay |

**Recommendation**: **Option C (Glow Indicator)** for MVP - simplest change, clear visual feedback.

---

### 3. Rule Condition Evaluator (NO CHANGE NEEDED)

**File**: [`src/ai/rule-condition-evaluator.ts`](src/ai/rule-condition-evaluator.ts)

**Lines 37-42** (`ally-count`):
```typescript
// Count living allies excluding self
const allyCount = allies.filter(
  (char) => char.id !== evaluator.id && char.currentHp > 0
).length;
```

**Lines 88-91** (`ally-has-status`):
```typescript
// Check if any living ally (excluding self) has the status
return allies.some((ally) => {
  if (ally.id === evaluator.id) return false;
```

**Analysis**: These are **condition evaluators**, not targeting selectors. They answer questions like:
- "Do I have other allies?" (for ally-count)
- "Does another ally have poisoned status?" (for ally-has-status)

**Decision**: **Keep self-exclusion**. The condition "ally-has-status" logically means "does ANY OTHER ally have this status". Self-status is checked via `self-has-status`.

---

### 4. Tick Executor Debug Mode (Code Change Required)

**File**: [`src/engine/tick-executor.ts`](src/engine/tick-executor.ts)

**Lines 554-567**:
```typescript
// Self-exclusion filter (for ally targeting)
if (targetingMode === 'ally-lowest-hp' || targetingMode === 'all-allies') {
  const selfRemoved = finalTargets.find(t => t.id === character.id);
  // ... logs about self-exclusion
}
```

**Change**: Remove this self-exclusion filter block since self will now be a valid target.

---

### 5. UI Components (Help Text Updates)

**File**: [`src/ui/targeting-override-selector.ts`](src/ui/targeting-override-selector.ts)

**Lines 30-31**:
```typescript
'ally-lowest-hp': 'Ally (Lowest HP)',
'ally-lowest-hp-damaged': 'Ally (Lowest HP - Damaged)',
```

**Lines 57-58**:
```typescript
'ally-lowest-hp': 'Targets the ally with the lowest current HP',
'ally-lowest-hp-damaged': 'Targets the ally with the lowest HP who is damaged (HP < max)',
```

**Change**: Update help text to clarify self-inclusion:
```typescript
'ally-lowest-hp': 'Targets ally or self with lowest HP',
'ally-lowest-hp-damaged': 'Targets damaged ally or self with lowest HP',
```

**File**: [`src/ui/debug-inspector.ts`](src/ui/debug-inspector.ts)

**Lines 201-202**:
```typescript
'ally-lowest-hp': 'targeting ally with lowest HP',
```

**Change**: Update to `'targeting ally or self with lowest HP'`

---

### 6. Test Expectations (Many Changes)

**File**: [`tests/targeting/target-selector.test.ts`](tests/targeting/target-selector.test.ts)

**Tests that need updating**:

| Line | Test Name | Current Expectation | New Expectation |
|------|-----------|---------------------|-----------------|
| 351 | "should exclude the caster from selection" | Caster excluded | Caster included, selected if lowest HP |
| 411 | "should return empty array when no valid allies exist (only caster alive)" | Returns `[]` | Returns `[caster]` |
| 510 | "should exclude the caster from selection" (damaged variant) | Caster excluded | Caster included if damaged and lowest |
| 610 | "should return empty array when no valid allies exist" | Returns `[]` | Returns `[caster]` if damaged |
| 644 | "should select damaged caster if caster is damaged (edge case)" | Returns `[]` | Returns `[caster]` |

**Note**: Test at line 644 has a **misleading name** - it says "should select damaged caster" but expects 0 targets.

---

## Spec Change Required

**Current** ([`GAME_SPEC.md:85-87`](specs/GAME_SPEC.md:85)):
```markdown
**Self excluded from ally targeting when teammates alive:**
- Prevents heal/shield self-loops
- Self-targeting allowed when solo or via explicit "self" targeting mode
```

**Proposed**:
```markdown
**Self included in ally targeting:**
- Characters may target themselves with ally-targeting skills (Heal, Shield)
- Target selection follows normal HP-based priority (lowest HP wins)
- Healers prioritize lower-HP allies naturally; self-heal only when they are lowest HP
```

---

## Implementation Plan

### Phase 1: Core Targeting Logic

| File | Change | Priority |
|------|--------|----------|
| [`src/targeting/target-selector.ts`](src/targeting/target-selector.ts) | Remove `p.id !== caster.id` from `ally-lowest-hp` and `ally-lowest-hp-damaged` | **P0** |
| [`tests/targeting/target-selector.test.ts`](tests/targeting/target-selector.test.ts) | Update 5+ tests to expect caster inclusion | **P0** |

### Phase 2: Debug & Display

| File | Change | Priority |
|------|--------|----------|
| [`src/engine/tick-executor.ts`](src/engine/tick-executor.ts) | Remove self-exclusion filter logging (lines 554-567) | **P1** |
| [`src/ui/targeting-override-selector.ts`](src/ui/targeting-override-selector.ts) | Update help text to mention self-inclusion | **P1** |
| [`src/ui/debug-inspector.ts`](src/ui/debug-inspector.ts) | Update mode explanations | **P1** |

### Phase 3: Visualization

| File | Change | Priority |
|------|--------|----------|
| [`src/ui/visualization-analyzer.ts`](src/ui/visualization-analyzer.ts) | Add self-targeting indicator (glow) instead of skipping | **P2** |
| [`src/ui/character-circle.ts`](src/ui/character-circle.ts) | Add self-targeting glow style | **P2** |

### Phase 4: Spec Update

| File | Change | Priority |
|------|--------|----------|
| [`specs/GAME_SPEC.md`](specs/GAME_SPEC.md) | Update lines 85-87 with new targeting behavior | **P1** |

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Healer at 30 HP, Ally at 50 HP | Healer self-heals (30 < 50) |
| Healer at 50 HP, Ally at 30 HP | Healer heals ally (30 < 50) |
| Healer at 100 HP (full), Ally at 50 HP | Healer heals ally (only damaged target) |
| Healer at 50 HP, Ally at 100 HP (full) | Healer self-heals (only damaged target) |
| Both at same HP (50), damaged | Leftmost target wins (tie-breaker) |
| Shield on lowest HP: Caster at 30 HP | Caster shields self |
| Solo healer, damaged | Healer self-heals |
| Solo healer, full HP | No target (correct - not damaged) |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Self-heal loops dominate strategy | Low | Medium | HP priority naturally prevents loops - healer only self-heals when lowest |
| Visual confusion (no arrow for self) | Medium | Low | Add glow indicator for self-targeting |
| Test regressions | Medium | Low | Comprehensive test updates in plan |
| Balance shift (healers survive longer) | Medium | Medium | Monitor gameplay; healers still need team coordination |

---

## Decision

**Status**: Proposed

**Context**: User requests that characters should be able to target themselves in any ally targeting situation, regardless of party size.

**Decision**: 
1. Remove caster exclusion from `ally-lowest-hp` and `ally-lowest-hp-damaged`
2. Add self-targeting visual indicator (glow) for intent display
3. Update spec, help text, and tests accordingly
4. Keep `ally-count` and `ally-has-status` conditions unchanged (they check OTHER allies)

**Consequences**:
- Characters can now self-heal/shield when they are the lowest HP target
- Solo survivors can always self-target
- HP-based priority naturally prevents degenerate self-heal loops
- Intent visualization needs self-targeting indicator
- Multiple tests require expectation updates

**Confidence**: HIGH (90%+) - Clear design direction, well-scoped changes.
