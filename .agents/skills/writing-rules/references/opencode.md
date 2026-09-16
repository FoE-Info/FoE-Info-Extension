# Authoring Rules for opencode

opencode counterpart to the Antigravity rule system. The rule text is shared;
activation differs.

## Activation Model

opencode does **not** read Antigravity's `trigger:` frontmatter
(`always_on`, `glob`, `model_decision`, `manual`). The workspace must therefore
list only `always_on` rules explicitly in `opencode.json`:

```json
{ "instructions": [".agents/rules/<always-on-rule>.md", ".opencode/instructions/*.md"] }
```

The agent loads `model_decision` rules from `.agents/rules/` only when their
declared scope matches the task. Keep `always_on` invariants short so the
always-loaded set stays inside the context budget; put long procedures in skills
or `references/` instead.

## Other Instruction Sources

- Project `AGENTS.md` in the repo root (and walk-up) is always injected.
- Global rules: `~/.config/opencode/AGENTS.md`.
- Remote instruction URLs are supported (5 s fetch timeout).

## Scoping

opencode has no frontmatter-driven rule activation. To scope guidance, state the
scope explicitly in a `model_decision` rule and require the agent to read it on
demand, or keep the procedure in a skill. Per-agent overrides belong in
`.opencode/agents/<name>.md` `permission`, not in rules.

## Verification

`tests/agents/harness-parity.test.mjs` and `tests/agents/taxonomy.test.mjs`
compare OpenCode's instruction list with the canonical `always_on` frontmatter
set. A wildcard or a missing always-on rule fails the harness tests.
