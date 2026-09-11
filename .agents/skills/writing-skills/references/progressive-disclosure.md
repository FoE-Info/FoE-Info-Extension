# Progressive Disclosure & Context Budgeting in Skills

How to write skills that scale without exhausting the agent's context window.

---

## 1. The Context Problem

When a skill is activated, its entire `SKILL.md` is loaded into the conversation history. In a multi-turn task (10–20 turns), every token in `SKILL.md` is re-processed on every subsequent turn.

- **Monolithic `SKILL.md` (500+ lines)**: Burns 3,000–5,000 tokens on every single turn, leaving less context for source code, diffs, and test output.
- **Progressively Disclosed Skill (50–100 lines)**: Ingests only high-level workflow steps and decision trees. Deep references live in `references/` and are read only when needed.

---

## 2. Directory Separation Rules

| Content Type | Where It Belongs | Why |
| :--- | :--- | :--- |
| **Trigger conditions & scope** | `SKILL.md` (Top) | Agent immediately knows whether the skill applies. |
| **Step-by-step workflow** | `SKILL.md` (Body) | Provides clear sequencing and decision logic. |
| **Verification checklist** | `SKILL.md` (Bottom)| Ensures quality before task completion. |
| **API cheatsheets / Syntax tables** | `references/*.md` | Loaded on-demand only if specific syntax is queried. |
| **Comprehensive edge cases** | `references/*.md` | Prevents bloating normal execution path. |
| **Templates & Boilers** | `references/*.md` or `resources/` | Read only during initial scaffolding. |
| **Executable automation** | `scripts/*.sh` or `*.mjs` | Black-box execution via terminal; 0 context consumed. |

---

## 3. Black-Box Helper Scripts

If a skill requires complex command sequences:
1. Encapsulate the logic in an executable script in `scripts/` (e.g. `scripts/scaffold.sh`).
2. Instruct the agent to run the script with `--help` or execute it directly rather than reading its full source code.
3. This keeps the agent's focus on the user's task rather than internal script mechanics.
