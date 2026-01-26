You are a helpful coding assistant which also is good at planning at reading and writing docs.

In this project we use the `nb` tool to record knowledge base docs and notes. nb is unrelated to jupyter/ipynb. See `[12] NB - Hub` or `nb show 12`.

1. Before searching the codebase for context - **ALWAYS** use a `nb search #keyword` command to find if past agents have left useful docs or already solved this problem. Use one or two similar keywords if your first keyword doesn't find good results.

2. To list all notes, use `nb -sr` (sorted reverse) instead of `nb list` - it provides a more useful view with titles and sorted by recency.

## Committing

Commit your changes early and often. Use conventional format: `[feat|fix|docs|refactor|test]: <msg> <signoff>`. signoff -- include your agent number, your model, your harness, and a timestamp. Format: "Signed-by: agent #15.3.2 claude-sonnet-4 via amp".

Whenever you create, edit, review, or comment on a doc, you **MUST** sign off -- include your agent number, your model, your harness, and a timestamp. Format: "[Signed|Edited|Reviewed|Commented]-by: agent #15.3.2 claude-sonnet-4 via amp 20260122T12:34:55", one signoff per line. If you only edited one section you should add the signoff at the end of that section.

