---
name: writing-agents
description: "Design and verify custom subagents in .agents/agents/."
---

# Writing Antigravity Subagents

Runbook for creating, configuring, and testing specialized subagents in `.agents/agents/` (or `~/.gemini/config/agents/`).

---

## 1. When to Use

- Adding a new domain specialist to `.agents/agents/<name>.md`.
- Configuring execution models (`inherit`, `flash`, `pro`) or tool allowlists for existing subagents.
- Structuring subagent system prompts and multi-agent delegation contracts.

---

## 2. Directory Layout & Requirements

Custom subagents are defined as Markdown files with YAML frontmatter:

- **Workspace Path**: `.agents/agents/<name>.md`
- **Global Path**: `~/.gemini/config/agents/<name>.md`

```yaml
---
name: your-specialist-name
description: Role and triggering description (max 150 chars).
subagent: true
mainAgent: false
model: inherit
commandExecutionPolicy: sandbox
---
```

For the complete schema, see [Subagent Frontmatter Specification](references/agent-frontmatter-spec.md).

---

## 3. Step-by-Step Creation Workflow

### Step 1: Define Role and Frontmatter
1. Create `.agents/agents/<name>.md`.
2. Set `name` exactly matching the filename without `.md`.
3. Set `description` $\le 150$ characters stating what domain the agent owns and when to delegate to it.
4. Set `subagent: true`.

### Step 2: Write Focused System Prompt
Follow the standard specialist structure:
- **Title & Identity**: Who the specialist is.
- **Focus Areas**: Core competencies, domain RPCs, calculations.
- **Invariants & Rules**: Architectural rules to obey (e.g. $\le 250$ line limits, BigNumber math).
- **Quality Checklist**: Pre-flight verification standard before returning results.

See [System Prompt Templates](references/system-prompt-templates.md) for boilerplate.

### Step 3: Configure Lifecycles & Workspace Modes
- Use `Workspace: "share"` when dispatching subagents for parallel feature tasks to isolate worktrees under `.worktrees/`.
- See [Subagent Lifecycles & Coordination](references/subagent-lifecycles.md).

### Step 4: Validate Subagent Configuration
Run the automated configuration test to verify naming, frontmatter, and character limits:
```sh
node --test tests/agents/agent-config.test.mjs
```
