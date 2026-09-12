# FoE-Info Project Conventions (Modern Web Guidance Overlay)

Project-specific overlay for the 141-guide Chrome-team library in this skill.
Read this before applying a guide so recommendations match what FoE-Info has
already enforced. The extension is a **Chromium-only MV3 DevTools panel +
options/popup/content-script** codebase, so target **Chrome 120+**.

---

## 1. Baseline Policy

| Tier | Policy |
| :--- | :--- |
| Baseline Widely Available | Use directly, no polyfill. |
| Baseline Newly Available | Use with feature detection (`'x' in window`, `@supports (...)`) and a graceful fallback. |
| Limited / experimental (e.g. `interestfor`, WebMCP, Built-in AI) | Opt-in behind a flag; never a hard dependency. |

`<meta name="color-scheme" content="light dark">` is present on every HTML
entry, so native controls and scrollbars already follow the OS theme.

---

## 2. Enforced Conventions (do not regress)

### Accessibility
- Informational, non-error updates use `role="status" aria-live="polite"` (add `aria-atomic` where useful). Reserve `role="alert"` for genuine errors/failures.
- Copy-to-clipboard actions announce success/failure through the shared live region `#foeCopyStatus` (created lazily in `src/js/utils/copy.js`); reuse the i18n keys `copied` / `copy_failed`.
- Custom `role="button"` elements activate on **Enter `keydown`** and **Space `keyup`** (guard `e.repeat`); prefer a native `<button type="button">`.
- One focusable control per collapse section; sync `aria-expanded` on the label trigger (the icon is `aria-hidden` + `tabindex="-1"`).
- Data tables carry a `<caption>` (first child) and `<th scope="col|row">`.
- Popovers expose `aria-haspopup`/`aria-expanded` and dismiss on Escape, returning focus to the trigger.

### Theming & CSS
- Use `color-scheme` + `light-dark()` / Bootstrap 5.3 `[data-bs-theme]` tokens; avoid `matchMedia('(prefers-color-scheme: dark)')` + class-toggling for base theming.
- Prefer standard `scrollbar-color` / `scrollbar-width` with `::-webkit-scrollbar` as fallback; honor `prefers-contrast: more`.
- Honor `prefers-reduced-motion: reduce` for any transition/animation.
- Prefer container queries (`@container`) for resizable docked panels over viewport `@media` alone.

### Forms (options page)
- All settings controls live inside `<form id="optionsForm">`, each with a stable `name`.
- Use native constraints (`required`, `min`, `max`, `step`, `inputmode`, `autocomplete`) and style feedback with `:user-invalid` (not bare `:invalid`).
- Submit runs `preventDefault()` + `checkValidity()` / `reportValidity()` and must not report success while invalid.

### Performance
- Defer work through `src/js/utils/scheduler.js` (`yieldToMain()`, `postBackgroundTask()`), not bare `setTimeout`.
- Heavy independent renders yield between steps.
- Non-critical enrichment/network fetches pass `{ priority: 'low' }`.
- Reuse one long-lived `ResizeObserver` (disconnect before re-observing) instead of constructing one per render.
- Cache `Intl.NumberFormat` per locale; batch DOM writes (no `innerHTML +=`); split long tasks.

### Date & JS
- Route every game timestamp through `src/js/utils/date.js` `resolveDate()` — InnoGames payload timestamps are Unix **seconds** (`< 1e11`), not milliseconds.
- Format via `formatTime` / `formatDate` / `formatDateTime` / `formatInTimeZone` / `formatRelativeTime`; never call raw `toLocale*` for dates, and do not reintroduce `dayjs`.
- `Intl.DurationFormat` (Chrome 129+) is available for localized durations.

### Security & CSP
- MV3 CSP stays `script-src 'self'; object-src 'none'; base-uri 'none'`.
- No `eval` / `new Function`; render untrusted or AI-generated text with `textContent`.
- No static game metadata bundled into `src/` (see the `dynamic-runtime-metadata` rule).

---

## 3. Category Routing

| Concern | `references/` folder |
| :--- | :--- |
| Panel layout, responsive docks, tables, containment | `css/`, `visual-design/` |
| Popovers, tooltips, dialogs, disclosure, top layer, transitions | `ui-behaviors/`, `ui-atoms/` |
| Toasts, drawers, onboarding tours | `ui-components/` |
| Render cost, long tasks, scheduling, caching | `performance/` |
| Options form validation, pickers, autofill | `forms/` |
| Timestamps, durations, intervals, reactive state | `js/` |
| ARIA announcements, semantic HTML | `accessibility/`, `html/` |
| Local summarization, agent tools (opt-in) | `built-in-ai/`, `webmcp/` |
| Tokens, credentials, data minimization | `security/`, `privacy/` |

---

## 4. Workflow

1. Identify the concern and open the matching guide(s) via the routing table.
2. Check this overlay for an existing project convention before inventing one.
3. Implement under the Baseline policy; keep slices $\le 100$ lines and files $\le 600$ lines.
4. Add or adjust tests and verify with `npm run verify`.
5. When a new convention becomes enforced, record it here so every specialist inherits it.
