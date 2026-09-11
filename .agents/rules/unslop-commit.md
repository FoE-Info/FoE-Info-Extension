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
* **Merge Commits**: When creating manual merge commits (`git merge --no-ff ... -m "..."`), the message is strictly validated by Husky's `commit-msg` hook.
  - Pattern: `chore(merge): merge <branch>` (keep under 72 chars, aim $\le 50$, e.g. `chore(merge): merge feat/opencode-monolith-decomp`).
  - Do not add verbose commentary to the subject line that pushes length over 72 characters.
* **Body**: Required for all non-trivial commits (`feat`, `refactor`, multi-file `fix` or `docs`). Optional only for genuinely trivial 1-line tweaks (e.g. single typo fix).
  - **Format**: 2 to 4 concise bullet points (`- <action or rationale>`) explaining what was changed and why.
  - **Strict Line Length**: Every line in the body (including bullet points) must be $\le 72$ characters (aim $\le 65$ chars). Husky's `commit-msg` hook will reject the commit if any line exceeds 72 characters.
  - **Multi-Flag CLI Usage**: In bash scripts and agent commands, supply structured bodies cleanly via multiple `-m` flags:
    `git commit -m "<type>(<scope>): <summary>" -m "- first change detail" -m "- second change detail"`

---

## 2. Prohibition of AI & Marketing Slop

Never include:
* Marketing verbs and fluff: `comprehensive`, `robust`, `seamless`, `enhance`, `leverage`, `holistic`.
* Template phrases: `This commit...`, `This change...`, `We are...`, `I have...`.
* Filler adverbs: `just`, `really`, `basically`, `simply`, `actually`.
* Restating filenames already identified by scope.
* AI co-authorship or attribution templates unless explicitly requested.
