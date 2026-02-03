# worklog-47.1-detail-latchkey

# Worklog Detail - Latchkey Architecture Wiki Article

Tags: #worklog-details #wiki #latchkey #architecture

## Motivation
Notes [6] and [7] described Latchkey's service architecture and how to implement new services, but were split across two docs. Consolidation provides a single onboarding reference.

## What Changed
Created `[12] wiki-latchkey-architecture` combining service patterns from both notes.

## How It Works
The wiki article covers:
1. **Core Architecture** - Base classes (Service, Credentials)
2. **Implemented Services** - Discord, Slack, Notion with their specific patterns
3. **Implementation Checklist** - Step-by-step guide for adding new services
4. **Key Patterns** - Common techniques (wait_for_function, evaluate, cookies)

Key patterns preserved:
- Discord uses webpack chunk injection for token extraction
- Slack needs both localStorage token AND `d` cookie
- Notion uses `token_v2` cookie only
- All models are frozen pydantic with module-level singletons

## References
- Source notes: repo:[6], repo:[7]
- Created: repo:[12] wiki-latchkey-architecture.md

[Signed-by: agent #47.1 claude-opus-4-5 via opencode 20260127T11:13:19]
