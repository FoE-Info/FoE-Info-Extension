---
type: "query"
date: "2026-09-27T17:54:40.953103+00:00"
question: "Why is whole-source auditing untrustworthy, and what fixes it?"
contributor: "graphify"
outcome: "corrected"
correction: "Use auditCandidates, never auditSource, for a whole repository. Threshold tuning cannot fix this - TODO section 11 already ruled that out and was right about the cause. Calibrate recall against the code, not the rule text: i18nBinding now demands prose and skips material-icons ligatures, nativeFloats blanks string literals. Widening i18n recall to a 3-line window was measured and reverted (57 candidates to 296). Route each rule only to its own candidates: judgeAll is a full cross product and asking all rules at once produced 87 calcPurity findings for a rule with zero candidates."
---

# Q: Why is whole-source auditing untrustworthy, and what fixes it?

## Answer

auditSource() hands the judge a WINDOW, so it can only answer whether a pattern appears somewhere in it. Same judge and same 12000-char window gave noEval 18 findings at 0 percent precision (no window contained eval or new Function) beside debugLogging 8 findings at 100 percent. The difference is recall isolation, not the judge. The candidate tier gives each rule a line-level recall test so the judge decides one line: 3375 questions dropped to 145, and 59 of 62 findings verified against source, 95 percent against the 11 percent of the 2026-09-26 pass.

## Outcome

- Signal: corrected
- Correction: Use auditCandidates, never auditSource, for a whole repository. Threshold tuning cannot fix this - TODO section 11 already ruled that out and was right about the cause. Calibrate recall against the code, not the rule text: i18nBinding now demands prose and skips material-icons ligatures, nativeFloats blanks string literals. Widening i18n recall to a 3-line window was measured and reverted (57 candidates to 296). Route each rule only to its own candidates: judgeAll is a full cross product and asking all rules at once produced 87 calcPurity findings for a rule with zero candidates.