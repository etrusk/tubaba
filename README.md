# Best Game Ever

A deterministic, tick-based auto-battler combat game prototype.

## Features

- **Tick-based combat** with 5-phase execution (Rule Evaluation → Action Progress → Action Resolution → Status Effects → Cleanup)
- **12 skill types**: Strike, Heavy Strike, Fireball, Execute, Poison, Heal, Shield, Defend, Revive, Taunt, Bash, Interrupt
- **6 status effects**: Poisoned, Stunned, Shielded, Taunting, Defending, Enraged
- **AI rule-based decision making** with conditions
- **Run management** with encounter progression and skill unlocks
- **Debug inspector** for combat decision visibility
- **Instructions builder UI** for AI configuration
- **Fully deterministic** - snapshot-testable combat logs

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js |
| Language | TypeScript 5.x |
| Testing | Vitest |
| UI | Vanilla JS (single HTML file) |
| State | Immer (immutable updates) |

## Project Structure

```
src/
├── ai/          # Enemy AI (EnemyBrain, RuleConditionEvaluator)
├── engine/      # Combat engine (TickExecutor, ActionResolver, SkillLibrary, StatusEffectProcessor)
├── targeting/   # Target selection (TargetSelector, TargetFilter)
├── run/         # Run management (RunStateManager, CharacterProgression)
├── types/       # TypeScript type definitions
└── ui/          # UI components (BattleController, CharacterCard, DebugInspector, etc.)
tests/           # Vitest test files (mirrors src structure)
specs/           # Requirements, plans, architecture docs
memory-bank/     # Project context and decisions
```

## Getting Started

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run type-check

# Build
npm run build

# Standards check (lint + type-check)
npm run standards:check
```

### Running the Battle Viewer

The interactive battle GUI requires compiling TypeScript first:

```bash
# 1. Build the project (compiles TypeScript to dist/)
npm run build

# 2. Open the battle viewer in your browser
# Option A: File protocol (simplest)
open battle-viewer.html        # macOS
xdg-open battle-viewer.html    # Linux
start battle-viewer.html       # Windows

# Option B: Use a local server (recommended for development)
npx serve .
# Then open http://localhost:3000/battle-viewer.html
```

The Battle Viewer provides:
- **Character cards** showing HP, status effects, and current actions
- **Play/Pause/Step controls** for tick-by-tick execution
- **Debug Inspector** showing AI rule evaluations, targeting decisions, and resolution substeps
- **Instructions Builder** to configure character AI behavior
- **Event Log** displaying combat events in real-time

## Development

- Entry point for battle visualization: [`battle-viewer.html`](battle-viewer.html)
- Tests colocated in `tests/` directory mirroring `src/` structure
- All combat is deterministic - identical inputs produce identical outputs

## License

ISC
