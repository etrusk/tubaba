# Character Color Architecture Issue

## Problem Statement

**User Report**: "When we implemented unique character colors, the changes only happened in one panel. Are we not using objects for characters? The changes should be across the game."

**Root Cause**: The unique character color system ([`character-name-formatter.ts`](../src/ui/character-name-formatter.ts)) is only applied to text rendering, not to visual elements like Battle Arena circles.

## Current State Analysis

### ✅ Where Unique Colors Work

**Event Log Panel**:
```typescript
// event-log.ts line 62-65
const colorizedMessage = characters.length > 0
  ? colorizeCharacterNamesInText(event.message, characters)
  : event.message;
```
- Character names in messages get unique colors via [`getCharacterColor(characterId)`](../src/ui/character-name-formatter.ts:41)
- Hero = green, Mage = blue, Goblin = red, Orc = orange (based on ID hash)

**Action Forecast Panel**:
```typescript
// action-forecast.ts line 52-53
const characterId = entry.characterId;
// Uses colorizeCharacterNamesInText() for character names
```
- Character names colored uniquely in timeline and predictions

### ❌ Where Unique Colors DON'T Work

**Battle Arena Circles** ([`character-circle.ts`](../src/ui/character-circle.ts)):
```typescript
// Lines 42-54 - HARDCODED team colors
const borderClass = isPlayer ? 'player' : 'enemy';
const borderColor = isPlayer ? '#4caf50' : '#f44336';  // ❌ Only 2 colors

let fillColor: string;
if (isKO) {
  fillColor = '#424242';
} else if (isPlayer) {
  fillColor = '#66bb6a'; // ❌ ALL players get same green
} else {
  fillColor = '#ff6b6b'; // ❌ ALL enemies get same red
}
```

**Problem**: Uses `isPlayer` boolean → 2 colors total (green vs red)
**Expected**: Uses `characterId` → 12 unique colors from palette

## Architectural Inconsistency

### Character Object Usage

**Character interface** ([`src/types/character.ts`](../src/types/character.ts:8-25)):
```typescript
export interface Character {
  id: string;        // ✅ Unique identifier
  name: string;      // ✅ Unique name
  isPlayer: boolean; // ⚠️ Only 2 values (team affiliation)
  // ... other properties
}
```

**Color System Design**:
```typescript
// character-name-formatter.ts line 41-58
export function getCharacterColor(characterId: string): string {
  // Hash function: characterId → consistent color index
  let hash = 0;
  for (let i = 0; i < characterId.length; i++) {
    hash = ((hash << 5) - hash) + characterId.charCodeAt(i);
  }
  const colorIndex = Math.abs(hash) % CHARACTER_COLORS.length;
  return CHARACTER_COLORS[colorIndex];
}
```

**The Issue**: 
- Color system is **object-oriented** (based on unique `id` property)
- Circle rendering is **team-oriented** (based on `isPlayer` boolean)
- This creates inconsistent identity representation across UI panels

### Why This Violates Expectations

1. **Object Identity**: Character is an object with unique `id`, so ALL visual representations should reflect that uniqueness
2. **Consistent Color = Consistent Identity**: If "Hero" is green in Event Log, it should be green in Battle Arena
3. **Current State**: "Hero" is green in text but shares green with "Mage" in circles - breaks identity mapping

## Impact Assessment

### User Experience
- **Confusion**: Cannot distinguish Hero from Mage in Battle Arena (both green circles)
- **Cognitive Load**: Must read names instead of using color recognition
- **Inconsistency**: Color means "character" in Event Log but "team" in Battle Arena

### Code Maintainability
- **DRY Violation**: Two separate color systems (text vs visual)
- **Feature Incompleteness**: Unique color feature only 50% implemented
- **Future Bug Risk**: Adding new panels - which color system to use?

## Solution Architecture

### Option 1: Apply Unique Colors to Circles (Recommended)

**Changes Required**:

1. **Import color function** in [`character-circle.ts`](../src/ui/character-circle.ts):
   ```typescript
   import { getCharacterColor } from './character-name-formatter.js';
   ```

2. **Replace border color logic**:
   ```typescript
   // BEFORE (line 42-43)
   const borderColor = isPlayer ? '#4caf50' : '#f44336';
   
   // AFTER
   const borderColor = getCharacterColor(id);
   ```

3. **Derive HP fill from character color**:
   ```typescript
   // Option A: Use character color with opacity
   const baseColor = getCharacterColor(id);
   const fillColor = isKO ? '#424242' : baseColor;
   const fillOpacity = isKO ? '0.3' : '0.7';
   
   // Option B: Lighten character color for fill
   const fillColor = isKO ? '#424242' : lightenColor(getCharacterColor(id), 20);
   ```

4. **Optional: Add team distinction**:
   ```typescript
   // Keep visual difference between players/enemies
   const borderWidth = isPlayer ? '3' : '3';
   const borderStyle = isKO 
     ? 'stroke-dasharray="8,4"' 
     : isPlayer 
       ? '' 
       : 'stroke-dasharray="2,2"'; // Subtle dot for enemies
   ```

**Files to Modify**:
- [`src/ui/character-circle.ts`](../src/ui/character-circle.ts) - Apply unique colors
- [`tests/ui/character-circle.test.ts`](../tests/ui/character-circle.test.ts) - Update color assertions
- [`battle-viewer.html`](../battle-viewer.html) - Update CSS if needed for opacity support

**Pros**:
- ✅ Consistent color identity across all UI panels
- ✅ Leverages existing color system (no new code)
- ✅ Better character distinction in Battle Arena
- ✅ Aligns with user expectations (characters are objects)

**Cons**:
- ⚠️ Loses strong team visual cue (all green vs all red)
- ⚠️ Requires test updates (~20 tests)
- ⚠️ May need subtle team indicator (border style, etc.)

### Option 2: Keep Team Colors, Add Character Indicator

**Alternative**: Keep team colors for circles, add character color as accent (name label, status border, etc.)

**Pros**: Preserves team distinction
**Cons**: Doesn't solve the core inconsistency issue

### Option 3: Revert Text Colors to Team Colors

**Alternative**: Remove unique colors from Event Log/Forecast, use team colors everywhere

**Pros**: Simpler system
**Cons**: Worse UX, removes already-implemented feature, still can't distinguish team members

## Recommendation

**Implement Option 1** - Apply unique character colors to Battle Arena circles.

**Rationale**:
1. **Architectural Consistency**: Characters are objects with unique IDs - color should reflect identity
2. **Feature Completion**: Unique colors were already implemented for text, just incomplete
3. **Better UX**: Players can track individuals across panels using color consistency
4. **Minimal Risk**: Changes isolated to rendering layer, no engine changes needed

**Mitigation for Team Distinction**:
- Add subtle border style difference (solid for players, dashed for enemies)
- Or: Add small team icon (⚔️ for player, 💀 for enemy) in circle corner
- Or: Position distinction already exists (top row = enemies, bottom row = players)

## Implementation Roadmap

### Phase 1: Core Fix (Critical)
1. Import [`getCharacterColor()`](../src/ui/character-name-formatter.ts:41) in [`character-circle.ts`](../src/ui/character-circle.ts)
2. Replace hardcoded border colors with unique colors
3. Update HP fill to use character color (with opacity/brightness variant)
4. Update ~20 tests in [`character-circle.test.ts`](../tests/ui/character-circle.test.ts)

### Phase 2: Team Distinction (Optional)
5. Add border style or other subtle team indicator
6. Test with multiple characters per team for clarity

### Phase 3: Validation (Required)
7. Visual testing with 3+ players and 3+ enemies
8. Verify color consistency across Event Log + Forecast + Arena
9. Snapshot tests for regression prevention

## Acceptance Criteria

**AC-COLORS-1**: Battle Arena circle borders use unique colors from [`getCharacterColor(id)`](../src/ui/character-name-formatter.ts:41)
- Hero circle border matches Hero name color in Event Log
- Mage circle border matches Mage name color in Event Log
- Goblin circle border matches Goblin name color in Event Log

**AC-COLORS-2**: HP fill color derived from character color (not hardcoded green/red)
- Fill uses character color with opacity or brightness adjustment
- KO state still uses gray (`#424242`)

**AC-COLORS-3**: Color consistency across all panels
- Character color in Arena = color in Event Log = color in Forecast
- No panel uses different color for same character

**AC-COLORS-4**: Visual distinction maintained (optional team indicator)
- Players vs enemies still distinguishable (via position, border style, or icon)
- Color alone doesn't need to convey team (position already does)

## Out of Scope

- **Intent Line Colors**: Keep skill-type colors (damage=red, heal=green) - they communicate action type, not actor identity
- **Color Customization UI**: User cannot pick custom colors (uses hash-based palette)
- **Character Color in Debug Inspector**: Text-only panel, not critical for this fix
- **Accessibility**: High contrast mode or colorblind modes (future enhancement)

## Related Files

- **Source**: [`src/ui/character-name-formatter.ts`](../src/ui/character-name-formatter.ts) - Color system implementation
- **Target**: [`src/ui/character-circle.ts`](../src/ui/character-circle.ts) - Needs color integration
- **Tests**: [`tests/ui/character-circle.test.ts`](../tests/ui/character-circle.test.ts) - Update assertions
- **Types**: [`src/types/visualization.ts`](../src/types/visualization.ts) - May need color field in CircleCharacterData
- **Integration**: [`battle-viewer.html`](../battle-viewer.html) - CSS may need opacity support

## Decision Required

Should we proceed with **Option 1** (apply unique character colors to Battle Arena circles)?

**Estimated Effort**: 
- Implementation: 30-45 minutes
- Testing: 15-20 minutes  
- Total: ~1 hour

**Risk**: Low - rendering layer only, no engine changes
