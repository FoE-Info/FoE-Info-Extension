# Chrome Extension Development Guide

### Mandatory Rules

These address the most common causes of broken extensions. Violating any produces a non-functional build.

#### 1. Icons: only reference files you create — or omit icons entirely

```
❌ BROKEN — referencing files that don't exist or reusing one file for all sizes:
   "icons": { "16": "icon.png", "48": "icon.png", "128": "icon.png" }

✅ CORRECT — each size is a separate file at the correct pixel dimensions:
   "icons": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
   (where icon-16.png is 16×16px, icon-48.png is 48×48px, icon-128.png is 128×128px)

✅ ALSO CORRECT — omit icons from manifest if you cannot generate real PNG files:
   (just remove the "icons" and "default_icon" fields — Chrome uses a default icon)
```

**If you include icon references, you MUST create the actual image files.** Generate them with a script (see `references/extensions/icons.md`) or leave them out. Never reference non-existent files.

#### 2. Side panel: you MUST provide a way to open it

Defining `"side_panel": {"default_path": "..."}` does NOT make it openable. Add a trigger:

```js
// In service-worker.js — open side panel on extension icon click
// IMPORTANT: chrome.action.onClicked ONLY fires when there is NO default_popup
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ windowId: tab.windowId });
});
```

If the extension has both a popup AND side panel, add a button in the popup that calls `chrome.sidePanel.open()`. Alternatively, use `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` — but the property is `openPanelOnActionClick`, NOT `openPanelOnActionIconClick`; the "Icon" variant causes a synchronous TypeError that silently aborts the service worker. Do NOT also define `default_popup` when using `setPanelBehavior`. See `references/extensions/side-panel.md`.

#### 3. Code execution: sandboxed iframes ONLY

Extension CSP blocks `eval()`, `new Function()`, inline `<script>` in all extension pages.

```js
// ❌ BROKEN — direct iframe DOM access throws SecurityError
iframe.contentDocument.write(html);

// ❌ BROKEN — eval in extension page
eval(userCode); // CSP blocks this

// ✅ OPTION A: Sandbox in manifest + postMessage
// manifest.json: { "sandbox": { "pages": ["sandbox.html"] } }
iframe.contentWindow.postMessage({ html, css, js }, '*');
// sandbox.html receives and runs:
window.addEventListener('message', (e) => {
  eval(e.data.js); /* allowed in sandbox */
});

// ✅ OPTION B: Blob URL (creates separate origin, bypasses extension CSP)
iframe.src = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));

// ✅ OPTION C: srcdoc
iframe.srcdoc = `<style>${css}</style>${html}<script>${js}<\/script>`;
```

See `references/extensions/csp-sandbox.md` for full details.

#### 4. `tab.url` requires the `tabs` permission

Without it, `tab.url` silently returns `undefined` — no error thrown.

```js
// manifest.json — REQUIRED if you read tab.url or tab.title anywhere:
{ "permissions": ["tabs"] }
```

See `references/extensions/tab-management.md`.

#### 5. Always use async/await — never `.then()` chains

```js
// ❌ BAD
chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
  chrome.scripting
    .executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] })
    .then(() => {});
});

// ✅ GOOD
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['content.js'],
});
```

For `runtime.onMessage` listeners that do async work:

```js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const data = await chrome.storage.local.get('key');
    sendResponse({ data });
  })();
  return true; // keeps channel open
});
```

#### 6. Content scripts: don't block the main thread

When modifying many DOM elements, batch with `requestAnimationFrame` and yield between batches:

```js
async function highlightAll(elements) {
  const BATCH = 20;
  for (let i = 0; i < elements.length; i += BATCH) {
    await new Promise((r) =>
      requestAnimationFrame(() => {
        elements
          .slice(i, i + BATCH)
          .forEach((el) => (el.style.backgroundColor = 'yellow'));
        r();
      }),
    );
    if (globalThis.scheduler?.yield) await scheduler.yield();
  }
}
```

See `references/extensions/content-scripts.md`.

#### 7. Service workers are ephemeral — never store state in variables

```js
// ❌ BROKEN — state lost when SW terminates (~30s of inactivity)
let count = 0;
chrome.tabs.onUpdated.addListener(() => {
  count++;
});

// ✅ CORRECT — persist in chrome.storage, read on every event
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  const { count = 0 } = await chrome.storage.local.get('count');
  await chrome.storage.local.set({ count: count + 1 });
  await chrome.action.setBadgeText({ text: String(count + 1) });
});
```

Use `chrome.alarms` instead of `setTimeout`/`setInterval`. See `references/extensions/service-worker.md`.

#### 8. chrome.identity: extension ID differs between dev and production

When using Google sign-in, the OAuth client_id is tied to a specific extension ID. The ID changes between unpacked development and the Chrome Web Store.

To stabilize the ID during development, add a `"key"` field to manifest.json:

1. Pack the extension once (chrome://extensions → Pack)
2. Extract the public key from the .crx
3. Add `"key": "MIIBIjANBgkqh..."` to manifest.json

Always document: "After publishing to the Chrome Web Store, update the OAuth client with the store-assigned extension ID." See `references/extensions/auth-identity.md`.

#### 9. Context menus: show user feedback after action

When a context menu item performs an action (save, copy, etc.), confirm it to the user. Use a notification, badge flash, or injected toast — don't let actions happen silently. See `references/extensions/context-menus.md` for a complete toast implementation.

#### 10. Prompt API: available in service workers, popup, and side panel

The `LanguageModel` API works in all extension contexts — service worker, popup, and side panel — with no additional manifest permissions required. Extensions also get `LanguageModel.params()`, which is unavailable on the web:

```js
const params = await LanguageModel.params();
// { defaultTopK: 3, maxTopK: 128, defaultTemperature: 1, maxTemperature: 2 }
```

For general Prompt API patterns (availability checks, session creation, streaming), use the `modern-web-guidance` skill. See `references/extensions/prompt-api.md` for the extension-specific wiring example.

#### 11. `chrome.action` API requires `action` in manifest

Using `chrome.action.setBadgeText`, `chrome.action.setIcon`, or `chrome.action.onClicked` requires
an `"action"` key in manifest.json — even if it's empty. Without it, `chrome.action` is `undefined`.

```js
// ❌ BROKEN — manifest has no "action" key
await chrome.action.setBadgeText({ text: '5' });
// TypeError: Cannot read properties of undefined (reading 'setBadgeText')

// ✅ FIX — add "action" to manifest.json (at minimum an empty object)
{ "action": {} }
// or with a popup:
{ "action": { "default_popup": "popup/popup.html" } }
```

#### 12. `activeTab` only works on direct user gestures — not from side panels

`activeTab` grants temporary access to the current tab ONLY when triggered by:

- Clicking the extension action icon
- A context menu item
- A keyboard shortcut from the `commands` API
- Accepting an omnibox suggestion

It does **NOT** grant access when clicking a button in a side panel, popup button that opens later,
or any programmatic trigger.

```js
// ❌ BROKEN — activeTab does NOT work from a side panel button click
document.getElementById('summarize').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText,
  });
});

// ✅ FIX — use "tabs" permission + specific host_permissions instead
// manifest.json: { "permissions": ["tabs", "scripting"], "host_permissions": ["<all_urls>"] }
```

See `references/extensions/side-panel.md`.

#### 13. DevTools panel URLs are relative to the extension root

When creating a DevTools panel, the panel HTML path is relative to the **extension root**, NOT
relative to the devtools page that calls `chrome.devtools.panels.create()`.

```js
// ❌ BROKEN — path relative to devtools/ directory
chrome.devtools.panels.create('My Panel', '', 'panel/panel.html');

// ✅ CORRECT — full path from extension root
chrome.devtools.panels.create('My Panel', '', 'devtools/panel/panel.html');
```

See `references/extensions/devtools.md`.

#### 14. Offscreen documents have NO access to most chrome.* APIs

Offscreen documents (`chrome.offscreen`) are **severely restricted**. Most `chrome.*` APIs
are unavailable, including `chrome.downloads`, `chrome.tabs`, `chrome.action`, and others.

```js
// ❌ BROKEN — chrome.downloads is undefined in offscreen documents
chrome.downloads.download({ url, filename: 'recording.webm' }); // TypeError

// ❌ BROKEN — chrome.action is undefined in offscreen documents
chrome.action.setBadgeText({ text: 'REC' }); // TypeError
```

**The only APIs available in offscreen documents are:**

- `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`
- `chrome.runtime.getURL`
- Standard Web APIs (DOM, fetch, MediaRecorder, Canvas, Web Audio, etc.)

**Rule of thumb:** Offscreen documents do the Web API work (recording, parsing, audio). The service worker does all chrome.* API work (downloads, badge updates, notifications). Use `chrome.runtime.sendMessage` to bridge between them. See `references/extensions/message-passing.md`.

#### 15. Notifications and badge icons must reference real image files

`chrome.notifications.create()` requires a valid `iconUrl` pointing to an actual image file.
If the file doesn't exist or the path is wrong, the call fails with `"Unable to download all specified images."`

```js
// ❌ BROKEN — icon file doesn't exist
chrome.notifications.create('reminder', {
  type: 'basic',
  iconUrl: 'icons/icon-128.png', // File not in extension!
  title: 'Reminder',
  message: 'Time is up!',
});

// ✅ Generate a data URL at runtime via OffscreenCanvas — no file needed.
// See `references/extensions/icons.md` for a reusable implementation.
const iconUrl = await getIconDataUrl();
chrome.notifications.create('reminder', {
  type: 'basic',
  iconUrl,
  title: 'Reminder',
  message: 'Time is up!',
});
```

This applies to ALL image references in chrome.* APIs — notifications, `chrome.action.setIcon`,
context menu icons, etc. **If you reference a file, it must exist.**

#### 16. Tab capture: guard against double-start with state locking

`chrome.tabCapture.getMediaStreamId()` fails with `"Cannot capture a tab with an active stream"`
if called while a previous capture is still active. Fast double-clicks on the extension icon
easily trigger this. Use explicit state locking:

```js
// ❌ BROKEN — no guard against rapid clicks
let isRecording = false;
chrome.action.onClicked.addListener(async (tab) => {
  if (isRecording) {
    stopRecording();
    isRecording = false;
  } else {
    isRecording = true;
    startRecording(tab);
  } // Second click = "active stream" error
});

// ✅ CORRECT — use transitional states to lock out concurrent operations
// State machine: 'idle' → 'starting' → 'recording' → 'stopping' → 'idle'
// Store state in chrome.storage.session (survives SW restart, cleared on browser close)
chrome.action.onClicked.addListener(async (tab) => {
  const { recordingState = 'idle' } =
    await chrome.storage.session.get('recordingState');

  if (recordingState === 'starting' || recordingState === 'stopping') return;

  if (recordingState === 'idle') {
    await chrome.storage.session.set({ recordingState: 'starting' });
    try {
      await startRecording(tab);
      await chrome.storage.session.set({ recordingState: 'recording' });
      await chrome.action.setBadgeText({ text: 'REC' });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } catch (err) {
      console.error('Failed to start recording:', err);
      await chrome.storage.session.set({ recordingState: 'idle' });
    }
  } else if (recordingState === 'recording') {
    await chrome.storage.session.set({ recordingState: 'stopping' });
    try {
      await stopRecording();
    } finally {
      await chrome.storage.session.set({ recordingState: 'idle' });
      await chrome.action.setBadgeText({ text: '' });
    }
  }
});
```

This pattern applies to any chrome API that manages exclusive resources:
`chrome.tabCapture`, `chrome.desktopCapture`, `chrome.offscreen.createDocument` (only one
offscreen document allowed at a time). See `references/extensions/media-capture.md`.

#### 17. `chrome.desktopCapture` requires a target tab with URL access

When calling `chrome.desktopCapture.chooseDesktopMedia()` from a service worker, you must pass
the active tab as the `targetTab` parameter. The tab object must have its `url` field populated,
which requires the `"tabs"` permission.

```js
// ❌ BROKEN — called without targetTab from service worker
chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], (streamId) => { ... });
// Error: "A target tab is required when called from a service worker context."

// ❌ BROKEN — tab doesn't have url field (missing "tabs" permission)
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], tab, (streamId) => { ... });
// Error: "targetTab doesn't have URL field set."

// ✅ CORRECT — "tabs" permission in manifest + pass tab object
// manifest.json: { "permissions": ["tabs", "desktopCapture"] }
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], tab, (streamId) => {
  if (!streamId) return; // User cancelled
});
```

**Note:** Prefer `chrome.tabCapture.getMediaStreamId()` for tab-only recording. Use `chrome.desktopCapture` only when the user should choose which screen/window to capture. See `references/extensions/media-capture.md`.

#### 18. `chrome.windows` has NO `.query()` method — use `getAll`, `getLastFocused`, or `getCurrent`

Unlike `chrome.tabs.query()`, the `chrome.windows` API does NOT have a `.query()` method.

```js
// ❌ BROKEN — chrome.windows.query does not exist
const windows = await chrome.windows.query({ focused: true });
// TypeError: chrome.windows.query is not a function

// ✅ CORRECT — use the right method for your need
const focused = await chrome.windows.getLastFocused({ populate: true });
const current = await chrome.windows.getCurrent({ populate: true });
const all = await chrome.windows.getAll({ populate: true });
```

**`chrome.windows` methods:** `getAll`, `getLastFocused`, `getCurrent`, `get(windowId)`, `create`, `update`, `remove`. See `references/extensions/tab-management.md`.

### Always Manifest V3

Never generate Manifest V2 code.

- `background.service_worker` not `background.scripts`
- `chrome.action` not `chrome.browserAction`
- `chrome.scripting.executeScript` not `chrome.tabs.executeScript`
- `host_permissions` is separate from `permissions`
- No inline scripts in HTML — use `<script src="file.js">`
- No inline event handlers — use `addEventListener`

---
