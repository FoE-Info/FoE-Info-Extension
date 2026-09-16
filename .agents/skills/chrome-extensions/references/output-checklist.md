# Chrome Extension Output Checklist

Verify EVERY item before delivering:

- [ ] `manifest_version: 3` — no V2 APIs anywhere
- [ ] All icon files referenced in manifest exist as real files with correct dimensions — or icons are omitted
- [ ] Side panel has an explicit open trigger (not just a manifest declaration)
- [ ] Code execution uses sandbox/blob/srcdoc — no `eval()` in extension pages
- [ ] `tabs` permission declared if `tab.url` or `tab.title` is accessed
- [ ] All code uses `async`/`await` — no `.then()` chains
- [ ] Content scripts batch DOM updates with `requestAnimationFrame`
- [ ] Service worker stores NO state in global variables — uses `chrome.storage`
- [ ] No inline scripts or event handlers in HTML
- [ ] Context menu actions show user confirmation
- [ ] `"action": {}` (or more) present in manifest if using `chrome.action.*` APIs
- [ ] If reading/scripting tabs from a side panel: use `tabs` + `host_permissions` (NOT `activeTab`)
- [ ] DevTools panel paths in `chrome.devtools.panels.create()` are relative to extension root
- [ ] Offscreen documents use ONLY `chrome.runtime` messaging — no `chrome.downloads`, `chrome.action`, etc.
- [ ] All image refs in `chrome.notifications`, `chrome.action.setIcon`, etc. point to real files (or use data URLs)
- [ ] Tab/desktop capture uses state locking to prevent double-start errors
- [ ] `chrome.desktopCapture.chooseDesktopMedia` passes `targetTab` with `tabs` permission
- [ ] `chrome.windows` calls use `getAll`/`getLastFocused`/`getCurrent` — NOT `.query()` (it doesn't exist)
- [ ] `chrome.permissions.request()` in a service worker `onMessage` listener is called with no `await` before it (gesture is lost after the first async gap)
- [ ] `chrome.userScripts` availability checked before use (API throws if user hasn't enabled it)
- [ ] User script configs persisted in `chrome.storage` and restored on `runtime.onInstalled` `"update"` reason
- [ ] `configureWorld({ messaging: true })` called before user scripts send messages; listening on `onUserScriptMessage` not `onMessage`
- [ ] `ScriptSource` entries each have exactly one of `code` or `file` (not both, not neither)
- [ ] User script `id` values do not start with underscore
- [ ] `sidePanel.setPanelBehavior` uses `openPanelOnActionClick` — NOT `openPanelOnActionIconClick`
- [ ] Error handling on all async operations
- [ ] `host_permissions` scoped to specific domains (not `<all_urls>` unless needed)
- [ ] `return true` in `onMessage` listeners with async responses
- [ ] Any use of `"tab"` in `chrome.contextMenus` `contexts` requires Chrome M150+
