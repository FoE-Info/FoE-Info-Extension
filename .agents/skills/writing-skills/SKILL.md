---
name: writing-skills
description: 'Author and test skills with progressive disclosure, both harnesses.'
---

# Writing Skills

Guide for authoring, structuring, and verifying high-performance skills using progressive disclosure and reference subdirectories. The body is harness-neutral; host-specific paths, frontmatter limits, and tool mappings live in [Harness Adapters](../../references/harness-adapters.md) and [opencode authoring](references/opencode.md).

---

## 1. When to Use

- Creating a new skill in `.agents/skills/<name>/` or `~/.gemini/config/skills/<name>/`.
- Refactoring an oversized `SKILL.md` to offload heavy documentation into `references/`.
- Validating skill YAML frontmatter, naming, and automated test coverage.

---

## 2. Directory Layout & Architecture

Every skill resides in a standalone directory:

```text
.agents/skills/<skill-name>/
├── SKILL.md          # Primary instructions (be concise, use references/ for bulk)
├── references/       # Heavy documentation, API tables, checklists (*.md)
├── scripts/          # Optional: Shell/Node automation run as black boxes
├── memory/           # Optional: worklog.jsonl + lessons.md (see step 5)
└── examples/         # Optional: Code patterns and reference implementations
```

Keep `.agents/skills/` at one entry per distinct domain. `writing-skills`,
`writing-agents`, `writing-rules`, `writing-hooks`, and `writing-plans` are
separate skills on purpose — different artifacts, different verification. Merge
skills only when the trigger conditions genuinely coincide.

For complete structural requirements, see [Antigravity Skill Specification](references/skill-specification.md).

---

## 3. Step-by-Step Authoring Workflow

### Step 1: Create Directory and YAML Frontmatter

Create `.agents/skills/<skill-name>/SKILL.md`:

```yaml
---
name: your-skill-name
description: Clear description of what the skill does and when to use it (max 120 chars).
---
```

- **`name`**: Lowercase, hyphen-delimited, matching directory name.
- **`description`**: Written in third-person stating both purpose and trigger conditions. Must be $\le 120$ characters in FoE-Info.

### Step 2: Write Focused Instructions in `SKILL.md`

Keep `SKILL.md` focused and actionable. Use `references/` for lengthy cheat sheets, API tables, and multi-page examples — not for core workflow steps:

1. **Overview**: Purpose and high-level goal.
2. **When to Use**: Specific triggering scenarios and prerequisite skills.
3. **Core Steps**: Actionable checklist and decision trees.
4. **Verification**: How the agent proves the task was completed successfully.

### Step 3: Offload Heavy Documentation to `references/`

Never inline multi-page API tables, syntax cheatsheets, or extensive examples into `SKILL.md`. Move them to `references/<topic>.md` and link to them using relative markdown paths.
See [Progressive Disclosure Guide](references/progressive-disclosure.md).

### Step 4: Verify with TDD & Automated Tests

1. Test your skill against common failure scenarios. See [Skill TDD Workflow](references/skill-tdd-workflow.md).
2. Run configuration tests to verify frontmatter and budget thresholds:
   ```sh
   node --test tests/agents/agent-config.test.mjs
   ```

### Step 5: Record Usage in the Skill Work Log

A skill that only accumulates notes never changes behaviour. Record each real
run and fold the lesson back into this file:

```sh
node .agents/scripts/skill-memory.mjs log \
  --skill <name> --outcome fail --lesson '<imperative rule + why>'
```

`--outcome` is `pass`, `fail`, or `partial`, and every `--signal` is a command
that can actually fail. Patch the workflow above with the lesson in the same
change — the worklog is the audit trail, `SKILL.md` is what the next run reads.
See [Skill Work Log & Memory](references/skill-memory.md) for the full loop.
