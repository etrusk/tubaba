# TDD Implementation Plan: Auto-Battler Prototype

## Overview

This plan implements a deterministic auto-battler combat system using test-driven development. The combat engine is tick-based with 5-phase execution per tick, ensuring complete predictability through strict determinism rules (no randomness, defined tie-breaking, floor rounding). We build from the core combat engine outward, with each component fully tested before integration. Determinism enables snapshot-based testing of combat logs, validating entire battle sequences against expected outcomes.

## Components

### Segment 1: Combat Engine

#### Component 1.1: TickExecutor
- **Purpose:** Orchestrates the 5-phase tick cycle (Rule Evaluation → Action Progress → Action Resolution → Status Effects → Cleanup)
- **Inputs:** `CombatState` (current state of battle)
- **Outputs:** `TickResult` (updated state, events log, victory/defeat status)
- **Dependencies:** ActionResolver, StatusEffectProcessor, RuleEvaluator

#### Component 1.2: ActionResolver
- **Purpose:** Executes action resolution phase with 6 ordered substeps (damage calc → healing calc → shield absorption → health updates → status application → action cancellation)
- **Inputs:** Array of actions completing this tick, current `CombatState`
- **Outputs:** Updated character states, event log entries
- **Dependencies:** SkillLibrary, DamageCalculator

#### Component 1.3: SkillLibrary
- **Purpose:** Defines all 12 skill behaviors (Strike, Heavy Strike, Fireball, Execute, Poison, Heal, Shield, Defend, Revive, Taunt, Bash, Interrupt)
- **Inputs:** Skill identifier, caster, target(s), combat context
- **Outputs:** Skill execution result (damage/healing values, status effects applied, action cancellations)
- **Dependencies:** None (pure skill definitions)

#### Component 1.4: StatusEffectProcessor
- **Purpose:** Applies per-tick effects for all 6 status types (Poisoned, Stunned, Shielded, Taunting, Defending, Enraged), decrements durations, removes expired
- **Inputs:** Array of characters with active status effects
- **Outputs:** Updated characters with applied effects, decremented durations, removed expired statuses
- **Dependencies:** None

#### Component 1.5: RuleEvaluator
- **Purpose:** Evaluates skill rules for idle characters to determine next actions
- **Inputs:** Character, available skills with rules, current combat state
- **Outputs:** Selected skill and target(s), or null if no rule matches
- **Dependencies:** TargetingSystem (Segment 2)

### Segment 2: Targeting System

#### Component 2.1: TargetSelector
- **Purpose:** Implements all targeting modes (self, single-enemy-lowest-hp, all-enemies, ally-lowest-hp, etc.) with deterministic tie-breaking
- **Inputs:** Targeting criteria, available targets, combat state
- **Outputs:** Ordered array of valid targets
- **Dependencies:** None

#### Component 2.2: TargetFilter
- **Purpose:** Applies targeting restrictions (Taunt forcing, Stunned preventing, dead exclusion)
- **Inputs:** Potential targets, targeting rules, combat state
- **Outputs:** Filtered and validated target list
- **Dependencies:** StatusEffectProcessor (for status checks)

### Segment 3: Enemy AI

#### Component 3.1: EnemyBrain
- **Purpose:** Selects skills for enemy units based on priority rules and conditions
- **Inputs:** Enemy unit, equipped skills with rules, combat state
- **Outputs:** Selected skill and target(s)
- **Dependencies:** RuleEvaluator, TargetingSystem

#### Component 3.2: RuleConditionEvaluator
- **Purpose:** Evaluates rule conditions (hp-below, ally-count, enemy-has-status, etc.)
- **Inputs:** Condition definition, combat state
- **Outputs:** Boolean (condition met or not)
- **Dependencies:** None

### Segment 4: Run Management

#### Component 4.1: RunStateManager
- **Purpose:** Manages progression through encounters (battles), tracks victory/defeat
- **Inputs:** Battle results, current run state
- **Outputs:** Updated run state, next encounter, run completion status
- **Dependencies:** CombatEngine (Segment 1)

#### Component 4.2: CharacterProgression
- **Purpose:** Handles unlocking new skills, managing skill loadouts (3 active skills)
- **Inputs:** Victory events, skill unlock choices
- **Outputs:** Updated character skill roster
- **Dependencies:** SkillLibrary

### Segment 5: UI Layer

#### Component 5.1: CombatRenderer
- **Purpose:** Renders combat state (HP bars, status icons, action timers, portraits)
- **Inputs:** `CombatState`, tick events
- **Outputs:** DOM updates (no direct HTML generation)
- **Dependencies:** CombatEngine (read-only)

#### Component 5.2: EventLogDisplay
- **Purpose:** Displays combat event log with timestamps (tick numbers)
- **Inputs:** Event log from `TickResult`
- **Outputs:** Formatted log entries
- **Dependencies:** None

#### Component 5.3: VictoryScreen
- **Purpose:** Shows post-battle results and skill unlock choices
- **Inputs:** Battle result, available skill unlocks
- **Outputs:** User skill selection
- **Dependencies:** CharacterProgression

## Data Structures

### Core Entity Types

```typescript
// Character representation (player or enemy)
interface Character {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  maxHp: number;                 // Maximum health
  currentHp: number;             // Current health (0 = knocked out)
  skills: Skill[];               // Equipped skills
  statusEffects: StatusEffect[]; // Active status effects
  currentAction: Action | null;  // Queued action in progress
  isPlayer: boolean;             // Player vs enemy distinction
}

// Skill definition
interface Skill {
  id: string;                    // Unique skill identifier
  name: string;                  // Display name
  baseDuration: number;          // Ticks to execute
  effects: SkillEffect[];        // Damage, healing, status applications
  targeting: TargetingMode;      // How targets are selected
  rules?: Rule[];                // Conditions for AI activation
}

// Skill effect (damage, heal, status, etc.)
interface SkillEffect {
  type: 'damage' | 'heal' | 'status' | 'shield' | 'revive' | 'cancel';
  value?: number;                // Numeric value (damage/healing amount)
  statusType?: StatusType;       // For status effect applications
  duration?: number;             // For status effects
}

// Rule for AI decision-making
interface Rule {
  priority: number;              // Higher = evaluated first
  conditions: Condition[];       // All must be true (AND logic)
  targetingOverride?: TargetingMode; // Optional target selection override
}

// Condition for rule evaluation
interface Condition {
  type: 'hp-below' | 'ally-count' | 'enemy-has-status' | 'self-has-status' | 'ally-has-status';
  threshold?: number;            // For hp-below, ally-count
  statusType?: StatusType;       // For status checks
}

// Status effect on a character
interface StatusEffect {
  type: StatusType;              // Which status
  duration: number;              // Ticks remaining (-1 = permanent until removed)
  value?: number;                // For Shielded (shield amount), Poisoned (damage/tick)
}

type StatusType = 'poisoned' | 'stunned' | 'shielded' | 'taunting' | 'defending' | 'enraged';

type TargetingMode = 
  | 'self' 
  | 'single-enemy-lowest-hp' 
  | 'single-enemy-highest-hp'
  | 'all-enemies' 
  | 'ally-lowest-hp' 
  | 'ally-dead'
  | 'all-allies';

// Queued action
interface Action {
  skillId: string;               // Which skill is being executed
  casterId: string;              // Who is casting
  targets: string[];             // Target character IDs
  ticksRemaining: number;        // Countdown to resolution
}

// Complete combat state
interface CombatState {
  players: Character[];          // Player party (max 3)
  enemies: Character[];          // Enemy units
  tickNumber: number;            // Current tick count
  actionQueue: Action[];         // All queued actions
  eventLog: CombatEvent[];       // History of combat events
  battleStatus: 'ongoing' | 'victory' | 'defeat';
}

// Result of a single tick
interface TickResult {
  updatedState: CombatState;     // New state after tick
  events: CombatEvent[];         // Events that occurred this tick
  battleEnded: boolean;          // True if victory or defeat
}

// Combat event for logging
interface CombatEvent {
  tick: number;                  // When it occurred
  type: 'action-queued' | 'action-resolved' | 'damage' | 'healing' | 'status-applied' | 'status-expired' | 'knockout' | 'victory' | 'defeat';
  actorId?: string;              // Who performed the action
  targetId?: string;             // Who was affected
  value?: number;                // Damage/healing amount
  skillName?: string;            // Skill used
  statusType?: StatusType;       // Status applied/expired
  message: string;               // Human-readable description
}
```

## Implementation Sequence

TDD order: Write tests first, implement to pass tests, validate with integration tests.

### Phase 1: Combat Engine Foundation (Segment 1 - Critical Path)
1. [ ] **Data structures and types** - Define all TypeScript interfaces (no dependencies)
2. [ ] **SkillLibrary tests** - Write tests for all 12 skill behaviors (depends on: 1)
3. [ ] **SkillLibrary implementation** - Implement skill definitions (depends on: 2)
4. [ ] **StatusEffectProcessor tests** - Write tests for 6 status types (depends on: 1)
5. [ ] **StatusEffectProcessor implementation** - Implement status logic (depends on: 4)
6. [ ] **ActionResolver tests** - Write tests for 6-substep resolution (depends on: 2, 4)
7. [ ] **ActionResolver implementation** - Implement resolution logic (depends on: 6)
8. [ ] **TickExecutor tests** - Write tests for 5-phase tick cycle (depends on: 6)
9. [ ] **TickExecutor implementation** - Implement tick orchestration (depends on: 8)
10. [ ] **Combat Engine integration tests** - Full battle scenarios (depends on: 9)

### Phase 2: Targeting System (Segment 2)
11. [ ] **TargetSelector tests** - Write tests for all targeting modes (depends on: 1)
12. [ ] **TargetSelector implementation** - Implement targeting logic (depends on: 11)
13. [ ] **TargetFilter tests** - Write tests for restrictions (Taunt, Stunned, etc.) (depends on: 5, 11)
14. [ ] **TargetFilter implementation** - Implement filtering logic (depends on: 13)

### Phase 3: Enemy AI (Segment 3)
15. [ ] **RuleConditionEvaluator tests** - Write tests for condition types (depends on: 1)
16. [ ] **RuleConditionEvaluator implementation** - Implement condition logic (depends on: 15)
17. [ ] **EnemyBrain tests** - Write tests for rule priority and selection (depends on: 12, 16)
18. [ ] **EnemyBrain implementation** - Implement AI decision-making (depends on: 17)
19. [ ] **Enemy AI integration tests** - Multi-turn AI scenarios (depends on: 18)

### Phase 4: Run Management (Segment 4)
20. [ ] **RunStateManager tests** - Write tests for encounter progression (depends on: 10)
21. [ ] **RunStateManager implementation** - Implement run logic (depends on: 20)
22. [ ] **CharacterProgression tests** - Write tests for skill unlocks (depends on: 3)
23. [ ] **CharacterProgression implementation** - Implement progression (depends on: 22)

### Phase 5: UI Layer (Segment 5 - Standard Coverage)
24. [ ] **CombatRenderer tests** - Write tests for state rendering (depends on: 10)
25. [ ] **CombatRenderer implementation** - Implement rendering (depends on: 24)
26. [ ] **EventLogDisplay tests** - Write tests for log formatting (depends on: 10)
27. [ ] **EventLogDisplay implementation** - Implement log display (depends on: 26)
28. [ ] **VictoryScreen tests** - Write tests for skill selection UI (depends on: 23)
29. [ ] **VictoryScreen implementation** - Implement victory screen (depends on: 28)

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Testing Framework** | Vitest | Fast, native ESM support, TypeScript-first, compatible with Vite build |
| **Type System** | TypeScript strict mode | Catch bugs at compile time, enforce determinism through type safety |
| **Project Structure** | `src/engine/`, `src/targeting/`, `src/ai/`, `src/run/`, `src/ui/` | Matches 5-segment architecture, clear separation of concerns |
| **State Management** | Immutable updates | Return new `CombatState` each tick, enables snapshot testing and replay |
| **Determinism Enforcement** | `Math.floor()` wrapper, no `Math.random()` | Guaranteed reproducibility for identical inputs |
| **Tie-Breaking** | Hardcoded player order (A, B, C), enemy alphabetical sort | Spec-defined, no ambiguity |
| **Event Logging** | Append-only array in `CombatState` | Full combat history for debugging and display |
| **Targeting Validation** | Separate filter step | Status effects (Taunt, Stunned) can modify targets after selection |

## Open Questions

- [ ] **Event log verbosity** - Should we log every tick's status effect decrements? (default: No, only damage/expiration)
- [ ] **UI refresh rate** - Render every tick or batch multiple ticks? (default: Every tick for now, optimize later)
- [ ] **Skill unlock UI** - Show all skills or only unlockable ones? (default: Only unlockable, show grayed-out locked)

## Out of Scope

Items explicitly not covered in this implementation plan:

- **Multiplayer or PvP** - Single-player only
- **Save/load system** - Run state persists only in memory
- **Animations** - Instant state transitions, no tweening
- **Sound effects** - Visual feedback only
- **Difficulty scaling** - Enemy stats are predefined
- **Skill customization** - Skills have fixed values, no upgrades
- **Mobile touch controls** - Desktop browser focus
- **Accessibility features** - Basic semantic HTML only, no ARIA
- **Localization** - English strings only

## Test Scenarios

### Segment 1: Combat Engine (Critical Path)

#### Component 1.1: TickExecutor

**Critical Path Tests** (must test first, blocks other work):

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC1: 5-phase tick execution** | `CombatState` with queued actions | `TickResult` with events from all 5 phases in order | Empty action queue still processes status effects |
| **AC2: Rule evaluation only for idle units** | Player A idle, Player B has action queued | Only Player A evaluates rules and queues action | Stunned idle unit skips rule evaluation |
| **AC3: Action progress countdown** | Action with 3 ticks remaining | Decremented to 2 ticks remaining | Multiple actions decrement simultaneously |
| **AC4: Simultaneous resolution** | 2 actions reach 0 ticks same tick | Both resolve in resolution phase, health updates applied together | Players act before enemies in tie (left-to-right) |
| **AC5: Status effect processing** | Poisoned character (2 ticks remaining) | Takes poison damage, duration decrements to 1 | Multiple statuses process in defined order |
| **AC6: Cleanup phase knockout detection** | Character drops to 0 HP after health updates | Marked as knocked out, removed from targetable units | All knockouts detected before victory check |
| **AC7: Victory condition** | All enemies knocked out | `battleStatus` = 'victory' | Simultaneous player/enemy knockout = defeat (players checked first) |
| **AC8: Defeat condition** | All players knocked out | `battleStatus` = 'defeat' | Last player knockout triggers defeat immediately |

**Standard Coverage Tests**:

- Tick counter increments by 1 each tick
- Event log contains entries from all phases
- Empty battlefield (all knocked out) immediately ends battle
- Battle status remains 'ongoing' when both sides have alive units

**Skip Testing**:

- TickResult object creation (trivial data structure)
- Phase execution order (validated by critical path AC1)

#### Component 1.2: ActionResolver

**Critical Path Tests**:

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC9: Damage calculation substep** | Strike (30 damage) vs normal target | 30 damage calculated | Defending target: damage × 0.5 (floor to 15) |
| **AC10: Healing calculation substep** | Heal (40 healing) on 60/100 HP target | 40 healing calculated (capped at max HP) | Dead target (0 HP): healing fails unless Revive |
| **AC11: Shield absorption substep** | 50 damage vs 20 shield | Shield breaks (0 remaining), 30 damage passes through | Shield exactly matches damage: shield breaks, 0 damage |
| **AC12: Health updates simultaneous** | A attacks B (30 dmg), B attacks A (20 dmg) | Both health values update together | B dies from A's damage but B's damage still applies |
| **AC13: Status application substep** | Poison skill resolves | Poisoned status (3 ticks, 5 dmg/tick) applied to target | Target already Poisoned: new status replaces old |
| **AC14: Action cancellation substep** | Interrupt hits target with queued action | Target's action removed from queue | Target with 1 tick remaining: action cancelled before resolution |

**Standard Coverage Tests**:

- Multiple damage sources sum correctly
- Healing on full-HP target does nothing
- Enraged doubles outgoing damage (multiplicative)
- Shield persists across ticks until depleted or expired

**Skip Testing**:

- Math.floor wrapper (tested in unit utils)
- Event log message formatting (UI concern)

#### Component 1.3: SkillLibrary

**Critical Path Tests** (one test per skill behavior):

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC15: Strike skill** | Caster, single target | 30 damage, 3-tick duration | Normal damage, no special conditions |
| **AC16: Heavy Strike skill** | Caster, single target | 50 damage, 5-tick duration | Higher damage, longer windup |
| **AC17: Fireball skill** | Caster, all enemies | 25 damage to each target | Multi-target damage |
| **AC18: Execute skill** | Caster, target at 15% HP | 99 damage | Target at 20% HP: normal 40 damage (threshold check) |
| **AC19: Poison skill** | Caster, single target | Poisoned status (5 dmg/tick, 3 ticks) | Damage-over-time application |
| **AC20: Heal skill** | Caster, ally at 50/100 HP | +40 HP (to 90/100) | Overhealing capped at max HP |
| **AC21: Shield skill** | Caster, single target | 30 shield points, 3-tick duration | Shield stacks replace, don't add |
| **AC22: Defend skill** | Self-cast | Defending status (damage reduction 50%, 2 ticks) | Self-buff application |
| **AC23: Revive skill** | Caster, dead ally (0 HP) | Target restored to 50% max HP | Alive target: skill fails/wasted |
| **AC24: Taunt skill** | Self-cast | Taunting status (2 ticks), all enemy attacks redirected | Forces targeting override |
| **AC25: Bash skill** | Caster, single target | 20 damage + Stunned (1 tick) | Damage + status combo |
| **AC26: Interrupt skill** | Caster, enemy with queued action | Target's action cancelled, no damage | Target idle: skill has no effect |

**Standard Coverage Tests**:

- All skills have correct base durations
- Targeting modes match skill definitions
- Skill IDs are unique

**Skip Testing**:

- Skill name/description strings (display-only data)

#### Component 1.4: StatusEffectProcessor

**Critical Path Tests**:

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC27: Poisoned per-tick damage** | Character with Poisoned (5 dmg, 2 ticks left) | -5 HP, duration → 1 tick | Poison damage can knock out character |
| **AC28: Stunned blocks action queueing** | Stunned character evaluates rules | No action queued, Stunned duration decrements | Existing queued action NOT cancelled |
| **AC29: Shielded damage absorption** | Tested in ActionResolver (AC11) | - | Duplicate test, covered elsewhere |
| **AC30: Taunting redirects targeting** | Enemy targets lowest-HP player, but another player Taunting | Taunt target selected instead | Tested in TargetFilter (Segment 2) |
| **AC31: Defending reduces damage** | Tested in ActionResolver (AC9) | - | Duplicate test, covered elsewhere |
| **AC32: Enraged doubles damage** | Enraged character deals 30 damage | 60 damage applied (multiplicative) | Stacks with other modifiers (floor final) |
| **AC33: Status duration decrement** | Character with 3-tick Poisoned | Duration → 2 ticks after processing | All statuses decrement per tick |
| **AC34: Status expiration removal** | Character with 1-tick Stunned | Stunned removed after duration → 0 | Multiple statuses can expire same tick |

**Standard Coverage Tests**:

- Permanent status (duration -1) never expires
- Multiple statuses on same character process independently
- Expired statuses removed before next tick begins

**Skip Testing**:

- Status effect enum values (TypeScript type safety)

### Segment 2: Targeting System

**Critical Path Tests**:

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **Single-enemy-lowest-hp targeting** | 3 enemies: 100, 50, 75 HP | Enemy with 50 HP selected | Tie (50, 50): leftmost in array |
| **All-enemies targeting** | 3 enemies alive | All 3 targeted | Dead enemies excluded |
| **Ally-lowest-hp targeting** | 3 players: 80, 30, 100 HP | Player with 30 HP selected | Caster excluded from ally targeting |
| **Ally-dead targeting (Revive)** | 1 dead ally, 2 alive | Dead ally selected | No dead allies: targeting fails |
| **Taunt forcing** | Enemy has "single-enemy-lowest-hp", Player B is Taunting | Player B selected regardless of HP | Multiple Taunts: leftmost Taunt target |
| **Stunned cannot target** | Tested in TickExecutor (AC2) | - | Covered in rule evaluation phase |

**Standard Coverage Tests**:

- Self-targeting always selects caster
- Empty target list returns empty array (no crash)
- Target validation removes knocked-out units

**Skip Testing**:

- Array sorting algorithms (standard library)

### Segment 3: Enemy AI

**Critical Path Tests**:

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **Rule priority ordering** | Enemy has 2 rules: priority 10 and 5 | Priority 10 evaluated first | Both conditions met: higher priority wins |
| **HP-below condition** | Rule "hp-below 30%", enemy at 25% HP | Condition true, rule triggers | Enemy at 31% HP: condition false |
| **Ally-count condition** | Rule "ally-count > 1", 2 allies alive | Condition true | Knocked-out allies not counted |
| **Enemy-has-status condition** | Rule "enemy-has-status: shielded", player has Shield | Condition true | Status expired: condition false |
| **AND logic for multiple conditions** | Rule with 2 conditions: HP < 50% AND ally-count > 0 | Both must be true to trigger | One false: rule skips |
| **No matching rules** | Enemy evaluates all rules, none match | Returns null (no action queued) | Enemy waits idle until rule matches |

**Standard Coverage Tests**:

- Rules without conditions always match (priority-only)
- Targeting override in rule uses specified mode
- Self-has-status condition checks enemy's own statuses

**Skip Testing**:

- Rule array iteration (standard logic)

### Segment 4: Run Management

**Standard Coverage Tests** (not critical path for prototype):

- Run state tracks current encounter number
- Victory advances to next encounter
- Defeat ends run
- Skill unlock adds to character skill pool

**Skip Testing**:

- UI components tested separately in Segment 5
- Run persistence (out of scope - memory only)

### Segment 5: UI Layer

**Standard Coverage Tests** (not critical path):

- Combat state renders HP bars with correct percentages
- Event log displays newest events at top
- Status icons appear for active statuses
- Victory screen shows unlockable skills

**Skip Testing**:

- Visual styling (CSS, not behavior)
- Animation timing (out of scope)
- DOM element creation (framework behavior)

## Integration Test Strategy

### Deterministic Combat Log Snapshots

Because the combat system is fully deterministic, we can use **snapshot testing** for integration validation:

1. **Define scenario**: Initial party, enemy, skill loadouts
2. **Run battle**: Execute `TickExecutor` until battle ends
3. **Capture log**: Serialize entire `eventLog` to JSON
4. **Compare snapshot**: Expect exact match to committed snapshot

**Example Integration Scenarios**:

- **"3 Strikers vs 1 Heavy Enemy"** - Validates simultaneous damage, knockout detection, victory
- **"Poison vs Heal Race"** - Validates status effects, healing, tick-over-time damage
- **"Taunt Tank Strategy"** - Validates Taunt redirect, Defend reduction, multi-turn survival
- **"Interrupt Spam"** - Validates action cancellation, rule re-evaluation
- **"Execute Finisher"** - Validates conditional damage threshold (below 25% HP)

These integration tests validate:
- All 5 phases execute in order
- All 12 skills work in combination
- All 6 status effects interact correctly
- Victory/defeat conditions trigger properly

Snapshot changes indicate behavior changes (regression or intended update).

## Next Steps for Human Approval

Before Code mode begins implementation, approve:

1. **Test priority classifications** - Are Critical/Standard/Skip labels correct?
2. **Data structure completeness** - Do TypeScript interfaces cover all needed fields?
3. **Implementation sequence order** - Are dependencies correctly identified?
4. **Technical decisions** - Any concerns with Vitest, immutability, or structure?

Once approved, Code mode proceeds with Phase 1, Step 1 (define TypeScript interfaces).
