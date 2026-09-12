---
name: writing-rules
description: "Author and optimize workspace rules in .agents/rules/."
---

# Writing Rules

Runbook for creating, structuring, and scoping workspace rules in `.agents/rules/` and `AGENTS.md`. The trigger frontmatter below is Antigravity-specific; the opencode activation model (instructions glob, no triggers) is in [opencode authoring](references/opencode.md) and [Harness Adapters](../../references/harness-adapters.md).

---

## 1. When to Use

- Adding a new workspace rule or constraint in `.agents/rules/<name>.md`.
- Optimizing rule triggers (`always_on` vs `glob` vs `model_decision`) to save context.
- Updating consolidated project guidelines in `AGENTS.md` or `GEMINI.md`.

---

## 2. Rule Types & Location

Antigravity discovers rules hierarchically:
- **Project Root**: `AGENTS.md` (or `GEMINI.md`) at repository root.
- **Workspace Rules**: `.agents/rules/<name>.md`.
- **Global Rules**: `~/.gemini/GEMINI.md`.

Every `.agents/rules/<name>.md` file must define frontmatter:

```yaml
---
trigger: always_on    # or glob, model_decision, manual
description: Concise statement of constraints and scope.
---
```

For trigger modes and glob matching, see [Rule Triggers & Glob Patterns](references/rule-triggers-and-globs.md).

---

## 3. Step-by-Step Creation Workflow

### Step 1: Select the Right Trigger
- **`always_on`**: Universal invariants only (verification before completion, small changes, file length limits).
- **`glob`**: Scoped to specific file paths (e.g., `glob: "src/js/calc/**"` for BigNumber math).
- **`model_decision`**: Process conventions that only apply on specific workflows (e.g. commits, release).

### Step 2: Write Invariant-Driven Constraints
1. State the non-negotiable invariant clearly.
2. Provide concise **GOOD** vs **BAD** code examples.
3. Keep individual rule files well under the 12,000 character limit.
See [Context Budgeting Guide](references/context-budgeting.md).

### Step 3: Use Boilerplate Templates
Review [Rule Templates](references/rule-templates.md) for pre-built scaffolding of architecture, math precision, and coding rules.

### Step 4: Verify Rule Registration
Run the configuration test suite to ensure valid frontmatter and byte budget thresholds:
```sh
node --test tests/agents/agent-config.test.mjs
```
