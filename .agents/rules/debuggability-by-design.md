---
trigger: always_on
description: Mandate that all features, calculators, RPC services, network interceptors, storage routines, and UI renderers implement debug-mode debuggability via logger.js.
---

# Rule: Debuggability by Design & Unified Diagnostics

Every module, feature, calculation engine, RPC service, network interceptor, and UI renderer in the FoE-Info extension must be built debuggable by design from day one.

---

## 1. Dual-Mode Operation Invariant

The extension operates in two distinct runtime modes:

1. **Standard Mode (Default)**:
   - **100% Silent**: Zero extraneous console chatter, zero performance overhead.
   - Never use ungated `console.log()`, `console.debug()`, or `console.dir()` directly in runtime application code.
2. **Debug Mode (Toggled via Header Logo Icon)**:
   - Enabled when the user clicks the FoE-Info logo in the panel header (swapping icon to `bug_report`) or when `debugEnabled` is set to `true` in extension storage.
   - Emits structured, informative diagnostics with module-scoped tagging `[FoE-Info:<ModuleName>]` directly to the DevTools panel console, ensuring visibility for both human users and external AI assistants (e.g. via Chrome DevTools MCP).

---

## 2. Mandatory Logger Instantiation

Every module in `src/js/` (outside pure type declarations) must instantiate a scoped logger:

```javascript
import { createLogger } from '../utils/logger.js';
const logger = createLogger('ModuleName');
```

For CommonJS/Node environments or dual-export modules:
```javascript
const { createLogger } = require('../utils/logger.js');
const logger = createLogger('ModuleName');
```

---

## 3. What Must Be Logged in Debug Mode

When writing or refactoring any code, instrument the following key operational events with `logger.debug(...)`:

| Domain / Layer | Events Requiring Debug Logging |
| :--- | :--- |
| **Pure Calculations (`src/js/calc/`)** | Input values, intermediate formulas, Arc bonus multipliers applied, rounding steps, and computed outputs. |
| **RPC & Protocol (`src/js/msg/`, `protocol/`)** | Inbound RPC requestClass/method, raw payload entity counts, unknown/unhandled packet formats, and dispatch decisions. |
| **State & Cache (`src/js/state/`)** | Cache hits, misses, writes, invalidations, and reactive state emissions. |
| **Network & Bridge (`contentBridge`, `xhrInterceptor`)** | Intercepted URL patterns, payload bridge handoffs, serialization checks, and connection lifecycle events. |
| **UI Rendering (`src/js/ui/`)** | Container clear events, template render starts/completions, data-i18n bindings applied, and accordion/collapse state toggles. |
| **Async Operations & Races** | Async fetch start/completion, storage load/save timestamps, potential out-of-order packet arrivals, and fallback recoveries. |

---

## 4. Prohibited Anti-Patterns

- **Ungated Console Calls**: Using raw `console.log()` that spams the console when debug mode is disabled.
- **Silent Features**: Adding new features, cards, or algorithms that provide zero diagnostic traces when debug mode is enabled.
- **Unsafe Object Logging**: Passing objects that mutate between log call and render, or mixing non-serializable references in ways that break console inspection; prefer passing stable, self-contained values to log methods.
- **Direct eval/alert**: Attempting direct DOM alerts or un-throttled window messaging instead of routing through `logger.js`.
