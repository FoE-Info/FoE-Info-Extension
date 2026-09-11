---
name: writing-hooks
description: "Author and configure Antigravity hooks in hooks.json."
---

# Writing Antigravity Lifecycle Hooks

Runbook for authoring, configuring, and verifying lifecycle hooks in `.agents/hooks.json` (or `plugins/<name>/hooks.json`).

---

## 1. When to Use

- Adding safety gates to intercept destructive terminal commands (`PreToolUse`).
- Injecting ephemeral instructions or guardrails before model execution (`PreInvocation`).
- Triggering background tasks like knowledge graph AST synchronization (`PostToolUse`).
- Preventing premature agent exit while background tasks are active (`Stop`).

---

## 2. Configuration Structure (`hooks.json`)

Hooks are configured in a single JSON map:

```json
{
  "my-hook-name": {
    "PreToolUse": [
      {
        "matcher": "run_command",
        "hooks": [
          {
            "type": "command",
            "command": "node ./scripts/safety-gate.mjs",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

See [Hook Events & Matchers](references/hook-events-and-matchers.md) and [Input/Output Contracts](references/input-output-contracts.md).

---

## 3. Step-by-Step Creation Workflow

### Step 1: Declare Event and Matcher in `hooks.json`
- Choose target event: `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, or `Stop`.
- Define matcher regex for tool events (e.g. `run_command` or `replace_file_content|write_to_file`).
- Set execution command and timeout (default: 30s; recommend $\le 5$s).

### Step 2: Implement Handler Script
1. Read stdin JSON payload completely on `end` event.
2. Note that all payload keys are **camelCase** protojson.
3. Write JSON response to stdout.
See [Hook Safety Recipes](references/hook-safety-recipes.md) for tested implementations.

### Step 3: Test Hook with Unit Tests
Create or update tests in `tests/agents/hooks.test.mjs` verifying:
1. Valid stdin/stdout JSON protocol adherence.
2. Correct handling of edge cases and timeouts.
3. Execution via child process:
   ```sh
   node --test tests/agents/hooks.test.mjs
   ```
