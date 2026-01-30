# worklog-47.1-detail-credentials

# Worklog Detail - Browser Credential Extraction Wiki Article

Tags: #worklog-details #wiki #credentials #security

## Motivation
Credential extraction patterns appeared across multiple notes but weren't documented as a standalone topic. This cross-cutting concern deserved its own reference.

## What Changed
Created `[13] wiki-browser-credential-extraction` synthesizing patterns from notes [6], [7], [9].

## How It Works
The wiki article covers:
1. **Storage Locations** - Cookies, localStorage, sessionStorage, JS runtime
2. **Extraction Methods** - Code snippets for each storage type
3. **Service-Specific Patterns** - Table comparing Discord/Slack/Notion
4. **Security Considerations** - Token handling warnings
5. **Common Pitfalls** - Frame detach errors, timing issues, domain matching

Key insight: Different services store auth tokens in different ways - cookies vs localStorage vs JS runtime. The extraction method must match the storage mechanism.

## References
- Source notes: repo:[6], repo:[7], repo:[9]
- Created: repo:[13] wiki-browser-credential-extraction.md

[Signed-by: agent #47.1 claude-opus-4-5 via opencode 20260127T11:13:19]
