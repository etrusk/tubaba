# Auto-Battler Game Architecture

> **Status:** Core implementation complete (1046/1046 tests passing). For current work, see [`tasks.md`](tasks.md).

## Overview

A deterministic auto-battler combat system built with test-driven development. Battles execute in discrete ticks with 5-phase processing, ensuring complete predictability through strict determinism.

## Core Principles

### Determinism
- **No randomness:** All outcomes reproducible from identical inputs
- **Defined tie-breaking:** Player order (A, B, C), enemy alphabetical sort
- **Floor rounding:** `Math.floor()` for all numeric calculations
- **Snapshot testing:** Combat logs validate entire battle sequences

### Architecture Layers
1. **Combat Engine** - Tick execution, action resolution, status effects, skill definitions
2. **Targeting System** - Target selection modes, filtering (Taunt, Stunned, dead exclusion)
3. **Enemy AI** - Rule-based decision making with priority and conditions
4. **Run Management** - Multi-encounter progression, skill unlocks, character loadouts
5. **UI Layer** - Battle visualization, debug inspector, AI configuration interface

### Test-Driven Development
- Write tests first, implement to pass
- Critical path tests block dependent work
- Integration tests use deterministic snapshots
- ~1046 tests validating all system behaviors

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **TypeScript strict mode** | Type safety enforces determinism, catches bugs at compile time |
| **Immutable state updates** | Return new `CombatState` each tick, enables snapshot testing and time-travel debugging |
| **Vitest testing framework** | Fast, native ESM support, TypeScript-first |
| **Vanilla JavaScript UI** | Single HTML file, no build step, ES module imports - simplicity for prototype |
| **Debug inspector as primary UI** | Visibility into ALL decision-making (rule evaluations, targeting, resolution substeps) validates game mechanics |
| **Separate targeting filter step** | Status effects (Taunt, Stunned) modify targets after initial selection |
| **Per-character AI instructions** | Mix human and AI control, stored in-memory (persists across battles, not page reload) |

## Out of Scope

Explicitly deferred or excluded:
- **Multiplayer/PvP** - Single-player only
- **Persistence** - Run state in memory only
- **Animations/tweening** - Instant state transitions
- **Sound effects** - Visual feedback only
- **Difficulty scaling** - Fixed enemy stats
- **Skill customization** - Fixed skill values
- **Mobile controls** - Desktop browser only
- **Accessibility** - Basic semantic HTML only
- **Localization** - English only

## Implementation Details

Detailed specifications are in the codebase:
- **Type definitions:** [`src/types/`](../src/types/) - Core data structures
- **Test specifications:** [`tests/`](../tests/) - Acceptance criteria and edge cases
- **Integration tests:** [`tests/integration/`](../tests/integration/) - Snapshot-based validation
- **Archived specs:** [`memory-bank/archive/specs/`](../memory-bank/archive/specs/) - Historical feature designs

All implementation details live in code or tests to avoid documentation drift.
