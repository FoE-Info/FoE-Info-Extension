# low-tool-comparator — Worked Examples

On-demand examples for the `low-tool-comparator` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Security & Fork Exclusion Comparative Audit

**Inquiry:** "Compare the private `src/extras/` overlay of LoW-Tool with FoE-Info's architecture."
**Reasoning Trace:**

1. Consult LoW-Tool fork exclusion record (`docs/specs/2026-09-12-low-tool-fork-exclusion-record.md`).
2. Identify security liabilities in LoW-Tool: hardcoded Discord webhooks, embedded Google Apps Script key, per-world player ID allowlists.
3. Compare against FoE-Info security invariants (Rule 12): FoE-Info strictly sanitizes user storage, avoids embedded credentials, and rejects closed-source overlays.
4. Persist findings to `./graphify-out/low-tool/findings/2026-09-security-overlay-comparison.md`.

---
