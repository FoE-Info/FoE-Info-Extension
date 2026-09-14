# foe-info-original-comparator — Worked Examples

On-demand examples for the `foe-info-original-comparator` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Original vs Modernized Architecture Comparison

**Inquiry:** "Compare the Great Building donation rendering pipeline between v1 original baseline and active FoE-Info."
**Reasoning Trace:**

1. Query v1 baseline graph `graphify-foe-info-original`:
   - `GreatBuildingsService.js` directly executed DOM mutations and rendered tables inline via `fCheckOutput`.
2. Query active host graph `graphify-foe-info`:
   - `GreatBuildingsService.js` publishes data to `GreatBuildingsState`, which is consumed reactively by `greatBuildingsRenderBinding.js` and `renderGbDonationPanel.js`.
3. Evaluate parity & improvement: Modularity improved; layering separation intact; no regression in calculated rewards.
4. Save report to `./graphify-out/foe-info-original/findings/2026-09-gb-donation-parity.md`.

---
