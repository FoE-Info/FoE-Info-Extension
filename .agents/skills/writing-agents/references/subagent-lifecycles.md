# Antigravity Subagent Lifecycles & Coordination

Lifecycle management, workspace isolation, and inter-agent communication.

---

## 1. Lifecycle States

1. **Running**: The subagent is actively executing instructions, calling tools, and reasoning.
2. **Idle**: The task is complete. The subagent returns its response to the parent agent and pauses. Sending a new message via `send_message` automatically re-awakens it.
3. **Killed**: The subagent is permanently terminated via `manage_subagents(Action: 'kill')`. Temporary Git worktrees are cleaned up immediately.

---

## 2. Workspace Modes

When invoking a subagent via `invoke_subagent`:

- **`inherit` (Default)**: Uses the parent's working directory. Suitable for read-only research or tightly coupled edits.
- **`share`**: Creates an isolated Git worktree under `.worktrees/<branch>` sharing the repository storage. **Mandatory for parallel feature tasks** to prevent dirty-state collisions.
- **`branch`**: Clones a fresh isolated workspace branched from the parent.

---

## 3. Communication & Safety Limits

- **Depth Limit**: Maximum nesting depth of 10 levels of subagents.
- **Transcripts**: Agents can read historical JSONL logs under `<appDataDir>/brain/<conversation-id>/.system_generated/logs/transcript.jsonl`.
- **No Polling**: The platform notifies the parent reactively upon subagent completion. Never poll `manage_subagents` in a loop.
