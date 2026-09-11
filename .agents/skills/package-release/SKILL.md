---
name: package-release
description: Pre-flight checks, manifest version sync, and production WebStore zip packaging.
---

# Workflow: Package WebStore Release

Follow this skill to validate code quality and produce a production-ready extension package.

## Steps

1. **Pre-flight Code Hygiene**:
   Run format, test suite, and translation parity verification:
   ```bash
   npm run check
   npm test
   npm run i18n:check
   ```
   *(Note: Full repository `npm run lint` is reserved for refactoring passes; staged changes are checked via lint-staged)*

2. **Sync Version Number**:
   Ensure version matches in both manifests:
   * `package.json`
   * `src/chrome/manifest.json`

3. **Build Production Assets**:
   Compile optimized bundles:
   ```bash
   npm run build
   ```
   Outputs will be generated in `build/FoE-Info_WEBSTORE/`.

4. **Verify Distribution Bundle**:
   Verify that `build/FoE-Info_WEBSTORE/manifest.json` exists and that all required icons and bundles are present.
