---
name: service-extractor
description: Safely extract InnoGames RPC handlers out of monoliths into src/js/msg/.
---

# Service Extractor Runbook

This skill outlines the step-by-step methodology for extracting an InnoGames RPC service handler out of `src/js/msg/StartupService.js` or `src/js/index.js` into an isolated, testable module in `src/js/msg/`.

---

## Prerequisite Checks
1. Ensure the working tree is clean: `git status`.
2. Ensure existing tests and builds pass: `npm run check && npm run build:dev`.
3. Check Graphify for references to the target service:
   ```bash
   # Query references in the knowledge graph
   npm run graph:foe-info:update
   ```

---

## Step-by-Step Procedure

### 1. Create Target Service Module
Create `src/js/msg/<ServiceName>.js`:
```javascript
// Example: src/js/msg/QuantumIncursionService.js
import { helper } from '../fn/helper.js';
import { state } from '../vars/state.js';

export function handleQuantumIncursion(msg) {
  if (!msg || !msg.responseData) return;
  const data = msg.responseData;
  // Process payload...
}
```

### 2. Export & Connect Call Site
In `src/js/index.js` or `src/js/msg/StartupService.js`:
1. Import the new service handler at the top of the file:
   ```javascript
   import { handleQuantumIncursion } from './msg/QuantumIncursionService.js';
   ```
2. Replace the inline code block in the message switch/router:
   ```javascript
   case 'QuantumIncursionService':
     handleQuantumIncursion(request);
     break;
   ```

### 3. Verify Constraints
1. **Slice Size**: Verify the diff is <100 lines: `git diff --stat`.
2. **Build Verification**: Run `npm run build:dev`.
3. **Runtime Test**: Run `foe-browser` and `node .agents/scripts/inspect-extension.js 3000` to confirm no runtime errors.
4. **Knowledge Graph Sync**: Run `npm run graph:foe-info:update`.
