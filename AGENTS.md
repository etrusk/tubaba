# Agent Instructions

This file provides context for AI agents working on this project.

## Project Type
[Web app / CLI tool / Library / Game / API / etc.]

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | [e.g., Node.js 20] |
| Language | [e.g., TypeScript 5.x] |
| Framework | [e.g., React 18, Next.js 14] |
| Styling | [e.g., Tailwind CSS] |
| Database | [e.g., PostgreSQL, SQLite, none] |
| ORM | [e.g., Prisma, Drizzle, none] |
| Testing | [e.g., Vitest, Jest] |
| Build | [e.g., Vite, webpack] |

## Conventions

### File Naming
- **Components:** PascalCase (`UserCard.tsx`)
- **Utilities:** camelCase (`formatDate.ts`)
- **Constants:** SCREAMING_SNAKE_CASE (`API_ENDPOINTS.ts`)
- **Tests:** `*.test.ts` or `*.spec.ts` colocated with source

### Code Style
- Enforced by: [ESLint + Prettier / Biome / etc.]
- Config files: [`.eslintrc.js`, `.prettierrc`]
- Key rules: [e.g., "No default exports", "Prefer named functions"]

### Git Workflow
- **Branch naming:** `feature/`, `fix/`, `refactor/`, `docs/`
- **Commit format:** [Conventional Commits / free-form]
- **PR requirements:** [Tests pass, review required]

## Key Files & Directories

```
src/
├── components/     # Reusable UI components
├── pages/          # Route components (if applicable)
├── services/       # Business logic, API calls
├── hooks/          # Custom React hooks
├── utils/          # Pure utility functions
├── types/          # TypeScript type definitions
└── constants/      # App-wide constants
```

**Entry point:** `src/index.ts` or `src/main.tsx`
**Config:** `[vite.config.ts, next.config.js, etc.]`
**Environment:** `.env.example` (copy to `.env.local`)

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

## Current Focus
[What the team is actively working on - update regularly]

## Known Issues / Tech Debt
[Things to be aware of, workarounds in place]

## API Keys / Secrets
- Never commit secrets to the repository
- Use `.env.local` for local development
- Required env vars documented in `.env.example`
