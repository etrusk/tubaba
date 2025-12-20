# Roo Code Project Template

A research-validated setup for AI-assisted development with Roo Code.

## Quick Start

1. Copy all files from this folder to your new project root
2. Open the project in VSCodium with Roo Code extension
3. Verify modes appear in Roo Code mode selector
4. Start in 🪃 Orchestrator mode
5. Fill in the template files as you begin

## What's Included

```
.roomodes                    # Custom mode definitions (replaces defaults)
.clinerules                  # Global rules for all modes
.roo/
  rules-orchestrator/        # Orchestrator-specific instructions
  rules-architect/           # Architect-specific instructions
  rules-code/                # Code-specific instructions
  rules-reviewer/            # Reviewer-specific instructions
  rules-ask/                 # Ask-specific instructions
memory-bank/                 # Session persistence
  00-project-overview.md     # Project description
  01-decisions.md            # Architecture Decision Records
  02-progress.md             # Session log
specs/                       # Spec-driven development
  requirements.md            # What we're building
  plan.md                    # How we'll build it
  tasks.md                   # Current work items
AGENTS.md                    # Universal agent context
.rooignore                   # Files agents should not access
```

## Custom Modes

| Mode | Purpose | Tools |
|------|---------|-------|
| 🪃 Orchestrator | Workflow coordination, enforces spec-first | read only |
| 🏗️ Architect | Design & planning | read, browser, mcp, edit(.md only) |
| 💻 Code | Implementation | all tools |
| 🔍 Reviewer | Fresh-eyes validation | read, command, mcp |
| ❓ Ask | Questions & explanations | read, browser, mcp |
| 🪲 Debug | Problem diagnosis | all tools |

## Workflow

```
User Request
    ↓
🪃 Orchestrator
    ├─→ 🏗️ Architect (if needs design)
    │       ↓
    │   specs/plan.md
    │       ↓
    ├─→ 💻 Code (implementation)
    │       ↓
    └─→ 🔍 Reviewer (validation)
            ↓
        Feedback loop or Done
```

## Research Sources

This template implements findings from:
- Game Development with Agentic LLM Teams (Oct 2025)
- Modern Testing Best Practices for 2025
- The State of LLM System Prompts (Oct 2025)
- The Solo Developer's Guide to AI-Agent Development Teams

Key principles applied:
- Spec-driven development (plan before code)
- Planner → Coder → Reviewer pipeline
- Anti-sycophancy protocols
- Anti-overengineering checks
- Confidence calibration
- Context rot mitigation
- Human approval gates
