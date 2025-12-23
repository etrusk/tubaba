# Memory Bank

This directory contains project context and architectural decisions.

## Structure

```
memory-bank/
├── 01-decisions.md    # Active architectural decisions
└── archive/           # Historical decisions and rejected proposals
```

## File Purposes

### 01-decisions.md

Contains **active** architectural decisions that affect current and future work.

**What belongs here:**
- Recently accepted architectural decisions (top of file)
- Strategic decisions still influencing development
- Historical summary table of implemented decisions

**Maintenance:**
- New decisions added at top using template
- Old decisions archived when no longer relevant
- Summary table updated when decisions are archived

### archive/

Contains decisions and specs that are no longer active but may provide historical context.

**What belongs here:**
- Superseded architectural decisions
- Rejected prototype proposals
- Historical specs from completed phases
- Lessons learned from abandoned approaches

**When to archive:**
- Decision is superseded by a new approach
- Prototype was declined by human
- Phase completed and decision is now implementation detail
- Context is historical, not actively referenced

## Archive Protocol

### Archiving a Decision

1. **Create archive file** with descriptive name:
   ```
   memory-bank/archive/YYYY-MM-DD-decision-name.md
   ```

2. **Move decision content** from `01-decisions.md` to archive file

3. **Update 01-decisions.md** historical table:
   ```markdown
   | 2025-12-20 | Phase 3 Data Model | Implemented, archived |
   ```

4. **Commit** with message:
   ```
   docs(memory): archive [decision name] - [reason]
   ```

### Archiving a Prototype Spec

When prototype is **declined**:

1. **Move spec** to `archive/`:
   ```bash
   git mv specs/prototype-name.md memory-bank/archive/YYYY-MM-DD-prototype-name.md
   ```

2. **Add summary** at top of archived file:
   ```markdown
   # [Prototype Name]
   
   **Status:** DECLINED
   **Date:** YYYY-MM-DD
   **Reason:** [Why declined - e.g., "Approach too complex", "Better alternative found"]
   
   ---
   
   [Original spec content...]
   ```

3. **Commit**:
   ```
   docs(memory): archive declined prototype [name]
   ```

When prototype is **accepted**:
- Spec stays in `specs/` and becomes production documentation
- Decision logged in `01-decisions.md`

## Examples

### Example: Archiving Superseded Decision

**Before** (01-decisions.md):
```markdown
## 2025-12-15 SQLite for Persistence
**Status:** Superseded by 2025-12-20 decision
**Decision:** Use SQLite for game state persistence
```

**After archiving:**

1. Create `archive/2025-12-15-sqlite-persistence.md` with full content
2. Update `01-decisions.md`:
   ```markdown
   | 2025-12-15 | SQLite for Persistence | Superseded by IndexedDB |
   ```

### Example: Archiving Declined Prototype

**Before:**
```
specs/rewind-feature.md  (detailed prototype spec)
```

**After human declines:**
```bash
git mv specs/rewind-feature.md memory-bank/archive/2025-12-22-rewind-feature-declined.md
```

Add to archived file:
```markdown
# Rewind Feature Prototype

**Status:** DECLINED
**Date:** 2025-12-22
**Reason:** Added complexity without clear gameplay benefit

---

[Original spec...]
```

## When NOT to Archive

Keep decisions active if they:
- Are less than 3 months old
- Actively referenced by current work
- Define constraints for ongoing features
- Document APIs still in use

Keep specs active if they:
- Document current system behavior
- Are production specifications (not prototypes)
- Reference tables or game mechanics in use
