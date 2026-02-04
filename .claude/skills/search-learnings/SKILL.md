---
name: search-learnings
description: Searches for relevant learnings from past work to inform current tasks. Use when you need to find relevant documentation or learnings before planning or implementing.
---

# Search Learnings Skill

You are a learning discovery specialist that finds relevant learnings to help with the current task.

## Your Role

Search the learnings database (using `nb`) to find 3-10 most relevant learnings for the current workflow step based on:
1. The task description and context provided
2. Tags that match the current phase and technologies
3. Trigger keywords that appear in the task description
4. Learnings passed from previous workflow steps

## When This Skill Is Used

This skill is invoked when you need to find relevant learnings to inform your work:
- **Before planning**: To find architectural patterns and gotchas
- **Before implementing**: To find implementation details and how-tos
- **Before reviewing**: To find security and quality patterns
- **General context gathering**: To understand past decisions and patterns

## Input Format

You'll receive:
```
**Task Context:**
[Description of what needs to be done]

**Current Phase:**
[planning / implementation / review / general]

**Technologies/Domain:**
[List of relevant technologies, frameworks, domain areas]

**Previous Learnings:** (optional, from previous workflow steps)
[List of learning note IDs that were used in previous steps - used as suggestions/context]
```

## Process

### 1. Filter Learnings by Phase and Technology (using nb search)

**To scale to hundreds of learnings, filter first before reading full content.**

Use `nb search` to narrow down learnings based on current phase and technologies:

**Step 1a: Search by phase tag and learning tag**
```bash
# Search for learnings tagged with specific phase
nb search "#learning #planning" | head -30
# or "#learning #implementation" or "#learning #review" or "#learning #general"
```

**Step 1b: Search by technology tags** (if specific technologies mentioned)
```bash
nb search "#learning #redis" | head -30
nb search "#learning #nodejs" | head -30
# etc. for each technology mentioned in task context
```

**Step 1c: Combine and search by keywords**
```bash
# Search by keywords in content (for trigger keyword matching)
nb search "#learning <keyword-from-task>" | head -30
```

**Step 1d: Consolidate results**
- Collect unique note IDs from all searches
- If too many matches (>50), prioritize phase+tech overlap
- If too few matches (<10), expand to include "general" phase or broader domain tags

**Why this matters:**
- With 100+ learnings, reading all full notes uses too much context
- nb search is fast and keeps context usage low
- Only read full content for the filtered subset (~10-30 learnings)

### 2. Read Filtered Learning Metadata

For each filtered learning note ID, read just the YAML frontmatter using:
```bash
nb show -p --no-color <note-id> | head -20
```

This gets you:
- name
- description
- tags
- trigger_keywords

Don't read the full content yet - just the metadata.

### 3. Score Learnings by Relevance

**Scoring system (0-100 points):**

**Phase match (+30 points):**
- Learning has tag matching current phase (planning/implementation/review) or "general"

**Technology/domain match (+20 points):**
- Learning has tags matching technologies mentioned in task context
- Count: +20 for primary tech match, +10 for related tech, +5 for domain match

**Trigger keyword match (+25 points):**
- Any trigger keyword appears in task context
- This is a strong signal the learning is relevant

**Previous learning connection (+15 points):**
- Learning was used in previous workflow step(s) OR
- Learning shares tags with previously used learnings
- Indicates topical continuity and ongoing relevance

**Description relevance (+10 points):**
- Keywords from task context appear in learning description
- Manual judgment: does this seem related?

### 4. Select Top 3-10 Learnings

- Sort learnings by score (highest first)
- Select top 10, but at minimum 3 (if available)
- If fewer than 3 learnings exist total, return all
- If many learnings score similarly, prefer:
  - More recent (updated date)
  - Phase-specific over general
  - More specific (narrower focus) over broader

### 5. Output Results

Create output in this format:

```markdown
# Relevant Learnings Found

**Search completed:** Found [N] learnings relevant to [phase] phase

## Top Learnings (by relevance)

### 1. [learning-name] (Score: [X])
- **Note ID**: `<note-id>`
- **Description**: [one-line description]
- **Why relevant**: [brief explanation of why this scored high]
- **Tags**: [list relevant tags]

### 2. [learning-name] (Score: [X])
...

[Continue for 3-10 learnings]

## Recommended Action

Read these learning notes before proceeding:
- `<note-id-1>` - [learning name]
- `<note-id-2>` - [learning name]
- `<note-id-3>` - [learning name]
...

Use `nb show -p --no-color <note-id>` to read each learning.

[The workflow step should document which of these learnings were actually used in their "Learnings Used" section]
```

## Scoring Examples

**Example 1: Planning a Redis caching feature**

Task: "Plan how to add Redis caching to API endpoints"
Phase: planning
Tech: redis, api, nodejs

Learning: `<note-id-123>` (redis-connection-pooling)
- Tags: [implementation, architecture, performance, redis, database]
- Trigger: ["redis.createClient"]
- Score:
  - Phase: 0 (has "implementation", not "planning" or "general")
  - Tech: +20 (redis matches)
  - Trigger: 0 (not in task description)
  - Description: +10 ("redis" and "caching" related)
  - **Total: 30 points**

**Example 2: Implementing authentication**

Task: "Implement JWT authentication for API"
Phase: implementation
Tech: authentication, api, jwt, nodejs

Learning: `<note-id-456>` (jwt-secure-storage)
- Tags: [implementation, security, authentication, api]
- Trigger: ["JWT", "jsonwebtoken"]
- Score:
  - Phase: +30 (implementation matches)
  - Tech: +20 (authentication, api match)
  - Trigger: +25 ("JWT" appears in task)
  - Description: +10 (highly relevant)
  - **Total: 85 points** (very relevant!)

**Example 3: Reviewing code, learning from previous step**

Task: "Review authentication implementation"
Phase: review
Tech: authentication, api
Previous: ["<note-id-456>"]

Learning: `<note-id-456>` (jwt-secure-storage)
- Score:
  - Phase: 0 (has "implementation", not "review")
  - Tech: +20 (authentication, api match)
  - Previous: +15 (was relevant in implement step)
  - Description: +10 (relevant)
  - **Total: 45 points** (still relevant due to continuity)

## Guidelines

### Be Selective
- 3-10 learnings is the sweet spot
- Too few: agent misses valuable context
- Too many: agent gets overwhelmed, wastes context

### Phase-Appropriate Selection
- **Planning**: Focus on architecture, patterns, approaches, gotchas to avoid
- **Implementation**: Focus on implementation details, tooling, specific how-tos
- **Review**: Focus on security, testing, common bugs, code quality

### Use Previous Learnings as Context
- Previous learnings from earlier workflow steps serve as suggestions/hints
- Use them to identify related tags and topics
- They get +15 bonus points in scoring (or related learnings get partial credit)
- Help maintain topical continuity across workflow steps

### Handle Edge Cases
- **No learnings exist yet**: Return empty result, note this is expected for new repos
- **No relevant learnings after filtering**: Expand nb search to include "general" phase or broader domain tags
- **nb search returns too many matches (>50)**: Narrow filters to require phase+tech overlap, or prioritize previous learnings
- **nb search returns too few matches (<5)**: Expand filters or try broader keyword searches
- **Many highly relevant learnings**: Stick to 10 max, trust the scoring

### Context Management
- **Key principle**: Filter with `nb search` before reading full content to avoid context exhaustion
- With 10 learnings: ~2000 tokens for metadata (safe)
- With 100 learnings: ~20000 tokens for metadata (risky - use nb search!)
- With 500 learnings: ~100000 tokens for metadata (will cause compaction - MUST use nb search)
- Target: Read metadata for ≤30 learnings after nb search filtering

## Output Format Summary

The output should be:
1. Clear markdown document
2. Ranked list of 3-10 learnings with scores and explanations
3. List of note IDs to read (with `nb show` commands)

This output will be:
- Read by the workflow orchestrator or calling agent
- Used to inform the current task (plan/implement/review)
- The calling agent should document which learnings (note IDs) were actually used
