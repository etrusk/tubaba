# Phase 5 Analysis: UI Layer Specification Gap

## Executive Summary

Phase 5 (UI Layer) specification has **significant quality gaps** compared to Phases 1-4. Current spec lacks data structures, critical path tests, integration scenarios, and architectural decisions. More fundamentally: **Should we build UI at all for a combat engine prototype?**

## Gap Analysis vs. Phases 1-4 Quality Standard

### Phase 4 Enhancement Pattern (from ADR 2025-12-21)

Phase 4 was enhanced with:
1. TypeScript interfaces for all data structures (`RunState`, `Encounter`, `SkillUnlockChoice`)
2. 10 critical path tests (AC35-AC44) with input/output/edge case tables
3. 4 integration scenarios with snapshot strategy
4. Explicit dependencies explaining HOW components interact
5. Enhanced component descriptions with state machine diagrams

**Phase 5 has NONE of this.**

### Specific Gaps in Current Phase 5 Spec

| Quality Dimension | Phases 1-4 | Phase 5 Current | Gap Severity |
|-------------------|------------|-----------------|--------------|
| **Data Structures** | 10+ TypeScript interfaces | 0 interfaces | 🔴 Critical |
| **Critical Path Tests** | 44 acceptance criteria with tables | 0 critical tests | 🔴 Critical |
| **Test Detail Level** | Input/output/edge case tables | 4 vague bullets | 🔴 Critical |
| **Integration Scenarios** | 3-4 per phase with snapshots | 0 scenarios | 🔴 Critical |
| **Component Description** | State machines, data flow | 3 bullet points | 🟡 Major |
| **Architectural Decisions** | Documented in ADRs | None made | 🔴 Critical |
| **Dependencies Explained** | "Consumes X, produces Y" | "depends on: 10" | 🟡 Major |
| **Test Classification** | Critical/Standard/Skip justified | All "Standard Coverage" | 🟡 Major |

## Missing Architectural Decisions (30% Escalation Required)

### 1. UI Framework Selection
**Status:** Not decided  
**Impact:** Critical - affects testing approach, build process, dependencies

**Options:**
- **Vanilla JavaScript** - No framework overhead, full control
  - Pros: Simple, no build step, minimal dependencies
  - Cons: Manual DOM management, no reactivity
- **React** - Industry standard, rich ecosystem
  - Pros: Component model, testing tools, familiar
  - Cons: Heavy for prototype, requires build setup
- **Preact** - React-compatible but lighter
  - Pros: Small bundle, React-like DX
  - Cons: Still needs build step
- **No UI (CLI only)** - Console-based battle viewer
  - Pros: Simplest, focuses on engine, already have event logs
  - Cons: Less impressive demo

**Recommendation:** This is a **30% decision** requiring human input.

### 2. State Binding Strategy
**Status:** Not specified  
**Impact:** Major - determines how UI stays synchronized with combat engine

**Options:**
- **Observer Pattern** - UI subscribes to TickExecutor events
- **Direct Polling** - UI reads CombatState each frame
- **Event Emitter** - Combat engine publishes events, UI listens
- **Framework Reactivity** - Depends on framework choice

**Dependency:** Blocked by Framework Selection decision.

### 3. UI-to-Logic Communication Protocol
**Status:** Unclear  
**Impact:** Major - VictoryScreen needs to submit skill choices to RunStateManager

Current spec says VictoryScreen "Outputs: User skill selection" but doesn't explain:
- Synchronous function call? Async callback? Event dispatch?
- Validation before submission? Or submit then validate?
- Error handling for invalid selections?

## Missing Data Structures

Phase 5 needs TypeScript interfaces (analogous to Phase 4's `RunState`, `Encounter`, `SkillUnlockChoice`):

```typescript
// Proposed (not yet specified):

interface RenderableCharacter {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  hpPercentage: number;  // Derived for progress bar
  statusIcons: StatusIcon[];
  actionProgress?: ActionProgress;
}

interface StatusIcon {
  type: StatusType;
  duration: number;
  iconPath: string;  // or CSS class?
}

interface ActionProgress {
  skillName: string;
  ticksRemaining: number;
  totalTicks: number;
  progressPercentage: number;  // Derived for progress bar
}

interface FormattedEvent {
  tick: number;
  timestamp: string;  // Formatted for display
  message: string;
  severity: 'info' | 'warning' | 'critical';
  icon?: string;
}

interface SkillUnlockOption {
  skillId: string;
  skillName: string;
  description: string;
  iconPath: string;
  isUnlocked: boolean;  // Already on this character?
}

interface VictoryScreenState {
  battleResult: 'victory' | 'defeat';
  encounterName: string;
  skillRewards: SkillUnlockOption[];
  playerParty: RenderableCharacter[];
  onSkillSelect: (choice: SkillUnlockChoice) => void;  // Callback contract
}
```

**Problem:** Spec doesn't define these, so Code mode would have to invent them.

## Missing Test Specifications

### Current Phase 5 Test Coverage (lines 527-541)

**Standard Coverage Tests** (4 bullets):
- Combat state renders HP bars with correct percentages
- Event log displays newest events at top
- Status icons appear for active statuses
- Victory screen shows unlockable skills

**Skip Testing**:
- Visual styling (CSS, not behavior)
- Animation timing (out of scope)
- DOM element creation (framework behavior)

### Problems

1. **No Critical Path Tests** - But victory screen skill selection IS critical (affects run progression)
2. **Vague Descriptions** - "renders HP bars with correct percentages" isn't testable without:
   - Input: What CombatState?
   - Expected Output: What percentage value?
   - Edge Case: 0 HP? Max HP? Mid-battle?
3. **"Framework behavior" in Skip** - Misunderstands testability:
   - We CAN test DOM output without testing React internals
   - Rendering logic IS testable behavior (e.g., "HP bar is 75% wide when HP is 75/100")

### What Phase 5 SHOULD Have (following Phase 1-4 pattern)

**Critical Path Tests** (20-30 tests, AC45-AC65):

| Scenario | Input | Expected Output | Edge Case |
|----------|-------|-----------------|-----------|
| **AC45: HP bar percentage calculation** | Character 75/100 HP | HP bar width = 75% | 0 HP → 0%, dead character grayed out |
| **AC46: Status icon display** | Character with 2 active statuses | 2 icons visible with durations | Expired status → icon removed |
| **AC47: Action timer display** | Action with 3 ticks remaining | Progress bar shows 3/5 (60%) | Action completes → timer cleared |
| **AC48: Event log formatting** | Damage event (30 damage) | "Tick 5: PlayerA dealt 30 damage to EnemyB" | Multiple events same tick → grouped |
| **AC49: Event log ordering** | 10 events across 5 ticks | Newest (tick 5) at top, oldest (tick 1) at bottom | Scrollable if > 20 events |
| **AC50: Victory screen skill display** | 3 skill rewards available | All 3 skills shown with descriptions | Already unlocked → grayed out |
| **AC51: Skill selection validation** | Click unlocked skill | Error: "Already unlocked" | Cannot submit invalid choice |
| **AC52: Skill selection submission** | Valid skill choice | Calls `RunStateManager.applySkillUnlock()` | Choice persists to next battle |

**Integration Tests** (3-5 scenarios):

1. **"Full Battle Rendering Sequence"** - 10-tick battle, UI updates each tick, snapshot final DOM
2. **"Victory to Next Encounter Flow"** - Battle victory → victory screen → skill selection → next encounter loaded
3. **"Event Log Accumulation"** - 3 encounters, event log shows all events or only current battle?
4. **"Status Effect Visual Feedback"** - Poison applied → icon appears → duration decrements → icon removed

## Missing Component Details

### Current vs. Needed Specifications

| Component | Current Spec | Needed Details |
|-----------|--------------|----------------|
| **CombatRenderer** | "Renders combat state" | • How does it subscribe to updates?<br>• Push (observer) or pull (polling)?<br>• Re-render entire state or diff?<br>• DOM structure (divs? table? canvas?) |
| **EventLogDisplay** | "Displays event log" | • Fixed height with scroll?<br>• Auto-scroll to newest?<br>• Event grouping strategy?<br>• Max events before truncation? |
| **VictoryScreen** | "Shows skill unlock choices" | • Modal overlay or page transition?<br>• How to close without selection?<br>• Callback signature for submission?<br>• Error display for invalid selection? |

## Fundamental Question: Should We Build UI?

### Context

This is a **TDD prototype for an auto-battler combat engine**:
- Phases 1-4: 455 tests validating core mechanics (100% passing)
- Core innovation: Deterministic tick-based combat with 5-phase execution
- UI explicitly marked "Standard Coverage" (not critical path)
- Out of scope: animations, sound, mobile, accessibility

### Options

#### Option A: Full UI Layer (Current Plan)
- Implement all 3 components (CombatRenderer, EventLogDisplay, VictoryScreen)
- Estimated: 60-80 tests, 3-5 integration scenarios
- **Pros:** Visual demo, complete user experience
- **Cons:** 
  - Large scope increase (UI complexity ≈ engine complexity)
  - Framework decision blocks progress (30% decision)
  - UI bugs would obscure engine quality
  - Testing UI is slower and more brittle

#### Option B: CLI Battle Viewer (Console-based)
- Replace Phase 5 with simple CLI simulator:
  ```bash
  npm run battle-sim
  
  === Tick 1 ===
  PlayerA queued Strike (30 damage) → EnemyA (3 ticks)
  EnemyA queued Heavy Strike (50 damage) → PlayerB (5 ticks)
  
  === Tick 4 ===
  PlayerA Strike resolves → EnemyA takes 30 damage (70/100 HP)
  EnemyA Poisoned (5 dmg/tick, 3 ticks)
  
  === Tick 5 ===
  EnemyA takes 5 poison damage (65/100 HP)
  Poisoned duration: 2 ticks remaining
  ```
- **Pros:**
  - Already have event log system (deterministic, tested)
  - Simple implementation (50 lines, no dependencies)
  - Focuses on engine quality (the actual innovation)
  - Easy to script/automate battles for testing
- **Cons:**
  - Less impressive demo
  - No interactive skill selection (could use CLI prompts)

#### Option C: Export Replay JSON (Visualization Separate)
- Export battle logs as JSON, build viewer separately:
  ```typescript
  // After battle:
  const replay = {
    initialState: { ... },
    ticks: [ /* all TickResults */ ],
    outcome: 'victory'
  };
  
  fs.writeFileSync('battle-replay.json', JSON.stringify(replay));
  ```
- External tool (separate project or web app) visualizes replays
- **Pros:**
  - Cleanest separation of concerns
  - Replay files are portable, shareable
  - Can build multiple viewers (web, CLI, analysis tools)
  - Engine tests remain fast
- **Cons:**
  - No integrated experience
  - Requires building viewer separately (or manually inspect JSON)

#### Option D: Minimal Web UI (Hybrid)
- Single HTML file with vanilla JS, no build step:
  ```html
  <script type="module">
    import { executeTick } from './src/engine/tick-executor.js';
    
    // Render loop
    function update(state) {
      document.getElementById('hp-player').textContent = state.players[0].currentHp;
      // ... etc
    }
  </script>
  ```
- **Pros:**
  - Simple, no framework decision needed
  - Visual feedback without build complexity
  - Can still test rendering logic
- **Cons:**
  - Manual DOM management
  - Limited interactivity

### Recommendation

**Defer Phase 5 and implement Option B (CLI Battle Viewer) first**, then revisit UI decision:

1. **Immediate value:** CLI viewer validates engine works end-to-end (30 min implementation)
2. **Human decision:** UI framework selection is 30% decision requiring input
3. **Quality focus:** Keep test suite fast and focused on engine mechanics
4. **Future-proof:** CLI viewer remains useful even if UI built later (scripting, CI testing)

If human wants visual demo, then enhance spec with Option D (minimal vanilla JS).

## Proposed Actions

### 1. Immediate (Architect to decide, human to approve)
- [ ] **Decision:** Should Phase 5 be UI, CLI, or hybrid?
- [ ] If UI: Choose framework (30% decision - escalate to human)
- [ ] If CLI: Skip detailed UI spec, write CLI viewer spec instead

### 2. If Proceeding with UI (Phase 5 Enhancement Required)
- [ ] Define 6-8 TypeScript interfaces for UI data structures
- [ ] Specify 20-30 critical path tests (AC45-AC65+) with tables
- [ ] Define 3-5 integration scenarios with snapshot strategy
- [ ] Document architectural decisions (framework, state binding, communication protocol)
- [ ] Enhance component descriptions with data flow diagrams
- [ ] Specify error handling for invalid states

### 3. If Switching to CLI (Simpler Path)
- [ ] Create `specs/cli-viewer-spec.md` with:
  - CLI output format specification
  - Battle simulation command interface
  - Event log formatting rules
  - 10-15 tests for output correctness
- [ ] Implement in `src/cli/battle-viewer.ts` (50-100 lines)
- [ ] Add `npm run battle-sim` script to package.json

## Questions for Human

1. **Primary goal of prototype?**
   - Demo visual appeal? → Need full UI
   - Validate engine mechanics? → CLI sufficient
   - Both? → Hybrid approach

2. **Timeline constraints?**
   - Need demo quickly? → CLI fastest
   - Have time for polish? → Can build full UI

3. **UI framework preference?**
   - Vanilla JS (simplest, no build)
   - React (familiar, structured)
   - Other?

4. **Testing priority?**
   - Keep tests fast (<5s total)? → Avoid UI tests
   - Comprehensive coverage? → Include UI tests

## Confidence Assessment

**High confidence (90%+):**
- Phase 5 spec has significant gaps vs. Phases 1-4
- Missing data structures, critical tests, integration scenarios
- Framework decision is 30% decision requiring human input

**Medium confidence (50-89%):**
- CLI viewer would be simpler and faster than full UI
- Vanilla JS would be simpler than React for this prototype

**Low confidence (<50%):**
- Human's preference between visual demo vs. engine quality focus
- Whether UI complexity is worth the effort for prototype

## Next Steps

**Awaiting human decision** on fundamental question: UI, CLI, or hybrid?

Once decided:
- If UI → Enhance Phase 5 spec to match Phases 1-4 quality
- If CLI → Create CLI viewer spec and implement
- If hybrid → Define minimal viable UI approach
