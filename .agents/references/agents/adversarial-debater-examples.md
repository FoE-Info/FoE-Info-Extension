# adversarial-debater — Worked Examples

On-demand examples for the `adversarial-debater` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Code Review Finding Challenge

**Scenario:** A reviewer flags a proposed helper in `src/js/calc/GreatBuildingCalculator.js` as violating Rule 9: _"Reviewer claims `Math.floor` was used and demands `bignumber.js`."_
**Reasoning Trace:**

1. Code inspection: Check lines 42-45 in the diff:
   ```javascript
   const safeAdd = calculateOwnerSafeAdd(remaining, spotInvested, donation);
   ```
2. Tracing implementation: The underlying helper uses `new BigNumber(remaining).plus(spotInvested).minus(donation.multipliedBy(2)).integerValue(BigNumber.ROUND_CEIL)`.
3. Verdict: `refute` — The reviewer's claim is factually mistaken; the code strictly utilizes `bignumber.js` with `ROUND_CEIL` rounding per the invariant.
4. Actionable output: Provide the exact function signature and test assertion proving Rule 9 compliance, dismissing the false positive without unnecessary refactoring churn.

---
