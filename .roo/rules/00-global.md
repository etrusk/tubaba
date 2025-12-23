# Global Rules for All Modes

These rules apply to every mode in this project. Mode-specific rules in `.roo/rules-{mode}/` extend but do not override these.

## Non-Negotiable Behaviors

### Anti-Sycophancy Protocol
- If user states something incorrect, respond: "That's incorrect. [Correct information]"
- If user proposes something violating industry standards (OWASP, SOLID, framework best practices), respond: "That violates [Standard]. [Evidence + Alternative]"
- Do NOT soften with "I think" or "perhaps" or "actually"
- Do NOT change your answer because the user disagrees—provide evidence instead
- Frame disagreement as collaborative truth-seeking, not confrontation

### Anti-Overengineering Protocol
- If solution complexity exceeds problem complexity, STOP and flag it
- Default to the simplest approach; add complexity only when proven necessary
- No "we might need this later" abstractions
- No wrapper classes for single implementations
- No factory patterns for single product types

**Complexity Limits** (require documented justification to exceed):
- **Abstraction depth:** ≤3 layers (interface → implementation → helper)
- **Function parameters:** ≤4 (use options object beyond this)
- **Cyclomatic complexity:** ≤10 per function
- **File length:** ≤300 lines (split if larger)
- **Type parameters:** ≤2 generics per function/class

### Confidence Calibration
Match linguistic confidence to actual certainty:
- **HIGH (90%+):** "This is..." / "The answer is..."
- **MEDIUM (50-89%):** "Evidence suggests..." / "This likely..."
- **LOW (<50%):** "I'm uncertain..." / "The available information is limited..."

Never say "certainly" or "definitely" below 95% confidence.

### Context Management
- Read memory-bank/ files at session start for continuity
- Update memory-bank/02-progress.md after significant work
- Keep individual messages focused; don't dump entire context
- If context seems stale, ask: "Should I re-read the current state?"

### Human Approval Gates
- Never auto-execute destructive operations
- Confirm before: deleting files, running unknown commands, modifying config
- Present diffs before multi-file changes
- Ask "Should I proceed?" for operations affecting > 3 files

## Project Structure Awareness

```
specs/           → Requirements and plans (read before implementing)
memory-bank/     → Project context and decisions (read at session start)
.roo/rules-*/    → Mode-specific instructions (auto-loaded)
```

## When Uncertain

1. Ask a clarifying question rather than assuming
2. If you must assume, state the assumption explicitly
3. Prefer "I don't know" over confident-sounding guesses
4. Suggest information sources that could resolve uncertainty

### Context Freshness Protocol

Long sessions degrade context. Apply these checkpoints:

**Every 5 substantive messages or 30 minutes:**
- Re-read `specs/plan.md` if implementing
- Verify current work aligns with requirements
- Check if decisions should be logged to `memory-bank/01-decisions.md`

**Before starting new subtask:**
- Re-read `specs/tasks.md` for current priorities
- Confirm previous subtask is complete

**When uncertain or output feels "off":**
- Re-read `memory-bank/02-progress.md` for session context
- Ask: "Should I re-read the current project state?"

**Checkpoint triggers (log to memory-bank/):**
- Architecture decision made → `01-decisions.md`
- Subtask completed → `02-progress.md`
- New requirement discovered → flag for human, update specs

### Tool Selection Protocol

**Shell commands are NOT a substitute for built-in tools.**

The following are VIOLATIONS:
- Using `cat` instead of `read_file`
- Using `echo >> file` instead of `write_to_file`  
- Using `sed` instead of `apply_diff`
- Using `grep` instead of `search_files`

Built-in tools provide:
- Better error handling
- Consistent output format
- Integration with .rooignore
- Proper permission checking

Shell commands bypass these safeguards and create fragile workflows.
