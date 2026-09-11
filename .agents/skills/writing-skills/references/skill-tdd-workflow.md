# Skill Verification & TDD Workflow

Adapting Test-Driven Development (TDD) to authoring, testing, and refining skills.

---

## 1. Core Concept: Red-Green-Refactor for Processes

| TDD Phase | Documentation Counterpart |
| :--- | :--- |
| **Test Case** | Baseline prompt given to an agent without the skill active. |
| **RED (Failure)** | Agent makes common assumptions, introduces bugs, or violates repo invariants. |
| **GREEN (Pass)** | Agent follows the newly authored skill and executes the procedure cleanly. |
| **REFACTOR** | Identify remaining edge cases, trim unnecessary text, move details to `references/`. |

---

## 2. The Verification Protocol

1. **Establish Baseline**: Note the mistakes an agent makes when asked to perform the task without explicit instructions.
2. **Draft Minimal Skill**: Write concise guidance in `SKILL.md` that addresses the specific failure modes.
3. **Test with Subagent**: Invoke an isolated subagent with the task and verify it follows the new skill.
4. **Trim to Progressive Disclosure**: Check line count. If `SKILL.md` exceeds 100 lines, extract references, templates, and deep tables into `references/`.
5. **Add Automated Gate**: If the skill involves structural invariants, add test assertions to `tests/agents/agent-config.test.mjs`.
