---
name: domain-context-first
description: Use when making design/architecture decisions - ask about domain requirements before defaulting to conventional wisdom
---

# Domain Context Before Conventional Wisdom

## Lesson from Retro

Agent recommended the "standard" hex coordinate system (axial/cube) based on generic best practices, but user pointed out that domain semantics (chess has special N/S directions) made a different choice better. The "elegant" solution wasn't the right solution.

## When to Use This Skill

This skill applies when you're about to:
- Recommend a technical approach based on general best practices
- Choose between multiple valid design patterns
- Make architecture decisions for a domain-specific application
- Default to "what the tutorials say" or "conventional wisdom"

**Warning signs you need this:**
- You're citing general resources (Red Blob Games, design pattern books, etc.)
- You're about to say "the standard approach is X"
- The project has domain-specific semantics (games, finance, medicine, etc.)
- You haven't asked what properties matter most to the user

## Key Guidance

1. **Ask about domain requirements first.** Before recommending the "standard" solution:
   - What domain semantics matter? (e.g., "N/S is special in chess")
   - What properties does the user care about preserving?
   - Are there constraints the generic solution doesn't account for?

2. **Domain context > generic elegance.** A solution that's "cleaner" in the abstract may be wrong for the specific domain. The coordinate system that's mathematically elegant isn't necessarily the one that matches game semantics.

3. **User's first instinct about their domain is often right.** They know their problem space. If they push back on a recommendation, investigate why before defending the "standard" approach.

4. **YAGNI on abstractions.** Don't add abstraction layers for hypothetical future users or "familiarity":
   - No existing users = no reason to optimize for familiarity
   - Start simple, add abstraction when there's actual need
   - "Familiar column numbers" don't matter when there are no users yet

5. **Investigate options, present choices.** Write up the landscape of options with trade-offs, then let the user decide based on their domain knowledge.

## Correct Workflow

1. User requests design decision (e.g., "what coordinate system?")
2. **Ask**: "What domain properties matter most? Any special semantics?"
3. Research options with trade-offs
4. Present options with domain context considered
5. Let user decide, record rationale

## Full Context

For complete details, see: Agent Diary: Session 6.0.0 (nb 150)

**Related documents:**
- nb 146: Hex Coordinate Systems - Options and Recommendation
- nb 148: Offset Hex Coords - Cleaner Representations
- Human Preferences: bowei (update 6.0.0) - documents "domain semantics over generic elegance" preference
