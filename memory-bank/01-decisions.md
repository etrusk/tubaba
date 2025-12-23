# Architecture Decision Records

New decisions go at the top. Keep only strategic decisions that affect future work.

---

## 2025-12-23 Hybrid Workflow Adoption

**Status:** Accepted

**Decision:** Dual-track workflow with automatic detection:
- **🧪 Prototyping track** - For uncertain/exploratory work (spike/* branches)
- **📋 Production track** - For known/specified work (main, ai/* branches)

**Orchestrator Detection:**
- Uncertainty signals ("try", "not sure", "explore") → Prototyping
- Certainty signals ("implement per spec", bug fixes) → Production

**Graduation Protocol:**
- Human accepts prototype → Update GAME_SPEC.md → Create specs/plan.md → Production-quality implementation

**Drift Rules:**
- Prototypes: Drift checks suspended during exploration
- Production: Full drift prevention enforced

See `.roo/rules-orchestrator/01-workflow.md` for full workflow details.

---

## 2025-12-23 Spec Management Protocol Adoption

**Status:** Accepted

**Decision:** Two-document system with maintenance protocol.
- `specs/GAME_SPEC.md` (~1200 words) - Always in context, vision document
- `specs/REFERENCE_TABLES.md` - Load on demand

**Maintenance Protocol:**
- Git: `spike/<feature>` for prototypes, `ai/<role>/<task>` for implementation
- Updates: Only accepted design decisions → GAME_SPEC, Stats → REFERENCE_TABLES
- Drift detection required at production task completion

See GAME_SPEC.md Design Decisions for all active constraints.

---

## Historical Decisions (Implemented)

| Date | Decision | Outcome |
|------|----------|---------|
| 2025-12-23 | UI Layout Redesign - Modal instructions | Implemented, tested |
| 2025-12-22 | Action Forecast feature | Implemented, 60+ tests |
| 2025-12-22 | Instructions Builder UI | Implemented, 102+ tests |
| 2025-12-21 | Phase 5 Vanilla JS UI | Implemented, 161 tests |
| 2025-12-21 | Phase 4 Run Management | Implemented, 95 tests |

Historical specs deleted. Tests are the living specification.

---

<!-- 
Template for new decisions:
## [Date] [Title]
**Status:** Accepted
**Decision:** [One sentence]
**Rationale:** [One sentence]
-->
