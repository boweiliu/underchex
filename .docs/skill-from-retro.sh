#!/bin/bash

# Script to process retro files and trigger skill generation
# Called by Claude Code PostToolUse hook after Write operations

set -e

# DEBUG: Log that hook was triggered
echo "[DEBUG] Hook triggered at $(date)" >> /tmp/hook-debug.log

# Read the JSON input from stdin
INPUT=$(cat)
# echo "[DEBUG] Raw INPUT: $INPUT" >> /tmp/hook-debug.log

# Extract the file_path from the tool input using jq
# Try file_path first (Write/Edit), then notebook_path (NotebookEdit)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
echo "[DEBUG] $(date '+%H:%M:%S') FILE_PATH: $FILE_PATH" >> /tmp/hook-debug.log

# Check if file path is provided
if [ -z "$FILE_PATH" ]; then
    echo "[DEBUG] $(date '+%H:%M:%S') No file path provided, exiting" >> /tmp/hook-debug.log
    exit 0
fi
echo "[DEBUG] $(date '+%H:%M:%S') File path provided: $FILE_PATH" >> /tmp/hook-debug.log

# Check if file ends in .md and is in .docs/nb/home/
if [[ ! "$FILE_PATH" =~ \.md$ ]] || [[ ! "$FILE_PATH" =~ \.docs/nb/home/ ]]; then
    echo "[DEBUG] $(date '+%H:%M:%S') File does not match criteria (.md in .docs/nb/home/), exiting" >> /tmp/hook-debug.log
    exit 0
fi
echo "[DEBUG] $(date '+%H:%M:%S') File matches criteria (.md in .docs/nb/home/)" >> /tmp/hook-debug.log

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "[DEBUG] $(date '+%H:%M:%S') File does not exist, exiting" >> /tmp/hook-debug.log
    exit 0
fi
echo "[DEBUG] $(date '+%H:%M:%S') File exists" >> /tmp/hook-debug.log

# Extract frontmatter and check for completed and skillwritten fields
# Using awk to parse YAML frontmatter between --- delimiters (macOS/BSD compatible)
FRONTMATTER=$(awk '/^---$/ {count++; next} count == 1 {print}' "$FILE_PATH")

if [ -z "$FRONTMATTER" ]; then
    echo "[DEBUG] $(date '+%H:%M:%S') No frontmatter found, exiting" >> /tmp/hook-debug.log
    exit 0
fi
echo "[DEBUG] $(date '+%H:%M:%S') Frontmatter found" >> /tmp/hook-debug.log

# Check if completed is true
COMPLETED=$(echo "$FRONTMATTER" | grep -E "^completed:" | awk '{print $2}' | tr -d ' ')
echo "[DEBUG] $(date '+%H:%M:%S') completed field value: '$COMPLETED'" >> /tmp/hook-debug.log
if [ "$COMPLETED" != "true" ]; then
    echo "[DEBUG] $(date '+%H:%M:%S') completed is not true, exiting" >> /tmp/hook-debug.log
    exit 0
fi
echo "[DEBUG] $(date '+%H:%M:%S') completed is true" >> /tmp/hook-debug.log

# Check if skillwritten exists and is true
SKILLWRITTEN=$(echo "$FRONTMATTER" | grep -E "^skillwritten:" | awk '{print $2}' | tr -d ' ')
echo "[DEBUG] $(date '+%H:%M:%S') skillwritten field value: '$SKILLWRITTEN'" >> /tmp/hook-debug.log
if [ "$SKILLWRITTEN" = "true" ]; then
    echo "[DEBUG] $(date '+%H:%M:%S') skillwritten is already true, exiting" >> /tmp/hook-debug.log
    exit 0
fi
echo "[DEBUG] $(date '+%H:%M:%S') skillwritten is not true, proceeding with skill generation" >> /tmp/hook-debug.log

# If we reach here, we need to spawn a headless claude code session with /skillfromretro
# NOTE: The /skillfromretro command will set skillwritten: true after successfully creating the skill

echo "[DEBUG] $(date '+%H:%M:%S') ===== PROCESSING RETRO FILE: $FILE_PATH =====" >> /tmp/hook-debug.log
echo "Processing retro file: $FILE_PATH"

# Spawn headless claude code session with /skillfromretro command
echo "Spawning claude code session to generate skill..."
echo "[DEBUG] $(date '+%H:%M:%S') About to spawn claude session" >> /tmp/hook-debug.log

# Run claude code in headless mode with the skillfromretro command
# --allowedTools explicitly whitelists tools needed for skill generation
# -p enables non-interactive/programmatic mode
nohup claude --allowedTools Write,Edit,Read,Glob,Grep,Skill -p "/skillfromretro $FILE_PATH" > /tmp/claude-skill-generation.log 2>&1 &
CLAUDE_PID=$!
echo "[DEBUG] $(date '+%H:%M:%S') Claude session spawned with PID: $CLAUDE_PID" >> /tmp/hook-debug.log
echo "Claude session spawned with PID: $CLAUDE_PID"

echo "Skill generation initiated for $FILE_PATH (check /tmp/claude-skill-generation.log)"
