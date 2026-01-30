---
name: consulting-nb-knowledge-local
description: Use when starting any task, encountering errors, or before proposing solutions - checks institutional memory first
---

# Consulting nb Knowledge

## Overview
Before taking action, search nb for past solutions and lessons learned.

## When to Use
**ALWAYS before:**
- Starting any new task
- Proposing a solution to a problem
- Encountering an error or test failure
- Choosing between implementation approaches

**Symptoms that trigger this:**
- User asks "how do we..."
- User reports a bug or issue
- You're about to explore the codebase
- You're about to write significant code

## Quick Reference
```bash
# General keyword search
nb search '#keyword' --list

# Search for specific topics
nb search 'error message' --list

# View a note
nb show <id>

# List recent notes
nb -sr | head -20
```

## Red Flags - You Skipped This
- "Let me explore the codebase first"
- "Let me check the files"
- "I'll search for..."
- "Let me understand the structure"

**All of these mean: Search nb FIRST.**

## Pattern
1. User asks question or describes problem
2. **IMMEDIATELY** search nb before any other tool
3. If found: Use that knowledge + verify still accurate
4. If not found: Proceed with investigation
5. After solving: Consider if worth documenting in nb
