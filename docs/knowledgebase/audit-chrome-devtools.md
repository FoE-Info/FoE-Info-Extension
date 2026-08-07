# Chrome DevTools Profiling & Performance Audit

**Milestone**: R8 — Chrome DevTools Performance & Memory Analysis  
**Domain**: `/chrome-devtools`  
**Note**: This is a static analysis of profiling methodology and anticipated bottlenecks derived from codebase review. Live runtime profiling requires the extension loaded in Chrome DevTools.

---

## 1. Extension Execution Context

FoE-Info-Extension runs exclusively in the **Chrome DevTools Panel** context — not a content script, not a background service worker. This has specific performance implications:

| Factor               | Value                                        | Implication                                         |
| -------------------- | -------------------------------------------- | --------------------------------------------------- |
| Execution context    | DevTools extension panel                     | Panel process is separate from inspected page       |
| Persistence model    | Panel lives as long as DevTools is open      | No service worker startup latency                   |
| DOM rendering target | `panel.html` (its own renderer)              | Isolated from game page; no shared DOM              |
| Network access       | `browser.devtools.network.onRequestFinished` | All traffic captured synchronously in panel process |
| JS bundle size       | 359 KiB (app.js)                             | Loaded once at panel open                           |
| CSS bundle size      | 518 KiB (app.css)                            | Loaded once at panel open                           |

---

## 2. Anticipated Performance Bottlenecks (Static Analysis)

### 2.1 `handleRequestFinished()` — Synchronous Dispatch on UI Thread

**File**: `src/js/index.js:649`  
**Risk**: HIGH

Every game API response fires `handleRequestFinished()` synchronously on the panel's JS thread. For large API responses (e.g., `StartupService.getData` with full city entity data), the current flow is:

```javascript
// Synchronous chain on every request finish
request.getContent().then(async ([body, mimeType]) => {
  const msgs = JSON.parse(body); // Synchronous JSON parse (up to 200KB)
  for (const msg of msgs) {
    // Synchronous dispatch loop
    if (condition) handleInline(msg); // DOM mutation (reflow/repaint)
  }
});
```

**Risk factors:**

- `JSON.parse()` of large payloads blocks the thread
- DOM `innerHTML` mutations inside the dispatch loop cause synchronous reflows
- No `requestAnimationFrame()` batching of DOM updates
- No `DocumentFragment` to batch table insertions

**Recommendation**: Wrap DOM mutations in `requestAnimationFrame()` or `queueMicrotask()` to defer layout thrashing.

---

### 2.2 Bootstrap 5 Full Bundle — CSS Parse Cost

**File**: `src/css/main.scss` → app.css (518 KiB)  
**Risk**: HIGH (initial load only)

The full Bootstrap 5 CSS bundle is parsed on panel open. In Chrome DevTools panel context, CSS parsing is synchronous and blocks the initial render.

**Key issue**: `main.scss` contains:

```scss
@import 'bootstrap/scss/bootstrap'; // Full Bootstrap
@import 'custom.scss';

.bootstrap-styles {
  @import 'bootstrap/scss/bootstrap'; // DUPLICATE — imported twice
  @import 'custom.scss';
}
```

This causes Bootstrap CSS to be generated **twice** in the output. The `.bootstrap-styles` wrapper has no consumers in the current codebase and should be removed.

**Estimated savings**: ~50% CSS reduction (~260 KiB) by removing the duplicate import.

---

### 2.3 `innerHTML` Mass Mutations — Layout Thrashing

**Pattern across all services**: Every service writes complete HTML tables to `innerHTML` of their container:

```javascript
// Pattern repeated in all 11 msg services:
armyDIV.innerHTML = `<table class="table table-dark">...large HTML string...</table>`;
$('body').i18n(); // Triggers full DOM traversal for i18n replacement
```

**Layout thrashing profile:**

1. `innerHTML` write → browser discards and re-parses subtree (synchronous)
2. `$('body').i18n()` → jQuery traverses ALL `data-i18n` attributes in the **entire document** body, not just the updated element
3. Bootstrap JS initializes popovers/tooltips on `[data-bs-toggle]` elements

**Recommendation**: Scope `$('body').i18n()` to the specific container: `$(containerEl).i18n()` to avoid full document traversal.

---

### 2.4 jQuery `.i18n()` Call Pattern — Full Document Traversal

**Occurrences**: 14 calls across the codebase — all target `$('body')`.

```javascript
// Every service does this after DOM update:
$('body').i18n();
```

The `@wikimedia/jquery.i18n` plugin traverses **every element** in `document.body` with a `data-i18n` attribute. In a DevTools panel with many expanded tables (potentially thousands of `<td>` elements), this is O(n) on the full DOM tree.

**Optimization**: Replace all `$('body').i18n()` with `$(specificContainer).i18n()` — scoped to only the element that was just updated.

---

### 2.5 External Font Loading — Panel Load Delay

**File**: `src/chrome/panel.html:8-14`

```html
<link
  href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined"
  rel="stylesheet"
/>
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:..."
/>
```

**Issue**: Panel HTML loads 2 Google Fonts CDN stylesheets over the network. In a DevTools panel context:

- Requires network access when DevTools opens
- If the user is offline or on a slow connection, icons fail to load
- Adds render-blocking latency to initial panel load

**Recommendation**: Bundle Material Icons as a local Webpack asset or switch to `material-symbols` npm package.

---

### 2.6 ResizeObserver — `fshowBattleground()` Re-render Loop

**File**: `src/js/fn/helper.js`

```javascript
// ResizeObserver triggers full BG table re-render on resize
const observer = new ResizeObserver(() => {
  fshowBattleground(); // Full table re-render
});
observer.observe(document.querySelector('#battlegroundCollapse'));
```

**Risk**: If the panel is resizable and the user resizes frequently, `fshowBattleground()` fires repeatedly. The function rebuilds the entire GBG comparison table from scratch on each resize event.

**Recommendation**: Debounce the ResizeObserver callback (100ms debounce), or separate data preparation from DOM mutation to avoid full re-renders on resize.

---

### 2.7 Extension Storage Reads — Startup Latency

**File**: `src/js/index.js` (storage initialization block)

On panel initialization, the extension reads multiple storage keys sequentially:

- `showOptions.*` flags (33 booleans)
- `collapse.*` state (33 booleans)
- `toolOptions.*` (height values, URLs)
- `ResourceDefs` (potentially large — full resource definition JSON)
- `CityEntityDefs` (potentially large — city entity metadata JSON)

**Risk**: Sequential storage reads add latency to panel readiness. `browser.storage.local.get()` is async but reads are done in serial chains.

**Recommendation**: Batch all startup storage reads into a single `browser.storage.local.get(null)` call (reads all keys at once).

---

## 3. Memory Usage Profile

### 3.1 Persistent Memory Consumers

| Object                              | Type           | Memory Risk | Notes                                 |
| ----------------------------------- | -------------- | ----------- | ------------------------------------- |
| `CityEntityDefs`                    | Object (large) | Medium      | Cached full city entity metadata      |
| `GBGdata`                           | Object         | Low–Medium  | GBG sector/province data              |
| `BattlegroundPerformance`           | Object         | Low         | Grows per season                      |
| `hiddenRewards`                     | Array          | Low         | Fixed size per game session           |
| `friends`/`guildMembers`/`hoodlist` | Arrays         | Low–Medium  | Depends on guild/hood size            |
| Bootstrap JS instances              | Map (internal) | Medium      | Popovers/tooltips not always disposed |

### 3.2 Popover/Tooltip Memory Leaks

**File**: `src/js/fn/helper.js` (`fShowIncidents()`)

```javascript
// On each fShowIncidents() call:
incidents.innerHTML = newHtml; // Replaces innerHTML — old DOM nodes removed
new Popover(el, options); // Creates new Bootstrap Popover instance
```

Bootstrap 5 Popover instances hold references to DOM elements. When `incidents.innerHTML` is replaced, the old DOM is garbage-collected, but Bootstrap may retain internal references in its global instance map.

**Recommendation**: Call `Popover.getOrCreateInstance(el).dispose()` before replacing `incidents.innerHTML`.

---

## 4. Profiling Methodology (Manual Steps)

To profile the live extension:

### 4.1 JavaScript Performance Profile

```
1. Open Forge of Empires game in Chrome
2. Open DevTools (F12)
3. Navigate to FoE-Info tab
4. Open DevTools-of-DevTools: chrome://inspect/#other → inspect the FoE-Info panel
5. In inner DevTools: Performance tab → Record
6. Trigger a game API call (e.g., switch cities, open GB)
7. Stop recording
8. Analyze:
   - handleRequestFinished execution time (main thread)
   - Layout/Paint after innerHTML mutations
   - $('body').i18n() traversal cost
```

### 4.2 Memory Snapshot

```
1. Same setup as above (DevTools-of-DevTools)
2. Memory tab → Take Heap Snapshot (baseline)
3. Trigger multiple game API calls
4. Take second Heap Snapshot
5. Compare: filter for detached DOM nodes (Bootstrap popover leaks)
6. Look for: Bootstrap Popover instances referencing removed elements
```

### 4.3 CSS Paint Profiling

```
1. Enable: DevTools Settings → Experiments → CSS Overview
2. Run CSS Overview in FoE-Info panel's inner DevTools
3. Look for: unused CSS rules (expected: ~80% of Bootstrap unused)
4. Cross-reference with PurgeCSS candidates
```

---

## 5. Performance Budget Recommendations

| Metric                   | Current            | Target        | Action                            |
| ------------------------ | ------------------ | ------------- | --------------------------------- |
| JS bundle (app.js)       | 359 KiB            | < 200 KiB     | splitChunks, jQuery removal       |
| CSS bundle (app.css)     | 518 KiB            | < 100 KiB     | PurgeCSS                          |
| CSS duplicate            | ~260 KiB redundant | 0             | Remove `.bootstrap-styles` import |
| External font requests   | 2 CDN requests     | 0             | Bundle locally                    |
| Storage reads on init    | N sequential reads | 1 batch       | `storage.get(null)`               |
| `$('body').i18n()` scope | Full document      | Per container | Scoped i18n calls                 |

---

## 6. Critical Findings Summary

| #   | Finding                                                                  | Severity | File                    | Fix                                      |
| --- | ------------------------------------------------------------------------ | -------- | ----------------------- | ---------------------------------------- |
| 1   | Bootstrap CSS imported twice in main.scss                                | HIGH     | `src/css/main.scss`     | Remove `.bootstrap-styles` wrapper block |
| 2   | `$('body').i18n()` full doc traversal on every data update               | HIGH     | All msg services        | Scope to `$(container).i18n()`           |
| 3   | External CDN fonts block panel initial render                            | MEDIUM   | `src/chrome/panel.html` | Bundle fonts locally                     |
| 4   | ResizeObserver triggers full table re-render on every resize             | MEDIUM   | `src/js/fn/helper.js`   | Debounce callback (100ms)                |
| 5   | Bootstrap Popovers not disposed before `incidents.innerHTML` replacement | MEDIUM   | `src/js/fn/helper.js`   | Call `.dispose()` before replacement     |
| 6   | Sequential storage reads at startup                                      | LOW      | `src/js/index.js`       | Batch with `storage.get(null)`           |
| 7   | No `requestAnimationFrame` batching of DOM updates                       | LOW      | `src/js/index.js`       | Batch DOM mutations per frame            |

---

## 7. DevTools-Specific Best Practices

When building Chrome DevTools extensions:

1. **DevTools panel IS a persistent extension page** — no cold-start latency, but memory accumulates over long sessions.
2. **Never block the UI thread** in `onRequestFinished` — `JSON.parse()` on large payloads (>100KB) should be offloaded to a Web Worker if causing jank.
3. **DevTools-of-DevTools profiling** requires `chrome://inspect/#other` — there is no other way to profile a DevTools panel's own performance.
4. **`chrome.devtools.network.onRequestFinished`** fires on the panel's JS thread. Long synchronous work here blocks the panel UI.
5. **Memory leaks accumulate** — a panel open for hours will grow. Dispose Bootstrap instances and clear event listeners when panels collapse.
