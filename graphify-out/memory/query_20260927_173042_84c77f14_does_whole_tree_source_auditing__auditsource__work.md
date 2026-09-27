---
type: "query"
date: "2026-09-27T17:30:42.537585+00:00"
question: "Does whole-tree source auditing (auditSource) work with the judge?"
contributor: "graphify"
outcome: "corrected"
---

# Q: Does whole-tree source auditing (auditSource) work with the judge?

## Answer

No. At 12000-char windows the finding rate is 53-72 percent across all four repos: 352 findings over 573 windows (home 119/225, forge-hammer 145/220, LoW-Tool 56/78, original 32/50). 3 of 3 sampled high-p findings were false positives. Recipe A (diff-based ruleStates) remains the calibrated path; source mode detects a pattern's presence anywhere in a large window rather than a specific violation.

## Outcome

- Signal: corrected