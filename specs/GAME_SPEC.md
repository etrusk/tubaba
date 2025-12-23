# Game Specification

## Section 1: Concept

**One-line summary:** A single-player roguelike auto-battler where players program party behavior through prioritized IF-THEN rules, then watch combat execute deterministically.

### Design Pillars

1. **Emergence from simplicity** - Complex tactical situations arise from simple, composable rules. No hidden mechanics or special cases.

2. **Debuggable failure** - When you lose, you can see exactly why. Every action, condition check, and targeting decision is visible and deterministic.

3. **Deterministic combat** - Same inputs always produce same outputs. No randomness, no variance, no "luck." Replayable from any state.

4. **Constraint as content** - Three rule slots per character force meaningful choices. Limited skill offerings create distinct character builds within a run.

### Core Loop

1. **Pre-battle:** Review enemies, inspect their rules, adjust your rules
2. **Battle:** Watch tick-by-tick execution, pause anytime to edit
3. **Post-battle:** Choose 1 of 3 skill offerings, assign to character
4. **Repeat:** Progress through encounters with accumulated skills

### What This Is NOT

- **No randomness** - No crits, no misses, no random targeting. Damage values are fixed. Target selection follows strict priority rules.
- **No real-time** - Discrete ticks, pausable anytime. Each tick represents 0.5s of visual time but executes instantly.
- **No deckbuilding** - Rules, not cards. Characters have skill loadouts with prioritized conditional rules, not decks to shuffle.
- **No permadeath** - Full heal after each battle. Runs are 6 encounters with skill progression, not permadeath roguelikes.

---

## Section 2: Design Decisions

### Time System

**Tick-based discrete time:**
- Each tick = 0.5s visual time
- Actions have duration (measured in ticks)
- Actions queue at tick start, countdown each tick, resolve at tick 0

**Simultaneous evaluation:**
- All idle units check rules at tick start (Phase 1)
- Targets locked when action queues, persist until resolution
- No mid-action retargeting

**Simultaneous resolution:**
- Damage, healing, status effects all resolve together (Phase 3)
- No action interrupts another during resolution
- Deterministic processing order within substeps

**Deterministic tie-breaking:**
- Player characters: left-to-right order (A, B, C)
- Enemy characters: alphabetical by ID
- Ensures identical replays from identical states

### Rule System

**3 rule slots per character (hard constraint):**
- Forces meaningful prioritization
- Cannot add more slots via upgrades
- Each rule: 1 skill + conditions + optional targeting override

**Top-to-bottom evaluation, first match fires:**
- Rules sorted by priority (descending)
- First rule with all conditions met executes
- If no rules match, character does nothing

**Target locking:**
- Targets selected when action queues
- Locked for entire action duration
- Taunt applied mid-action does not redirect locked actions

**No automatic fallbacks:**
- Empty rule slots = no action from that slot
- Invalid rules (no valid targets) skip to next rule
- Character may stand idle if no rules match

### Targeting

**Health-based targeting uses current HP, not percentage:**
- "Lowest HP" means absolute HP value (25/100 beats 40/50)
- Important for focus-fire tactics

**Self excluded from ally targeting when teammates alive:**
- Prevents heal/shield self-loops
- Self-targeting allowed when solo or via explicit "self" targeting mode

**Taunt only affects NEW target selections:**
- Does not redirect already-locked targets
- Forces enemies to select taunting character when queuing new actions
- Healers can ignore taunt if their skill targeting mode bypasses it

### Combat Resolution Order (per tick)

1. **Rule evaluation** - All idle characters check rules, queue actions with locked targets
2. **Action progress** - Decrement ticksRemaining for all active actions
3. **Action resolution** - For actions reaching ticksRemaining = 0:
   - Substep 1: Damage calculation
   - Substep 2: Healing calculation
   - Substep 3: Shield absorption
   - Substep 4: Health update
   - Substep 5: Status application
   - Substep 6: Action cancellation (Interrupt, Stun)
4. **Status effects** - Poison damage, duration decrement
5. **Cleanup** - Knockout check, victory/defeat determination

### Progression

**6 encounters per run:**
- Escalating difficulty through enemy composition
- Final encounter is boss (Warlord)

**Skill offering after each battle:**
- Pick 1 of 3 skills, or skip
- Assign to any character
- Offering pool excludes starting skills

**Starting skills never appear in offerings:**
- Characters begin with 2-3 skills
- These never offered during run
- Prevents redundant choices

**Full heal between battles:**
- No attrition between encounters
- Each battle is self-contained puzzle
- Status effects clear between battles

### Visual

**Characters as geometric shapes (prototype):**
- Circles with HP "liquid drain" fill
- Team-based border colors (green players, red enemies)
- Unique name colors per character for identity
- Intent lines show targeting (color-coded by skill type)

**No sprite art for MVP:**
- SVG-based visualization
- Functional over aesthetic
- All information visible (HP, status, actions)

---

## Section 3: Working Notes

Flat list of observations and tactical implications discovered during development:

- Brute uses Heavy Slash on taunting targets — creates tactical tension between survival and threat management
- Healer ignores taunt entirely — support AI personality emerges from targeting mode selection
- Shaman uses fixed targeting (always Character A first) — predictable pattern enables positioning strategy
- Warlord uses Ground Slam when >2 players alive — AOE pressure incentivizes spreading damage or early kills
- Shield reapplication resets pool to 30, loses previous absorption — timing matters, no stacking
- Stun applied in substep 5 — same-tick attacks resolve before stun takes effect
- Interrupt cannot cancel same-tick resolution — must queue interrupt before target's action resolves
- Poison applies in substep 5, ticks in phase 4 — 1 tick delay before first damage
- Defending reduces damage by 50% before shield absorption — multiplicative with shield value
- Enraged adds flat +15 damage to next attack — stacks with defending reduction (calculate defending first)
- Taunt duration 4 ticks — outlasts most attack durations (2-4 ticks)
- Execute threshold 25% HP — on 100 HP target, triggers at 25 HP exactly (≤ threshold)
- Heal targeting "damaged allies" excludes full HP — prevents wasted heals
- Revive requires knocked-out target — cannot pre-queue on living ally
- Action queuing happens only when idle — active actions must complete before re-evaluation
- Debug inspector shows all rule evaluations — why each character chose (or didn't choose) each skill
- Intent lines distinguish queued (dashed) vs executing (solid) — visual feedback for action timing
- Character name colors unique per ID — consistent across all UI panels
- Event log shows tick-by-tick history — replay combat for post-battle analysis
- Forecast predicts next action after current completes — planning tool for multi-tick actions
- Instructions Builder allows AI rule customization — mix human and AI party members
- Priority reordering with up/down arrows — drag-and-drop deferred to keep UI simple
- Condition builder supports 5 condition types — HP thresholds, ally status, enemy status, universal
- Targeting override per rule — same skill can target differently based on conditions

---

## Section 4: Current Prototype State

- **Core implementation complete:** 1063 tests passing (Phases 1-8)
- **UI:** Circle-based visualization, Intent lines, Debug Inspector, Instructions Builder, Action Forecast
- **Server:** Always running at http://localhost:3000/battle-viewer
- **Next:** Rule Evaluation Display Redesign (specs/rule-evaluation-display-redesign.md) to show decision reasoning
