---
description: Run the standard lint/build verification sequence before calling a change done
---

Run, in order, and report any failures without trying to silently work around them:

1. `npx --yes prettier@3.9.6 --check .` — formatting is the only automated check in this repo, there is no linter or test runner.
2. `npm run build:dev` — incremental development build.
3. `npm run build` — production Web Store build.

Only report the change complete once all three pass.
