# JavaScript & jQuery Audit

**Milestone**: R6 — JavaScript & jQuery Expert Audit  
**Domain**: `/javascript-expert` + `/jquery-expert`  
**Source Files**: `src/js/index.js`, `src/js/fn/copy.js`, `src/js/fn/helper.js`, `src/js/msg/*.js`

---

## 1. `index.js` Complexity Overview

| Metric                           | Value              | Assessment                                  |
| -------------------------------- | ------------------ | ------------------------------------------- |
| Total lines                      | 2,806              | God module — far exceeds 500-line guideline |
| Import statements                | 88 module imports  | Monolithic dependency surface               |
| `var` declarations               | 152                | Legacy — function-scoped hoisting           |
| `let`/`const` declarations       | 33                 | Modern — but minority                       |
| `async`/`await`/`Promise` usages | 4                  | Heavily under-utilized for async code       |
| jQuery usages                    | 33 across codebase | Mostly one pattern (`$('body').i18n()`)     |
| Exported state variables         | 28+                | Public mutable global state                 |

**Module responsibilities that should be extracted:**

1. Global state (28 variables) → `src/js/state/appState.js`
2. Debug utility (`checkDebug`, `debugEnabled`) → `src/js/state/debug.js`
3. Network listener + dispatch router → `src/js/dispatch/requestRouter.js`
4. DOM node handles (`donationDIV`, `incidents`, `alerts`, `debug`) → `src/js/state/domHandles.js`
5. Inline message handlers → individual handler modules or `requestRouter.js`

---

## 2. jQuery Usage — Complete Inventory

jQuery is provided globally via Webpack's `ProvidePlugin` (not imported per-module). Total: **33 usages** across 10 files.

| File                                      | Line(s) | jQuery Expression                      | Purpose                        | Vanilla Replacement                           |
| ----------------------------------------- | ------- | -------------------------------------- | ------------------------------ | --------------------------------------------- |
| `src/js/fn/copy.js`                       | 166     | `var $temp = $('<textarea>')`          | Create textarea element        | `document.createElement('textarea')`          |
| `src/js/fn/copy.js`                       | 167     | `$('body').append($temp)`              | Append to body                 | `document.body.append($temp)`                 |
| `src/js/fn/copy.js`                       | 168     | `$(element).html()`                    | Get innerHTML                  | `element.innerHTML`                           |
| `src/js/fn/helper.js`                     | 824     | `$('#battlegroundCollapse').height()`  | Get element height             | `el.offsetHeight`                             |
| `src/js/fn/helper.js`                     | 825     | `$('#battlegroundCollapse').height()`  | Get element height (condition) | `el.offsetHeight`                             |
| `src/js/fn/helper.js`                     | 826     | `$('#battlegroundCollapse').height(h)` | Set element height             | `el.style.height = h + 'px'`                  |
| `src/js/fn/helper.js`                     | 828     | `$('body').i18n()`                     | Wikimedia i18n plugin          | **Cannot replace** (plugin requires jQuery)   |
| `src/js/msg/ArmyUnitManagementService.js` | 107     | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(armyDIV).i18n()`                   |
| `src/js/msg/ClanBattleService.js`         | 161     | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(gvgContainer).i18n()`              |
| `src/js/msg/ClanBattleService.js`         | 373     | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(gvgContainer).i18n()`              |
| `src/js/msg/GuildExpeditionService.js`    | 66      | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(donationDIV2).i18n()`              |
| `src/js/msg/OtherPlayerService.js`        | 984     | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(visitEl).i18n()`                   |
| `src/js/msg/GreatBuildingsService.js`     | 522     | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(donationDIV).i18n()`               |
| `src/js/msg/GreatBuildingsService.js`     | 614     | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(donationDIV).i18n()`               |
| `src/js/msg/GuildBattlegroundService.js`  | 104     | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(targetsEl).i18n()`                 |
| `src/js/msg/GuildBattlegroundService.js`  | 327     | `var $temp = $('<textarea>')`          | Textarea for clipboard         | `document.createElement('textarea')`          |
| `src/js/msg/GuildBattlegroundService.js`  | 328     | `$('body').append($temp)`              | Append textarea                | `document.body.append($temp)`                 |
| `src/js/msg/GuildBattlegroundService.js`  | 329     | `$(element).html()`                    | Get innerHTML                  | `element.innerHTML`                           |
| `src/js/msg/GuildBattlegroundService.js`  | 332     | `$('<div />').html(html).text()`       | HTML to plain text             | See note below                                |
| `src/js/msg/GuildBattlegroundService.js`  | 704     | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(el).i18n()`                        |
| `src/js/msg/ResourceService.js`           | 82      | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(goodsDIV).i18n()`                  |
| `src/js/msg/StartupService.js`            | 974     | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(cityStatsEl).i18n()`               |
| `src/js/index.js`                         | 591     | `$('body').i18n()`                     | i18n init                      | Keep as `$('body').i18n()` (full doc on init) |
| `src/js/index.js`                         | 593     | `jQuery ? $().jquery : 'NOT'`          | jQuery version check           | Remove (debug code)                           |
| `src/js/index.js`                         | 1053    | `$('body').i18n()`                     | i18n refresh                   | Scoped: `$(container).i18n()`                 |
| `src/js/index.js`                         | 1434    | `$('#investedDiv').i18n()`             | i18n refresh (already scoped!) | Keep scoped                                   |
| `src/js/index.js`                         | 1660    | `$('body').i18n()`                     | i18n refresh                   | Scope to container                            |
| `src/js/index.js`                         | 1693    | `$('body').i18n()`                     | i18n refresh                   | Scope to container                            |
| `src/js/index.js`                         | 1915    | `$('body').i18n()`                     | i18n refresh                   | Scope to container                            |
| `src/js/index.js`                         | 2010    | `$('body').i18n()`                     | i18n refresh                   | Scope to container                            |
| `src/js/index.js`                         | 2618    | `$('#rewards').i18n()`                 | i18n refresh (already scoped!) | Keep scoped                                   |
| `src/js/index.js`                         | 2628    | `$('#rewardsText').height()`           | Get height                     | `el.offsetHeight`                             |
| `src/js/index.js`                         | 2629    | `$('#rewardsText').height(h)`          | Set height                     | `el.style.height = h + 'px'`                  |

### jQuery Dependency Summary

| Usage Category                             | Count  | Replaceable?                                    |
| ------------------------------------------ | ------ | ----------------------------------------------- |
| `$('body').i18n()` (full-doc i18n refresh) | 12     | Partial: scope to container instead             |
| `$(container).i18n()` (already scoped)     | 3      | ✅ Keep scoped — already correct                |
| `$('<textarea>')` creation                 | 2      | ✅ Replace with `document.createElement`        |
| `$('body').append()`                       | 2      | ✅ Replace with `document.body.append()`        |
| `$(element).html()` getter                 | 2      | ✅ Replace with `element.innerHTML`             |
| `$('<div />').html(html).text()`           | 1      | ✅ Replace with `DOMParser` (see below)         |
| `.height()` getter/setter                  | 3      | ✅ Replace with `offsetHeight` / `style.height` |
| jQuery version check                       | 1      | ✅ Remove (debug)                               |
| **Total replaceable**                      | **13** | jQuery still needed for `wikimedia/jquery.i18n` |

**Vanilla replacement for `$('<div />').html(html).text()`** (HTML-to-text stripping):

```javascript
// Before (jQuery):
const text = $('<div />').html(html).text();

// After (vanilla):
const el = document.createElement('div');
el.innerHTML = html;
const text = el.textContent;
```

> [!IMPORTANT]
> jQuery **cannot be fully removed** because `@wikimedia/jquery.i18n` is a jQuery plugin that requires `$` to be available globally. The dependency chain is: i18n support → jquery.i18n → jQuery. To remove jQuery entirely, the i18n library must be replaced first.

---

## 3. Deprecated API Audit

### 3.1 `document.execCommand('copy')` — Deprecated

**File**: `src/js/fn/copy.js:170` and `src/js/msg/GuildBattlegroundService.js:330`  
**Severity**: HIGH

```javascript
// Current (deprecated):
document.execCommand('copy');

// Modern replacement (Clipboard API):
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback to execCommand for environments without Clipboard API
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}
```

**Note**: The `clipboardWrite` permission in manifest.json was designed for `document.execCommand`. The Clipboard API (`navigator.clipboard`) in extension contexts may require the `clipboard-write` permission (via `navigator.permissions.query`). Test behavior in DevTools panel context before removing `clipboardWrite` from manifest.

### 3.2 `XMLHttpRequest` in `post.js`

**File**: `src/js/fn/post.js`  
**Severity**: MEDIUM

```javascript
// Current (legacy):
const xhr = new XMLHttpRequest();
xhr.open('POST', url);
xhr.send(JSON.stringify(data));

// Modern replacement:
async function postData(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    mode: 'no-cors',
  });
  return response;
}
```

### 3.3 `.height()` jQuery Getter/Setter

**Files**: `src/js/fn/helper.js:824-826`, `src/js/index.js:2628-2629`

```javascript
// Before (jQuery):
if ($('#rewardsText').height() > toolOptions.rewardSize) {
  $('#rewardsText').height(toolOptions.rewardSize);
}

// After (vanilla):
const el = document.getElementById('rewardsText');
if (el.offsetHeight > toolOptions.rewardSize) {
  el.style.height = toolOptions.rewardSize + 'px';
}
```

---

## 4. Async Patterns Analysis

### 4.1 Current State

Only 4 async usages in the entire codebase. The main dispatch handler mixes async and callback patterns:

```javascript
// Current: nested async inside .then()
request.getContent().then(async ([body, mimeType]) => {
  const msgs = JSON.parse(body);
  for (const msg of msgs) {
    // Synchronous dispatch inside async callback
    if (msg.requestClass === 'StartupService') {
      startupService(msg); // No await — fire-and-forget
    }
  }
});
```

**Issues**:

- No `try/catch` around `JSON.parse(body)` — malformed response crashes silently
- No error handling in the `.then()` — unhandled promise rejection
- Async dispatch without awaiting — ordering not guaranteed

### 4.2 Missing Error Boundaries

```javascript
// Current (no error handling):
request.getContent().then(async ([body, mimeType]) => {
  const msgs = JSON.parse(body); // ← Can throw SyntaxError
  // ...
});

// Recommended:
request.getContent().then(async ([body, mimeType]) => {
  try {
    const msgs = JSON.parse(body);
    for (const msg of msgs) {
      await dispatch(msg);
    }
  } catch (err) {
    if (err instanceof SyntaxError) {
      checkDebug(`Response parse error: ${err.message}`);
    } else {
      checkDebug(`Dispatch error: ${err.message}`);
    }
  }
});
```

### 4.3 Missing AbortController

Metadata fetch pipeline has no timeout:

```javascript
// Current (no timeout):
await Promise.all(metadataUrls.map((url) => fetch(url)));

// Recommended:
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);
try {
  await Promise.all(
    metadataUrls.map((url) => fetch(url, { signal: controller.signal })),
  );
} finally {
  clearTimeout(timeout);
}
```

---

## 5. Variable Scope & Declaration Quality

### 5.1 `var` → `let`/`const` Migration

152 `var` declarations vs 33 `let`/`const` — the codebase is predominantly legacy-style.

**Impact of `var`**:

- Function-scoped instead of block-scoped → loop variable leaks possible
- Hoisted to function top → can use before declaration without error
- Re-declaration allowed → accidental shadowing goes undetected

**Migration strategy** (automated):

```bash
# Add ESLint with no-var rule:
npm install --save-dev eslint @eslint/js
echo '{"rules":{"no-var":"error","prefer-const":"error"}}' > .eslintrc.json

# Auto-fix (converts var to let, replaces never-reassigned let with const):
npx eslint src/js --fix
```

---

## 6. Dead Code & Unused Imports

| Location                                   | Issue                                                                                          | Action                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/js/index.js:88`                       | `import { mapToStyles } from '@popperjs/core/lib/modifiers/computeStyles.js'`                  | Remove — `mapToStyles` is not referenced in index.js           |
| `foe-info-webstore.config.js` TerserPlugin | `output: null` — deprecated key (should be `format`) and is overridden by later `format: null` | Remove `output: null`; keep only `format: { comments: false }` |
| `foe-info-webstore.config.js` TerserPlugin | `format: {}` then `format: null` — null overwrites the options object                          | Replace both with a single `format: { comments: false }`       |
| `src/js/index.js:593`                      | jQuery version check debug log                                                                 | Remove                                                         |

---

## 7. Modern JavaScript Opportunities

### 7.1 Optional Chaining (`?.`)

Widespread patterns like:

```javascript
// Current:
if (msg && msg.responseData && msg.responseData.rankings) {
  const rankings = msg.responseData.rankings;
}

// Modern:
const rankings = msg?.responseData?.rankings;
```

### 7.2 Nullish Coalescing (`??`)

```javascript
// Current:
const value = response || defaultValue; // Falsy check — 0 and '' are treated as null

// Modern:
const value = response ?? defaultValue; // Null/undefined only
```

### 7.3 Structured Clone

```javascript
// Current (common pattern for deep copy):
const copy = JSON.parse(JSON.stringify(obj));

// Modern (faster, handles more types):
const copy = structuredClone(obj);
```

### 7.4 Array Destructuring in `for..of`

```javascript
// Current:
for (const entry of Object.entries(obj)) {
    const key = entry[0];
    const value = entry[1];
}

// Modern:
for (const [key, value] of Object.entries(obj)) { ... }
```

### 7.5 `Object.hasOwn()` vs `hasOwnProperty()`

```javascript
// Current:
if (obj.hasOwnProperty(key)) { ... }

// Modern (safe when obj doesn't inherit from Object.prototype):
if (Object.hasOwn(obj, key)) { ... }
```

---

## 8. jQuery Bundle Cost Analysis

| Library                  | Minified Size | Purpose                              |
| ------------------------ | ------------- | ------------------------------------ |
| jQuery 3.7.1             | ~87 KiB       | Required by `@wikimedia/jquery.i18n` |
| `@wikimedia/jquery.i18n` | ~15 KiB       | i18n message translation             |
| **Total**                | **~102 KiB**  | Could be eliminated if i18n replaced |

**Alternative i18n libraries** (no jQuery required):

- [`i18next`](https://www.i18next.com/) — ~33 KiB, full-featured, framework-agnostic
- [`rosetta`](https://github.com/lukeed/rosetta) — 0.6 KiB, minimal, no dependencies
- [`typesafe-i18n`](https://github.com/ivanhofer/typesafe-i18n) — TypeScript-first

**Estimated saving from dropping jQuery**: ~87 KiB from JS bundle (359 KiB → ~272 KiB).

> [!NOTE]
> The i18n replacement is a **medium-complexity** effort: requires changing all `data-i18n=""` attributes and all `$(...).i18n()` calls. The message catalog in `src/i18n/*.json` is reusable.

---

## 9. Recommended Improvements (Prioritized)

| Priority     | Issue                                                   | File                                               | Action                                           | Effort   |
| ------------ | ------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------ | -------- |
| **CRITICAL** | No `try/catch` in `handleRequestFinished`               | `src/js/index.js`                                  | Wrap entire dispatch in try/catch                | 30 min   |
| **HIGH**     | Migrate `document.execCommand('copy')` to Clipboard API | `src/js/fn/copy.js`, `GuildBattlegroundService.js` | Use `navigator.clipboard.writeText()` + fallback | 2 hrs    |
| **HIGH**     | Remove unused `mapToStyles` import                      | `src/js/index.js:88`                               | Delete import line                               | 5 min    |
| **HIGH**     | Fix TerserPlugin dead config                            | `foe-info-webstore.config.js`                      | Consolidate to `format: { comments: false }`     | 10 min   |
| **HIGH**     | Scope all `$('body').i18n()` calls to containers        | All msg services                                   | Replace with `$(container).i18n()`               | 2 hrs    |
| **HIGH**     | Replace jQuery textarea pattern with vanilla            | `copy.js`, `GuildBattlegroundService.js`           | `document.createElement` + `element.innerHTML`   | 1 hr     |
| **MEDIUM**   | Replace jQuery `.height()` with vanilla                 | `helper.js`, `index.js`                            | `offsetHeight` / `el.style.height =`             | 30 min   |
| **MEDIUM**   | Replace `XMLHttpRequest` with `fetch()`                 | `src/js/fn/post.js`                                | Rewrite `postData()` with async fetch            | 1 hr     |
| **MEDIUM**   | Add ESLint + `no-var` rule + auto-fix                   | project root                                       | `npm install eslint` + eslint --fix              | 2 hrs    |
| **MEDIUM**   | Add optional chaining (`?.`) throughout                 | `src/js/msg/*.js`                                  | Use `?.` for nested property access              | 3 hrs    |
| **MEDIUM**   | Add `AbortController` to metadata fetch                 | `src/js/index.js`                                  | Wrap `Promise.all` fetch with 30s timeout        | 1 hr     |
| **LOW**      | Evaluate replacing `@wikimedia/jquery.i18n`             | All files                                          | Research `i18next` as replacement                | 1-2 days |
| **LOW**      | Replace `JSON.parse/stringify` with `structuredClone`   | `src/js/msg/*.js`                                  | Use `structuredClone()` for deep copies          | 1 hr     |
