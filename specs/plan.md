# View Model Pattern for Consistent UI Presentation

## Overview

Introduce a View Model layer to transform domain objects into presentation-ready objects ONCE, ensuring all UI components display consistent data. This addresses the recurring issue where features (skill lists, name colors) are applied inconsistently across different UI panels.

## Problem Statement

Current architecture has **distributed presentation logic**:
- [`character-card.ts`](../src/ui/character-card.ts) calls `formatCharacterName()` explicitly
- [`skill-priority-editor.ts`](../src/ui/skill-priority-editor.ts) receives `availableSkills` as a separate parameter
- [`instructions-converter.ts`](../src/ui/instructions-converter.ts) uses `SkillLibrary.getAllSkills()` directly
- Each component does its own transformation, leading to inconsistencies when features are added

**Result**: When we add "all skills for all characters", some components show 12 skills, others show 3.

## Components

### 1. CharacterViewModel
**Purpose**: Presentation-ready character data with all formatting pre-applied.

**Inputs**: `Character` (domain), character ID
**Outputs**: `CharacterViewModel` with formatted name, colors, full skill list

```typescript
// src/types/view-models.ts
export interface CharacterViewModel {
  // Identity
  id: string;
  name: string;                    // Raw name
  formattedName: string;           // HTML with color styling
  color: string;                   // Hex color for this character
  
  // State
  currentHp: number;
  maxHp: number;
  hpPercent: number;               // Pre-calculated 0-100
  isKO: boolean;
  isPlayer: boolean;
  
  // Skills (always full library for all characters)
  skills: SkillViewModel[];
  
  // Status
  statusEffects: StatusEffectViewModel[];
  
  // Action
  currentAction: ActionViewModel | null;
}
```

### 2. SkillViewModel
**Purpose**: Presentation-ready skill data.

```typescript
export interface SkillViewModel {
  id: string;
  name: string;
  baseDuration: number;
  formattedDuration: string;      // "2 ticks"
  color: string;                  // Skill-type color (strike=red, heal=green)
}
```

### 3. ViewModelFactory
**Purpose**: Single transformation point from domain → view models.

**Location**: `src/ui/view-model-factory.ts`

```typescript
export class ViewModelFactory {
  // Transform entire combat state to view models
  static createBattleViewModel(state: CombatState): BattleViewModel;
  
  // Individual transformations (called by above)
  static createCharacterViewModel(char: Character): CharacterViewModel;
  static createSkillViewModel(skill: Skill): SkillViewModel;
}
```

### 4. BattleViewModel
**Purpose**: Complete presentation state for the entire battle UI.

```typescript
export interface BattleViewModel {
  tick: number;
  battleStatus: 'ongoing' | 'victory' | 'defeat';
  
  // All characters with consistent formatting
  players: CharacterViewModel[];
  enemies: CharacterViewModel[];
  allCharacters: CharacterViewModel[];  // Combined for name lookups
  
  // Pre-built lookups for text colorization
  characterColorMap: Map<string, string>;
}
```

## Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  CombatState    │ ──► │ ViewModelFactory │ ──► │ BattleViewModel │
│  (domain)       │     │                  │     │ (presentation)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                              ┌────────────────────────────────────────┐
                              │            UI Components               │
                              │  ┌──────────┐ ┌──────────┐ ┌────────┐ │
                              │  │ CharCard │ │ SkillEd  │ │ Arena  │ │
                              │  └──────────┘ └──────────┘ └────────┘ │
                              └────────────────────────────────────────┘
```

## Implementation Sequence

1. **Create view model types** (`src/types/view-models.ts`)
   - Define all ViewModel interfaces
   - No dependencies on existing code

2. **Create ViewModelFactory** (`src/ui/view-model-factory.ts`)
   - Import existing formatters (`character-name-formatter.ts`)
   - Import `SkillLibrary` for full skill list
   - Single factory with static methods

3. **Add `getViewModel()` to BattleController**
   - Cache view model, invalidate on state change
   - Returns frozen `BattleViewModel`

4. **Refactor UI components** (one at a time)
   - `character-card.ts` - use `CharacterViewModel`
   - `skill-priority-editor.ts` - use `SkillViewModel[]` from character
   - `debug-inspector.ts` - use `characterColorMap` for text colorization
   - `instructions-builder.ts` - use consistent skill list

## Key Design Decisions

### Skills: Always Full Library
Every character gets access to ALL skills in the view model:
```typescript
// ViewModelFactory.createCharacterViewModel()
const allSkills = SkillLibrary.getAllSkills();
return {
  ...character,
  skills: allSkills.map(s => this.createSkillViewModel(s))
};
```

**Rationale**: Simplifies skill management. Domain model can have subset, but presentation always shows full library.

### Name Colors: Pre-computed
```typescript
const viewModel: CharacterViewModel = {
  name: character.name,
  formattedName: formatCharacterName(character.name, character.id),
  color: getCharacterColor(character.id)
};
```

**Rationale**: Components never call formatters directly. If they need the name, use `formattedName`. If they need the color, use `color`.

### Immutable View Models
View models are frozen on creation. Components cannot mutate them.

```typescript
return Object.freeze(viewModel);
```

**Rationale**: Matches existing pattern in `BattleController` using `deepFreeze()`.

## Open Questions

1. **Caching granularity**: Cache entire `BattleViewModel` or individual `CharacterViewModel`s?
   - **Proposed default**: Cache entire view model, invalidate on any state change (simpler, current pattern)

2. **Component migration order**: All at once or incremental?
   - **Proposed default**: Incremental, starting with `character-card.ts` as reference implementation

## Out of Scope

- Reactive/observable patterns (overkill for current scale)
- Component framework (staying vanilla JS)
- State management library (BattleController is sufficient)
- View model diffing/patching (full regeneration is fast enough)

## Test Scenarios

### ViewModelFactory

**Critical path:**
| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| Character has subset of skills | Character with 3 skills | ViewModel with 12 skills (full library) | Empty skill array |
| Name color consistency | Same character ID | Same color every call | Hash collision on different IDs |
| HP percentage calculation | currentHp=25, maxHp=100 | hpPercent=25 | 0 HP, HP > maxHp |

**Standard coverage:**
- Status effects have formatted duration text
- Action has formatted countdown text
- All characters (players + enemies) included in allCharacters

**Skip testing:**
- `Object.freeze()` behavior (JS built-in)
- Interface type compliance (TypeScript compile-time)

### Refactored Components

**Critical path:**
| Scenario | Input | Expected Output |
|----------|-------|-----------------|
| CharacterCard uses formattedName | CharacterViewModel | HTML contains colored name span |
| SkillPriorityEditor shows all skills | CharacterViewModel.skills | 12 skill items rendered |

**Skip testing:**
- HTML structure (existing snapshot tests cover this)
- CSS class application (visual, not logic)

## Acceptance Criteria

1. ✅ All UI components receive data through `BattleViewModel`
2. ✅ Character names are consistently colored across all panels
3. ✅ Skill lists show full library for all characters in all panels
4. ✅ No direct calls to `formatCharacterName()` or `SkillLibrary.getAllSkills()` in UI components
5. ✅ Existing tests continue to pass
6. ✅ New tests verify view model transformation logic
