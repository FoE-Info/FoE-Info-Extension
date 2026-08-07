# Chrome Extension MV3 Audit

**Milestone**: R9 — Chrome Extensions MV3 Compliance & Security Audit  
**Domain**: `/chrome-extensions`  
**Source Files**: `src/chrome/manifest.json`, `src/js/index.js`, `src/js/devtools.js`

---

## 1. Extension Architecture Overview

FoE-Info-Extension uses an **unusual but valid MV3 architecture** with no background service worker:

```
manifest.json
├── action.default_popup → popup.html (action button in toolbar)
├── devtools_page → devtools.html → devtools.js → panel.html
│   └── browser.devtools.panels.create() spawns the actual panel
├── options_ui.page → options.html
├── externally_connectable → https://*.forgeofempires.com/game/*
└── (no background) ← No service worker
```

**Why no background service worker works here**: The extension's logic all runs inside the DevTools panel. The DevTools panel is an extension page that persists as long as DevTools is open — it doesn't have the service worker's 30-second idle shutdown. This is an architecturally correct choice for a DevTools extension.

---

## 2. Manifest Fields Audit

| Field                    | Value                                           | Status | Notes                                                         |
| ------------------------ | ----------------------------------------------- | ------ | ------------------------------------------------------------- |
| `manifest_version`       | 3                                               | ✅     | Correct — MV3                                                 |
| `minimum_chrome_version` | `"88.0"`                                        | ⚠️     | Chrome 88 = first MV3, but many MV3 features stabilized later |
| `name`                   | `""`                                            | ✅     | Populated at build time by `WebpackExtensionManifestPlugin`   |
| `version`                | `""`                                            | ✅     | Populated at build time from `package.json`                   |
| `description`            | `"Essential Info for Forge of Empires addicts"` | ✅     | Clear, concise                                                |
| `homepage_url`           | Set                                             | ✅     | Valid                                                         |
| `externally_connectable` | `["https://*.forgeofempires.com/game/*"]`       | ⚠️     | See §6                                                        |
| `devtools_page`          | `"devtools.html"`                               | ✅     | Correct DevTools panel registration                           |
| `options_ui.open_in_tab` | `false`                                         | ✅     | Opens inline in settings (preferred)                          |

### `minimum_chrome_version` Assessment

`"88.0"` is technically correct for MV3, but the extension uses APIs that were stabilized in later versions:

| API Used                                     | Stable Chrome Version     |
| -------------------------------------------- | ------------------------- |
| `browser.devtools.network.onRequestFinished` | Chrome 18+ (stable in 88) |
| `webextension-polyfill`                      | Chrome 88+                |
| `chrome.webRequest.onBeforeSendHeaders`      | Chrome 88+                |
| `Clipboard API` (if adopted)                 | Chrome 66+                |

**Recommendation**: Keep at `"88.0"` — no compelling reason to bump unless specific APIs require higher versions.

---

## 3. Permissions Audit

### 3.1 Permissions Table

| Permission         | Used   | Necessity            | Risk Level | Notes                                                            |
| ------------------ | ------ | -------------------- | ---------- | ---------------------------------------------------------------- |
| `storage`          | ✅     | Required             | Low        | All user settings and cached data                                |
| `unlimitedStorage` | Verify | Assess               | Low        | `CityEntityDefs` + `ResourceDefs` may approach default 5MB limit |
| `clipboardWrite`   | ✅     | Required (currently) | Low        | For `document.execCommand('copy')`                               |
| `webRequest`       | ✅     | Required             | **HIGH**   | See critical analysis §4                                         |

### 3.2 `unlimitedStorage` Assessment

The extension saves `CityEntityDefs` (full metadata for all city entities) and `ResourceDefs` (all game resources) to local storage. Depending on game content, these could approach Chrome's default 5MB storage limit. `unlimitedStorage` is justified but should be documented for Chrome Web Store reviewers.

### 3.3 `clipboardWrite` Assessment

Currently required for `document.execCommand('copy')` which is deprecated. If migrated to the modern Clipboard API (`navigator.clipboard.writeText()`):

- In **extension contexts** (DevTools panel), `navigator.clipboard` works **without** any permission declaration
- Chrome extensions running in extension page contexts have automatic clipboard access when the document is focused
- **Recommendation**: Migrate to Clipboard API → remove `clipboardWrite` permission

---

## 4. `webRequest` — Critical MV3 Compliance Analysis

**Severity**: CRITICAL

### 4.1 Current Usage

```javascript
// src/js/index.js:637
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    return {
      requestHeaders: details.requestHeaders.filter((x) => !originWithId(x)), // ← RETURNS modified headers
    };
  },
  { urls: ['https://*.innogamescdn.com/*'] },
  ['requestHeaders'], // ← Reads request headers
);
```

The listener **returns a modified `requestHeaders` array** — this is **blocking/modifying mode**.

### 4.2 MV3 Blocking Restrictions

| Context                         | Blocking webRequest       | Observer-only webRequest |
| ------------------------------- | ------------------------- | ------------------------ |
| Background Service Worker (MV3) | ❌ Removed                | ✅ Allowed               |
| Extension Page (MV3)            | ⚠️ See below              | ✅ Allowed               |
| DevTools Panel (MV3)            | ⚠️ Same as extension page | ✅ Allowed               |

**Key finding**: The Chrome documentation states that in MV3, `webRequest` can **observe** requests in extension pages, but **header modification** (blocking mode — returning `{requestHeaders: ...}`) is restricted to the background service worker context AND requires the `blocking` option in the filter.

Looking at the current code:

- The filter is `['requestHeaders']` — NOT `['requestHeaders', 'blocking']`
- Without `'blocking'` in the filter array, the return value is **ignored**
- This means the Origin header stripping **may not be working** in the current implementation

### 4.3 Impact Assessment

**If Origin header stripping is non-functional**, CDN requests to `*.innogamescdn.com` will include the extension Origin header. Innogames CDN servers may:

1. Ignore it (most likely — CDN servers are typically permissive)
2. Block the request (unlikely but possible for metadata fetches)
3. Return CORS-error (possible if CDN has strict CORS policy)

The extension has been working for years suggesting option 1 (CDN ignores the header), but the intent of the code (privacy: hiding the extension origin) is not being achieved.

### 4.4 Recommended Fix

**Option A**: Add `'blocking'` to the filter and verify it works from DevTools panel context:

```javascript
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => ({
    requestHeaders: details.requestHeaders.filter((x) => !originWithId(x)),
  }),
  { urls: ['https://*.innogamescdn.com/*'] },
  ['requestHeaders', 'blocking'], // ← Add 'blocking'
);
```

Note: This may require the `webRequestBlocking` permission in some Chrome versions.

**Option B**: Migrate to `declarativeNetRequest` (the MV3-compliant approach):

```json
// In manifest.json:
"permissions": ["declarativeNetRequest"],
"declarative_net_request": {
    "rule_resources": [{
        "id": "strip_origin",
        "enabled": true,
        "path": "rules/strip_origin.json"
    }]
}
```

```json
// rules/strip_origin.json:
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [{ "header": "Origin", "operation": "remove" }]
    },
    "condition": {
      "urlFilter": "*.innogamescdn.com",
      "resourceTypes": ["xmlhttprequest", "other"]
    }
  }
]
```

---

## 5. `host_permissions` Audit

| Host Pattern                            | Purpose                         | Issue                                                                      | Recommendation                                                                |
| --------------------------------------- | ------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `https://*.forgeofempires.com/game/*`   | Game API interception           | Path `/game/*` may miss some API endpoints                                 | Verify completeness                                                           |
| `https://*.google.com/*`                | Google Sheets posting           | **Very broad** — covers all Google services including gmail.com, drive.com | Narrow to `https://script.google.com/*` and `https://sheets.googleapis.com/*` |
| `https://*.googleusercontent.com/`      | Google Content URLs             | **Missing trailing `/*`** — pattern won't match any paths                  | Fix to `https://*.googleusercontent.com/*`                                    |
| `https://discordapp.com/api/webhooks/*` | Discord webhook                 | Old domain — Discord migrated to discord.com years ago                     | Remove if discord.com always succeeds                                         |
| `https://discord.com/api/webhooks/*`    | Discord webhook                 | ✅ Correct                                                                 | Keep                                                                          |
| `https://*.innogamescdn.com/*`          | CDN metadata + header stripping | ✅ Required                                                                | Keep                                                                          |

### Google Sheets URL Pattern Fix

The current `*.google.com/*` pattern is flagged by Chrome Web Store reviewers as unnecessarily broad. The extension only posts to Google Sheets Web App URLs (format: `https://script.google.com/macros/s/SCRIPT_ID/exec`).

```json
// Before:
"https://*.google.com/*",
"https://*.googleusercontent.com/",

// After:
"https://script.google.com/macros/s/*/exec",
"https://*.googleusercontent.com/*"
```

---

## 6. `externally_connectable` Analysis

```json
"externally_connectable": {
    "matches": ["https://*.forgeofempires.com/game/*"]
}
```

**What this enables**: JavaScript running on `*.forgeofempires.com/game/*` pages can call `chrome.runtime.connect()` or `chrome.runtime.sendMessage()` to communicate with this extension.

**What's missing**: No `runtime.onMessageExternal` or `runtime.onConnectExternal` listener is defined anywhere in the codebase. The extension declares it can receive external connections but never handles them.

**Risk**: A compromised or malicious page on `*.forgeofempires.com` could attempt to send messages to the extension. Without a handler, messages are silently dropped — no data exposure risk currently. However, the `externally_connectable` declaration creates a surface that should either be:

1. Used intentionally (with a message handler)
2. Removed if unused

**Recommendation**: Remove `externally_connectable` from manifest.json if no external messaging is required.

---

## 7. DevTools Panel Architecture Assessment

The `devtools_page` → `devtools.js` → `panels.create()` → `panel.html` chain is **correct MV3 implementation**:

```javascript
// src/js/devtools.js (correct):
browser.devtools.panels.create(EXT_NAME, null, 'panel.html').then((panel) => {
  // Panel created
});
```

**DevTools-specific behaviors**:

- Panel has access to `chrome.devtools.*` APIs only from the devtools page context
- `browser.devtools.network.onRequestFinished` fires in the panel's JS context
- Panel process is separate from the inspected page's process
- Panel persists through page navigations (correct behavior for FoE)

**No issues** with the DevTools panel architecture.

---

## 8. Content Security Policy

```json
"content_security_policy": {
    "extension_pages": "script-src 'self' ; object-src 'self'"
}
```

**Assessment**: ✅ Correct and minimal.

- No `unsafe-eval` — prevents code injection
- No `unsafe-inline` — prevents inline script execution
- `object-src 'self'` — prevents plugin embedding

**Potential addition**: If bundled Material Icons fonts are added locally, no CSP changes needed. If Google Fonts CDN is retained, the stylesheet link (not a script) is not governed by `script-src` — no CSP change required.

---

## 9. Security Analysis

| Concern                                                  | Location            | Severity | Notes                                                                                                                                  |
| -------------------------------------------------------- | ------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `innerHTML` injection without sanitization               | All msg services    | MEDIUM   | Game API responses written directly to innerHTML. A compromised FoE API could inject HTML. Mitigation: game API is HTTPS + same origin |
| No input validation on `postData` URLs                   | `src/js/fn/post.js` | LOW      | Discord/Sheets URLs from user-configured options                                                                                       |
| `externally_connectable` without handler                 | `manifest.json`     | LOW      | Silent message drop — no data exposure                                                                                                 |
| `web_accessible_resources` exposes `browser-polyfill.js` | `manifest.json`     | INFO     | Low risk — polyfill is a public library                                                                                                |
| Origin header stripping may not work                     | `src/js/index.js`   | MEDIUM   | See §4 — may not be achieving intended privacy goal                                                                                    |

---

## 10. Chrome Web Store Compliance

For Web Store submission, the following justifications will be required:

| Permission               | Justification Text (draft)                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webRequest`             | Required to strip the extension Origin header from CDN metadata requests to innogamescdn.com to prevent extension detection by the game server.                 |
| `unlimitedStorage`       | The extension caches city entity metadata (CityEntityDefs) and resource definitions (ResourceDefs) that together can exceed Chrome's default 5MB storage limit. |
| `https://*.google.com/*` | **Change to narrower pattern first** — then justify: Used to post guild statistics to user-configured Google Sheets Web App URL.                                |
| `clipboardWrite`         | Required for the copy-to-clipboard functionality in donation calculator and social list export features.                                                        |

---

## 11. Recommended Improvements (Prioritized)

| Priority     | Issue                                                                                | Action                                                           |
| ------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **CRITICAL** | `webRequest` header modification may be non-functional (missing `'blocking'` filter) | Add `'blocking'` to filter or migrate to `declarativeNetRequest` |
| **HIGH**     | `https://*.google.com/*` too broad                                                   | Narrow to `https://script.google.com/macros/s/*/exec`            |
| **HIGH**     | `https://*.googleusercontent.com/` missing `/*`                                      | Fix to `https://*.googleusercontent.com/*`                       |
| **HIGH**     | `externally_connectable` declared but unused                                         | Remove from manifest if no external messaging needed             |
| **HIGH**     | `clipboardWrite` may become unnecessary                                              | Migrate to Clipboard API → remove permission                     |
| **MEDIUM**   | `innerHTML` injection without sanitization                                           | Add DOMPurify or manual sanitization layer for API responses     |
| **MEDIUM**   | `https://discordapp.com` (old domain)                                                | Remove if discord.com always works                               |
| **LOW**      | `minimum_chrome_version: "88"`                                                       | Bump to `"102"` where MV3 APIs were more fully stabilized        |
| **LOW**      | `webRequest` permission justification                                                | Prepare Web Store reviewer justification text                    |
