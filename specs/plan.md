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
- **Purpose:** Manages run state machine (in-progress → awaiting-skill-selection → next encounter), tracks encounter progression
- **Inputs:** `TickResult` from combat engine (for victory/defeat detection), `SkillUnlockChoice` from player
- **Outputs:** Updated `RunState`, next `Encounter` loaded into `CombatState`, run completion signals
- **Dependencies:** TickExecutor (consumes `TickResult.battleEnded` and `battleStatus`), CharacterProgression (for skill unlock application)
- **State Transitions:**
  - `in-progress` → (battle victory) → `awaiting-skill-selection`
  - `awaiting-skill-selection` → (skill choice) → `in-progress` (next encounter)
  - `in-progress` → (battle defeat) → `defeat`
  - `in-progress` → (final encounter victory) → `victory`

#### Component 4.2: CharacterProgression
- **Purpose:** Applies skill unlocks to characters, enforces 3-skill active loadout constraint
- **Inputs:** `SkillUnlockChoice` (character ID + skill ID), character's current skill pool
- **Outputs:** Updated `Character.skills` array (max 3 active skills for battle)
- **Dependencies:** SkillLibrary (validates skill IDs exist), RunState (checks skill is in `encounter.skillRewards`)
- **Validation Rules:**
  - Skill must be in current encounter's `skillRewards` list
  - Skill cannot already be unlocked on that character
  - Character can have many unlocked skills but only 3 active in loadout
  - Loadout changes apply to next battle's `CombatState`

### Segment 5: UI Layer

#### Component 5.0: TickExecutor Debug Enhancement
- **Purpose:** Instrument tick execution to capture rule evaluation, targeting decisions, and resolution substeps
- **Inputs:** `CombatState`
- **Outputs:** `TickResultWithDebug` (extends `TickResult` with `debugInfo`)
- **Dependencies:** Existing TickExecutor

#### Component 5.1: BattleController
- **Purpose:** Manages tick stepping (forward/back via state history), play/pause, speed control
- **Inputs:** Initial `CombatState`, user controls (step/play/pause)
- **Outputs:** Current state, tick history for step-back
- **Dependencies:** TickExecutor

#### Component 5.2: CharacterCard
- **Purpose:** Renders single character (HP bar, status icons, action progress)
- **Inputs:** Character data from `CombatState`
- **Outputs:** HTML element
- **Dependencies:** None (pure view function)

#### Component 5.3: DebugInspector (PRIMARY FEATURE)
- **Purpose:** Shows WHY each action was chosen - rule evaluations, targeting decisions, resolution substeps
- **Inputs:** `TickResultWithDebug.debugInfo`
- **Outputs:** HTML panel showing decision details
- **Dependencies:** None (pure view function)

#### Component 5.4: EventLog
- **Purpose:** Displays combat event log with tick numbers, newest at top
- **Inputs:** `CombatEvent[]` from `TickResult`
- **Outputs:** HTML list of events
- **Dependencies:** None (pure view function)

#### Component 5.5: BattleViewer (Integration)
- **Purpose:** Single HTML file that assembles all components into working UI
- **Inputs:** Encounter data
- **Outputs:** Interactive battle visualization
- **Dependencies:** All above components

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

// Run management state
interface RunState {
  runId: string;                 // Unique run identifier
  currentEncounterIndex: number; // Which encounter is active (0-based)
  encounters: Encounter[];       // All encounters in this run
  playerParty: Character[];      // Player party with unlocked skills
  runStatus: 'in-progress' | 'awaiting-skill-selection' | 'victory' | 'defeat';
  encountersCleared: number;     // Number of victories
  skillsUnlockedThisRun: string[]; // Skill IDs unlocked during this run
}

// Single encounter definition
interface Encounter {
  encounterId: string;           // Unique encounter identifier
  name: string;                  // Display name (e.g., "Forest Ambush")
  enemies: Character[];          // Enemy units for this battle
  skillRewards: string[];        // Skill IDs available for unlock after victory
}

// Player skill selection after victory
interface SkillUnlockChoice {
  characterId: string;           // Which character unlocks the skill
  skillId: string;               // Skill to unlock (must be from encounter rewards)
}

// Debug-enhanced tick result
interface TickResultWithDebug extends TickResult {
  debugInfo: DebugInfo;
}

// Debug information for DebugInspector
interface DebugInfo {
  ruleEvaluations: RuleEvaluation[];
  targetingDecisions: TargetingDecision[];
  resolutionSubsteps: ResolutionSubstep[];
}

// Rule evaluation details for a character
interface RuleEvaluation {
  characterId: string;
  characterName: string;
  rulesChecked: RuleCheckResult[];
  selectedRule: string | null;
  selectedSkill: string | null;
  selectedTargets: string[];
}

// Individual rule check result
interface RuleCheckResult {
  ruleIndex: number;
  priority: number;
  conditions: ConditionCheckResult[];
  matched: boolean;
  reason: string;
}

// Condition evaluation result
interface ConditionCheckResult {
  type: ConditionType;
  expected: string;
  actual: string;
  passed: boolean;
}

// Targeting decision details
interface TargetingDecision {
  casterId: string;
  skillId: string;
  targetingMode: TargetingMode;
  candidates: string[];
  filtersApplied: TargetFilterResult[];
  finalTargets: string[];
  tieBreaker?: string; // Explains deterministic choice if tied
}

// Target filter application result
interface TargetFilterResult {
  filterType: 'taunt' | 'dead-exclusion' | 'self-exclusion';
  removed: string[];
}

// Resolution substep details
interface ResolutionSubstep {
  substep: 'damage-calc' | 'healing-calc' | 'shield-absorption' | 'health-update' | 'status-application' | 'action-cancel';
  details: SubstepDetail[];
}

// Individual substep detail
interface SubstepDetail {
  actorId: string;
  targetId: string;
  skillId: string;
  value?: number;
  description: string;
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
20. [ ] **RunStateManager tests** - Write tests for encounter progression (depends on: 10 - consumes TickResult.battleEnded and CombatState)
21. [ ] **RunStateManager implementation** - Implement run state machine (depends on: 20)
22. [ ] **CharacterProgression tests** - Write tests for skill unlocks (depends on: 3 - SkillLibrary skill definitions)
23. [ ] **CharacterProgression implementation** - Implement loadout management (depends on: 22)
24. [ ] **Run Management integration tests** - Full run scenarios with snapshots (depends on: 21, 23)

### Phase 5: UI Layer (Segment 5 - Enhanced)
25. [ ] **TickExecutor Debug Enhancement tests** - Write tests for debug info capture (AC45-AC47) (depends on: 9)
26. [ ] **TickExecutor Debug Enhancement implementation** - Instrument existing TickExecutor (depends on: 25)
27. [ ] **BattleController tests** - Write tests for tick stepping and play/pause (AC48-AC50) (depends on: 26)
28. [ ] **BattleController implementation** - Implement state history and controls (depends on: 27)
29. [ ] **CharacterCard tests** - Write tests for character rendering (depends on: 1)
30. [ ] **CharacterCard implementation** - Pure render function for character (depends on: 29)
31. [ ] **DebugInspector tests** - Write tests for decision visibility (AC51-AC53) (depends on: 26)
32. [ ] **DebugInspector implementation** - Render rule/targeting/substep details (depends on: 31)
33. [ ] **EventLog tests** - Write tests for event formatting (depends on: 10)
34. [ ] **EventLog implementation** - Render event list, newest first (depends on: 33)
35. [ ] **BattleViewer integration tests** - Full battle with all components (depends on: 34)
36. [ ] **BattleViewer HTML** - Single file combining all components (depends on: 35)

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
| **UI Framework** | Vanilla JavaScript | Prototype goal: tactile UX feedback with minimal complexity. Single HTML file, no build step, ES module imports. Deferred animations/polish. |
| **Primary UI Feature** | Debug Inspector | Key UX requirement: see ALL decision-making (rule evaluations, targeting, resolution substeps) to validate game mechanics |

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

#### Component 4.1: RunStateManager

**Critical Path Tests:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC35: Run initialization** | Player party (3 characters), encounter list (5 encounters) | `RunState` with `currentEncounterIndex` = 0, `runStatus` = 'in-progress' | Empty party → validation error |
| **AC36: Battle victory → skill selection** | `TickResult` with `battleEnded` = true, `battleStatus` = 'victory' | `runStatus` = 'awaiting-skill-selection', skill rewards available | No skill rewards → skip directly to next encounter |
| **AC37: Skill selection → encounter progression** | `SkillUnlockChoice` submitted | `currentEncounterIndex` increments, new encounter loaded into `CombatState` | Final encounter completed → `runStatus` = 'victory' |
| **AC38: Battle defeat handling** | `TickResult` with `battleStatus` = 'defeat' | `runStatus` = 'defeat', no encounter progression | Cannot call `loadNextEncounter()` after defeat |
| **AC39: Run completion detection** | Encounter 4 (index 4) victory with 5 total encounters | `runStatus` = 'victory', `encountersCleared` = 5 | Run ends, no next encounter to load |
| **AC40: Mid-run state tracking** | 2 encounters cleared, 1 skill unlocked | `encountersCleared` = 2, `skillsUnlockedThisRun` = ['strike'] | State persists across encounters |

**Standard Coverage Tests:**

- `RunState.encountersCleared` increments on each victory
- `RunState.skillsUnlockedThisRun` appends skill IDs on unlock
- Encounter enemies loaded into `CombatState.enemies` correctly
- `runId` uniquely identifies each run attempt

**Skip Testing:**

- Run persistence to storage (out of scope - memory only)
- Encounter generation algorithm (using fixed data for prototype)

#### Component 4.2: CharacterProgression

**Critical Path Tests:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC41: Skill unlock from rewards** | Character, `skillId` from `encounter.skillRewards` | Skill added to `character.skills` array | Skill already unlocked → validation error |
| **AC42: Loadout enforcement (3 active skills)** | Character with 4 unlocked skills | Only 3 skills equipped in `character.skills` for battle | Must select which 3 are active before next battle |
| **AC43: Skill unlock validation** | Attempt to unlock skill not in `skillRewards` | Validation error thrown | Cannot unlock arbitrary skills |
| **AC44: Skill persistence across encounters** | Skill unlocked in encounter 1 | Skill available in character loadout for encounter 2+ | Unlocked skills persist in `RunState` |

**Standard Coverage Tests:**

- Unlocked skills remain in character's skill pool throughout run
- Loadout changes apply to next battle's `CombatState`
- Cannot unlock same skill twice on same character
- Skill unlock choice recorded in `RunState.skillsUnlockedThisRun`

**Skip Testing:**

- Skill unlock UI animations (Segment 5 concern)
- Skill tooltip descriptions (display-only data)
- Reward pool balancing (game design, not system behavior)

### Segment 5: UI Layer

#### Component 5.0: TickExecutor Debug Enhancement

**Critical Path Tests:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC45: Rule evaluation capture** | Character with 3 rules | `debugInfo` shows all 3 rules checked with pass/fail | Character stunned → no rules checked |
| **AC46: Targeting decision capture** | Strike targeting lowest-HP | `debugInfo` shows candidates, filters, final selection | Taunt override documented |
| **AC47: Resolution substep capture** | Damage + status skill | `debugInfo` shows damage-calc, health-update, status-application substeps | Shield absorption shown when applicable |

**Standard Coverage Tests:**

- Debug info captured for all characters that evaluate rules
- Multiple targeting decisions captured per tick
- Empty debug info when no actions occur

**Skip Testing:**

- Debug info formatting (DebugInspector concern)

#### Component 5.1: BattleController

**Critical Path Tests:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC48: Step forward** | Current tick 5, `step()` called | State advances to tick 6, tick 5 saved to history | Battle ended → `step()` no-ops |
| **AC49: Step back** | History has ticks 1-5, `stepBack()` called | Returns to tick 4 state | At tick 0 → `stepBack()` no-ops |
| **AC50: Play/pause** | `play()` then `pause()` after 3 ticks | 3 ticks executed, timer stopped | Play when already playing → no-op |

**Standard Coverage Tests:**

- History maintains full state snapshots
- Speed control adjusts tick interval
- Reset returns to initial state

**Skip Testing:**

- Timer implementation details (browser API)

#### Component 5.3: DebugInspector

**Critical Path Tests:**

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC51: Rule evaluation display** | `RuleEvaluation` with 3 rules (1 matched) | Shows all 3 rules with ✓/✗, highlights matched | No rules matched → shows "No action (waiting)" |
| **AC52: Targeting display** | `TargetingDecision` with taunt filter | Shows candidates, taunt filter removed X targets, final | Tie-breaker explanation shown |
| **AC53: Substep display** | 4 resolution substeps | Shows numbered list of substeps with details | Empty substeps → shows "No resolutions this tick" |

**Standard Coverage Tests:**

- Condition details displayed (expected vs actual)
- Filter applications shown with removed target names
- Substep values formatted correctly

**Skip Testing:**

- HTML structure (tested via integration)
- CSS styling (visual concern)

#### Component 5.2: CharacterCard & 5.4: EventLog & 5.5: BattleViewer

**Standard Coverage Tests:**

- CharacterCard renders HP bars with correct percentages
- CharacterCard displays status icons for active statuses
- CharacterCard shows action progress bars
- EventLog displays newest events at top
- EventLog formats tick numbers
- BattleViewer integrates all components

**Skip Testing:**

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

### Run Management Integration Scenarios

Because runs are deterministic sequences of battles, we can snapshot entire run progressions:

**Example Integration Scenarios:**

- **"Three Encounter Victory Run"** - Validates full run flow: encounter 0 victory → skill unlock → encounter 1 victory → skill unlock → encounter 2 victory → run completion
  - **Tests:** Encounter progression, skill unlock persistence, run completion detection, `runStatus` state transitions
  - **Snapshot:** Complete `RunState` history and all 3 battle event logs

- **"Early Defeat Run"** - Validates defeat handling: encounter 0 → player party knockout → run ends with defeat
  - **Tests:** Defeat detection, progression blocking (cannot advance), `runStatus` = 'defeat'
  - **Snapshot:** `RunState` at defeat with `encountersCleared` = 0

- **"Skill Persistence Across Encounters"** - Validates skill unlocks: unlock Strike in encounter 0 → verify Strike available in encounter 1 loadout
  - **Tests:** Skill unlock application, persistence in `RunState.skillsUnlockedThisRun`, availability in subsequent battles
  - **Snapshot:** Character skill arrays after each unlock

- **"Loadout Swap Between Battles"** - Validates loadout management: unlock 4th skill after encounter 0 → change active 3 skills before encounter 1 → verify new loadout in battle
  - **Tests:** Loadout enforcement (3 active skills), loadout changes apply to `CombatState`, skill swapping logic
  - **Snapshot:** Character loadouts before/after swap, battle reflects new skills

These integration tests validate:
- `RunStateManager` correctly sequences encounters
- `CharacterProgression` persists unlocks across battles
- Victory/defeat correctly transition `runStatus`
- Full run from start to victory/defeat works end-to-end

### Test Count Estimates

**By Phase:**
- Phase 1 (Combat Engine): ~120-150 tests (critical path)
- Phase 2 (Targeting System): ~40-50 tests
- Phase 3 (Enemy AI): ~60-80 tests
- Phase 4 (Run Management): ~80-100 tests
- Phase 5 (UI Layer): ~70-95 tests (15-20 debug enhancement + 20-25 BattleController + 30-40 rendering + 5-10 integration)
- Integration tests: ~85-95 tests (combat engine + AI + run management snapshots)

**Total Project Estimate:** 525-550 tests

The majority of tests are in critical path components (Phases 1-4), with Phase 5 focusing on standard coverage for UI rendering and debug tooling. Integration tests validate end-to-end scenarios using deterministic snapshot comparisons.

## Next Steps for Human Approval

Before Code mode begins implementation, approve:

1. **Test priority classifications** - Are Critical/Standard/Skip labels correct?
2. **Data structure completeness** - Do TypeScript interfaces cover all needed fields?
3. **Implementation sequence order** - Are dependencies correctly identified?
4. **Technical decisions** - Any concerns with Vitest, immutability, or structure?

Once approved, Code mode proceeds with Phase 1, Step 1 (define TypeScript interfaces).
