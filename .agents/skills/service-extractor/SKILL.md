---
name: service-extractor
description: 'Extract JSON-RPC handlers from monoliths into src/js/msg/.'
---

# Service Extractor Runbook

This skill outlines the step-by-step methodology for extracting an InnoGames RPC service handler out of `src/js/msg/StartupService.js` or `src/js/index.js` into an isolated, testable module in `src/js/msg/`.

---

## Prerequisite Checks

1. Ensure the working tree is clean: `git status`.
2. Ensure the verification gate passes: `npm run verify`.
3. Query `graphify-foe-info` with `get_node` / `get_neighbors` for the target service. If the graph is stale, refresh it with `bash scripts/graphify/graphify.sh foe-info ast` (or `mise run graph-ast`) first; refreshing alone is not a query.

---

## Step-by-Step Procedure

### 1. Create Target Service Module

Create `src/js/msg/<ServiceName>.js`:

```javascript
// Example: src/js/msg/QuantumIncursionService.js
import { createLogger } from '../utils/logger.js';

const logger = createLogger('QuantumIncursionService');

export function handleQuantumIncursion(msg) {
  if (!msg || !msg.responseData) return;
  const data = msg.responseData;
  logger.debug('Inbound RPC payload received', {
    method: msg.requestMethod,
    nodeCount: data.nodes?.length,
  });
  // Process payload...
  logger.debug('Processed payload', { nodeCount: data.nodes?.length });
}
```

### 2. Export & Connect Call Site

For a new RPC service, expose `register(dispatcher)` and connect it through `src/js/msg/registerServices.js`, following an existing service such as `AllyService.js`. Do not self-register at import time.

For an existing legacy handler extraction, replace its current call site without adding a second registration. Check `src/js/protocol/legacyBridge.js` and the central registry before changing routing. Relative imports depend on the caller's directory: an import from `msg/StartupService.js` must not add another `msg/` segment.

### 3. Verify Constraints

1. **Slice Cohesion**: Check the diff for one reason to change (`git diff --stat`, then read it). `docs/architecture.md` "Cohesion Over Line Count" is the rule: a slice is the unit that changes for one reason, not a fixed line budget. `npm run audit:refs -- --strict` flags modules over 500 lines as a feature-boundary prompt, not a violation.
2. **Build Verification**: Run `npm run build:dev`.
3. **Debuggability Verification**: Confirm module instantiates `createLogger`, produces zero logs when debug is disabled, and emits detailed diagnostics when debug is enabled.
4. **Runtime Test**: Verify with headless tests (`npm test`) and check the live panel console in the attached browser session.
5. **Knowledge Graph Sync**: Run `bash scripts/graphify/graphify.sh foe-info update` (or `mise run graph-update`).
