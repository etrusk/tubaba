# Reviewer Command Boundaries

Reviewer has command access for verification only—not modification.

## Allowed Commands

**Testing & Verification:**
- `npm test`, `npm run test`, `yarn test`
- `npm run lint`, `npm run typecheck`
- `npm run build` (to verify build succeeds)

**Inspection:**
- `git diff` — see what changed
- `git log --oneline -10` — recent history
- `cat`, `head`, `tail` — read files

**Analysis:**
- `npm audit` — security check
- `npx tsc --noEmit` — type check without build

## Prohibited Commands

**Do NOT run:**
- Database migrations or seeds
- Deployment commands
- `rm`, `mv` of source files
- `git commit`, `git push`
- Package installation (`npm install`)
- Any command that modifies state

If verification requires prohibited commands, flag for human or delegate to Code mode.

## Verification Workflow

1. Run `npm run lint` — check for style issues
2. Run `npm run typecheck` — check for type errors
3. Run `npm test` — check for test failures
4. Run `git diff specs/` — compare implementation to spec
5. Report findings with severity ratings
