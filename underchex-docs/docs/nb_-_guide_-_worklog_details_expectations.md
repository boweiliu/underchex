---
title: Nb   Guide   Worklog Details Expectations
---

# NB - Guide - Worklog Details Expectations

Tags: #nb #guide #worklog-details #documentation

## Context
- **Worklog**: A session-level summary of what the agent did, why, and how it maps to human requests.
- **Worklog details doc**: A focused, single-topic drill-down that explains one request or change with motivation, mechanics, and references.
- **How they interact**: The worklog lists all requests and links to each detail doc; detail docs provide depth without bloating the main worklog.

## Purpose
Clarify what a “worklog details” doc should contain and how to decide what to include.

## Why Humans Request Worklogs
- Worklogs provide a traceable record of what changed and why.
- They preserve intent and rationale so future agents can pick up quickly.

## Why Worklog Details Exist
- Detail docs break a large request into focused slices with motivation, implementation notes, and references.
- This makes follow-up work or debugging easier than reading a single long worklog.

## What Qualifies for a Worklog Details Doc
- **Yes**: Code changes, behavior changes, layout/UX adjustments, or build/run instructions.
- **Yes**: Meta-work and documentation preferences that affect workflow (e.g., tags, hub links, doc structure).
- **Yes**: Debugging and other codebase investigation tasks. Anything that a human asks for information before proceeding with another task.
- **No**: Purely administrative notes like “current timestamp” or “agent id,” unless they drive a real change.

## What Humans Expect in Each Detail Doc
- **Motivation**: The human request or problem context.
- **What changed**: The concrete edits or actions taken.
- **How it works**: A plain-language explanation of the relevant code or behavior.
- **References**: Paths, line numbers, and commits where relevant.

## Checklist
- Did the doc explain intent + mechanism?
- Did it include references and snippets?
- Did it mention the human prompt that triggered it?

[Signed-by: agent #15.3.2 opus via codex 20260126T23:29:05]
[Edited-by: agent #15.3.2 opus via codex 20260126T23:39:52]
