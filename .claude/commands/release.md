---
description: Build the Chrome Web Store release package and verify the output
---

Standard workflow for creating a release bundle for Chrome Web Store submission:

1. Verify a clean workspace: `npx --yes prettier@3.9.6 --check .` must pass without errors.
2. Generate the release package: `npm run build`.
3. Verify the output:
   - Production distribution files compiled into `build/FoE-Info_WEBSTORE/`.
   - Release ZIP generated as `build/FoE-Info_WEBSTORE_<version>_<YYYY-MM-DD>.zip`.

Do not push or publish anything — stop after verifying the local build output and report what was produced.
