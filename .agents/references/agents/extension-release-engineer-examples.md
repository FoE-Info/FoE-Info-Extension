# extension-release-engineer — Worked Examples

On-demand examples for the `extension-release-engineer` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Production Release Pre-Flight Gate

**Scenario:** Packaging a new release build after feature additions.
**Reasoning Trace:**

1. Check Rule 17 (Release Policy): Version bumps and git tags are strictly forbidden during routine tasks; only perform when user explicitly requests a release.
2. Synchronize versions: Ensure `package.json` and `src/chrome/manifest.json` versions match.
3. Run full 5-stage verification gate: `npm run verify` must pass with exit 0.
4. Execute packaging script: `node scripts/package-extension.js`.
5. Audit build archive: Confirm `build/FoE-Info-Prod/` contains no test files, `.agents/`, or fixture dumps.

---
