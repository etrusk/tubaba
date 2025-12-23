# Character Name Color Consistency Fix

## Decision

**Keep team colors (red/green) for circle visuals, but apply unique character colors to character NAMES across all UI panels.**

## Current State Analysis

### ✅ Where Character Names Use Unique Colors

**Event Log** ([`event-log.ts`](../src/ui/event-log.ts:62-65)):
```typescript
const colorizedMessage = colorizeCharacterNamesInText(event.message, characters);
// Hero name = unique green, Mage = unique blue, etc.
```

**Action Forecast** ([`action-forecast.ts`](../src/ui/action-forecast.ts:52)):
```typescript
// Uses colorizeCharacterNamesInText() for character names in timeline
```

### ❌ Where Character Names DON'T Use Unique Colors

**Battle Arena Circles** ([`character-circle.ts`](../src/ui/character-circle.ts:129-136)):
```typescript
<!-- Character name -->
<text 
  x="${x}" 
  y="${nameY}" 
  class="character-name"
  text-anchor="middle"
  fill="#ffffff"     // ❌ HARDCODED WHITE - should use getCharacterColor(id)
  font-size="12">${name}</text>
```

**Problem**: All character names in Battle Arena are white, not their unique colors.

## Solution Architecture

### Design Decision

**Circle Visual Elements** (keep team colors):
- Border color: Green for players, Red for enemies (team distinction)
- HP fill: Green gradient for players, Red gradient for enemies
- Rationale: Position-based team recognition, strong visual hierarchy

**Character Names** (apply unique colors):
- Name labels in ALL panels use `getCharacterColor(id)`
- Ensures same character = same color across entire UI
- Rationale: Identity consistency, character tracking across panels

### Visual Example

**Before** (current state):
```
Battle Arena:     [Green Circle] Hero (white text)
Event Log:        "Hero attacks Goblin" (Hero = green text)
Action Forecast:  "Hero → Strike" (Hero = green text)
```
❌ Inconsistent: Hero is white in Arena, green elsewhere

**After** (proposed fix):
```
Battle Arena:     [Green Circle] Hero (unique green text)
Event Log:        "Hero attacks Goblin" (Hero = unique green text)
Action Forecast:  "Hero → Strike" (Hero = unique green text)
```
✅ Consistent: Hero is unique green everywhere

## Implementation Plan

### File Changes

**1. Update [`character-circle.ts`](../src/ui/character-circle.ts)**

Import color function:
```typescript
import type { CircleCharacterData } from '../types/visualization.js';
import { getCharacterColor } from './character-name-formatter.js';  // ADD THIS
```

Replace hardcoded white text color (line 129-136):
```typescript
// BEFORE
<text 
  x="${x}" 
  y="${nameY}" 
  class="character-name"
  text-anchor="middle"
  fill="#ffffff"
  font-size="12">${name}</text>

// AFTER
<text 
  x="${x}" 
  y="${nameY}" 
  class="character-name"
  text-anchor="middle"
  fill="${getCharacterColor(id)}"
  font-size="12"
  font-weight="bold">${name}</text>
```

**Leave unchanged**:
- Border colors (lines 42-44): Keep team-based green/red
- HP fill colors (lines 47-54): Keep team-based green/red gradients
- HP text color (line 125): Keep white for readability
- Status/action text: Keep current colors

**2. Update Tests** ([`tests/ui/character-circle.test.ts`](../tests/ui/character-circle.test.ts))

Find tests that check name text color and update assertions:
```typescript
// BEFORE
expect(svg).toContain('fill="#ffffff"');  // Old white color

// AFTER
import { getCharacterColor } from '../../src/ui/character-name-formatter.js';
const expectedColor = getCharacterColor('hero');
expect(svg).toContain(`fill="${expectedColor}"`);
```

Estimated tests to update: ~5-10 assertions

### Files Modified
- [`src/ui/character-circle.ts`](../src/ui/character-circle.ts) - Apply unique color to name text
- [`tests/ui/character-circle.test.ts`](../tests/ui/character-circle.test.ts) - Update color assertions

### Files NOT Modified
- [`src/ui/character-name-formatter.ts`](../src/ui/character-name-formatter.ts) - No changes (already has color system)
- [`src/ui/event-log.ts`](../src/ui/event-log.ts) - No changes (already uses unique colors)
- [`src/ui/action-forecast.ts`](../src/ui/action-forecast.ts) - No changes (already uses unique colors)

## Acceptance Criteria

**AC-NAME-1**: Character names in Battle Arena circles use unique colors
- Hero name color in Arena = Hero name color in Event Log
- Mage name color in Arena = Mage name color in Event Log
- Each character's name has consistent color across all panels

**AC-NAME-2**: Circle visual elements keep team colors
- Player circle borders remain green (`#4caf50`)
- Enemy circle borders remain red (`#f44336`)
- HP fill gradients remain team-based (green/red)

**AC-NAME-3**: Color consistency verification
- Open Battle Viewer with 3+ players and 3+ enemies
- Verify each character name has same color in Arena, Event Log, Forecast
- Verify circle borders/fills still distinguish teams

**AC-NAME-4**: Tests updated and passing
- All character-circle tests pass with new color assertions
- No regressions in other UI tests

## Color Palette Reference

From [`character-name-formatter.ts`](../src/ui/character-name-formatter.ts:14-27):

```typescript
const CHARACTER_COLORS = [
  '#4caf50', // Green (Hero)
  '#2196f3', // Blue (Mage)
  '#f44336', // Red (Goblin)
  '#ff9800', // Orange (Orc)
  '#9c27b0', // Purple
  '#00bcd4', // Cyan
  '#ffeb3b', // Yellow
  '#e91e63', // Pink
  '#8bc34a', // Light Green
  '#ff5722', // Deep Orange
  '#673ab7', // Deep Purple
  '#03a9f4', // Light Blue
];
```

Color assigned via hash: `hash(characterId) % 12` → consistent per character

## Estimated Effort

- **Implementation**: 10-15 minutes (2 line changes + import)
- **Testing**: 15-20 minutes (update ~5-10 test assertions)
- **Total**: ~30 minutes

**Risk Level**: Low
- Minimal code changes (1 file, 2 lines)
- No engine or data structure changes
- Isolated to rendering layer
- Easy to verify visually

## Out of Scope

- Changing circle border/fill colors (stays team-based red/green)
- Customizing character colors (remains hash-based from palette)
- HP text color (stays white for readability)
- Status effect text colors (unchanged)
- Intent line colors (remain skill-type based: damage=red, heal=green, etc.)

## Visual Consistency Matrix

| UI Panel          | Character Names | Circle Borders | HP Fill |
|-------------------|-----------------|----------------|---------|
| Battle Arena      | Unique ✅       | Team (G/R)     | Team    |
| Event Log         | Unique ✅       | N/A            | N/A     |
| Action Forecast   | Unique ✅       | N/A            | N/A     |
| Debug Inspector   | Plain text      | N/A            | N/A     |

**Key Principle**: Character identity (names) = unique colors, Team affiliation (shapes/positions) = team colors
