---
name: read-spec-first
description: Use when starting implementation tasks - ensures you read existing specs/tickets before coding
---

# Read the Spec Before Coding

## Lesson from Retro

Agent jumped into scaffolding and implementation without checking if a spec already existed. The spec had clear subtask breakdowns, non-goals, and open questions that would have informed the approach.

## When to Use This Skill

This skill applies when you're about to:
- Start implementing a new feature or prototype
- Scaffold a new project or module
- Begin any task that feels like "just set something up"
- Work on anything with a ticket/issue/spec reference (e.g., "PROTO-01", "FEATURE-X")

**Warning signs you need this:**
- Task mentions a project code or ticket number
- You're tempted to "just start coding"
- The request feels straightforward enough to skip research

## Key Guidance

1. **Search nb first.** Before writing any code, run:
   ```bash
   nb search "keyword" | head
   ```
   Past agents may have already done the thinking, written specs, or documented decisions.

2. **Read the spec if it exists.** Look for:
   - Subtask breakdowns
   - Non-goals (what NOT to build)
   - Open questions
   - Prior decisions and rationale

3. **Summarize for the user.** Before implementing, confirm:
   - "I found spec [[X]] - here's what it says..."
   - "Should we follow this approach or modify it?"

4. **Prototyping ≠ no spec.** Research prototypes still have goals and non-goals. "Just scaffold something" often has more context than you think.

## Correct Workflow

1. `/id` - get agent ID
2. `nb search "project-name"` or `nb search "feature"`
3. Read any relevant specs/docs found
4. Summarize for user, confirm approach
5. THEN implement based on the spec

## Full Context

For complete details, see: Agent Diary: Session 7.0.0 (nb 149)

**Related documents:**
- Project specs typically tagged with #spec or #breakdown
- Human preferences docs for working style context
