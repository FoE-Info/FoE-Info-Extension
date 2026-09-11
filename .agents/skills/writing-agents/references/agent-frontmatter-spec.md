# Antigravity Subagent Frontmatter Specification

Based on official Antigravity documentation at `https://antigravity.google/docs/subagents/`.

---

## 1. Supported YAML Frontmatter Fields

```yaml
---
name: my-specialist-agent
description: Concise explanation of specialist capabilities and triggering context.
subagent: true
mainAgent: false
model: inherit
commandExecutionPolicy: sandbox
tools:
  - view_file
  - replace_file_content
  - write_to_file
  - grep_search
  - run_command
skills:
  - refactor-index-slice
---
```

### Field Definitions

| Field | Type | Default | Description |
| :--- | :--- | :---: | :--- |
| `name` | `string` | (Required) | Unique identifier for the custom agent. Must match filename (`<name>.md`). |
| `description` | `string` | (Required) | Explains capabilities and triggers. Must be $\le 150$ characters in FoE-Info. |
| `subagent` | `boolean` | `true` | Must be `true` to allow invocation via `invoke_subagent`. |
| `mainAgent` | `boolean` | `true` | Set to `false` if this is exclusively a background specialist. |
| `model` | `string` | `inherit` | Model tier: `inherit` (default), `flash` (fast/light scanning), or `pro` (complex reasoning). |
| `commandExecutionPolicy`| `string` | `sandbox` | Execution policy: `sandbox`, `auto`, `eager`, or `off`. |
| `tools` | `string[]` | `[]` | Explicit allowed tools list. If omitted or empty, inherits all parent tools. |
| `skills` | `string[]` | `[]` | Pre-mounted skill paths available to this subagent. |
| `mcpServers` | `object[]`| `[]` | Custom MCP server configurations scoped to this subagent. |
