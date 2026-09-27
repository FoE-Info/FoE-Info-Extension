---
type: "query"
date: "2026-09-27T17:37:23.205024+00:00"
question: "Does the judge rule bank match the current .agents/rules/?"
contributor: "graphify"
outcome: "corrected"
correction: "Audit the rule bank against .agents/rules/ before trusting any finding, and after changing any rule file. 5 of 8 were unrepresented. Every rule now records its src and declares repos; release-policy, browser-environment-hygiene and workspace-structure stay out because they constrain agent conduct, not diffs."
---

# Q: Does the judge rule bank match the current .agents/rules/?

## Answer

No. 5 of 8 rule files had no representation (modern-web-conventions, debuggability-by-design, release-policy, browser-environment-hygiene, workspace-structure) and dynamic-runtime-metadata was covered only by its static-tables half. Reconciled to 16 rules: 14 judged + 2 deterministic (metadataBoundary, preseededJson), each recording the file it was transcribed from in src.

## Outcome

- Signal: corrected
- Correction: Audit the rule bank against .agents/rules/ before trusting any finding, and after changing any rule file. 5 of 8 were unrepresented. Every rule now records its src and declares repos; release-policy, browser-environment-hygiene and workspace-structure stay out because they constrain agent conduct, not diffs.