---
trigger: model_decision
description: Forbid auto version bumps or git tags during routine verification.
---

# AGENT RELEASE & VERIFICATION POLICY

- Routine task verification MUST run `npm run verify` ONLY.
- NEVER execute `npm version`, `git tag`, or release packaging during routine task iterations.
- Version bumps and WebStore ZIP generation are strictly opt-in and triggered ONLY by explicit user command: "Release version X.Y.Z".
