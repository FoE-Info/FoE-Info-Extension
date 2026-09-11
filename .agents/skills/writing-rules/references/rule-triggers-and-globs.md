# Antigravity Rule Triggers & Glob Patterns

Authoritative guide to rule activation mechanisms based on `https://antigravity.google/docs/rules-workflows/`.

---

## 1. Supported Triggers

Rules defined in `.agents/rules/*.md` or plugins declare their activation behavior using YAML frontmatter:

```yaml
---
trigger: glob
glob: "src/js/calc/**"
description: Enforces BigNumber arithmetic precision in calculation engines.
---
```

### Activation Modes

| Trigger Mode | Behavior | Best Used For |
| :--- | :--- | :--- |
| **`always_on`** | Injected unconditionally into every model turn across the workspace. | Universal non-negotiable invariants: verification iron law, superpowers, small incremental slices, file caps. |
| **`glob`** | Injected only when viewing, creating, or modifying files matching the glob pattern. | Language- or domain-specific constraints: math precision in `calc/`, style rules in `*.scss`, test rules in `tests/**`. |
| **`model_decision`**| Injected when the model determines the rule description matches current user intent. | Process guidelines: release procedures, conventional commit formatting, refactoring guidelines. |
| **`manual`** | Injected only when explicitly referenced by the user or agent via `@rule-name`. | Rarely needed edge-case checklists or deep migration protocols. |

---

## 2. Glob Pattern Syntax

Antigravity uses standard glob matching:

- `src/js/calc/**`: Matches any file inside `src/js/calc/` and all subdirectories.
- `src/js/{calc,msg,state}/**/*.js`: Matches JavaScript files across specified directories.
- `*.scss`: Matches stylesheets anywhere in the workspace.
- `tests/**/*.test.mjs`: Matches Node test files.

---

## 3. Merging and Deduplication

- Antigravity automatically deduplicates rules by canonical file path.
- Even if a rule matches multiple glob conditions or is referenced via `@mention`, it is injected at most **once** per conversation turn.
