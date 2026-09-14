# chrome-extension-architect — Worked Examples

On-demand examples for the `chrome-extension-architect` subagent. The agent’s role, workflow, invariants, and verification requirements remain in its flat definition.

## Few-Shot Reasoning Example: Versioned Bridge postMessage Protocol

**Scenario:** Transmitting an intercepted RPC envelope from DevTools harness (`devtools.js`) to the extension panel (`index.js`).
**Reasoning Trace:**

1. Avoid window globals (`window.handleRawNetworkEntry`). Use structured `window.postMessage` envelopes.
2. Specify version and message type:
   ```javascript
   export function postNetworkEntry(entry) {
     window.postMessage(
       {
         source: 'foe-info-devtools',
         version: 1,
         type: 'raw-network-entry',
         payload: entry,
       },
       '*',
     );
   }
   ```
3. In panel receiver: Verify `event.source === window`, validate `version === 1`, and check `event.data?.source === 'foe-info-devtools'` before dispatching.

---
