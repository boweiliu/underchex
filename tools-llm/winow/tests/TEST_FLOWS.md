# Winow Test Flows

---

## 1. Create Session

**User Story:** As a developer, I want to start an agent session on a task.

**Flow:**
1. User runs `winow start "fix the bug in auth.ts"`
2. System creates a git worktree, tmux session, and launches the agent
3. System outputs the session name/ID
4. User runs `winow ps` to see the session listed as active

---

## 2. Interact with Session

**User Story:** As a developer, I want to send follow-up instructions and attach to a running session.

**Flow:**
1. User runs `winow send <session> "also update the tests"`
2. System sends the message to the running agent
3. User runs `winow attach <session>`
4. User is now attached to the tmux session viewing the agent

---

## 3. Multiple Sessions

**User Story:** User has multiple agent sessions running simultaneously.

**Flow:**
1. User runs `winow start "task A"` - creates session-1
2. User runs `winow start "task B"` - creates session-2
3. User runs `winow ps`
4. Both sessions are listed with their prompts/status
5. User can send to and attach to each independently

---

## 4. Session Identification

**User Story:** User needs to identify sessions when multiple exist.

**Expected:**
- Sessions should have unique, identifiable names
- Names should be based on branch/worktree or auto-generated
- User can use session name to target send/attach commands
