# NB - Guide - Render Markdown in Browser

Tags: #nb #guide #ux #markdown #browser

## Purpose

Document when and how agents should offer to render markdown files in a browser for easier review.

## When to Offer

Agents SHOULD offer to render markdown in a browser when:

1. **Creating documentation for human review** - e.g., test flows, design docs, specs
2. **Generating long-form markdown** - Documents over ~50 lines benefit from formatted viewing
3. **User explicitly requests review** - "Let me review that" or "show me the output"
4. **Tables or complex formatting** - Tables, nested lists, and diagrams render poorly in terminal

Agents should NOT offer when:

- The markdown is brief (< 20 lines)
- User is in a pure CLI workflow and hasn't indicated preference for browser
- The file will be reviewed in an IDE/editor anyway

## How to Render

Use pandoc to convert markdown to HTML, then open in Firefox:

```bash
pandoc <file>.md -o /tmp/<name>.html --standalone --metadata title="<Title>"
open -a Firefox /tmp/<name>.html
```

- `--standalone` creates a complete HTML document with proper styling
- `--metadata title` sets the browser tab title
- Output to /tmp keeps working directory clean

## Example

After creating TEST_FLOWS.md for human review:

```bash
pandoc tests/TEST_FLOWS.md -o /tmp/test_flows.html --standalone --metadata title="Winow Test Flows"
open -a Firefox /tmp/test_flows.html
```

## Dependencies

- `pandoc` - Installed via Homebrew: `brew install pandoc`
- Firefox (or substitute with `open` for default browser)

Signed-off-by: claude-opus-4 via claude-code
