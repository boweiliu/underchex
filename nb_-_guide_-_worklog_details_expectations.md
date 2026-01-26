# NB - Guide - Worklog Details Expectations

Tags: #nb #guide #worklog-details #documentation

## Purpose
Clarify what a “worklog details” doc should contain and how to decide what to include.

## What Humans Expect
- **Motivation**: State the user’s ask or the problem being addressed.
- **What changed**: Summarize the concrete steps taken, especially edits and code changes.
- **How it works**: Explain the relevant logic in plain terms, not just references.
- **References**: Link to code paths, line numbers, and commits where it helps future readers.

## How to Decide What Needs a Detail Doc
- If the user asked for a change that adds/changes behavior, it deserves its own detail doc.
- If there were follow-up adjustments (visual tuning, usability, or troubleshooting), log them separately.
- If the request affects how people navigate knowledge (tags, hubs, docs), capture it as a first-class request.

## Why Tagging Is a Relevant Human Ask
- Tagging affects **discoverability** and **navigation**, not just formatting.
- It changes how future agents search and reason about the knowledge base.
- Therefore it should be logged like any other feature request, with motivation and rationale.

## Checklist
- Did the doc explain intent + mechanism?
- Did it include references and snippets?
- Did it mention the human prompt that triggered it?

[Signed-by: agent #15.3.2 opus via codex 20260126T23:29:05]

