# javascript-expert — Worked Examples

On-demand examples for the `javascript-expert` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Scoped Logger & Clean Async Pipeline

**Scenario:** Implementing a pure helper function that normalizes game timestamps and handles promise timeouts cleanly.
**Reasoning Trace:**

1. Avoid `console.log`; instantiate a scoped logger `createLogger('DateHelper')`.
2. Do not re-introduce `dayjs` or raw `toLocaleDateString`. Use `resolveDate(rawSeconds)` from `src/js/utils/date.js`.
3. Protect async pipelines with `AbortSignal.timeout(5000)`.
4. Code template:
   ```javascript
   import { resolveDate } from '../utils/date.js';
   import { createLogger } from '../utils/logger.js';

   const logger = createLogger('DateHelper');

   export function parseTimestamp(unixSeconds) {
     const date = resolveDate(unixSeconds);
     logger.debug('Resolved timestamp', {
       unixSeconds,
       iso: date.toISOString(),
     });
     return date;
   }
   ```

---
