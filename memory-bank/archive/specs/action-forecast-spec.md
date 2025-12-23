# Action Forecast Feature Specification

## Overview

The Action Forecast provides real-time prediction of character actions, showing both immediate next moves and complete AI behavior rules. This "see the future" feature enhances gameplay understanding by revealing the decision-making process before actions execute.

## Problem Statement

Players cannot predict what AI-controlled characters will do next, making it difficult to:
- Understand AI behavior patterns
- Validate instruction configurations
- Anticipate battle flow
- Debug unexpected actions

## Solution

Add a persistent Action Forecast panel that displays:
1. **Action Timeline** - When each character will act (next 5-10 ticks)
2. **Next Action Forecast** - Predicted skill + targets for idle characters
3. **Rule Summary** - Complete AI decision tree per character

## Components

### Component 1: ActionForecastAnalyzer
- **Purpose:** Predict next actions using existing AI logic
- **Inputs:** `CombatState`, `Map<string, CharacterInstructions>`
- **Outputs:** `ActionForecast` with timeline + rule summaries
- **Dependencies:** enemy-brain.ts (reuses `selectAction` for predictions)

### Component 2: ActionForecastRenderer
- **Purpose:** Render forecast data as HTML
- **Inputs:** `ActionForecast`
- **Outputs:** HTML string with timeline + rule summaries
- **Dependencies:** None (pure view function)

### Component 3: BattleController Integration
- **Purpose:** Manage forecast state and updates
- **Inputs:** Combat state changes, instruction updates
- **Outputs:** Updated forecast on every tick
- **Dependencies:** ActionForecastAnalyzer

## Data Structures

```typescript
/**
 * Complete forecast for all characters
 */
interface ActionForecast {
  timeline: ActionTimelineEntry[];  // Next N actions in order
  characterForecasts: CharacterForecast[]; // Per-character details
}

/**
 * Single entry in the action timeline
 */
interface ActionTimelineEntry {
  tickNumber: number;           // When this will happen
  characterId: string;
  characterName: string;
  skillName: string;
  targetNames: string[];
  isQueued: boolean;            // True if already in progress, false if predicted
}

/**
 * Forecast for a single character
 */
interface CharacterForecast {
  characterId: string;
  characterName: string;
  isPlayer: boolean;
  currentAction: {
    skillName: string;
    targetNames: string[];
    ticksRemaining: number;
  } | null;
  nextAction: {
    skillName: string;
    targetNames: string[];
    reason: string;              // Which rule matched
  } | null;
  rulesSummary: RuleSummary[];
}

/**
 * Human-readable rule summary
 */
interface RuleSummary {
  priority: number;
  skillName: string;
  conditionsText: string;       // "If HP < 50% AND Ally Count > 1"
  targetingMode: string;        // "Lowest HP Enemy"
  enabled: boolean;
}
```

## Implementation Sequence

1. **Create data type definitions** in `src/types/forecast.ts`
2. **Build ActionForecastAnalyzer** in `src/ui/action-forecast-analyzer.ts`
   - `forecastNextActions(state, instructions)` - main analysis function
   - `buildTimeline(state, predictions)` - construct action timeline
   - `summarizeRules(character, instructions)` - format rule summaries
3. **Build ActionForecastRenderer** in `src/ui/action-forecast.ts`
   - `renderActionForecast(forecast)` - main render function
   - `renderTimeline(timeline)` - action timeline HTML
   - `renderCharacterForecast(forecast)` - per-character section
   - `renderRuleSummary(rules)` - rule list HTML
4. **Extend BattleController** with forecast management
   - Add `getForecast()` method
   - Update forecast on `step()` and `play()`
   - Pass instructions map to analyzer
5. **Update battle-viewer.html** layout
   - Add forecast panel (persistent, always visible)
   - Wire up forecast updates
   - Position alongside debug inspector

## Acceptance Criteria

### AC62: Action Timeline Display
**Given** a combat state with multiple characters
**When** forecast is generated
**Then** display ordered timeline of next 5-10 actions with:
- Tick number when action will execute
- Character name → Skill name → Target name(s)
- Visual distinction between queued (in-progress) and predicted actions

**Edge Cases:**
- All characters have queued actions → show only queued (no predictions)
- No character can act (all stunned) → show "No actions available"
- Actions complete at same tick → show in deterministic order (players first, left-to-right)

### AC63: Next Action Prediction
**Given** an idle character with AI rules
**When** forecast analyzes next action
**Then** use actual AI logic (`selectAction`) to predict skill and targets
**And** display prediction with matching rule explanation

**Edge Cases:**
- No rules match → display "Waiting (no valid action)"
- Multiple rules match → show highest priority rule used
- Character is stunned → display "Stunned (cannot act)"
- Character is dead → exclude from forecast

### AC64: Rule Summary Display
**Given** a character with configured instructions
**When** forecast renders rule summary
**Then** display complete priority-ordered rule list with:
- Priority number [P100, P50, etc.]
- Conditions as human-readable text ("If HP < 50%")
- Targeting mode ("Lowest HP Ally")
- Enabled/disabled state (gray out disabled)

**Edge Cases:**
- No conditions → display "Always"
- Multiple conditions → join with "AND"
- Targeting override → show "Override: [mode]"
- Empty rule set → display "No rules configured"

### AC65: Real-time Forecast Updates
**Given** forecast is displayed
**When** combat state changes (tick, HP change, status applied)
**Then** forecast updates immediately with new predictions
**And** timeline reflects current action progress

**Edge Cases:**
- Action completes → timeline shifts, new prediction appears
- HP drops below threshold → rule priority changes reflected
- Instructions modified → forecast updates with new rules
- Battle ends → forecast shows "Battle Complete"

## Test Scenarios

### Critical Path Tests

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **Timeline with queued actions** | Player A: Strike (2 ticks), Player B: idle | Timeline shows Tick 2: Player A Strike, Tick 3: Player B [predicted] | Multiple actions same tick |
| **Prediction accuracy** | Idle character with "If HP < 50%: Heal" rule, at 40% HP | Next action: "Heal → Self (Rule: HP < 50%)" | Prediction must match actual `selectAction` result |
| **Rule summary formatting** | Instruction with 2 conditions: hp-below 50%, ally-count > 1 | Display: "If HP < 50% AND Ally Count > 1" | Empty conditions → "Always" |
| **Timeline ordering** | Player action tick 3, Enemy action tick 2, Player action tick 2 | Order: Tick 2 Player, Tick 2 Enemy, Tick 3 Player | Deterministic tie-breaking |
| **Update on state change** | Action completes, HP changes | Timeline rebuilds, predictions recalculate | Must reflect new state immediately |
| **No valid action** | Character with no matching rules | Display: "Waiting (no valid action)" | Distinguish from stunned |

### Standard Coverage Tests

- Character with single rule (no conditions)
- Character with disabled rules (grayed out)
- Character with targeting override
- Enemy character forecast (includes enemy rules)
- Human-controlled character (show "Manual Control")
- Character with empty instruction set
- Timeline with 10+ future actions
- Condition text formatting (all 5 condition types)
- Status-based predictions (Stunned, Taunted)

### Skip Testing

- CSS styling for forecast panel
- Animation of timeline updates
- Scroll behavior for long rule lists

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Prediction Logic** | Reuse `selectAction` from enemy-brain.ts | Ensures forecast matches actual behavior, avoids duplication |
| **Update Frequency** | Every tick (in `step()` and `play()`) | Real-time accuracy, minimal performance cost |
| **Timeline Depth** | Next 5-10 actions | Balances visibility with UI clutter |
| **Rule Text Format** | Human-readable strings | Better UX than raw condition objects |
| **State Immutability** | Forecast is read-only analysis | No side effects on combat state |

## UI Layout Mockup

```
┌─────────────────────────────────────────────────────┐
│ ⏱️  ACTION FORECAST                                  │
├─────────────────────────────────────────────────────┤
│ Next Actions (Timeline)                             │
│ ▶ Tick 12: Warrior → Strike → Goblin A [Queued]    │
│   Tick 13: Goblin A → Bash → Warrior [Predicted]   │
│   Tick 14: Mage → Heal → Warrior [Predicted]       │
│   Tick 15: Warrior → Strike → Goblin B [Predicted] │
│                                                     │
├─────────────────────────────────────────────────────┤
│ AI Rules Summary                                    │
│                                                     │
│ 👤 Warrior (AI Mode)                                │
│   Current: Strike → Goblin A (2 ticks remaining)   │
│   Next: Strike → Goblin A (Rule: Always)           │
│   Rules:                                            │
│     [P100] If HP < 50%: Heal → Self                │
│     [P50]  Always: Strike → Lowest HP Enemy        │
│                                                     │
│ 🧙 Mage (AI Mode)                                   │
│   Current: Idle                                     │
│   Next: Heal → Warrior (Rule: Ally HP < 30%)       │
│   Rules:                                            │
│     [P100] If Ally HP < 30%: Heal → Lowest HP Ally │
│     [P50]  Always: Fireball → All Enemies          │
│                                                     │
│ 👹 Goblin A (Enemy)                                 │
│   Current: Idle                                     │
│   Next: Bash → Warrior (Rule: Always)              │
│   Rules:                                            │
│     [P10] Always: Bash → Lowest HP Enemy           │
└─────────────────────────────────────────────────────┘
```

## Integration Points

1. **BattleController**
   - Add `instructionsMap` property
   - Call `getForecast()` on every state change
   - Pass forecast data to UI update callback

2. **battle-viewer.html**
   - Add forecast panel in right column (below instructions builder)
   - Wire up forecast rendering
   - Update on tick/state change events

3. **Existing Components**
   - No changes to combat engine (read-only analysis)
   - Reuses enemy-brain.ts prediction logic
   - Compatible with existing instruction system

## Open Questions

- **Timeline depth:** Show next 5 or 10 actions? (Recommend 5 for prototype)
- **Enemy rules visibility:** Show enemy AI rules or hide for mystery? (Recommend show for debugging)
- **Update animation:** Animate timeline changes or instant update? (Recommend instant for prototype)

## Out of Scope

- Multi-tick lookahead (forecast only predicts immediate next action)
- Alternative timeline branches ("what if" scenarios)
- Manual action planning UI (human mode skill selection)
- Forecast export/sharing
- Historical forecast accuracy tracking

## Success Metrics

- Players can predict next action with >90% accuracy by reading forecast
- Instruction debugging time reduced (can verify rules before battle)
- Enhanced understanding of AI decision-making process
- Zero performance impact (forecast calculation <5ms per tick)

## Next Steps

1. Human approval of specification
2. Create implementation tasks in [`specs/tasks.md`](specs/tasks.md)
3. Implement in order: types → analyzer → renderer → integration → tests
