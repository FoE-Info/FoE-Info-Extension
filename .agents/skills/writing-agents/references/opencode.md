# Authoring Subagents for opencode

opencode counterpart to the canonical `.agents/agents/<name>.md` persona. Each
of the 36 canonical specialists has a thin shim in `.opencode/agents/`.

## Shim Format

`.opencode/agents/<name>.md` (the file name becomes the agent name):

```markdown
---
name: <name>
description: <same one-line description as the canonical agent>
mode: subagent
---

You are the `<name>` specialist. Your canonical persona, scope, domain
knowledge, and quality checklist live in `.agents/agents/<name>.md`. Read that
file in full before acting, and treat it as the authoritative source.
```

- `name` must match the canonical file name and the shim file name.
- `mode` is `subagent` (also valid: `primary`, `all`).
- The markdown body becomes the agent's system prompt. Do not also set `prompt:`
  in frontmatter.
- Optional fields: `model`, `temperature`, `top_p`, `steps`, `hidden`, `color`,
  `permission`, `tools` (deprecated), `disable`.

## Dispatch

The primary agent invokes a shim through the `task` tool with
`subagent_type: <name>`. Users can also `@`-mention it. Antigravity's
`invoke_subagent`/`TypeName`/`Role`/`Prompt` maps to this call; see
[Harness Adapters](../../../references/harness-adapters.md).

## Capability Differences

Canonical agents declare only `name`/`description`/`subagent`. The shim adds
`mode: subagent`. To make a read-only specialist (explorer, reviewer, auditor)
enforce read-only in opencode, add `permission: { edit: deny, bash: ask }` to
its shim; the canonical file is left unchanged.

## Verification

`node --test tests/agents/agent-config.test.mjs` asserts 1:1 filename parity
between `.agents/agents/` and `.opencode/agents/`.
`tests/agents/harness-parity.test.mjs` asserts shim descriptions match canonical.
