# Agent Instructions

This file provides context for AI agents working on this project.

## Project Type
Turn-based combat game engine with browser-based battle visualization

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js |
| Language | TypeScript 5.x |
| Framework | None (Vanilla JS for UI) |
| Styling | Inline styles in HTML |
| Database | None (in-memory game state) |
| ORM | None |
| Testing | Vitest |
| Build | TypeScript Compiler (tsc) |

## Conventions

### File Naming
- **UI Components:** kebab-case (`character-card.ts`, `intent-line.ts`)
- **Engine/Logic:** kebab-case (`tick-executor.ts`, `action-resolver.ts`)
- **Types:** kebab-case (`view-models.ts`, `combat.ts`)
- **Tests:** `*.test.ts` colocated with source

### Code Style
- Enforced by: ESLint
- Config file: `eslint.config.mjs`
- Key rules: Named exports only, explicit types, no `any`

### Git Workflow
- **Branch naming:** `spike/` (prototypes), `feature/`, `fix/`
- **Commit format:** Conventional Commits
- **PR requirements:** Tests pass, TypeScript compiles

## Key Files & Directories

```
src/
├── engine/         # Core combat logic (tick executor, action resolver)
├── ai/             # Enemy AI and rule evaluation
├── run/            # Character progression, skill loadout management
├── targeting/      # Target selection and filtering
├── ui/             # Battle visualization components (vanilla JS)
└── types/          # TypeScript type definitions
```

**Entry point:** `battle-viewer.html` (opens in browser)
**Config:** `tsconfig.json`, `vitest.config.ts`
**Specs:** `specs/GAME_SPEC.md` (game design), `specs/plan.md` (current task)

## Common Commands

```bash
# Development
npm run dev          # Start dev server

# Testing
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # With coverage

# Build & Deploy
npm run build        # Production build
npm run lint         # Check linting
npm run typecheck    # TypeScript check
```

## Development URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/battle-viewer` | Browser testing for battle visualization UI |

**Note:** The dev server must be running (`npm run dev`) before accessing these URLs.

**Important:** Run `npm run build` to compile TypeScript changes before they will be visible in the browser.

## Architecture Patterns

### View Model Pattern (Dec 2025)
UI components receive pre-formatted data through a View Model layer:

```
CombatState → ViewModelFactory → BattleViewModel → UI Components
```

**Key types:**
- [`CharacterViewModel`](src/types/view-models.ts) - Pre-formatted character data with `formattedName`, `color`, full skill list
- [`SkillViewModel`](src/types/view-models.ts) - Presentation-ready skills with duration formatting
- [`BattleViewModel`](src/types/view-models.ts) - Complete presentation state
- [`ViewModelFactory`](src/ui/view-model-factory.ts) - Single transformation point

**Convention:** UI components never access `SkillLibrary` or call formatter functions directly. All presentation logic goes through the View Model.

## Current Focus
View Model pattern implementation complete. All UI components now use consistent pre-formatted data.

## Known Issues / Tech Debt
None currently tracked.

## API Keys / Secrets
- Never commit secrets to the repository
- Use `.env.local` for local development
- Required env vars documented in `.env.example`
