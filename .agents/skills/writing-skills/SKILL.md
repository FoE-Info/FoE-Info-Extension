---
name: writing-skills
description: "Author and test Antigravity skills with progressive disclosure."
---

# Writing Antigravity Skills

Guide for authoring, structuring, and verifying high-performance Antigravity skills using progressive disclosure and reference subdirectories.

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
└── examples/         # Optional: Code patterns and reference implementations
```

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
