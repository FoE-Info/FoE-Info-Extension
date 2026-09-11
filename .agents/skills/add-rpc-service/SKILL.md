---
name: add-rpc-service
description: Scaffold decoupled InnoGames JSON-RPC service handlers in src/js/msg/.
---

# Workflow: Add New InnoGames RPC Service

Use this skill when InnoGames releases a new game feature, settlement, or mini-game with a new RPC service class (e.g. `QuantumIncursionService`, `HeroEventService`).

---

## Phase 1: Packet Capture & Reverse-Engineering
1. Launch the test browser:
   ```bash
   foe-browser
   ```
2. In Chrome DevTools, capture the raw JSON response payload from the Network tab or console logs.
3. Save a sample envelope structure in `scratch/sample-<service>-payload.json`.
4. Identify the request class and methods:
   ```json
   {
     "requestClass": "<ServiceName>",
     "requestMethod": "<methodName>",
     "responseData": { ... }
   }
   ```

---

## Phase 2: Create Modular Service Handler
1. Create `src/js/msg/<ServiceName>.js`.
2. Implement the parsing function:
   - Handle undefined properties and missing fields defensively.
   - Instantiate `const logger = createLogger('<ServiceName>')` from `../utils/logger.js`.
   - Add `logger.debug(...)` calls logging incoming RPC method, entity count, and state mutations.
   - Use `BigNumber` for all numeric calculations (points, rewards).
   - Use `helper.fEntityNameTrim()` or `getCityEntityDef()` for entity name lookups.
3. Export the handler:
   ```javascript
   export function handle<ServiceName>(msg) { ... }
   ```

---

## Phase 3: Route in Message Dispatcher
1. Expose a service `register(dispatcher)` method using `dispatcher.register(requestClass, requestMethod, handler)`; follow an existing module such as `AllyService.js`.
2. Import the service in `src/js/msg/registerServices.js` and invoke its registration from `registerAllServices`.
3. Keep registration owned by that central registry; do not self-register at module import or add a new switch branch to `index.js`.

---

## Phase 4: End-to-End Contract Propagation Audit
Audit the new service contract across every pipeline stage using the `cross-platform-contract-propagation-audit` skill:
1. **Wire Ingestion**: Confirm `xhr-interceptor.js` and `content-bridge.js` bridge the payload without dropping properties.
2. **State & Storage**: Confirm state attributes are saved to `MetadataStore` or `src/js/vars/` with defensive defaults (`?.`, `??`).
3. **DOM Presentation**: Confirm all user-visible text is safely inserted using `textContent` or sanitized elements (no unescaped `.html()`).
4. **Deterministic Fixture**: Add a sample payload to `tests/protocol/` asserting envelope extraction and parsing without runtime errors.

---

## Phase 5: UI Presentation & Localization
1. In `src/chrome/panel.html`, add a responsive Bootstrap card/tab for the feature:
   - Use `data-i18n` attributes on all labels.
2. Add new translation keys to `src/i18n/en.json`.
3. Propagate keys to all locales:
   ```bash
   npm run i18n:fix
   npm run i18n:check
   ```

---

## Phase 6: Verification & Knowledge Graph Sync
1. Run formatting and linting:
   ```bash
   npm run format
   npm run check
   npm run lint
   ```
2. Build the extension:
   ```bash
   npm run build:dev
   ```
3. Test live in the browser:
   ```bash
   foe-browser
   node .agents/scripts/inspect-extension.js 5000
   ```
4. Update the codebase knowledge graph:
   ```bash
   npm run graph:foe-info:update
   ```
