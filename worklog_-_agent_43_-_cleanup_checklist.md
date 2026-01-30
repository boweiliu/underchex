# Worklog - Agent 43 - Cleanup Checklist
Tags: #worklogs #checklist #tablebase #tests #documentation #kotlin

Checklist for cleaning up [[Worklog - Agent 43 - C and Elixir Tablebase Tests]] (nb 64).

## Checklist
- Add background context: what a tablebase is, why we focus on specific matchups (KvK, KQvK, etc.), and how those relate to supported configurations.
- Add `Tags: #worklogs` after the H1 if worklogs are expected to be tagged; otherwise confirm it is linked from `Worklogs Index` and keep it tag-less.
- Tighten the Summary to 1-2 bullets; avoid full sentences.
- Collapse "Work Completed" bullets so each item is one line where possible; remove bold emphasis if it is not used consistently elsewhere.
- Normalize list numbering (either `1.` or bullets) across "Priority Work Items" and "Notes on Kotlin".
- Include line numbers with filenames for key references, and note the commit(s) used.
- Provide evidence for test results: commit hash, exact commands, sample output, and start/end timestamps for the run.
- For subsequent work items, reference previous worklog docs that list the same remaining items, so the lineage is traceable.
- For Kotlin notes, add explicit verification commands and recommended fixes (e.g., JDK install/selection commands).
- Ensure the test table and counts have a date reference (for example, add "Test results (2026-01-22)").
- In "Test Commands," remove redundant `cd` lines by grouping per language, or add a short "run from repo root" note.
- Verify links are complete and current: `Worklogs Index`, `Project/Underchex - Hub`, and the previous worklog.
- Add topic tags where helpful to correlate with related docs (#tablebase, #cross-impl, #tests, #kotlin).

## Links
- [[Worklog - Agent 43 - C and Elixir Tablebase Tests]] (nb 64)
- [[Worklogs Index]] (nb 40)
