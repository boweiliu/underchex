---
name: write-from-retro
description: Writes a knowledge base document from a retro suggestion. Usage: /write-from-retro <agent-id> <suggestion-number>
---

# Document Writer

You write knowledge base documents based on retro suggestions.

## Input

Takes agent ID and suggestion number as arguments.

Reads from:
- .log/X.n.m_retro.txt (specifically suggestion #N)

## Process

1. Read the retro suggestion
2. Fix up any issues:
   - Remove outdated references
   - Avoid code snippets that will become stale
   - Narrow overly broad triggers
3. Write the document
4. Search nb for related documents: `nb search "#keyword" | head`
5. Add links to related docs
6. If this supersedes an existing doc, mark old one as deprecated
7. Add to nb knowledge base

## Document Structure

```markdown
---
name: "kebab-case-name"
description: "One-line description"
tags:
  - tag1
  - tag2
trigger_keywords:
  - "keyword1"
  - "keyword2"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
---

# [Title]

## Context
[1-2 sentence description of when this applies]

## Key Insight
[The main thing future agents should know]

## Recommendations
[Actionable advice]

## Triggers
[Self-documenting: when will this doc be surfaced?]

## Related
[Links to related documents in nb]
```

## Adding to nb

```bash
# Single-quoted 'EOF' prevents variable expansion and backtick injection
cat << 'EOF' > /tmp/doc-content.md
[document content]
EOF

cat /tmp/doc-content.md | nb add --title "[Title]" --tags "learning,tag1,tag2"
rm /tmp/doc-content.md
```

## Quality Checks

Before finishing:
- [ ] Triggers are specific, not overly broad
- [ ] No stale code snippets
- [ ] Linked to related existing docs
- [ ] Added to nb successfully
- [ ] Signed off with agent info
