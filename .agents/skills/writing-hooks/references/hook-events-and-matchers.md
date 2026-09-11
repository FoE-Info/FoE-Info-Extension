# Antigravity Lifecycle Hook Events & Matchers

Based on `https://antigravity.google/docs/hooks/` and `agy-customizations`.

---

## 1. Supported Lifecycle Events

Hooks are declared in `.agents/hooks.json` (or plugin roots):

| Event | When It Fires | Target | Structure |
| :--- | :--- | :--- | :--- |
| **`PreToolUse`** | Before a tool step executes. | Tool name (e.g. `run_command`). | Grouped with `matcher` & `hooks`. |
| **`PostToolUse`** | After a tool step completes. | Tool name (e.g. `replace_file_content`). | Grouped with `matcher` & `hooks`. |
| **`PreInvocation`** | Before model is called. | N/A | Flat list of handler objects. |
| **`PostInvocation`**| After tool calls finish. | N/A | Flat list of handler objects. |
| **`Stop`** | When agent execution loop finishes. | N/A | Flat list of handler objects. |

---

## 2. Matcher Syntax

For `PreToolUse` and `PostToolUse`, group handlers using regex matchers:
- `"matcher": "*"`: Matches all tools.
- `"matcher": "run_command"`: Matches exact tool.
- `"matcher": "replace_file_content|write_to_file"`: Matches file modification tools.
- `"matcher": "browser_.*"`: Matches any tool starting with `browser_`.
