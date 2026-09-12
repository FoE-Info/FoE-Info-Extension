# Authoring Rules for opencode

opencode counterpart to the Antigravity rule system. The rule text is shared;
activation differs.

## Activation Model

opencode does **not** read Antigravity's `trigger:` frontmatter
(`always_on`, `glob`, `model_decision`, `manual`). Instead the workspace injects
every rule unconditionally via the `opencode.json` `instructions` glob:

```json
{ "instructions": [".agents/rules/*.md", ".opencode/instructions/*.md"] }
```

The agent decides applicability per task. Keep `always_on` invariants short so
the always-loaded set stays inside the context budget; put long procedures in
skills or `references/` instead.

## Other Instruction Sources

- Project `AGENTS.md` in the repo root (and walk-up) is always injected.
- Global rules: `~/.config/opencode/AGENTS.md`; Claude fallback
  `~/.claude/CLAUDE.md` (disable with `OPENCODE_DISABLE_CLAUDE_CODE=1`).
- Remote instruction URLs are supported (5 s fetch timeout).

## Scoping

opencode has no per-glob rule activation. To scope guidance to a path, either
keep it in a skill the agent loads on demand, or state the scope explicitly in
the rule text and let the agent apply it. Per-agent overrides belong in
`.opencode/agents/<name>.md` `permission`, not in rules.

## Verification

Existing rules are validated by loading them through the `instructions` glob;
there is no separate rule-registration test. `tests/agents/harness-parity.test.mjs`
can assert the glob still resolves all 17 canonical rule files.
