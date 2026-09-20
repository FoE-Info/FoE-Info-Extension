---
trigger: model_decision
description: "Web conventions: Unix timestamps in seconds, a11y, and forms."
---

# Rule: FoE-Info Modern Web Conventions

Enforced frontend conventions for the FoE-Info Chrome extension (Chromium-only MV3 DevTools panel + options/popup/content-script targeting Chrome 120+).

## 1. Baseline Policy

| Tier                                         | Policy                                                                                 |
| :------------------------------------------- | :------------------------------------------------------------------------------------- |
| Baseline Widely Available                    | Use directly, no polyfill.                                                             |
| Baseline Newly Available                     | Use with feature detection (`'x' in window`, `@supports (...)`) and graceful fallback. |
| Limited / Experimental (WebMCP, Built-in AI) | Opt-in behind a flag; never a hard dependency.                                         |

`<meta name="color-scheme" content="light dark">` is present on every HTML entry, so native controls and scrollbars already follow the OS theme.

## 2. Enforced Conventions (Do Not Regress)

### Accessibility

- Informational, non-error updates use `role="status" aria-live="polite"` (add `aria-atomic` where useful). Reserve `role="alert"` for genuine errors/failures.
- Copy-to-clipboard actions announce success/failure through the shared live region `#foeCopyStatus` (created lazily in `src/js/utils/copy.js`); reuse the i18n keys `copied` / `copy_failed`.
- Custom `role="button"` elements activate on **Enter `keydown`** and **Space `keyup`** (guard `e.repeat`); prefer a native `<button type="button">`.
- Enclose search and filter inputs in a semantic `<search>` element (Chrome 118+ Baseline) rather than a generic `<div>` with `role="search"`.
- One focusable control per collapse section; sync `aria-expanded` on the label trigger (the icon is `aria-hidden` + `tabindex="-1"`).
- Data tables carry a `<caption>` (first child) and `<th scope="col|row">`.
- Popovers expose `aria-haspopup`/`aria-expanded` and dismiss on Escape, returning focus to the trigger.

### Theming & CSS

- Use `color-scheme` + `light-dark()` / Bootstrap 5.3 `[data-bs-theme]` tokens (set `document.documentElement.dataset.bsTheme = 'dark'|'light'`); avoid legacy class-toggling (`bg-dark`, `text-light`) for base theming.
- Prefer standard `scrollbar-color` / `scrollbar-width` with `::-webkit-scrollbar` as fallback; honor `prefers-contrast: more`.
- Honor `prefers-reduced-motion: reduce` for any transition/animation.
- Prefer container queries (`@container`) for resizable docked panels over viewport `@media` alone.

### Forms (Options Page)

- All settings controls live inside `<form id="optionsForm">`, each with a stable `name`.
- Use native constraints (`required`, `min`, `max`, `step`, `inputmode`, `autocomplete`) and style feedback with `:user-invalid` (not bare `:invalid`).
- Submit runs `preventDefault()` + `checkValidity()` / `reportValidity()` and must not report success while invalid.

### Performance

- Defer work through `src/js/utils/scheduler.js` (`yieldToMain()`, `postBackgroundTask()`), not bare `setTimeout`.
- Heavy independent renders yield between steps.
- Use `content-visibility: auto` with `contain-intrinsic-size` on long scrollable lists or dense data tables (e.g. GB contributions, large inventories) to defer offscreen layout and paint.
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
