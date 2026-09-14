# performance-memory-profiler — Worked Examples

On-demand examples for the `performance-memory-profiler` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Teardown Lifecycle & Buffer Bounding

**Scenario:** Subscribing to window resize events and caching recent RPC metrics without memory leakage.
**Reasoning Trace:**

1. Avoid bare `window.addEventListener('resize', handler)` without cleanup; pass `{ signal }` from an `AbortController`.
2. Bound metric arrays: If array exceeds 100 items, slice or shift to prevent unbounded heap expansion.
3. Code template:
   ```javascript
   export function setupMetricsCollector(abortSignal) {
     const buffer = [];
     window.addEventListener(
       'resize',
       () => {
         buffer.push(Date.now());
         if (buffer.length > 100) buffer.shift();
       },
       { signal: abortSignal },
     );
   }
   ```
4. Zero Autonomous Browser Control: Heap snapshots and CDP trace collection require explicit user permission in the current prompt.

---
