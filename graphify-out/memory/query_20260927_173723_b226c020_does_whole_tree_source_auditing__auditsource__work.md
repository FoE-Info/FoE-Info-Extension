---
type: "query"
date: "2026-09-27T17:37:23.305320+00:00"
question: "Does whole-tree source auditing (auditSource) work with the judge?"
contributor: "graphify"
outcome: "corrected"
correction: "Use Recipe A (diff-based ruleStates) for rule audits, not auditSource. Whole-source passes run 53-72 percent finding rate with ~11 percent precision, and confidence is inverted rather than merely uninformative - the top finding is often a window holding only a file header and imports. Independently reproduces the 2026-09-26 verdict. Call D.brief() before running an audit, not after."
---

# Q: Does whole-tree source auditing (auditSource) work with the judge?

## Answer

No. At 12000-char windows the finding rate is 53-72 percent across all four repos: 352 findings over 573 windows (home 119/225, forge-hammer 145/220, LoW-Tool 56/78, original 32/50). 3 of 3 sampled high-p findings were false positives. Recipe A (diff-based ruleStates) remains the calibrated path; source mode detects a pattern's presence anywhere in a large window rather than a specific violation.

## Outcome

- Signal: corrected
- Correction: Use Recipe A (diff-based ruleStates) for rule audits, not auditSource. Whole-source passes run 53-72 percent finding rate with ~11 percent precision, and confidence is inverted rather than merely uninformative - the top finding is often a window holding only a file header and imports. Independently reproduces the 2026-09-26 verdict. Call D.brief() before running an audit, not after.