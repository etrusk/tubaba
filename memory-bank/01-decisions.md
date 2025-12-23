# Architecture Decision Records

New decisions go at the top. Keep only strategic decisions that affect future work.

---

## 2025-12-23 Spec Management Protocol Adoption

**Status:** Accepted

**Decision:** Two-document system with maintenance protocol.
- `specs/GAME_SPEC.md` (~1200 words) - Always in context
- `specs/REFERENCE_TABLES.md` - Load on demand

**Maintenance Protocol:**
- Git: `spike/<feature>` for prototypes, `ai/<role>/<task>` for implementation
- Updates: Strategic decisions → GAME_SPEC, Stats → REFERENCE_TABLES
- Drift detection required at task completion

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
