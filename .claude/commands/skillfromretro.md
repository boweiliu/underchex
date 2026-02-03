# /skillfromretro

When invoked:

1. Ask the user for a filepath **if none is provided**.
2. If a filepath is provided, make sure that the filepath is in the .nb_docs_repo/home/ directory.
3. Read the file and check the frontmatter:
   - If `completed: false` or `completed` is not present, DO NOT write a skill. Exit gracefully.
   - If `skillwritten: true`, DO NOT write a skill (already done). Exit gracefully, tell user why you exited. 
   - If there is NO frontmatter, but it is an md file and it is in the right location, you can write in the frontmatter as `completed: true` `skillwritten: false`. 
   - Only proceed if `completed: true` AND `skillwritten` is not `true`.

## Writing Skills from Retros

When creating a skill from a retro document:

### 1. Read and Analyze the Retro
- Read the retro file from `.nb_docs_repo/home/{filename.md}`
- Identify the core lesson or problem the retro addresses
- Look for a **Triggers** section - this tells you when the lesson is relevant
- Understand the context: what went wrong? what was learned? what should agents do differently?

### 2. Craft the Skill Metadata

**Skill Name:**
- Use kebab-case
- Should reflect the topic/problem domain (e.g., `nb-visual-architecture`, `avoid-premature-optimization`)
- Keep it concise and searchable

**Skill Description (one-line):**
- Capture the essence of when to use this skill
- Should match the spirit of the retro's Triggers section
- Format: "Use when [condition that should trigger this skill]"
- Example: "Use when modifying nb-visual or debugging graph visualization issues"
- This is what agents see in the skill list - make it count!

### 3. Write the Skill Content

Structure the skill content as follows:

```markdown
---
name: your-skill-name
description: Use when [triggering condition from retro]
---

# [Skill Title]

## Lesson from Retro

[1-2 sentence summary of the key lesson or problem this retro addresses]

## When to Use This Skill

[Expand on the triggers - be specific about conditions, symptoms, or contexts where this skill applies. This should help agents recognize when they need this guidance BEFORE they make the same mistake.]

## Key Guidance

[Bullet points or short paragraphs with the actionable takeaways from the retro]

## Full Context

For complete details, see: [Retro Title](/docs/{retro_filename_without_extension})

**Related documents:**
[List any related docs mentioned in the retro]
```

### 4. Make Triggers Proactive

The goal is to surface the skill BEFORE the agent makes the same mistake. Consider:

- What symptoms or conditions precede the problem?
- What keywords or file paths are involved?
- What types of tasks commonly lead to this issue?
- Can you detect the problem context early enough to prevent it?

**Good triggers:**
- "Task explicitly mentions modifying X"
- "Agent is about to Y without first doing Z"
- "Working with files in directory X"

**Avoid:**
- Overly broad triggers that fire on common words
- Triggers that only match after the problem already happened
- Generic file operations unless truly specific to the lesson

### 5. Skill File Location

Save the skill to: `.claude/skills/{skill-name}.md`

### 6. Test the Description

Ask yourself:
- Would an agent reading just the one-line description know when to invoke this?
- Is it specific enough to be useful but broad enough to catch relevant cases?
- Does it capture the "aha!" moment from the retro?

## Example Pattern

If a retro teaches "Always check X before doing Y to avoid Z problem":
- **Name:** `check-x-before-y`
- **Description:** `Use when about to perform Y operations, ensures X is verified first`
- **Content:** Explains why checking X matters, how to check it, and links to the full retro

