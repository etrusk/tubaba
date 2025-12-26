# Tooltip Z-Index Fix Plan

## Problem Analysis

The skill tooltip z-index has failed 3 times because the root cause was never addressed: **CSS stacking contexts**.

### Current State

In [`battle-viewer.html`](../battle-viewer.html):
- [`.skill-tooltip`](../battle-viewer.html:1059) has `position: absolute; z-index: 10000`
- [`.panel`](../battle-viewer.html:67) has `backdrop-filter: blur(10px)` → **creates stacking context**
- [`.instructions-panel`](../battle-viewer.html:369) has `overflow-y: auto` → **creates stacking context**
- Inline styles at lines 1429, 1448 add `z-index: 1000` → **creates stacking context**

**Why z-index fails:** A child element's z-index only competes within its parent's stacking context. The tooltip's `z-index: 10000` is meaningless when its ancestor has `backdrop-filter` - it can never appear above elements outside that context.

### Options Evaluated

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **1. Fixed positioning + JS** | Escapes stacking contexts, works with existing DOM | Requires JS for position calculation | ✅ **Recommended** |
| **2. Body-level tooltip container** | Complete escape from contexts | Major DOM restructuring, lifecycle management | ❌ Over-engineered |
| **3. CSS containment audit** | Pure CSS | Breaks scrolling (`overflow-y`), fragile to future changes | ❌ Impractical |
| **4. Popover API** | Native top-layer support | Chrome 114+, Firefox 125+, Safari 17+ only | ❌ Limited support |

## Chosen Approach: Fixed Positioning with JS Coordinates

**Rationale:**
1. `position: fixed` always positions relative to viewport, escaping ALL stacking contexts
2. Minimal JS required (just `getBoundingClientRect()` on hover)
3. No browser compatibility issues
4. No DOM restructuring needed
5. Permanent fix - won't break with future CSS changes

## Implementation

### CSS Changes ([`battle-viewer.html`](../battle-viewer.html))

**Before (line 1059-1082):**
```css
.skill-tooltip {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  z-index: 10000;
  /* ... */
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  margin-top: 8px;
}

.skill-display:hover .skill-tooltip {
  visibility: visible;
  opacity: 1;
}
```

**After:**
```css
.skill-tooltip {
  visibility: hidden;
  opacity: 0;
  position: fixed;  /* Changed from absolute */
  z-index: 10000;
  /* ... */
  /* Remove left/top/transform - JS will set these */
  pointer-events: none;
}

.skill-tooltip.visible {
  visibility: visible;
  opacity: 1;
}
```

### JS Changes ([`battle-viewer.html`](../battle-viewer.html))

Add tooltip positioning logic in the script section:

```javascript
// Tooltip positioning - escapes stacking contexts via position:fixed
document.addEventListener('mouseenter', (e) => {
  const skillDisplay = e.target.closest('.skill-display');
  if (!skillDisplay) return;
  
  const tooltip = skillDisplay.querySelector('.skill-tooltip');
  if (!tooltip) return;
  
  const rect = skillDisplay.getBoundingClientRect();
  const tooltipHeight = 100; // Approximate, will adjust
  
  // Position below by default, above if near bottom
  const spaceBelow = window.innerHeight - rect.bottom;
  const showAbove = spaceBelow < tooltipHeight + 20;
  
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.transform = 'translateX(-50%)';
  
  if (showAbove) {
    tooltip.style.top = `${rect.top - 8}px`;
    tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
  } else {
    tooltip.style.top = `${rect.bottom + 8}px`;
  }
  
  tooltip.classList.add('visible');
}, true);

document.addEventListener('mouseleave', (e) => {
  const skillDisplay = e.target.closest('.skill-display');
  if (!skillDisplay) return;
  
  const tooltip = skillDisplay.querySelector('.skill-tooltip');
  if (tooltip) {
    tooltip.classList.remove('visible');
  }
}, true);
```

### Edge Cases Handled

1. **Near bottom of viewport:** Tooltip appears above the skill
2. **Near edges:** `translateX(-50%)` centers horizontally, contained within viewport
3. **Scrolling:** Position is calculated fresh on each hover (no stale coordinates)
4. **Multiple tooltips:** Only the hovered tooltip becomes visible

## Files to Modify

1. [`battle-viewer.html`](../battle-viewer.html) - CSS and JS changes

## Test Scenarios

**Critical path:**
| Scenario | Steps | Expected |
|----------|-------|----------|
| Tooltip in instructions panel | Hover skill in scrollable panel | Tooltip visible above ALL UI |
| Tooltip near bottom | Scroll so skill is near viewport bottom, hover | Tooltip appears ABOVE skill |
| Tooltip persistence | Hover skill, scroll page | Tooltip stays correctly positioned or hides |
| Multiple skills | Hover skill A, move to skill B | Only skill B's tooltip visible |

**Standard coverage:**
- Tooltip content displays correctly (skill name, description, duration)
- Tooltip disappears on mouse leave
- Works in all three column areas (left, middle, right)

**Skip testing:**
- Tooltip styling (visual only, not functional)
- Animation timing (CSS transition)

## Acceptance Criteria

1. [ ] Tooltips appear above ALL UI elements regardless of container
2. [ ] Tooltips correctly position below skills (or above near viewport bottom)
3. [ ] No tooltip clipping or overflow issues
4. [ ] Existing tooltip content and styling preserved
5. [ ] Works in instructions panel, skill pool, and character inventory

## Complexity Budget

- **Files modified:** 1 (battle-viewer.html)
- **New abstractions:** 0
- **Lines of CSS changed:** ~10
- **Lines of JS added:** ~30

---

# Debug Battle Builder Implementation Plan

## Overview

Convert battle-viewer from "run with predefined enemies" to a "create-your-own-battle debug mode" where both player and enemy characters can be freely added, removed, and modified including skill assignment. This is a debug/testing tool, not production game flow.

## Current State Analysis

| Component | Current Behavior | Issue |
|-----------|-----------------|-------|
| [`Character`](../src/types/character.ts:8) | Has `isPlayer: boolean` | ✅ Already generic |
| [`RunState.playerParty`](../src/types/run.ts:43) | Only manages player characters | ❌ No enemy management |
| [`skill-loadout-manager.ts`](../src/run/skill-loadout-manager.ts:43) | Hardcoded to `runState.playerParty` | ❌ Excludes enemies |
| [`battle-viewer.html:1284`](../battle-viewer.html:1284) | Blocks enemy skill assignment | ❌ Artificial restriction |
| [`enemy-brain.ts`](../src/ai/enemy-brain.ts:25) | `selectAction()` works for any character | ✅ Already generic |

## Design Decision: Debug-Only Character Manager

**Decision:** Create parallel debug utilities instead of modifying production code.

**Options Considered:**

1. **Extend `RunState` with `allCharacters`** - Clean but adds permanent complexity to run management
2. **Rename `playerParty` to `characters`** - Breaking change, too invasive for a debug tool
3. **Create debug-specific utilities** ✅ - Non-breaking, clearly scoped

**Rationale:** Debug Battle Builder is a testing tool, not production game flow. Creating separate utilities:
- Preserves existing run management integrity
- Clearly communicates "this is for debugging"
- Allows ad-hoc character manipulation without state machine complexity

## Components

### 1. DebugBattleState Interface

**Purpose:** Lightweight state for debug mode (no run progression, encounters, etc.)

**Location:** `src/types/debug.ts` (extend existing file)

```typescript
export interface DebugBattleState {
  /** All characters in the debug battle (players and enemies) */
  characters: Character[];
  /** Shared skill pool for distribution */
  skillPool: string[];
}
```

### 2. Debug Character Manager

**Purpose:** Manage characters and skills in debug mode (no player/enemy distinction for loadouts)

**Location:** `src/run/debug-character-manager.ts` (new file)

```typescript
/**
 * Distribute a skill to any character in debug mode
 * @returns Updated state with skill moved from pool to character
 */
export function debugDistributeSkill(
  state: DebugBattleState,
  skillId: string,
  characterId: string
): DebugBattleState;

/**
 * Unequip a skill from any character in debug mode
 * @returns Updated state with skill returned to pool
 */
export function debugUnequipSkill(
  state: DebugBattleState,
  skillId: string,
  characterId: string
): DebugBattleState;

/**
 * Add a new character to the debug battle
 * @returns Updated state with new character
 */
export function debugAddCharacter(
  state: DebugBattleState,
  character: Character
): DebugBattleState;

/**
 * Remove a character from the debug battle
 * @returns Updated state with character removed, skills returned to pool
 */
export function debugRemoveCharacter(
  state: DebugBattleState,
  characterId: string
): DebugBattleState;
```

### 3. Rename: enemy-brain.ts → action-selector.ts

**Purpose:** File name should reflect actual behavior (selects action for ANY AI-controlled character)

**Changes:**
- Rename file: `src/ai/enemy-brain.ts` → `src/ai/action-selector.ts`
- Rename test: `tests/ai/enemy-brain.test.ts` → `tests/ai/action-selector.test.ts`
- Update imports in:
  - `src/engine/tick-executor.ts`
  - `battle-viewer.html`
  - Any other files importing from `enemy-brain.ts`

**No code changes:** The `selectAction()` function already has the correct generic name.

### 4. Battle Viewer UI Updates

**Purpose:** Enable character/skill management for ALL characters

**Changes in `battle-viewer.html`:**

1. **State management:** Replace `RunState` + `CombatState` hybrid with `DebugBattleState` for debug mode
2. **Character panel:** Show ALL characters (not just `playerParty`)
3. **Skill assignment:** Remove line 1284 restriction (`const character = runState.playerParty.find(...)`)
4. **Add character UI:** Button to spawn new player/enemy with defaults
5. **Remove character UI:** X button on each character card

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Debug Battle Builder                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐    ┌────────────────────────┐                   │
│  │ DebugBattleState│◄───│ debugDistributeSkill() │                   │
│  │  - characters[] │    │ debugUnequipSkill()    │                   │
│  │  - skillPool[]  │    │ debugAddCharacter()    │                   │
│  └────────┬────────┘    │ debugRemoveCharacter() │                   │
│           │             └────────────────────────┘                   │
│           │                                                           │
│           ▼                                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  CombatState    │───►│  tick-executor  │───►│  action-selector │  │
│  │  (for battle)   │    │                 │    │  (was enemy-brain)│  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Implementation Sequence

### Phase 1: Infrastructure (must complete first)
1. [ ] Extend `src/types/debug.ts` with `DebugBattleState` interface
2. [ ] Create `src/run/debug-character-manager.ts` with all four functions
3. [ ] Write tests for debug-character-manager

### Phase 2: Rename (safe refactor)
4. [ ] Rename `src/ai/enemy-brain.ts` → `src/ai/action-selector.ts`
5. [ ] Rename `tests/ai/enemy-brain.test.ts` → `tests/ai/action-selector.test.ts`
6. [ ] Update all imports (search for `enemy-brain`)
7. [ ] Verify tests pass

### Phase 3: UI Integration
8. [ ] Update `battle-viewer.html` to use `DebugBattleState`
9. [ ] Remove line 1284 player-only restriction
10. [ ] Add "Add Character" button with modal/form
11. [ ] Add "Remove Character" button on character cards
12. [ ] Test skill equip/unequip for both players AND enemies

## Out of Scope

- Production run management changes (keep `RunState` and `skill-loadout-manager.ts` as-is)
- Character stat editing (HP, name) - future enhancement
- Skill creation UI - use existing `SkillLibrary`
- Save/load debug battle configurations
- Multiple encounters in debug mode

## Open Questions

1. **Default character stats?** → Propose: HP=100, start with Strike+Defend only
2. **Character naming?** → Propose: "Player N" or "Enemy N" auto-generated
3. **Initial skill pool?** → Propose: All skills from `SkillLibrary.getAllSkills()`

## Test Scenarios

### debug-character-manager.ts

**Critical path:**
| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Distribute skill to player | valid skillId, player characterId | Skill moves pool→character | Character already has skill |
| Distribute skill to enemy | valid skillId, enemy characterId | Skill moves pool→character | Enemy at 4-skill cap |
| Unequip from player | equipped skill | Skill returns to pool | Cannot unequip innate |
| Unequip from enemy | equipped skill | Skill returns to pool | Cannot unequip innate |
| Add character | new Character | Appended to characters[] | Duplicate ID |
| Remove character | existing characterId | Character removed, skills→pool | Remove last character |

**Standard coverage:**
- Verify `isPlayer` flag preserved through operations
- Verify skill pool updates correctly

**Skip testing:**
- UI integration (browser testing)
- CSS tooltip visibility

### action-selector.ts (rename only)

**Critical path:**
| Scenario | Input | Expected |
|----------|-------|----------|
| All existing tests pass | - | No behavior change |
| Imports updated | grep for 'enemy-brain' | Zero results |

## Acceptance Criteria

1. [ ] `DebugBattleState` interface exists with `characters[]` and `skillPool[]`
2. [ ] All four debug functions work for both `isPlayer: true` AND `isPlayer: false` characters
3. [ ] `enemy-brain.ts` renamed to `action-selector.ts` with all imports updated
4. [ ] Battle viewer allows skill equipping on enemy characters
5. [ ] "Add Character" button spawns new characters (player or enemy)
6. [ ] "Remove Character" removes character and returns skills to pool
7. [ ] All existing tests pass
8. [ ] New tests cover debug-character-manager functions

## Complexity Budget

- **New files:** 2 (debug-character-manager.ts, debug-character-manager.test.ts)
- **New abstractions:** 1 (`DebugBattleState` interface)
- **Modified files:** ~5 (debug.ts, battle-viewer.html, imports for rename)

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rename breaks imports | Medium | Search all files for 'enemy-brain' before committing |
| UI state management complexity | Low | Keep DebugBattleState simple, derive CombatState on demand |
| Innate skill handling for enemies | Low | Enemies also get Strike+Defend as innate |
