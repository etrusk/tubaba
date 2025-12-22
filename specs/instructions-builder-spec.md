# Instructions Builder UI Architecture

## Overview

This specification enhances [`battle-viewer.html`](../battle-viewer.html) with an Instructions Builder UI that allows configuring AI behavior for player characters. The builder creates `Rule[]` arrays compatible with the existing [`EnemyBrain`](../src/ai/enemy-brain.ts)/[`RuleConditionEvaluator`](../src/ai/rule-condition-evaluator.ts) system, enabling players to automate character decisions or maintain manual control.

## Layout Transformation

### Current Layout (battle-viewer.html:38-499)
```
┌─────────────────────────────────────────┐
│  Players  │   Controls   │   Enemies   │  (3-column)
├─────────────────────────────────────────┤
│          Debug Inspector                │
│          Event Log                      │
└─────────────────────────────────────────┘
```

### New Layout
```
┌────────────────────┬────────────────────┐
│                    │                    │
│   Enemies (TOP)    │    Controls        │
│                    │                    │
├────────────────────┤                    │
│                    │  ─────────────────  │
│   Players (BOTTOM) │  Instructions      │
│                    │  Builder Panel     │
│                    │                    │
└────────────────────┴────────────────────┘
│          Debug Inspector                │
│          Event Log                      │
└─────────────────────────────────────────┘
```

## Data Structures

### CharacterInstructions
```typescript
/**
 * Per-character instruction configuration
 * Stores control mode and AI rules for automated behavior
 */
interface CharacterInstructions {
  characterId: string;           // Which character these instructions apply to
  controlMode: 'human' | 'ai';   // Manual control or automated
  skillInstructions: SkillInstruction[]; // Rules per skill (only used if controlMode = 'ai')
}
```

### SkillInstruction
```typescript
/**
 * Configuration for a single skill's AI behavior
 * Maps to Rule type from skill.ts with UI-friendly structure
 */
interface SkillInstruction {
  skillId: string;                   // Which skill this instruction applies to
  priority: number;                  // Higher = evaluated first (1-100 scale)
  conditions: Condition[];           // When to use this skill (reuses existing type)
  targetingOverride?: TargetingMode; // Optional targeting mode override (reuses existing type)
  enabled: boolean;                  // Allow disabling rules without deleting
}
```

### InstructionsBuilderState
```typescript
/**
 * UI state for instructions builder panel
 * Manages selection, editing, and persistence
 */
interface InstructionsBuilderState {
  selectedCharacterId: string | null;        // Currently editing character (null = no selection)
  instructions: Map<string, CharacterInstructions>; // All character instructions
  editingSkillId: string | null;             // Currently editing skill (null = viewing all)
  isDirty: boolean;                          // Unsaved changes indicator
}
```

### InstructionsPanelData
```typescript
/**
 * Props for rendering instructions builder
 * Pure data passed to render function
 */
interface InstructionsPanelData {
  selectedCharacter: Character | null;       // Character being configured
  instructions: CharacterInstructions | null; // Current instructions for character
  availableSkills: Skill[];                  // Skills the character has equipped
}
```

## Component Architecture

### Component 5.6: InstructionsBuilder (Container)
- **Purpose:** Main container coordinating all builder sub-components
- **Inputs:** `InstructionsPanelData`, event handlers
- **Outputs:** HTML string for entire instructions panel
- **Responsibilities:**
  - Render character selection state (selected vs. none selected)
  - Coordinate ControlModeToggle, SkillPriorityEditor, ConditionBuilder sub-components
  - Handle "Apply" / "Cancel" actions
  - Display validation errors

### Component 5.7: ControlModeToggle
- **Purpose:** Switch between Human (manual) and AI (automated) control
- **Inputs:** Current `controlMode` ('human' | 'ai')
- **Outputs:** HTML toggle button with state
- **Responsibilities:**
  - Render toggle button with active state indicator
  - Emit `mode-changed` event on toggle
  - Show help text explaining mode differences

### Component 5.8: SkillPriorityEditor
- **Purpose:** Configure which skills are prioritized by AI
- **Inputs:** `SkillInstruction[]`, available `Skill[]`
- **Outputs:** HTML list with drag handles and priority numbers
- **Responsibilities:**
  - Render skill list ordered by priority (descending)
  - Provide up/down arrows or drag handles for reordering
  - Show priority numbers (auto-calculated from order)
  - Enable/disable individual skills

### Component 5.9: ConditionBuilder
- **Purpose:** Add/edit conditions for when a skill should trigger
- **Inputs:** `Condition[]` for selected skill, `availableConditionTypes`
- **Outputs:** HTML form for condition configuration
- **Responsibilities:**
  - Render list of existing conditions with edit/delete
  - Provide "Add Condition" button with type selector
  - Render type-specific inputs (threshold for hp-below, status selector for enemy-has-status)
  - Validate condition values (e.g., threshold 0-100 for hp-below)

### Component 5.10: TargetingOverrideSelector
- **Purpose:** Override default skill targeting mode
- **Inputs:** Current `targetingOverride` or undefined, available `TargetingMode[]`
- **Outputs:** HTML dropdown with targeting modes
- **Responsibilities:**
  - Render dropdown with all TargetingMode options
  - Show "(Default)" option to clear override
  - Display help text explaining each targeting mode

## Data Flow

```
User clicks character card
  ↓
BattleController updates InstructionsBuilderState.selectedCharacterId
  ↓
InstructionsBuilder renders with selected character data
  ↓
User toggles control mode → ControlModeToggle emits event
  ↓
BattleController updates CharacterInstructions.controlMode
  ↓
(If AI mode) User configures skills:
  - SkillPriorityEditor emits priority-changed event
  - ConditionBuilder emits condition-added/edited/removed event
  - TargetingOverrideSelector emits targeting-changed event
  ↓
BattleController updates SkillInstruction[] for character
  ↓
User clicks "Apply" → Instructions converted to Rule[] and attached to Character.skills
  ↓
Battle starts → EnemyBrain.selectAction() uses generated rules
```

## Integration with Existing Systems

### With EnemyBrain/RuleConditionEvaluator
The instructions builder generates `Rule[]` arrays that attach to `Skill.rules`:

```typescript
// Convert SkillInstruction[] to Rule[] for a character's skills
function applyInstructionsToCharacter(
  character: Character,
  instructions: CharacterInstructions
): Character {
  if (instructions.controlMode === 'human') {
    // Remove all rules - character requires manual input
    return {
      ...character,
      skills: character.skills.map(skill => ({ ...skill, rules: [] }))
    };
  }
  
  // Apply AI rules to skills
  return {
    ...character,
    skills: character.skills.map(skill => {
      const instruction = instructions.skillInstructions.find(
        si => si.skillId === skill.id && si.enabled
      );
      
      if (!instruction) {
        return { ...skill, rules: [] }; // No rule for this skill
      }
      
      const rule: Rule = {
        priority: instruction.priority,
        conditions: instruction.conditions,
        targetingOverride: instruction.targetingOverride
      };
      
      return { ...skill, rules: [rule] };
    })
  };
}
```

### With BattleController
`BattleController` extends with instructions state management:

```typescript
class BattleController {
  private instructionsState: InstructionsBuilderState;
  
  // Existing methods: play(), pause(), step(), etc.
  
  // New methods:
  selectCharacter(characterId: string): void;
  updateControlMode(characterId: string, mode: 'human' | 'ai'): void;
  updateSkillPriority(characterId: string, skillId: string, priority: number): void;
  addCondition(characterId: string, skillId: string, condition: Condition): void;
  removeCondition(characterId: string, skillId: string, conditionIndex: number): void;
  updateTargetingOverride(characterId: string, skillId: string, targeting?: TargetingMode): void;
  applyInstructions(): void; // Convert instructions to rules and attach to characters
}
```

## Acceptance Criteria

### Critical Path Tests

| AC# | Scenario | Input | Expected Output | Edge Case |
|-----|----------|-------|-----------------|-----------|
| **AC54** | Character selection | Click character card with `data-character-id="player-1"` | `InstructionsBuilderState.selectedCharacterId` = "player-1", panel renders character's current instructions | Click same character again → deselects (panel shows "Select a character") |
| **AC55** | Control mode toggle | Selected character, click "AI Mode" toggle | `CharacterInstructions.controlMode` = 'ai', skill editor becomes visible | Toggle to Human → skill editor hidden, rules cleared |
| **AC56** | Skill priority reordering | AI mode, skills [Heal, Strike, Shield], move Strike to priority 1 | `SkillInstruction[0]` = Strike (priority 100), Heal (priority 50), Shield (priority 0) | Single skill → priority 100 (no reordering UI) |
| **AC57** | Condition addition | Editing Strike skill, add "hp-below 50%" condition | `SkillInstruction.conditions` = `[{type: 'hp-below', threshold: 50}]` | Add multiple conditions → all stored (AND logic) |
| **AC58** | Condition editing | Existing "hp-below 30%" condition, change threshold to 50 | Condition updated: `threshold: 50` | Invalid threshold (e.g., -10) → validation error, change blocked |
| **AC59** | Targeting override selection | Strike skill, select "single-enemy-highest-hp" override | `SkillInstruction.targetingOverride` = 'single-enemy-highest-hp' | Select "(Default)" → clears override (undefined) |
| **AC60** | Instructions application | Configured 2 skills with rules, click "Apply" | `Character.skills[x].rules` populated with converted Rules, battle uses AI | No instructions configured → no rules applied (idle character) |
| **AC61** | Instructions persistence | Apply instructions, step battle 5 ticks, return to builder | Instructions still present in UI (not lost) | Reset battle → instructions persist (not tied to battle state) |

### Standard Coverage Tests

- Character card click event binding to `selectCharacter()`
- Deselecting character (click elsewhere or close button)
- Multiple condition types (hp-below, ally-count, enemy-has-status, self-has-status, ally-has-status)
- Status type selector for status-based conditions
- Threshold input validation (0-100 for hp-below percentage)
- Priority auto-calculation from skill order (top = 100, bottom = 0, linear interpolation)
- Enable/disable skill toggle (disabled skills excluded from rules)
- "Cancel" button discards unsaved changes
- Dirty state indicator (show "unsaved changes" message)
- Empty state when no character selected

### Skip Testing

- Drag-and-drop library behavior (use up/down arrows for prototype, defer drag)
- CSS styling for toggle button appearance
- Help text content (display-only strings)
- Tooltip hover effects (UI polish, not behavior)

## Implementation Sequence

### Phase 6: Instructions Builder UI (New)

1. **Define Instructions Data Structures**
   - Add `CharacterInstructions`, `SkillInstruction`, `InstructionsBuilderState`, `InstructionsPanelData` to [`src/types/index.ts`](../src/types/index.ts)
   - Add instruction conversion utilities to new file `src/ui/instructions-converter.ts`

2. **Write InstructionsBuilder Test Suite** (AC54-AC61)
   - Tests for character selection rendering
   - Tests for control mode toggle interaction
   - Tests for skill priority ordering
   - Tests for condition add/edit/remove
   - Tests for targeting override selection
   - Tests for instructions application and persistence

3. **Implement InstructionsBuilder Container**
   - Pure render function returning HTML
   - Coordinate sub-component rendering
   - Handle selection state display

4. **Write ControlModeToggle Test Suite**
   - Tests for toggle rendering with current mode
   - Tests for mode switch event emission
   - Tests for help text display

5. **Implement ControlModeToggle**
   - Render toggle button with active state
   - Emit events for mode changes

6. **Write SkillPriorityEditor Test Suite**
   - Tests for skill list rendering ordered by priority
   - Tests for priority reordering (up/down arrows)
   - Tests for enable/disable skill toggle

7. **Implement SkillPriorityEditor**
   - Render skill list with priority numbers
   - Up/down arrow handlers for reordering
   - Enable/disable checkboxes

8. **Write ConditionBuilder Test Suite**
   - Tests for condition list rendering
   - Tests for adding conditions with type selection
   - Tests for editing condition values
   - Tests for removing conditions
   - Tests for validation (threshold ranges, required fields)

9. **Implement ConditionBuilder**
   - Render condition list with edit/delete
   - Type-specific input rendering
   - Validation and error display

10. **Write TargetingOverrideSelector Test Suite**
    - Tests for dropdown rendering with all modes
    - Tests for default option (no override)
    - Tests for help text per targeting mode

11. **Implement TargetingOverrideSelector**
    - Render dropdown with TargetingMode options
    - Default option handling

12. **Extend BattleController for Instructions**
    - Add `InstructionsBuilderState` to controller
    - Implement selection/update methods
    - Implement `applyInstructions()` conversion

13. **Update battle-viewer.html Layout**
    - Refactor to 2-column layout
    - Add instructions panel to right column
    - Wire character card click events
    - Wire instructions builder event handlers

14. **Write Instructions Integration Tests**
    - Full workflow: select character → configure AI → apply → battle uses rules
    - Verify rules applied to Character.skills correctly
    - Verify EnemyBrain uses generated rules
    - Snapshot test: configured instructions → AI battle log matches expected

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Control mode storage** | Per-character in `CharacterInstructions` | Allows mixing human and AI characters in same party |
| **Rule generation timing** | On "Apply" click, not real-time | Prevents incomplete configurations from affecting battle, explicit user action |
| **Priority representation** | 0-100 scale auto-calculated from order | Simpler UX than manual priority entry, prevents priority conflicts |
| **Condition validation** | Client-side before save | Immediate feedback, prevents invalid conditions reaching engine |
| **Instructions persistence** | In-memory only (not localStorage) | Prototype scope, persists across battle resets but not page reload |
| **Reordering UI** | Up/down arrows (not drag) | Simpler implementation, accessible, drag can be added later |
| **Multiple rules per skill** | Single rule per skill in UI | Engine supports multiple, but UI simplifies to one rule (can extend later) |

## Open Questions

- [ ] **Manual control implementation** - Human mode requires skill selection UI during battle. Should this be in scope or defer to future work? (Recommendation: Defer, focus on AI configuration first)
- [ ] **Default instructions** - Should characters start with default rules or blank? (Recommendation: Blank, explicit configuration required)
- [ ] **Import/Export** - Should we support saving instruction sets to JSON? (Recommendation: Defer, prototype uses in-memory only)

## Out of Scope

Items explicitly not covered in this implementation:

- **Manual skill selection during battle** - Human mode defined but no in-battle UI for choosing skills/targets
- **Drag-and-drop reordering** - Using up/down arrows for priority, drag can be added later
- **Instruction templates** - No preset configurations (e.g., "Tank", "Healer")
- **Instruction import/export** - No saving to file or localStorage
- **Multiple rules per skill** - UI creates one rule per skill (engine supports multiple)
- **Advanced condition logic** - No OR conditions, nested conditions, or custom expressions (AND-only)
- **Real-time rule preview** - No simulation of "what would AI do now" before applying
- **Undo/redo** - No history of instruction changes
- **Instruction sharing** - No copying instructions between characters

## Test Count Estimates

**By Component:**
- InstructionsBuilder container: ~15-20 tests
- ControlModeToggle: ~8-10 tests
- SkillPriorityEditor: ~12-15 tests
- ConditionBuilder: ~20-25 tests (most complex, type-specific inputs)
- TargetingOverrideSelector: ~6-8 tests
- Instructions converter utilities: ~10-12 tests
- BattleController extensions: ~15-18 tests
- Layout integration: ~8-10 tests
- Integration tests: ~8-10 tests

**Total Estimate:** ~102-128 tests for Phase 6

**Project Total with Phase 6:** 627-678 tests (current 455 + Phase 5 planned 70-95 + Phase 6 102-128)

## Next Steps for Human Approval

Before Code mode begins implementation, approve:

1. **Layout transformation** - Is 2-column (Battle left, Controls+Instructions right) the desired layout?
2. **Component breakdown** - Are the 5 sub-components (ControlModeToggle, SkillPriorityEditor, ConditionBuilder, TargetingOverrideSelector, InstructionsBuilder) appropriately scoped?
3. **Data structures** - Do TypeScript interfaces cover all needed fields?
4. **Scope boundaries** - Is deferring manual control UI and drag-and-drop acceptable for prototype?
5. **Integration approach** - Is extending BattleController with instructions state the right pattern?
