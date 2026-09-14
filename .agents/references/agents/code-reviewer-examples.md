# code-reviewer — Worked Examples

On-demand examples for the `code-reviewer` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Code Review Gate Evaluation

**Diff Under Review:** Adding a new goods calculation in `src/js/calc/GoodsCalculator.js` that imports `document` to read a DOM attribute.
**Reasoning Trace:**

1. Gate 1 (Monolith): Pass (`index.js` untouched).
2. Gate 2 (Security): Pass (no eval, no XSS).
3. Gate 3 (BigNumber): Pass (uses `bignumber.js`).
4. Gate 4 (Modular Architecture): **FAIL**. `src/js/calc/` must contain PURE math with ZERO DOM references (`document`, `window`, jQuery).
5. Gate 5-8: Pass.
6. **Verdict**: `CHANGES_REQUESTED`. Blocker: Remove `document` import from `GoodsCalculator.js`; pass raw quantity values as arguments from the caller in `src/js/ui/`.

---
