# forge-hammer-comparator — Worked Examples

On-demand examples for the `forge-hammer-comparator` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Safe-Spot Selection Comparative Audit

**Inquiry:** "Compare safe-spot selection predicate between FoE-Info and Forge-Hammer."
**Reasoning Trace:**

1. In Forge-Hammer: Inspect GB locking predicate: uses `occupant < remaining` to determine if a place is passable.
2. In FoE-Info: Previously checked `spotLock <= remaining` (which failed on locked boundary `occupant == remaining`). Modern FoE-Info uses pure `isPlacePassable(remaining, occupant)` achieving parity.
3. Compare BigNumber precision: Both use hybrid rounding (half-up for rewards, ceiling for locks).
4. Persist findings to `./graphify-out/forge-hammer/findings/2026-09-safe-spot-parity.md`.

---
