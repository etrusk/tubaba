# Circle-Based Character Visualization & Intent Signaling System

## Overview

Replace rectangular character cards with circular visualizations that show HP depletion through a "draining liquid" effect, and add visual intent lines connecting characters to their targets to show action flow in real-time.

**Goals:**
1. More intuitive HP visualization (circle fills/empties like a container)
2. Visual clarity of action targeting (who is doing what to whom)
3. Distinguish between queued intents (dashed lines) vs executing actions (solid lines)
4. Maintain testability through pure render functions
5. Zero framework dependencies (vanilla JS + SVG)

**Constraints:**
- Must integrate with existing [`BattleController`](../src/ui/battle-controller.ts)
- Must preserve existing character data model
- Must work with current two-column layout
- Must support all existing status effects and actions
- Render functions must be pure (string/data → SVG/HTML)

---

## Type Definitions

### New Types in `src/types/visualization.ts`

```typescript
/**
 * Position data for a character circle in the battle arena
 */
export interface CharacterPosition {
  /** Character ID */
  characterId: string;
  /** X coordinate (center of circle) */
  x: number;
  /** Y coordinate (center of circle) */
  y: number;
  /** Circle radius */
  radius: number;
}

/**
 * Visual rendering data for a character circle
 */
export interface CircleCharacterData {
  /** Character ID */
  id: string;
  /** Display name */
  name: string;
  /** Current HP */
  currentHp: number;
  /** Maximum HP */
  maxHp: number;
  /** HP percentage (0-100) */
  hpPercent: number;
  /** Status effects to display */
  statusEffects: StatusEffect[];
  /** Current action (null if idle) */
  currentAction: Action | null;
  /** Player vs enemy */
  isPlayer: boolean;
  /** Position in arena */
  position: CharacterPosition;
}

/**
 * Intent line data connecting caster to target(s)
 */
export interface IntentLine {
  /** Caster character ID */
  casterId: string;
  /** Target character ID */
  targetId: string;
  /** Skill being used */
  skillId: string;
  /** Ticks remaining (0 = executing, >0 = queued) */
  ticksRemaining: number;
  /** Line style */
  lineStyle: 'solid' | 'dashed';
  /** Line color based on skill type */
  color: string;
  /** Start position (caster circle edge) */
  startPos: { x: number; y: number };
  /** End position (target circle edge) */
  endPos: { x: number; y: number };
}

/**
 * Complete battle visualization data
 */
export interface BattleVisualization {
  /** All character circles */
  characters: CircleCharacterData[];
  /** All intent lines */
  intentLines: IntentLine[];
  /** Arena dimensions */
  arenaDimensions: { width: number; height: number };
}

/**
 * Skill type to color mapping for intent lines
 */
export type SkillColorMap = {
  [skillId: string]: string;
};
```

---

## Component Design

### 1. Character Circle Renderer (`src/ui/character-circle.ts`)

**Responsibility:** Render individual character as SVG circle with HP fill, status effects, and action display.

**Key Function:**
```typescript
export function renderCharacterCircle(data: CircleCharacterData): string
```

**Visual Design:**

```
┌─────────────────────┐
│   Character Name    │  ← Text above circle
├─────────────────────┤
│                     │
│   ╔═══════════╗     │  ← Outer circle (border)
│   ║█████████░░║     │  ← Inner fill (HP percentage, top-to-bottom)
│   ║█████████░░║     │  ← Fills from bottom, empties from top
│   ║█████░░░░░░║     │  ← At 50% HP: bottom half filled
│   ║  75/100   ║     │  ← HP text centered
│   ╚═══════════╝     │
│                     │
│  [Shielded(3)]      │  ← Status effects below circle
│  [Poisoned(2)]      │
│                     │
│  Strike (2)         │  ← Current action below statuses
└─────────────────────┘
```

**HP Fill Algorithm:**
- Circle divided into vertical "slices" (approximated with SVG path or clipPath)
- Fill height = `radius * 2 * (hpPercent / 100)`
- Fill anchored to bottom of circle, grows upward
- Empty space at top = `radius * 2 - fillHeight`

**SVG Structure:**
```xml
<g class="character-circle" data-character-id="{id}">
  <!-- Outer circle border -->
  <circle cx="{x}" cy="{y}" r="{radius}" class="circle-border {player|enemy}" />
  
  <!-- HP fill (clipped to circle, anchored bottom) -->
  <defs>
    <clipPath id="circle-clip-{id}">
      <circle cx="{x}" cy="{y}" r="{radius - 2}" />
    </clipPath>
  </defs>
  <rect 
    x="{x - radius}" 
    y="{y - radius + (1 - hpPercent/100) * radius * 2}" 
    width="{radius * 2}" 
    height="{hpPercent/100 * radius * 2}"
    class="hp-fill {player|enemy}"
    clip-path="url(#circle-clip-{id})" />
  
  <!-- HP text -->
  <text x="{x}" y="{y}" class="hp-text">{currentHp}/{maxHp}</text>
  
  <!-- Character name -->
  <text x="{x}" y="{y - radius - 10}" class="character-name">{name}</text>
  
  <!-- Status effects -->
  <text x="{x}" y="{y + radius + 20}" class="status-effects">{statusEffectsText}</text>
  
  <!-- Current action -->
  <text x="{x}" y="{y + radius + 40}" class="action-display">{actionText}</text>
</g>
```

**Color Scheme:**
- **Player circle border:** `#4caf50` (green)
- **Player HP fill:** `linear-gradient(0deg, #66bb6a, #4caf50)` (bottom to top)
- **Enemy circle border:** `#f44336` (red)
- **Enemy HP fill:** `linear-gradient(0deg, #ff6b6b, #f44336)` (bottom to top)
- **Empty space:** transparent or `rgba(0,0,0,0.3)`

---

### 2. Intent Line Renderer (`src/ui/intent-line.ts`)

**Responsibility:** Render SVG lines connecting caster to target(s) with style based on action state.

**Key Function:**
```typescript
export function renderIntentLine(line: IntentLine): string
```

**Visual Design:**

```
Caster ◉━━━━━━━━━━━━━━→ Target  (Solid: executing, ticksRemaining = 0)
Caster ◉╌╌╌╌╌╌╌╌╌╌╌╌╌→ Target  (Dashed: queued, ticksRemaining > 0)
```

**Line Style Rules:**
- **ticksRemaining = 0:** Solid line (`stroke-dasharray: none`)
- **ticksRemaining > 0:** Dashed line (`stroke-dasharray: 8,4`)
- **Arrow:** Add arrowhead marker at target end
- **Width:** 2-3px, slightly thicker for executing actions

**Color Mapping by Skill Type:**
```typescript
const SKILL_COLORS: SkillColorMap = {
  // Damage skills (red spectrum)
  'strike': '#f44336',
  'heavy-strike': '#d32f2f',
  'fireball': '#ff5722',
  'execute': '#b71c1c',
  'bash': '#e91e63',
  
  // Healing skills (green spectrum)
  'heal': '#4caf50',
  'revive': '#66bb6a',
  
  // Buff/Shield skills (blue spectrum)
  'shield': '#2196f3',
  'defend': '#1976d2',
  
  // Debuff skills (purple spectrum)
  'poison': '#9c27b0',
  'stun': '#673ab7',
  
  // Utility (yellow/orange)
  'taunt': '#ff9800',
  'interrupt': '#ffc107',
  
  // Default
  'default': '#ffd700',
};
```

**SVG Structure:**
```xml
<defs>
  <marker id="arrowhead-{lineId}" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
    <polygon points="0 0, 10 3, 0 6" fill="{color}" />
  </marker>
</defs>

<line 
  x1="{startPos.x}" 
  y1="{startPos.y}" 
  x2="{endPos.x}" 
  y2="{endPos.y}" 
  stroke="{color}"
  stroke-width="{ticksRemaining === 0 ? 3 : 2}"
  stroke-dasharray="{ticksRemaining === 0 ? 'none' : '8,4'}"
  marker-end="url(#arrowhead-{lineId})"
  class="intent-line {solid|dashed}"
  data-caster-id="{casterId}"
  data-target-id="{targetId}"
  data-skill-id="{skillId}" />
```

**Line Position Calculation:**
- Start: Edge of caster circle (point on circumference toward target)
- End: Edge of target circle (point on circumference toward caster)
- Algorithm:
  ```typescript
  // Calculate angle between centers
  const dx = targetX - casterX;
  const dy = targetY - casterY;
  const angle = Math.atan2(dy, dx);
  
  // Start point: caster circle edge
  const startX = casterX + casterRadius * Math.cos(angle);
  const startY = casterY + casterRadius * Math.sin(angle);
  
  // End point: target circle edge
  const endX = targetX - targetRadius * Math.cos(angle);
  const endY = targetY - targetRadius * Math.sin(angle);
  ```

---

### 3. Battle Arena Layout (`src/ui/battle-arena-layout.ts`)

**Responsibility:** Calculate character positions in a spatial layout that minimizes line crossings.

**Key Function:**
```typescript
export function calculateCharacterPositions(
  players: Character[], 
  enemies: Character[], 
  arenaDimensions: { width: number; height: number }
): CharacterPosition[]
```

**Layout Strategy:**

```
┌─────────────────────────────────────────────────┐
│                 BATTLE ARENA                    │
│                                                 │
│  Enemy 1        Enemy 2        Enemy 3          │  ← Enemies: top, spaced evenly
│     ◉              ◉              ◉             │
│                                                 │
│                                                 │  
│                                                 │  ← Central space for intent lines
│                                                 │
│                                                 │
│     ◉              ◉              ◉             │
│  Player 1       Player 2       Player 3         │  ← Players: bottom, spaced evenly
│                                                 │
└─────────────────────────────────────────────────┘
```

**Position Calculation:**
- **Arena dimensions:** 800px width × 500px height
- **Circle radius:** 40px
- **Padding:** 60px from edges
- **Enemies (top row):**
  - Y position: `padding + radius` (100px from top)
  - X positions: evenly spaced across width
  - For N enemies: `x[i] = padding + (arenaWidth - 2*padding) * (i / (N-1))`
- **Players (bottom row):**
  - Y position: `arenaHeight - padding - radius` (400px from top)
  - X positions: same spacing as enemies

---

### 4. Visualization Analyzer (`src/ui/visualization-analyzer.ts`)

**Responsibility:** Transform CombatState into BattleVisualization data structure.

**Key Function:**
```typescript
export function analyzeVisualization(state: CombatState): BattleVisualization
```

**Algorithm:**
1. Calculate character positions using `calculateCharacterPositions()`
2. Build `CircleCharacterData[]` from `state.players` + `state.enemies`
3. Build `IntentLine[]` from character actions:
   - For each character with `currentAction !== null`:
     - For each target in `currentAction.targets`:
       - Create `IntentLine` connecting caster → target
       - Determine line style from `currentAction.ticksRemaining`
       - Map skill ID to color using `SKILL_COLORS`
       - Calculate start/end positions using circle edge algorithm
4. Return complete `BattleVisualization`

**Edge Cases:**
- **Self-targeting:** Draw circular arc from character to self (loopback)
- **Multiple targets:** Draw separate line to each target
- **Dead characters:** Gray out circle, no outgoing intent lines
- **Overlapping characters:** Shouldn't occur with fixed layout, but add slight offset if positions collide

---

### 5. Battle Visualization Renderer (`src/ui/battle-visualization.ts`)

**Responsibility:** Main entry point that renders complete SVG battle arena.

**Key Function:**
```typescript
export function renderBattleVisualization(visualization: BattleVisualization): string
```

**SVG Structure:**
```xml
<svg 
  width="{arenaDimensions.width}" 
  height="{arenaDimensions.height}" 
  viewBox="0 0 {width} {height}"
  class="battle-arena-svg">
  
  <!-- Intent lines layer (below characters) -->
  <g class="intent-lines-layer">
    {intentLines.map(renderIntentLine).join('')}
  </g>
  
  <!-- Characters layer (above intent lines) -->
  <g class="characters-layer">
    {characters.map(renderCharacterCircle).join('')}
  </g>
</svg>
```

**Rendering Order:**
1. Intent lines drawn first (background layer)
2. Character circles drawn on top (foreground layer)
3. This ensures lines don't obscure character details

---

## Integration with BattleController

### Updates to `battle-viewer.html`

**Current Layout (Character Cards):**
```html
<div class="panel enemies-panel">
  <h2>👹 Enemies</h2>
  <div class="character-list" id="enemies-container"></div>
</div>
```

**New Layout (Battle Arena):**
```html
<div class="panel battle-arena-panel">
  <h2>⚔️ Battle Arena</h2>
  <div id="battle-arena-container"></div>
</div>
```

**Rendering Hook:**
```javascript
// In renderBattle() function
const state = battleController.getCurrentState();
const visualization = analyzeVisualization(state);
const arenaHtml = renderBattleVisualization(visualization);

document.getElementById('battle-arena-container').innerHTML = arenaHtml;
```

**Migration Strategy:**
- **Phase 1:** Add battle arena alongside existing character cards (both visible)
- **Phase 2:** Add toggle button to switch between card view and arena view
- **Phase 3:** Make arena view default, keep card view as fallback

---

## Visual Design Decisions

### Circle Size & Spacing

| Element | Value | Rationale |
|---------|-------|-----------|
| Circle radius | 40px | Large enough for HP text readability |
| Min spacing | 80px | Prevents circle overlap (2× radius) |
| Arena width | 800px | Fits 3 characters with comfortable spacing |
| Arena height | 500px | Provides vertical space for lines |
| Font size (HP) | 14px bold | Readable within 80px diameter circle |
| Font size (name) | 12px | Fits above circle without collision |
| Font size (status) | 10px | Compact, multiple statuses stack vertically |

### Status Effect Display

**Compact Format:**
- Stacked below circle, centered
- Max 2 visible, rest shown as "+N more" overflow
- Format: `[Type(duration)]` e.g., `[Shielded(3)]`
- Color-coded background matching existing status colors

### Action Display

**Format:**
- Below status effects, centered
- Text: `{SkillName} ({ticksRemaining})`
- Special case: ticksRemaining=0 shows "Executing!" in bold
- Color: `#ffd700` (gold) for visibility

### KO Visual

- Circle border becomes dashed
- HP fill becomes dark gray `#424242`
- HP text shows "0/100" or "KO"
- Character name grayed out `opacity: 0.5`
- No outgoing intent lines

---

## Test Scenarios

### Character Circle Rendering

**Critical Path:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Full HP | `currentHp=100, maxHp=100` | Circle 100% filled, "100/100" text | hpPercent = 100 |
| Half HP | `currentHp=50, maxHp=100` | Circle 50% filled (bottom half), "50/100" text | hpPercent = 50 |
| Low HP | `currentHp=10, maxHp=100` | Circle 10% filled (small bottom section), "10/100" text | hpPercent = 10 |
| Zero HP (KO) | `currentHp=0, maxHp=100` | Empty gray circle, "KO" text, dashed border | hpPercent = 0 |
| Overheal | `currentHp=120, maxHp=100` | Circle 100% filled (clamped), "120/100" text | hpPercent > 100 (clamped to 100) |
| Player border | `isPlayer=true` | Green border `#4caf50` | Visual distinction |
| Enemy border | `isPlayer=false` | Red border `#f44336` | Visual distinction |
| Multiple statuses | 3 status effects | Shows first 2, "+1 more" | Status overflow |
| Long name | name="VeryLongCharacterName" | Text truncated with ellipsis | Text overflow |
| Executing action | `ticksRemaining=0` | "Strike - Executing!" in gold | Special case |
| Queued action | `ticksRemaining=3` | "Strike (3)" in gold | Normal case |

**Standard Coverage:**
- Character name positioning (centered above circle)
- Status effect color coding matches existing scheme
- HP text vertical centering within circle
- SVG clipPath correctly constrains fill to circle

**Skip Testing:**
- Font rendering quality (browser-dependent)
- Exact pixel positioning (visual regression, not unit test)

---

### Intent Line Rendering

**Critical Path:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Executing action | `ticksRemaining=0` | Solid line, 3px width, red (strike) | lineStyle='solid' |
| Queued action | `ticksRemaining=3` | Dashed line, 2px width, red (strike) | lineStyle='dashed' |
| Damage skill | `skillId='strike'` | Red line `#f44336` | Color mapping |
| Heal skill | `skillId='heal'` | Green line `#4caf50` | Color mapping |
| Shield skill | `skillId='shield'` | Blue line `#2196f3` | Color mapping |
| Unknown skill | `skillId='custom'` | Gold line `#ffd700` (default) | Fallback color |
| Multiple targets | 3 targets | 3 separate lines from caster | Line per target |
| Self-target | caster = target | Circular arc loopback | Special geometry |
| Horizontal line | same Y position | Straight horizontal line | Degenerate case |
| Vertical line | same X position | Straight vertical line | Degenerate case |
| Dead caster | currentHp=0 | No line rendered | Filter out |
| Dead target | target.currentHp=0 | No line rendered (for attacks) | Filter out (except revive) |

**Standard Coverage:**
- Arrowhead marker points toward target
- Line opacity transitions on hover
- Line positioned at circle edges (not centers)
- SVG marker definitions don't duplicate

**Skip Testing:**
- Anti-aliasing quality (renderer-dependent)
- Line animation smoothness (visual, not functional)

---

### Battle Arena Layout

**Critical Path:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| 1v1 battle | 1 player, 1 enemy | Both centered horizontally | Minimal spacing |
| 2v2 battle | 2 players, 2 enemies | Evenly spaced pairs | Standard spacing |
| 3v3 battle | 3 players, 3 enemies | Full width utilization | Max spacing |
| 1v3 battle | 1 player, 3 enemies | Player centered, enemies spread | Asymmetric |
| 3v1 battle | 3 players, 1 enemy | Players spread, enemy centered | Asymmetric |
| Max players | 3 players, 3 enemies | No circle overlap (min 80px apart) | Boundary test |
| Zero enemies | 0 enemies | No crash, empty enemy area | Defensive |
| Zero players | 0 players | No crash, empty player area | Defensive |

**Standard Coverage:**
- Circles stay within arena bounds (padding respected)
- Equal spacing between same-team characters
- Y positions consistent (enemies top, players bottom)

**Skip Testing:**
- Exact pixel values (implementation detail)
- Responsive resizing (future enhancement)

---

### Visualization Analyzer

**Critical Path:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Idle battle | No actions queued | Empty `intentLines` array | No visual clutter |
| Single action | 1 action with 1 target | 1 intent line generated | Minimal case |
| Multiple casters | 3 actions from different casters | 3 intent lines | Standard case |
| Multi-target action | 1 action with 3 targets | 3 intent lines (1 per target) | Line fan-out |
| Mixed queue states | 2 queued (dashed), 1 executing (solid) | 3 lines with correct styles | Style variety |
| Self-buff | `casterId === targets[0]` | Loopback line to self | Geometric edge case |
| Dead character action | Caster has currentHp=0 | No line rendered | Filter dead |
| Action to dead target | Target has currentHp=0 | No line (except revive) | Filter dead targets |
| All skills represented | 12 different skills | 12 different colors mapped | Color coverage |
| Position collision | 2 characters same position | Offset applied to prevent overlap | Defensive |

**Standard Coverage:**
- Character positions match layout algorithm
- HP percentages correctly calculated
- Status effects copied to visualization data
- Arena dimensions passed through correctly

**Skip Testing:**
- Performance with 100+ characters (out of scope, max is 6)
- Animation frame interpolation (not in MVP)

---

### Integration with BattleController

**Critical Path:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Initial render | Fresh battle state | Arena renders with all characters | Bootstrap |
| After tick | Execute 1 tick | Intent lines update (tick countdown) | State change |
| Action resolves | ticksRemaining 1→0 | Line changes dashed→solid | State transition |
| HP damage | Character takes damage | Circle fill height decreases | Visual update |
| Character KO | currentHp → 0 | Circle grays out, intent lines removed | Death handling |
| Status applied | Add 'shielded' | Status appears below circle | Status update |
| Battle victory | All enemies dead | No enemy circles, no lines to enemies | End state |
| Battle defeat | All players dead | No player circles, no lines from players | End state |

**Standard Coverage:**
- Clicking character in arena selects for instructions (if click handling added)
- Hover over intent line shows tooltip (future enhancement)
- Arena re-renders on play/pause/step

**Skip Testing:**
- CSS animation performance (browser-dependent)
- SVG scaling on different screen sizes (responsive design, future)

---

## Acceptance Criteria

### AC66: Circle Character Visualization
- **Given** a character with 75% HP
- **When** rendered as a circle
- **Then** the circle is 75% filled from bottom-to-top with appropriate color
- **And** HP text displays "75/100" centered in circle
- **And** player circles have green borders, enemy circles have red borders
- **And** status effects and current action are visible below the circle

### AC67: HP Liquid Drain Effect
- **Given** a character taking damage over time
- **When** HP decreases from 100% → 50% → 10% → 0%
- **Then** circle fill visually "drains" from top-to-bottom
- **And** at 100% circle is fully filled
- **And** at 50% only bottom half is filled
- **And** at 0% circle is empty with gray fill and "KO" indicator

### AC68: Intent Line Rendering
- **Given** a character with queued action (ticksRemaining = 3)
- **When** intent line is rendered
- **Then** line is dashed, 2px width, connecting caster to target at circle edges
- **And** line color matches skill type (red for damage, green for heal, blue for buff)
- **And** arrowhead points toward target

### AC69: Executing Action Line Style
- **Given** a character with executing action (ticksRemaining = 0)
- **When** intent line is rendered
- **Then** line is solid (not dashed), 3px width
- **And** line color matches skill type
- **And** arrowhead points toward target

### AC70: Multi-Target Lines
- **Given** an action with 3 targets (e.g., all-enemies)
- **When** intent lines are rendered
- **Then** 3 separate lines are drawn from caster to each target
- **And** all lines have same color and style based on action state

### AC71: Battle Arena Layout
- **Given** a 3v3 battle (3 players, 3 enemies)
- **When** arena is rendered
- **Then** enemies are positioned in top row, evenly spaced
- **And** players are positioned in bottom row, evenly spaced
- **And** no character circles overlap (minimum 80px spacing)
- **And** all circles stay within arena bounds

### AC72: Dead Character Handling
- **Given** a character with currentHp = 0
- **When** arena is rendered
- **Then** character circle has dashed border and gray fill
- **And** character name is grayed out (opacity 0.5)
- **And** no intent lines originate from dead character
- **And** no intent lines target dead character (except revive skill)

### AC73: Real-time Visualization Updates
- **Given** a running battle
- **When** a tick is executed
- **Then** intent lines update to reflect new ticksRemaining values
- **And** character HP fills update when damage/healing occurs
- **And** status effects update when applied/expired
- **And** lines change from dashed to solid when actions execute

---

## Performance Considerations

### Rendering Optimization

| Metric | Target | Strategy |
|--------|--------|----------|
| Initial render | <50ms | Pre-calculate positions, cache SVG strings |
| Re-render on tick | <16ms (60fps) | Only update changed elements (diff approach) |
| Line calculation | <1ms per line | Simple trigonometry, no complex pathfinding |
| SVG complexity | <100 elements | Max 6 characters × 5 lines = 30 lines + 6 circles = <50 total |
| Memory usage | <1MB | SVG is text-based, minimal overhead |

### SVG vs Canvas Decision

**Choice: SVG**

**Rationale:**
- Pure functions can return SVG strings (testable)
- CSS styling for free (hover, selection states)
- Accessibility (screen readers can parse SVG)
- Scales to any screen size (vector graphics)
- Simpler state management (DOM handles rendering)
- Sufficient performance for ≤6 characters + ≤30 lines

**Canvas rejected because:**
- Requires imperative drawing API (harder to test)
- No built-in hover/click handling (must implement manually)
- No accessibility (just pixels)
- Fixed resolution (scaling requires redrawing)

---

## Migration Path

### Phase 1: Parallel Implementation (Week 1)
1. Implement all pure render functions
2. Add battle arena panel alongside existing character cards
3. Both views visible simultaneously for comparison
4. Toggle button to switch between views

### Phase 2: Feature Parity (Week 2)
1. Add character selection by clicking circles (parity with cards)
2. Add hover tooltips for intent lines (enhancement)
3. User testing to validate clarity vs card view

### Phase 3: Default Transition (Week 3)
1. Make arena view default
2. Keep card view as "Classic Mode" option
3. Update documentation and screenshots

### Phase 4: Deprecation (Week 4+)
1. Remove card view code if arena proves superior
2. Or keep both if user preference varies

---

## Out of Scope (Future Enhancements)

- **Animations:** Smooth transitions for HP changes, line appearance/disappearance
- **3D effects:** Depth/shadow for visual hierarchy
- **Particles:** Visual effects for action execution (explosions, healing sparkles)
- **Zoom/pan:** Arena navigation for larger battles
- **Drag-to-target:** Interactive targeting using drag from character to target
- **Replay timeline:** Scrub through battle history with animated visualization
- **Customization:** User-selectable color schemes, circle sizes
- **Mobile touch:** Touch-optimized controls for arena interaction
- **Sound effects:** Audio cues for actions resolving
- **Battle backgrounds:** Themed arena visuals (forest, cave, etc.)

---

## Open Questions

1. **Should status effects be shown as icons inside the circle or text below?**
   - **Proposed:** Text below (simpler, no icon asset creation)
   - **Alternative:** Small icons overlaid on circle border (more compact)
   - **Decision:** Start with text, add icons if space becomes an issue

2. **How to handle 10+ status effects on one character?**
   - **Proposed:** Show first 2-3, then "+N more" overflow indicator
   - **Alternative:** Scrollable list or expandable tooltip on hover
   - **Decision:** "+N more" with hover tooltip showing all (Phase 2)

3. **Should KO'd characters remain visible or fade out?**
   - **Proposed:** Remain visible with gray styling (preserves spatial layout)
   - **Alternative:** Fade to 20% opacity or slide off-screen
   - **Decision:** Remain visible (helps track casualties)

4. **Line behavior for AoE skills (all-enemies)?**
   - **Proposed:** Draw individual line to each target (simple, clear)
   - **Alternative:** Fan-out effect with single base line splitting
   - **Decision:** Individual lines (easier to implement, clearer per-target distinction)

5. **Performance threshold for number of characters?**
   - **Proposed:** Max 3v3 (6 characters) for MVP
   - **Alternative:** Support up to 5v5 (10 characters) with smaller circles
   - **Decision:** Optimize for 3v3, test with 5v5, warn if >10

---

## Dependencies

- **Existing:**
  - [`Character`](../src/types/character.ts) type
  - [`Action`](../src/types/combat.ts) type
  - [`StatusEffect`](../src/types/status.ts) type
  - [`CombatState`](../src/types/combat.ts) type
  - [`BattleController`](../src/ui/battle-controller.ts) getCurrentState()

- **New:**
  - `src/types/visualization.ts` - New type definitions
  - `src/ui/character-circle.ts` - Circle renderer
  - `src/ui/intent-line.ts` - Line renderer
  - `src/ui/battle-arena-layout.ts` - Position calculator
  - `src/ui/visualization-analyzer.ts` - State → visualization transformer
  - `src/ui/battle-visualization.ts` - Main SVG renderer

---

## Success Metrics

- [ ] All 73 acceptance criteria (AC66-AC73) passing
- [ ] ~80-100 unit tests for render functions
- [ ] ~15-20 integration tests for full arena rendering
- [ ] Initial render <50ms
- [ ] Re-render on tick <16ms (60fps)
- [ ] Zero console errors on character death/victory/defeat
- [ ] Visual clarity: User can identify who is targeting whom at a glance
- [ ] HP depletion is intuitive (circle drains like liquid)
- [ ] Dashed vs solid lines clearly distinguish queued vs executing actions
