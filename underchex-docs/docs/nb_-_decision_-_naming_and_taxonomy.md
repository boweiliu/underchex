---
title: Nb   Decision   Naming And Taxonomy
---

# NB - Decision - Naming and Taxonomy

Tags: #workflow #decision #knowledge-base

## Goal
Standardize note titles so they are predictable, searchable, and easy to link.

## Current issues (observed)
- Mixed casing and patterns (e.g., title case, sentence case, lowercase, parentheticals).
- Some titles include scope in parentheses ("(underchex)") while others do not.
- Several notes are ambiguous about intent (hub vs how-to vs troubleshooting).
- At least one deprecated note lacks a consistent naming cue.

## Proposal summary
Adopt a strict, minimal naming system that encodes doc type and topic. Use a
slash for topic nesting (not a hyphen):

```
<Topic[/Subtopic]> - <Doc Type> - <Specific>
```

Example:
- `Codex - Hub`
- `Codex - Guide - Setup`
- `Worktrees/Direnv - Debug - NB_DIR`
- `NB - Guide - Search Tags`
- `NB - Reference - Common Commands`
- `Project/Underchex - Onboarding`

This structure makes it obvious what the note is for, keeps search results clustered, and allows predictable linking.

## Taxonomy
Doc types (use one per note):
- Hub: landing page that links to sub-notes
- Guide: procedural steps
- Reference: canonical facts and commands
- Onboarding: first-time setup or repo entry points
- Cheatsheet: compact, high-signal reference list
- Debug: problem/cause/solution path
- Decision: a recorded choice and rationale
- Deprecated: redirects to the active note
- Scratch: temporary, non-authoritative

Topics (examples, can have subtopics too):
- Project (project-wide, ie underchex)
- NB (notebook system)
- Codex (LLM tooling)
- Worktrees (git worktrees)
- Winow (the subtool)

## Naming rules
- Title case for words; hyphen separators between segments.
- Use `/` to nest topics (only inside the Topic segment).
- No parentheses in titles; encode scope in Topic or Specific.
- Keep titles short; only add a third segment when needed.
- Avoid abbreviations unless they are the product name (e.g., NB, Codex).
- Specific segment should be short; use Title Case or ALLCAPS for env vars.
- Deprecated notes must include `- Deprecated` in the title AND in the body.

## H1 heading requirement
- **The H1 heading (`# Title`) is the canonical title** - `nb list` displays the H1 heading, not the filename.
- Every note MUST have an H1 heading as the first line, followed by a Tags line.
- The H1 heading must follow the naming convention above.
- If a note lacks an H1 heading, nb falls back to the filename (including `.md` extension), which looks inconsistent.
- Filenames may use underscores or other patterns for legacy reasons, but the H1 heading is what matters for display and linking.

## Notes
- If a topic becomes large, keep the topic stable and extend the third segment.
- Keep titles consistent with the chosen taxonomy to reduce duplicate notes.

Signed-off-by: gpt-5 via codex
