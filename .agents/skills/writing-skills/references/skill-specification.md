# Antigravity Skill Specification

Authoritative specification for Antigravity skills based on `https://antigravity.google/docs/skills/` and `agy-customizations`.

---

## 1. Directory Structure

A skill must be a standalone directory placed inside a customization root:
- Workspace: `.agents/skills/<skill-name>/`
- Global: `~/.gemini/config/skills/<skill-name>/`
- Plugin: `plugins/<plugin-name>/skills/<skill-name>/`

```text
.agents/skills/<skill-name>/
├── SKILL.md          # Required: Main instructions and entry point
├── references/       # Optional: Bulky reference manuals, API specs, matrices
├── scripts/          # Optional: Helper scripts and executable command wrappers
├── examples/         # Optional: Code patterns and reference implementations
└── resources/        # Optional: Data fixtures, templates, checklists
```

---

## 2. YAML Frontmatter Specification

Every skill must begin with a YAML frontmatter block:

```yaml
---
name: my-specialized-skill
description: Clear description of what the skill does and when to use it.
---
```

### Frontmatter Fields

| Field | Type | Required | Rules & Invariants |
| :--- | :--- | :---: | :--- |
| `name` | `string` | Yes | Unique identifier. Lowercase letters, digits, and hyphens only. Must match directory name. |
| `description` | `string` | Yes | Written in third-person. States **what** the skill does AND **when** to activate it. Under 120 characters in FoE-Info to conserve discovery context. |

---

## 3. Discovery & Activation Lifecycle

Skills use a **3-stage progressive disclosure loop**:

1. **Discovery (Turn 0)**:
   - Only `name` and `description` are exposed to the model in the available skills list.
   - Zero tokens spent on skill body content.
2. **Activation (On-Demand)**:
   - When user prompts match the description or the user/agent activates the skill, the agent calls `view_file` on `SKILL.md`.
3. **Execution**:
   - The agent executes the instructions in `SKILL.md`.
   - If deep reference details are needed, the agent selectively calls `view_file` on files in `references/`.
