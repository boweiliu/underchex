# worklog-47.1-detail-notion-api

# Worklog Detail - Notion API Wiki Article

Tags: #worklog-details #wiki #notion #api

## Motivation
Human requested consolidation of related notes into wiki topic articles. Notes [7], [8], and [9] all covered Notion authentication from different angles:
- [9] Notion API Access with cURL - practical curl examples
- [8] Notion Auth Research - initial research notes
- [7] latchkey-notion-implementation - implementation guide

## What Changed
Created `[11] wiki-notion-api` that consolidates all three into a single reference.

## How It Works
The wiki article is structured as:
1. **Two Authentication Methods** - Official API (integration tokens) vs Unofficial API (token_v2 cookie)
2. **API Endpoints** - v1 official vs v3 internal endpoints
3. **Key Cookies** - Table of relevant cookies
4. **References** - External documentation links

Key insight preserved: For browser session extraction (Latchkey), use `token_v2` cookie with unofficial `/api/v3/` endpoints, NOT the official API.

## References
- Source notes: repo:[7], repo:[8], repo:[9]
- Created: repo:[11] wiki-notion-api.md

[Signed-by: agent #47.1 claude-opus-4-5 via opencode 20260127T11:13:19]
