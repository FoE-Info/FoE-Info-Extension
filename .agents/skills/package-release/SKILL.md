---
name: package-release
description: "Manifest version sync and production WebStore zip packaging."
---

# Workflow: Package WebStore Release

Follow this skill to validate code quality and produce a production-ready extension package.

## Steps

1. **Pre-flight Code Hygiene**:
   Run the full verification gate and separate typecheck:
   ```bash
   npm run verify
   npm run typecheck
   ```
   `verify` includes ESLint; lint-staged is an additional commit-time check.

2. **Sync Version Number**:
   Ensure version matches in both manifests:
   * `package.json`
   * `src/chrome/manifest.json`

3. **Build Production Assets & WebStore Zip**:
   Compile optimized production bundles:
   ```bash
   npm run build
   ```
   Outputs:
   - Unpacked directory: `build/FoE-Info-Prod/`
   - Packaged distribution zip: `build/FoE-Info_WEBSTORE_<version>_<YYYY-MM-DD>.zip` (created by `scripts/package-extension.js`).

4. **Automated Release Pipeline (`npm run release`)**:
   For official releases, use the automated release runner [`scripts/release.mjs`](../../../scripts/release.mjs):
   ```bash
   npm run release
   ```
   This orchestrates:
   - Verification of version parity between `package.json` and `manifest.json`.
   - Full 5-stage verification gate (`npm run verify`).
   - Production bundle compilation & WebStore zip creation (`npm run build`).
   - Verification of the generated `build/FoE-Info_WEBSTORE_<version>_<date>.zip` artifact.
   - Git annotated tag creation (`v<version>`) and tag push to `origin`.
   - GitHub Release creation via `gh release create` attaching the zip artifact and release notes from `CHANGELOG.md`.

5. **Verify Distribution Bundle**:
   Confirm that `build/FoE-Info-Prod/manifest.json` exists, that all required icons and bundles are present, and that the zip file is ready for Chrome Web Store Developer Dashboard upload.
