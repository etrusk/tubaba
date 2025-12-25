# SkillDisplay Component with Tooltip (v2)

## Overview

Create a unified SkillDisplay component for consistent skill presentation across **all** UI locations. The component renders skill name, color, duration indicator, and provides a hover tooltip with full skill details (effects, targeting, duration).

## Status: Phase 2 Required

Phase 1 complete: Created `renderSkillDisplay()` and migrated `skill-priority-editor.ts`.

**Phase 2 gaps identified:**
1. Available Skills panel uses `.pool-skill` class (no tooltip)
2. Equipped Skills panel uses `.loadout-skill` class (no tooltip)
3. Tooltip content unhelpful for status effects ("Applies Taunting" doesn't explain what Taunting does)

## Problem Statement

Skills are currently rendered inconsistently in 6+ locations:

| Location | Current Rendering | Missing |
|----------|------------------|---------|
| [`character-card.ts:50-58`](../src/ui/character-card.ts:50) | `skillId.charAt(0).toUpperCase() + slice(1)` | Color, duration, tooltip |
| [`character-circle.ts:77-84`](../src/ui/character-circle.ts:77) | `skillId` + `SKILL_COLORS` lookup + ticks | Tooltip |
| [`skill-priority-editor.ts:113`](../src/ui/skill-priority-editor.ts:113) | `skill.name` + inline duration | Color, tooltip |
| [`action-forecast.ts:62-64`](../src/ui/action-forecast.ts:62) | `skillName` only | Color, duration, tooltip |
| [`debug-inspector.ts:80-81`](../src/ui/debug-inspector.ts:80) | `skillName` + priority | Color, tooltip |
| [`event-log.ts:103-127`](../src/ui/event-log.ts:103) | Skill name in event text | Color, tooltip |

**Issues:**
1. No tooltips anywhere - users can't discover what skills do
2. Color determined inconsistently (some use `SKILL_COLORS`, some use `getSkillColor()`)
3. Duration formatting duplicated
4. Capitalization logic duplicated

## Components

### 1. Extended SkillViewModel

**Purpose**: Add tooltip content fields to existing [`SkillViewModel`](../src/types/view-models.ts:13-24).

**New fields** (all pre-formatted for display):

```typescript
// src/types/view-models.ts (extend existing)
export interface SkillViewModel {
  // Existing fields
  id: string;
  name: string;
  baseDuration: number;
  formattedDuration: string;  // "2 ticks"
  color: string;              // skill-type color

  // NEW: Tooltip content fields
  /** Human-readable effect summary, e.g., "Deals 15 damage" */
  effectsSummary: string;
  /** Human-readable targeting description, e.g., "Targets lowest HP enemy" */
  targetingDescription: string;
}
```

**Effect summary examples:**
- `"Deals 15 damage"`
- `"Heals 30 HP"`
- `"Applies Poisoned for 6 ticks"`
- `"Grants 20 Shield"`
- `"Revives with 50% HP"`
- `"Interrupts target's action"`
- `"Deals 25 damage, Applies Stunned for 2 ticks"` (multi-effect)

**Targeting description examples:**
- `"Targets self"`
- `"Targets lowest HP enemy"`
- `"Targets all enemies"`
- `"Targets lowest HP ally (including self)"`
- `"Targets dead ally"`

### 2. SkillDisplay Component

**Purpose**: Reusable function that renders a skill element with consistent styling and tooltip.

**Location**: `src/ui/skill-display.ts`

**Signature:**
```typescript
export interface SkillDisplayOptions {
  /** Show duration indicator (default: true) */
  showDuration?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Render as inline span vs block div (default: inline) */
  inline?: boolean;
}

/**
 * Renders a skill element with tooltip
 * @returns HTML string with skill name and CSS tooltip
 */
export function renderSkillDisplay(
  skill: SkillViewModel,
  options?: SkillDisplayOptions
): string;
```

**HTML structure (CSS tooltip approach):**
```html
<span class="skill-display" style="color: #f44336;" data-skill-id="strike">
  Strike
  <span class="skill-duration">(2 ticks)</span>
  <span class="skill-tooltip">
    <strong>Strike</strong> (2 ticks)<br>
    Deals 15 damage<br>
    <em>Targets lowest HP enemy</em>
  </span>
</span>
```

**CSS (add to battle-viewer.html):**
```css
.skill-display {
  position: relative;
  cursor: help;
}

.skill-tooltip {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  z-index: 1000;
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px 12px;
  min-width: 180px;
  max-width: 250px;
  font-size: 0.85rem;
  line-height: 1.4;
  color: #e0e0e0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  
  /* Position below by default */
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  margin-top: 8px;
  
  transition: opacity 0.15s ease-in-out, visibility 0.15s ease-in-out;
  pointer-events: none;
}

.skill-display:hover .skill-tooltip {
  visibility: visible;
  opacity: 1;
}

.skill-tooltip strong {
  color: inherit;
}

.skill-tooltip em {
  color: #888;
}

.skill-duration {
  color: #64b5f6;
  font-size: 0.85em;
  margin-left: 4px;
}
```

### 3. Effect Formatter

**Purpose**: Convert [`SkillEffect[]`](../src/types/skill.ts:27-36) to human-readable summary.

**Location**: Extend [`ViewModelFactory`](../src/ui/view-model-factory.ts)

**Logic:**
```typescript
private static formatEffects(effects: SkillEffect[]): string {
  return effects.map(effect => {
    switch (effect.type) {
      case 'damage':
        return `Deals ${effect.value} damage`;
      case 'heal':
        return `Heals ${effect.value} HP`;
      case 'shield':
        return `Grants ${effect.value} Shield`;
      case 'status':
        return `Applies ${capitalize(effect.statusType!)} for ${effect.duration} ticks`;
      case 'revive':
        return `Revives with ${effect.value}% HP`;
      case 'cancel':
        return `Interrupts target's action`;
      default:
        return '';
    }
  }).filter(Boolean).join(', ');
}
```

### 4. Targeting Formatter

**Purpose**: Convert [`TargetingMode`](../src/types/skill.ts:14-22) to human-readable description.

**Location**: Extend [`ViewModelFactory`](../src/ui/view-model-factory.ts)

**Logic:**
```typescript
private static formatTargeting(mode: TargetingMode): string {
  const descriptions: Record<TargetingMode, string> = {
    'self': 'Targets self',
    'single-enemy-lowest-hp': 'Targets lowest HP enemy',
    'single-enemy-highest-hp': 'Targets highest HP enemy',
    'all-enemies': 'Targets all enemies',
    'ally-lowest-hp': 'Targets lowest HP ally (including self)',
    'ally-lowest-hp-damaged': 'Targets lowest HP damaged ally',
    'ally-dead': 'Targets dead ally',
    'all-allies': 'Targets all allies',
  };
  return descriptions[mode] ?? mode;
}
```

## Data Flow

```
┌─────────────────┐     ┌──────────────────────────────┐     ┌─────────────────┐
│      Skill      │ ──► │      ViewModelFactory        │ ──► │  SkillViewModel │
│    (domain)     │     │  + formatEffects()           │     │  (extended)     │
│                 │     │  + formatTargeting()         │     │                 │
└─────────────────┘     └──────────────────────────────┘     └─────────────────┘
                                                                      │
                                                                      ▼
                                                          ┌─────────────────────┐
                                                          │  renderSkillDisplay │
                                                          │  (skill-display.ts) │
                                                          └─────────────────────┘
                                                                      │
                         ┌────────────────────────────────────────────┴────┐
                         ▼                ▼                ▼               ▼
                  ┌──────────┐     ┌──────────┐     ┌───────────┐   ┌──────────┐
                  │ CharCard │     │ SkillEd  │     │ DebugInsp │   │ Forecast │
                  └──────────┘     └──────────┘     └───────────┘   └──────────┘
```

## Implementation Sequence

1. **Extend SkillViewModel interface** (`src/types/view-models.ts`)
   - Add `effectsSummary: string`
   - Add `targetingDescription: string`
   - No breaking changes to existing fields

2. **Add formatters to ViewModelFactory** (`src/ui/view-model-factory.ts`)
   - Add `formatEffects()` private method
   - Add `formatTargeting()` private method
   - Update `createSkillViewModel()` to populate new fields

3. **Create SkillDisplay component** (`src/ui/skill-display.ts`)
   - Export `renderSkillDisplay()` function
   - Export `SkillDisplayOptions` interface
   - CSS-only tooltip implementation

4. **Add CSS to battle-viewer.html**
   - `.skill-display` styles
   - `.skill-tooltip` hover styles
   - `.skill-duration` inline styles

5. **Update unit tests** (`tests/ui/view-model-factory.test.ts`)
   - Test effect formatting for each effect type
   - Test targeting mode descriptions
   - Test multi-effect skills

6. **Create component tests** (`tests/ui/skill-display.test.ts`)
   - Test HTML structure
   - Test options handling
   - Test tooltip content

7. **Migrate UI components** (one at a time, backward compatible)
   - `skill-priority-editor.ts` - high impact, shows all skills
   - `character-circle.ts` - visible in main arena
   - `debug-inspector.ts` - shows skill names in evaluations
   - `action-forecast.ts` - shows skill names in timeline
   - `character-card.ts` - shows current action skill
   - `event-log.ts` - (lowest priority, inline text context)

## Design Decisions

### CSS-only Tooltips (vs JS)

**Decision**: Use CSS `:hover` tooltips, not JS event handlers.

**Rationale**:
- Simpler implementation (no event listeners, no state)
- Works with SSR-style string rendering (current pattern)
- Native browser handling of show/hide timing
- Adequate for discovery tooltips (not interactive content)

**Trade-off**: Cannot reposition if tooltip goes off-screen. Acceptable for game UI where layout is controlled.

### Pre-formatted Tooltip Content

**Decision**: Store `effectsSummary` and `targetingDescription` as pre-formatted strings in ViewModel, not raw effect data.

**Rationale**:
- UI components never need to format - just render
- Matches existing ViewModel pattern (pre-computed `formattedDuration`, `formattedName`)
- Single formatting point in ViewModelFactory

### Inline vs Block Rendering

**Decision**: Default to inline (`<span>`) for flexibility.

**Rationale**:
- Most usages are inline (within sentences, lists)
- `inline: false` option available for block contexts

## Out of Scope

- Interactive tooltips (click-to-pin, hover delay config)
- Tooltip repositioning based on viewport bounds
- Skill icons or images
- Animation effects on skill execution
- Detailed condition/rule display in tooltip

## Test Scenarios

### ViewModelFactory - Effect Formatting

**Critical path:**
| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Damage effect | `{type: 'damage', value: 15}` | `"Deals 15 damage"` | value=0 |
| Heal effect | `{type: 'heal', value: 30}` | `"Heals 30 HP"` | - |
| Status effect | `{type: 'status', statusType: 'poisoned', duration: 6}` | `"Applies Poisoned for 6 ticks"` | duration=1 (singular) |
| Shield effect | `{type: 'shield', value: 20}` | `"Grants 20 Shield"` | - |
| Revive effect | `{type: 'revive', value: 50}` | `"Revives with 50% HP"` | - |
| Cancel effect | `{type: 'cancel'}` | `"Interrupts target's action"` | - |
| Multi-effect | `[damage 15, status stunned 2]` | `"Deals 15 damage, Applies Stunned for 2 ticks"` | - |
| Empty effects | `[]` | `""` | - |

**Standard coverage:**
- All targeting modes produce non-empty descriptions
- Skill duration formatting matches existing behavior

**Skip testing:**
- CSS tooltip visibility (browser/CSS behavior)
- HTML attribute escaping (framework concern)

### SkillDisplay Component

**Critical path:**
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| Basic render | SkillViewModel with all fields | HTML with skill name, color, tooltip |
| No duration | `{ showDuration: false }` | No `.skill-duration` span |
| Custom class | `{ className: 'my-skill' }` | Class added to root element |

**Standard coverage:**
- `data-skill-id` attribute present
- Tooltip contains effectsSummary and targetingDescription

**Skip testing:**
- Hover behavior (CSS, not JS)
- Tooltip positioning (CSS, not JS)

## Acceptance Criteria

1. [ ] `SkillViewModel` extended with `effectsSummary` and `targetingDescription`
2. [ ] `ViewModelFactory.createSkillViewModel()` populates new fields
3. [ ] `renderSkillDisplay()` produces consistent HTML with CSS tooltip
4. [ ] At least one UI component migrated to use `renderSkillDisplay()`
5. [ ] Tooltip displays skill name, duration, effects, and targeting
6. [ ] Existing tests pass
7. [ ] New tests cover effect formatting and component rendering

## Migration Path (Backward Compatible)

Each component can be migrated independently:

### Phase 1: Infrastructure (required)
- Extend SkillViewModel (non-breaking)
- Update ViewModelFactory
- Create skill-display.ts
- Add CSS

### Phase 2: Migrate Components (incremental)

**skill-priority-editor.ts** (first, highest impact):
```typescript
// Before
<span class="skill-name">${skill.name} 
  <span style="color: #64b5f6; font-size: 0.85em;">(${skill.baseDuration} ticks)</span>
</span>

// After
${renderSkillDisplay(skill)}
```

**character-circle.ts**:
```typescript
// Before  
const skillName = currentAction.skillId.charAt(0).toUpperCase() + currentAction.skillId.slice(1);
actionColor = SKILL_COLORS[currentAction.skillId] ?? SKILL_COLORS['default'];

// After (need to pass skill ViewModel from action)
${renderSkillDisplay(actionSkill, { inline: true })}
```

**Remaining components**: Follow similar pattern, replace inline formatting with `renderSkillDisplay()`.

---

# Phase 2: Complete UI Standardization

## Problem Summary

Three panels render skills differently:

| Panel | Current Class | Current Look | Tooltip |
|-------|--------------|--------------|---------|
| Available Skills | `.pool-skill` | Gradient rounded rect | ❌ None |
| Equipped Skills | `.loadout-skill` | Solid color rect | ❌ None |
| Instructions (Skill Priority) | `.skill-display` | Name + duration | ✅ Has tooltip |

**User expectation:** All skills should look and behave identically with helpful tooltips.

## Phase 2 Requirements

### 1. Enhanced Tooltip Content - Status Effect Descriptions

Current tooltip for Taunt: `"Applies Taunting for 4 ticks"`
**Problem:** Doesn't explain what Taunting does.

**Solution:** Include status effect descriptions from [`src/types/status.ts`](../src/types/status.ts:1-9):

| Status | Description |
|--------|-------------|
| `poisoned` | Deals damage over time |
| `stunned` | Prevents action queueing |
| `shielded` | Absorbs damage before HP |
| `taunting` | Forces enemies to target this character |
| `defending` | Reduces incoming damage by 50% |
| `enraged` | Doubles outgoing damage |

**Enhanced tooltip example:**
```
Taunt (2 ticks)
Applies Taunting for 4 ticks
→ Forces enemies to target this character
Targets self
```

### 2. Unified Skill Styling

Replace all skill rendering with `renderSkillDisplay()`:

**Option A (Selected/Highlight variant):**
```typescript
export interface SkillDisplayOptions {
  showDuration?: boolean;  // default: true
  className?: string;      // Additional classes
  inline?: boolean;        // default: true
  selectable?: boolean;    // default: false - adds hover/select styles
  selected?: boolean;      // default: false - currently selected
  disabled?: boolean;      // default: false - greyed out, non-interactive
}
```

**Unified CSS approach:**
- Base `.skill-display` for all skills
- Modifier classes: `.skill-display--selectable`, `.skill-display--selected`, `.skill-display--disabled`
- Remove `.pool-skill` and `.loadout-skill` classes

### 3. SkillViewModel Enhancement

Extend effect formatting to include status descriptions:

```typescript
// In view-model-factory.ts
private static formatStatusEffect(statusType: StatusType, duration: number): string {
  const descriptions: Record<StatusType, string> = {
    'poisoned': 'Deals damage over time',
    'stunned': 'Prevents action queueing',
    'shielded': 'Absorbs damage before HP',
    'taunting': 'Forces enemies to target this character',
    'defending': 'Reduces incoming damage by 50%',
    'enraged': 'Doubles outgoing damage',
  };
  
  const tickText = duration === 1 ? 'tick' : 'ticks';
  const statusName = statusType.charAt(0).toUpperCase() + statusType.slice(1);
  return `Applies ${statusName} for ${duration} ${tickText}\n→ ${descriptions[statusType]}`;
}
```

## Phase 2 Implementation Sequence

### Step 1: Enhance ViewModelFactory effect formatting
File: `src/ui/view-model-factory.ts`
- Add status effect descriptions to `formatEffects()` method
- Include the "→ [explanation]" on new line for status effects

### Step 2: Update SkillDisplayOptions
File: `src/ui/skill-display.ts`
- Add `selectable`, `selected`, `disabled` options
- Add corresponding CSS class generation

### Step 3: Add unified CSS
File: `battle-viewer.html`
- Add `.skill-display--selectable` hover styles
- Add `.skill-display--selected` gold border
- Add `.skill-display--disabled` opacity + strikethrough
- Remove `.pool-skill` and `.loadout-skill` styles

### Step 4: Migrate Available Skills panel
File: `battle-viewer.html` (lines 1394-1407)
Replace:
```javascript
<div class="pool-skill ${selectedSkillId === skillId ? 'selected' : ''}"
     style="background: ${getSkillColor(skillId)};"
     onclick="selectSkillFromPool('${skillId}')">
  ${SkillLibrary.getSkill(skillId).name}
</div>
```
With:
```javascript
${renderSkillDisplay(ViewModelFactory.createSkillViewModel(SkillLibrary.getSkill(skillId)), {
  showDuration: false,
  selectable: true,
  selected: selectedSkillId === skillId
})}
```

### Step 5: Migrate Equipped Skills panel
File: `battle-viewer.html` (lines 1417-1444)
Replace inline `.loadout-skill` divs with `renderSkillDisplay()` calls:
- Innate skills (Strike, Defend): `{ disabled: true, showDuration: false }`
- Equipped skills: `{ showDuration: false }` with onclick for unequip

### Step 6: Update tests
- Test status effect descriptions in view-model-factory.test.ts
- Test new options in skill-display.test.ts

## Updated CSS

```css
/* Base skill display (already exists) */
.skill-display {
  position: relative;
  cursor: help;
  display: inline-block;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: bold;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

/* Selectable variant (for pool/loadout) */
.skill-display--selectable {
  cursor: pointer;
}

.skill-display--selectable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

/* Selected state */
.skill-display--selected {
  border-color: #ffd700;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
}

/* Disabled state (innate skills) */
.skill-display--disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Remove old classes (cleanup) */
/* .pool-skill - REMOVE */
/* .loadout-skill - REMOVE */
```

## Phase 2 Acceptance Criteria

1. [ ] All three panels use `renderSkillDisplay()` for skill rendering
2. [ ] Status effects show explanatory descriptions in tooltip
3. [ ] Skill styling consistent across all panels (same border-radius, padding)
4. [ ] Tooltips visible on hover in all three panels
5. [ ] Selected state visual feedback (gold border) works in all panels
6. [ ] Disabled state (innate skills) renders correctly
7. [ ] All tests pass
8. [ ] Old `.pool-skill` and `.loadout-skill` CSS removed

## Test Scenarios - Phase 2

### ViewModelFactory - Status Effect Descriptions

| Scenario | Input | Expected effectsSummary |
|----------|-------|------------------------|
| Taunting status | `{type: 'status', statusType: 'taunting', duration: 4}` | `"Applies Taunting for 4 ticks\n→ Forces enemies to target this character"` |
| Poisoned status | `{type: 'status', statusType: 'poisoned', duration: 6}` | `"Applies Poisoned for 6 ticks\n→ Deals damage over time"` |
| Stunned status | `{type: 'status', statusType: 'stunned', duration: 2}` | `"Applies Stunned for 2 ticks\n→ Prevents action queueing"` |
| Defending status | `{type: 'status', statusType: 'defending', duration: 3}` | `"Applies Defending for 3 ticks\n→ Reduces incoming damage by 50%"` |

### SkillDisplay - New Options

| Scenario | Options | Expected Classes |
|----------|---------|-----------------|
| Selectable | `{ selectable: true }` | `skill-display skill-display--selectable` |
| Selected | `{ selectable: true, selected: true }` | `skill-display skill-display--selectable skill-display--selected` |
| Disabled | `{ disabled: true }` | `skill-display skill-display--disabled` |
