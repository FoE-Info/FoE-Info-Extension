---
trigger: model_decision
description: Mandate Conventional Commits following the unslop-commit standard with concise subjects (<=72 chars, aim <=50).
---

# Rule: Unslop Conventional Commits

All Git commits in this workspace must adhere strictly to the `/unslop-commit` standard.

---

## 1. Commit Message Structure

* **Subject Line**: `<type>(<scope>): <imperative summary>`
  - Permitted types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `build`, `ci`, `revert`.
  - Imperative mood only: `add`, `fix`, `update`, `remove` (never `added`, `fixing`, `fixes`).
  - Length: Aim for $\le 50$ characters; hard maximum of 72 characters.
  - No trailing period. Lowercase after colon.
* **Body**: Only include when necessary for non-obvious "why", breaking changes, security context, or data migrations. Wrap at 72 characters.

---

## 2. Prohibition of AI & Marketing Slop

Never include:
* Marketing verbs and fluff: `comprehensive`, `robust`, `seamless`, `enhance`, `leverage`, `holistic`.
* Template phrases: `This commit...`, `This change...`, `We are...`, `I have...`.
* Filler adverbs: `just`, `really`, `basically`, `simply`, `actually`.
* Restating filenames already identified by scope.
* AI co-authorship or attribution templates unless explicitly requested.
