# JavaScript & jQuery Audit

**Verified**: 2026-08-08 against all JavaScript under `src/js/` and the production
Webpack build.

## Executive summary

The request parser now has both a `try/catch` around response processing and a final
promise rejection handler, correcting the most serious stale claim in the previous
audit. The current high-risk problems are concrete runtime defects in storage/posting
code, unsanitized HTML rendering, and inaccessible dynamic interaction patterns.

`src/js/index.js` remains a 2,644-line orchestration and state module. Domain services
import its live mutable exports while `index.js` imports those services, so the module
graph is highly coupled and initialization order remains fragile.

## Confirmed defects

### P0: `postToDiscord` calls an undefined function

`src/js/fn/post.js:57` calls `getKey(webHookUrl)`, but there is no active import or
definition. The only candidate implementation is commented out in `helper.js`.
Calling `postToDiscord` therefore throws `ReferenceError` before sending. The same
path also logs the derived hook value, which would expose webhook credentials if the
function were restored.

Remove the dead key derivation and never log webhook URLs/tokens. Validate the URL
against the allowed Discord hosts immediately before sending.

### P0: remote response text is assigned to `innerHTML`

`src/js/fn/post.js:348` assigns an external Google Sheets response directly to
`alerts.innerHTML` when JSON parsing fails. The success path also interpolates the
remote `result` field into HTML. Treat both as untrusted: render with `textContent` or
construct the alert DOM with native elements. Do not use a regex or CSP as the
sanitization boundary.

The wider renderer contains 239 active `innerHTML` assignments. Many interpolate
player names, game metadata, or other intercepted payload fields. Audit each boundary
and reserve `innerHTML` for fixed templates whose dynamic values are escaped or
sanitized by a reviewed policy.

### P0: the storage getter never returns its promise

`src/js/fn/storage.js:getStorage` starts `browser.storage.local.get(...).then(...)`
but does not return that chain. Its caller in `GreatBuildingsService.js:58-59`
therefore receives `undefined`, and the persisted `useNewDonationPanel` value cannot
be restored as intended.

Make `getStorage` return the promise (or make it `async`) and await it at call sites.
Also replace `runtime.lastError` checks inside promise flows with `.catch`/`try-catch`.

### P0: treasury and treasury-log IDs are assigned to the same node

`src/js/index.js:374` sets `treasury.id = 'treasury'`, then line 377 sets
`treasury.id = 'treasuryLog'` instead of assigning `treasuryLog.id`. The treasury
element loses its expected ID and the log element remains unnamed, breaking ID-based
lookups and accessibility relationships.

## Reliability and lifecycle findings

### Network operations need a single robust abstraction

Five active `XMLHttpRequest` instances duplicate POST setup and mostly omit HTTP
status checks, `error`/`timeout` handling, abort behavior, and user-visible failures.
Two requests incorrectly set `Access-Control-Allow-Origin`; that is a response header
and has no useful effect in a client request.

The unused `postData` helper is also broken: its `.then` callback returns nothing, so
the awaited `response` becomes `undefined` and `response.json()` would throw. Replace
the dead helper and XHR copies with one tested `fetch` function that validates URLs,
checks `response.ok`, sets a timeout/abort signal, and returns a typed result.

### Resize observers are not disposed

Nine `ResizeObserver` instances are created in dynamic render paths and no
`disconnect()` or `unobserve()` call exists. Re-rendering can retain detached nodes
and duplicate storage writes. Keep observers in module-owned slots, disconnect before
replacing their target, and disconnect during panel teardown.

### Dark-mode change handling contains a no-op comparison

`src/js/index.js:492` evaluates `darkMode == 'dark'` rather than assigning state. The
handler also toggles classes regardless of the `matches` value, so repeated changes
can desynchronize visual state. Use `classList.toggle(name, matches)` and update the
single source of truth explicitly.

### Promise error coverage is inconsistent

The DevTools request path at `index.js:667-1914` now catches parsing/dispatch errors
and `getContent()` rejection. Retain that improvement. Options storage writes,
permission requests, runtime update checks, clipboard writes, and several storage
helpers still swallow or omit failures. User-triggered operations should resolve to a
visible status, not only a console message.

## jQuery assessment

jQuery 4.0.0 is supplied globally by Webpack and is required by
`@wikimedia/jquery.i18n` 1.0.9. It is therefore not currently removable in isolation.
The active code contains:

- 18 full-body `$('body').i18n()` passes;
- two scoped i18n calls;
- jQuery height reads/writes in two render paths;
- a temporary-textarea/HTML manipulation sequence in
  `GuildBattlegroundService.js`.

Repeated full-body translation after small subtree updates is the most important
jQuery performance issue. Translate the newly inserted container where possible.
The remaining DOM/height/clipboard uses can be converted to native APIs without
waiting for an i18n migration.

Webpack's shared `vendors.js` is 223,528 bytes, but that chunk also contains
Bootstrap, Popper, Wikimedia i18n, and other dependencies. Do not attribute the whole
chunk—or an unmeasured fixed byte saving—to jQuery alone. Use `npm run analyze` before
setting a migration target.

## Language and architecture findings

- There are 571 source lines beginning with `var` declarations versus 21 with `let`
  and 126 with `const`; these are lexical counts, not AST declaration counts.
- Mutable state is exported broadly from `index.js`, `showOptions.js`, service
  modules, and collapse/global helpers.
- Many service modules import `index.js` while `index.js` imports them, creating
  circular dependency pressure even where Webpack happens to initialize the current
  paths successfully.
- Loose equality is widespread in message routing. Coercion may be intentional for
  server IDs, so convert it with tests rather than a blind global replacement.
- `console.debug` is removed from production by Terser, but `console.log`,
  `console.info`, and `console.error` remain. `storage.set` currently logs every key
  and value through `console.log`, which can expose player or configuration data.

Extract the request router and state ownership incrementally. A safe sequence is:

1. add characterization tests for storage, posting, and representative dispatches;
2. fix the four confirmed runtime/security defects above;
3. introduce a state module with explicit setters/events;
4. move dispatch tables out of `index.js` one service family at a time;
5. break service-to-`index.js` imports by passing dependencies or narrow adapters.

## Accessibility of generated UI

Dynamic actions and disclosures are usually rendered as spans or paragraphs and then
given click listeners. Mouse behavior works, but keyboard behavior, role, name,
focusability, and `aria-expanded` updates are missing. Prefer native buttons in the
template helpers rather than adding key handlers to every call site. This change also
enables delegated event handling from stable containers and reduces listener churn.

## Prioritized remediation

| Priority | Action                                                                                      | Primary files                               |
| -------- | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| P0       | Remove undefined `getKey` call and credential logging                                       | `fn/post.js`                                |
| P0       | Stop inserting remote/game values as unsanitized HTML                                       | `fn/post.js`, renderers                     |
| P0       | Return/await the storage getter promise                                                     | `fn/storage.js`, `GreatBuildingsService.js` |
| P0       | Correct the treasury-log ID assignment                                                      | `index.js`                                  |
| P1       | Consolidate XHR/fetch behavior with validation, status checks, timeout, and surfaced errors | `fn/post.js`, options UI                    |
| P1       | Replace generated action spans/paragraphs with buttons and delegated events                 | `fn/AddElement.js`, service renderers       |
| P1       | Own and disconnect `ResizeObserver` instances                                               | dynamic service renderers                   |
| P1       | Scope i18n refreshes to changed subtrees                                                    | `index.js`, service modules                 |
| P2       | Add ESLint and focused tests before `var`/equality modernization                            | project tooling, `src/js/`                  |
| P2       | Split mutable state and dispatch routing out of `index.js`                                  | new state/router modules                    |

## Verification record

```text
npm run check                  PASS
npm run build                  PASS with 3 performance warnings
npm audit --audit-level=high   PASS: 0 known vulnerabilities
Automated unit/integration tests: not configured
ESLint/type checking:            not configured
```
