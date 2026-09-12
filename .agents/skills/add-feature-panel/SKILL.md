---
name: add-feature-panel
description: "Scaffold accessible, localized UI panels in panel.html."
---

# Workflow: Add Feature UI Panel

Use this skill when creating a new user-facing panel or collapsible card in the extension UI (e.g., Historical Allies, City Space Optimizer, Combat Boost Matrix).

> [!IMPORTANT]
> **Production Extension UI Boundary**:
> Do not use in-chat Generative UI (`<agent-embed>` artifacts) for extension features. Production panels must be integrated directly into `src/chrome/panel.html` using **Bootstrap 5.3**, localized with `data-i18n` attributes, and styled via `src/css/main.scss`.


---

## Phase 1: Service Architecture & State
1. Implement the feature logic in a modular service:
   - `src/js/msg/<FeatureName>Service.js` (for RPC handlers) or `src/js/utils/<featureName>.js` (for new utilities; `fn/` contains legacy helpers).
   - Never write monolithic logic directly into `src/js/index.js`.
   - Instantiate `const logger = createLogger('<FeatureName>')` from `../utils/logger.js`.
   - Emit `logger.debug(...)` statements during panel rendering, filter updates, and state changes.
2. Connect state reactively with `MetadataStore.js` or `src/js/vars/state.js`.
3. Use `bignumber.js` for all Forge Point, boost, or resource arithmetic.


---

## Phase 2: Component Layout & Accessibility
1. Define the collapsible container using Bootstrap 5 classes and accessible markup:
   - Use standard accordion / collapse elements: `data-bs-toggle="collapse"` and `aria-expanded`.
   - Ensure color contrast complies with WCAG 2.2 AA (minimum 4.5:1 for normal text).
2. Wire up state persistence in `src/js/fn/collapse.js` so user collapsed/expanded preferences persist across sessions.
3. If the panel card or content container is resizable (`resize: vertical` or `resize: both`):
   - **Never use `max-height: max-content !important;` in CSS**: This overrides inline height styling and causes collapsed panels to expand to 100% full content height.
   - **Bind with `bindResizableCollapse`**: Import and call `bindResizableCollapse(containerEl, storageKey, options)` from `src/js/ui/panelResize.js`.
   - **Lifecycle Clamping**:
     - During `show.bs.collapse`, clamp `maxHeight` to target height to prevent layout jumps.
     - During `shown.bs.collapse`, re-apply target inline `height = targetHeight + 'px'`.
     - Guard `ResizeObserver` callbacks against `.collapsing` and `!show` classes to avoid saving transition heights.

---

## Phase 3: Internationalization (i18n)
1. Add `data-i18n` attributes to all static text labels:
   ```html
   <span data-i18n="allies_active_count">Active Allies</span>
   ```
2. For dynamic template strings, use `t('allies_room_count', count)` from `src/js/utils/i18n.js`.
3. Add the primary English keys to `src/i18n/en.json`.
4. Run the automated parity generator to propagate keys to all 7 languages:
   ```bash
   npm run i18n:fix
   npm run i18n:check
   ```

---

## Phase 4: Verification & Runtime Testing
1. Build the development bundle:
   ```bash
   npm run build:dev
   ```
2. Inspect the live panel in Chromium:
   ```bash
   foe-browser
   ```
3. Verify panel rendering without runtime exceptions on port 9222 via CDP.

---

## References

- [Bootstrap Component Patterns](references/bootstrap-components.md): Tested card, badge, and table markup for DevTools panels.
- [Bootstrap JS Lifecycle & Teardown](references/bootstrap-js-api.md): Native instance management and memory leak prevention.
- [Bootstrap Color Modes & Theming](references/bootstrap-color-modes.md): Dark theme tokens and FoE aesthetic styling.

---

## Modern Web Guidance (Project Overlay)

Apply the `modern-web-guidance` library with the FoE-Info overlay: [modern-web-guidance](../modern-web-guidance/SKILL.md) and [project conventions](../modern-web-guidance/references/project-conventions.md).
Primary reference categories: `accessibility/`, `html/`, `ui-behaviors/`, `ui-atoms/`, `css/`.
Uphold:
- informational updates use `role="status" aria-live="polite"`
- tables get `<caption>` + `<th scope>`
- one focusable collapse control with synced `aria-expanded`
- popovers dismiss on Escape
- `color-scheme`-aware theming
