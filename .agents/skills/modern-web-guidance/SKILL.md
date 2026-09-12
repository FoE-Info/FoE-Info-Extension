---
name: modern-web-guidance
description: "Research modern Web standards, APIs, and Baseline features."
---

# Modern Web Guidance

Comprehensive reference library of 141 offline best-practice guides developed by the Google Chrome team for modern web standards, Baseline features, and Web APIs.

> **Read first:** the FoE-Info overlay [`references/project-conventions.md`](references/project-conventions.md) records the conventions this project has already enforced (a11y live regions, `color-scheme`/`light-dark()`, options form validation, `scheduler.js` deferral, `resolveDate()` timestamps, MV3 CSP), the Baseline policy, and a concern-to-folder routing table. Apply a guide only after checking it for an existing project convention.

---

## 1. When to Use

- Researching Baseline browser APIs, modern CSS features, or DOM APIs.
- Replacing legacy libraries with native modern alternatives (e.g., Popover API, Web Animations, Anchor Positioning).
- Implementing performance optimizations (LCP, scheduler yielding, content-visibility) and accessibility patterns.
- Integrating browser Built-in AI (Prompt API, Summarizer API) or WebMCP tools.

---

## 2. Directory Navigation & Offline Guides

All 141 guides are located in `references/` organized across 14 topical categories:

| Category | Guides | Focus Areas | Key References |
| :--- | :---: | :--- | :--- |
| **`performance/`** | 24 | LCP, long task chunking, yielding, content-visibility | [`break-up-long-tasks.md`](references/performance/break-up-long-tasks.md), [`defer-rendering-heavy-content.md`](references/performance/defer-rendering-heavy-content.md) |
| **`ui-behaviors/`** | 29 | Anchor positioning, top layer, enter/exit transitions | [`animate-to-from-top-layer.md`](references/ui-behaviors/animate-to-from-top-layer.md), [`scrollytelling.md`](references/ui-behaviors/scrollytelling.md) |
| **`css/`** | 15 | Subgrid, container queries, light-dark(), has() | [`size-aware-styling.md`](references/css/size-aware-styling.md), [`child-state-based-styling.md`](references/css/child-state-based-styling.md) |
| **`forms/`** | 16 | Form-associated custom elements, autofill, pickers | [`autofill-address-form.md`](references/forms/autofill-address-form.md), [`ime-safe-enter-submit.md`](references/forms/ime-safe-enter-submit.md) |
| **`ui-atoms/`** | 10 | Popovers, position-aware tooltips, carousels | [`position-aware-tooltips.md`](references/ui-atoms/position-aware-tooltips.md) |
| **`visual-design/`** | 16 | Color spaces, color-mix(), contrast adaptation | [`adapt-scrollbar-to-contrast-preferences.md`](references/visual-design/adapt-scrollbar-to-contrast-preferences.md) |
| **`security/`** | 7 | Passkeys, WebAuthn, credential management | [`passkey-authentication.md`](references/security/passkey-authentication.md) |
| **`built-in-ai/`** | 5 | Chrome Prompt API, Language Model, Summarizer | [`prompt-api.md`](references/built-in-ai/prompt-api.md), [`language-model.md`](references/built-in-ai/language-model.md) |
| **`webmcp/`** | 3 | Web Model Context Protocol & agentic tools | [`agentic-javascript-tools.md`](references/webmcp/agentic-javascript-tools.md), [`webmcp.md`](references/webmcp/webmcp.md) |
| **`ui-components/`**| 4 | Toasts, drawers, app tour patterns | [`persistent-toast-notifications.md`](references/ui-components/persistent-toast-notifications.md) |
| **`js/`** | 8 | Event coordinates, location-agnostic data, differentials | [`coordinate-global-events.md`](references/js/coordinate-global-events.md) |
| **`accessibility/`**| 2 | Screen reader announcements, aria live regions | [`accessible-error-announcement.md`](references/accessibility/accessible-error-announcement.md) |
| **`html/`** | 1 | Semantic HTML architecture and elements | [`html.md`](references/html/html.md) |
| **`privacy/`** | 1 | Privacy-preserving web features | [`privacy.md`](references/privacy/privacy.md) |

---

## 3. Finding and Reading Guides

To find a relevant guide without loading unnecessary context:
1. Search guide titles or content:
   ```sh
   grep -rn "pattern" .agents/skills/modern-web-guidance/references/
   ```
2. Read the specific guide using `view_file`:
   ```javascript
   // Inspect only the targeted guide
   view_file(".agents/skills/modern-web-guidance/references/<category>/<guide-name>.md")
   ```

---

## 4. Browser Support Policy & Baseline

- **Baseline Widely Available**: Features with 30+ months of cross-browser support are safe to use immediately without polyfills.
- **Baseline Newly Available**: Require feature detection (`if ('...' in window)` or `@supports (...)`) and graceful degradation.
- **Extension Context**: Chrome extensions target Chromium, allowing newer web platform features (Chrome 120+) natively without legacy IE/Safari polyfills.
