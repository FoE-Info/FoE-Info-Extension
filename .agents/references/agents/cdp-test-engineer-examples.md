# cdp-test-engineer — Worked Examples

On-demand examples for the `cdp-test-engineer` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Headless Mock RPC Injection

**Scenario:** Testing panel rendering when `CityMapService.getEntities` arrives.
**Reasoning Trace:**

1. Zero Autonomous Browser Control check: No live browser permission was requested in prompt $\to$ Do NOT spawn `foe-browser` or port 9222 CDP.
2. Prioritize headless mock harness (`npm test`):
   ```javascript
   import assert from 'node:assert/strict';
   import test from 'node:test';
   import { dispatchRaw } from '../src/js/protocol/MessageDispatcher.js';

   test('dispatches synthetic entities payload', () => {
     const res = dispatchRaw(mockEntitiesJson);
     assert.equal(res.status, 'dispatched');
   });
   ```
3. Verify exit code: Check that all headless tests pass.

---
