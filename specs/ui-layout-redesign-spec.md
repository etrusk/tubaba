# UI Layout Redesign Specification

## Overview
Redesign battle-viewer.html layout to emphasize Action Forecast visibility and convert Instructions Builder to a floating modal. This change simplifies the main layout to focus on battle visualization and future prediction while making instructions editing contextual to character selection.

## Current Layout (2-Column)
```
┌────────────────────┬────────────────────┐
│                    │                    │
│  Battle Arena      │  Tick Controls     │
│  (SVG circles)     │  (top of column)   │
│                    │                    │
│                    ├────────────────────┤
│                    │                    │
│                    │  Instructions      │
│                    │  Builder           │
│                    │  (always visible)  │
│                    │                    │
├────────────────────┴────────────────────┤
│  Debug Inspector                        │
├─────────────────────────────────────────┤
│  Event Log                              │
└─────────────────────────────────────────┘
```

## New Layout (2-Column with Modal)
```
┌────────────────────┬────────────────────┐
│                    │                    │
│  Battle Arena      │                    │
│  (SVG circles)     │  Action Forecast   │
│                    │  (entire column)   │
├────────────────────┤                    │
│  Tick Controls     │                    │
│  [< Step] [Step >] │                    │
│  (manual only)     │                    │
└────────────────────┴────────────────────┘
│  Debug Inspector                        │
├─────────────────────────────────────────┤
│  Event Log                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Instructions Builder (Floating Modal)  │
│  Opens on character click               │
│  [Close] button to dismiss              │
└─────────────────────────────────────────┘
```

## Component Changes

### 1. Battle Arena (Top Left)
**No changes required**
- SVG battle visualization with circle characters
- Intent lines showing action targeting
- Click on character opens Instructions Builder modal

### 2. Tick Control (Under Arena)
**Remove:**
- Speed selector dropdown (1x/2x/4x)
- Play button (auto-advance)
- Pause button (stop auto-advance)

**Keep:**
- Step Backward button (`<` or `← Step`)
- Step Forward button (`>` or `Step →`)

**Rationale:** Manual step-by-step navigation provides better control for debugging and understanding AI decisions. Auto-play feature removed to simplify UI and encourage deliberate tick-by-tick analysis.

### 3. Right Column = Action Forecast Only
**Expand:**
- Action Forecast panel now occupies entire right column
- More vertical space for timeline and rule summaries
- Better visibility of upcoming actions

**Rationale:** Action Forecast is the primary "see the future" feature. Giving it dedicated space emphasizes prediction visibility and makes room for longer timelines and detailed rule explanations.

### 4. Character Instructions = Floating Modal
**Convert to Modal:**
- Instructions Builder becomes floating window (CSS: `position: fixed` or modal overlay)
- Opens when character clicked in battle arena
- Close button (`×` or `[Close]`) to dismiss
- Overlay darkens background when modal open
- Modal centered on screen, scrollable if content overflows

**State Management:**
- `BattleController` tracks `selectedCharacterId: string | null`
- Click on character circle sets `selectedCharacterId`
- Close button sets `selectedCharacterId = null`
- Modal visible when `selectedCharacterId !== null`

**Rationale:** Instructions editing is contextual to character selection. Modal approach:
- Reduces visual clutter (only shown when needed)
- Focuses user attention on one character at a time
- Frees right column for Action Forecast
- Natural workflow: click character → edit instructions → close → see forecast update

### 5. Debug Inspector & Event Log (Below)
**Layout Options:**
- **Option A (Full Width):** Debug Inspector full width, Event Log full width (stacked vertically)
- **Option B (Split):** Debug Inspector left 50%, Event Log right 50% (side-by-side)

**Recommended:** Option A (stacked) - Provides more horizontal space for debug trace details and event messages.

## Data Structure Changes

No new types required. Extend existing `BattleControllerState`:

```typescript
interface BattleControllerState {
  // ... existing fields
  selectedCharacterId: string | null; // NEW: ID of character with open instructions modal
}
```

## HTML/CSS Changes

### battle-viewer.html Structure
```html
<body>
  <div class="main-container">
    <!-- Left Column: Battle + Controls -->
    <div class="left-column">
      <div id="battle-arena">
        <!-- SVG battle visualization -->
      </div>
      <div id="tick-controls">
        <button id="step-back">← Step Back</button>
        <button id="step-forward">Step Forward →</button>
      </div>
    </div>

    <!-- Right Column: Action Forecast -->
    <div class="right-column">
      <div id="action-forecast">
        <!-- Timeline, next actions, rule summaries -->
      </div>
    </div>
  </div>

  <!-- Below Main: Debug + Events -->
  <div class="bottom-container">
    <div id="debug-inspector">
      <!-- Rule evaluations, targeting decisions -->
    </div>
    <div id="event-log">
      <!-- Battle chronology -->
    </div>
  </div>

  <!-- Floating Modal: Instructions Builder -->
  <div id="instructions-modal" class="modal" style="display: none;">
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <button class="modal-close">×</button>
      <div id="instructions-builder">
        <!-- Control mode toggle, skill priority editor, etc. -->
      </div>
    </div>
  </div>
</body>
```

### CSS Additions
```css
/* Modal overlay */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: none;
  z-index: 1000;
}

.modal.visible {
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1001;
}

.modal-close {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}
```

## BattleController API Extensions

Add methods for modal management:

```typescript
class BattleController {
  // ... existing methods

  /**
   * Opens instructions modal for specified character
   */
  selectCharacter(characterId: string): void {
    this.state.selectedCharacterId = characterId;
    this.renderInstructionsModal();
  }

  /**
   * Closes instructions modal
   */
  deselectCharacter(): void {
    this.state.selectedCharacterId = null;
    this.hideInstructionsModal();
  }

  /**
   * Returns ID of character with open modal (or null)
   */
  getSelectedCharacter(): string | null {
    return this.state.selectedCharacterId;
  }
}
```

## Event Handlers

### Character Click Handler
```typescript
// In battle-visualization.ts or battle-viewer.html
function handleCharacterClick(characterId: string): void {
  battleController.selectCharacter(characterId);
}
```

### Modal Close Handler
```typescript
// Close button click
document.getElementById('modal-close').addEventListener('click', () => {
  battleController.deselectCharacter();
});

// Click outside modal (overlay click)
document.querySelector('.modal-overlay').addEventListener('click', () => {
  battleController.deselectCharacter();
});

// Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && battleController.getSelectedCharacter()) {
    battleController.deselectCharacter();
  }
});
```

## Test Scenarios

### Critical Path

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Open modal on character click | Click character circle in arena | Modal visible with character's instructions | Clicking same character twice keeps modal open |
| Close modal with button | Click close button (`×`) | Modal hidden, `selectedCharacterId = null` | Multiple clicks have no effect |
| Close modal with overlay | Click outside modal content | Modal hidden | Clicking modal content doesn't close |
| Close modal with Escape | Press Escape key when modal open | Modal hidden | Escape when modal closed has no effect |
| Tick controls removed | UI loads | No play/pause/speed selector buttons | Only step forward/back visible |
| Action Forecast expanded | UI loads | Forecast occupies full right column | Adequate space for timeline + rules |

### Standard Coverage
- Modal open state persists across tick steps (modal stays open)
- Applying instructions updates forecast immediately
- Modal scrollable when content overflows viewport
- Multiple characters selectable in sequence (close first, open second)

### Skip Testing
- Modal CSS animations (visual polish, not functional)
- Modal responsive breakpoints (prototype single viewport)
- Keyboard navigation within modal (accessibility enhancement)

## Implementation Steps

1. **Update HTML structure** - Rearrange battle-viewer.html per new layout
2. **Remove tick control buttons** - Delete play/pause/speed selector elements
3. **Expand Action Forecast container** - Remove Instructions Builder from right column
4. **Add modal HTML** - Create floating modal container with overlay
5. **Add modal CSS** - Position fixed, overlay, close button styles
6. **Extend BattleController** - Add `selectedCharacterId`, `selectCharacter()`, `deselectCharacter()`
7. **Add event handlers** - Character click, modal close, overlay click, Escape key
8. **Test modal state** - Unit tests for BattleController modal methods
9. **Test integration** - Character click → modal open → close → modal hidden

## Out of Scope (Deferred)
- Modal animations (fade in/out)
- Responsive layout for mobile/tablet
- Keyboard navigation (Tab/Shift+Tab within modal)
- Multiple modals open simultaneously (one at a time only)
- Modal drag-and-drop repositioning
- Modal resize handles
- Remember last opened character across page reload

## Acceptance Criteria

**AC74:** Tick controls show only Step Forward and Step Back buttons (play/pause/speed removed)  
**AC75:** Action Forecast panel occupies entire right column with adequate vertical space  
**AC76:** Instructions Builder appears as floating modal when character clicked  
**AC77:** Modal close button (`×`) dismisses modal and clears `selectedCharacterId`  
**AC78:** Clicking modal overlay dismisses modal  
**AC79:** Pressing Escape key dismisses modal when open  
**AC80:** Debug Inspector and Event Log positioned below main content (full width or split)  
**AC81:** Modal prevents interaction with background content (overlay blocks clicks)  

## Migration Notes

**Breaking Changes:**
- Existing battle-viewer.html layout will be restructured
- CSS grid/flexbox layout may need adjustment
- Event listeners for removed buttons must be deleted

**Backward Compatibility:**
- No API changes to existing components (CharacterCircle, ActionForecast, etc.)
- Instructions Builder component unchanged (only container changes)
- BattleController state extended (non-breaking addition)

**Testing Impact:**
- UI integration tests may need snapshot updates
- New tests for modal state management
- Remove tests for play/pause/speed controls
