---
trigger: always_on
description: Mandate that all user-visible text, tooltips, and labels use internationalization (i18n) bindings rather than hardcoded English strings.
---

# Rule: Internationalization (i18n) Compliance

FoE-Info supports 7 language locales (`en`, `de`, `es`, `fr`, `it`, `el`, `gr`). Hardcoding English strings in HTML templates or dynamically generated DOM elements breaks the user experience for non-English players.

---

## 1. Static HTML Templates (`src/chrome/panel.html`)

All static headers, labels, buttons, and placeholders must include a `data-i18n` attribute:

```html
<!-- GOOD -->
<h5><span data-i18n="collection">Building Collection Times</span></h5>
<button class="btn btn-sm" data-i18n="load">Load Data</button>

<!-- BAD -->
<h5>Building Collection Times</h5>
<button class="btn btn-sm">Load Data</button>
```

---

## 2. Dynamic JavaScript Rendering

When constructing dynamic HTML or tooltips in JavaScript:
* Prefer native `t('key')` from `src/js/fn/i18n.js` (or legacy `$.i18n('key')` bridge):
  ```javascript
  import { t } from '../fn/i18n.js';
  const label = t('available');
  ```
* Use parameter interpolation for dynamic values:
  ```javascript
  const message = t('reward_received', playerName, fpAmount);
  ```
* Never concatenate raw untranslated English words into the DOM.

---

## 3. Key Synchronization

Whenever a new key is added:
1. Add it to `src/i18n/en.json`.
2. Run `npm run i18n:fix` to propagate the key across all other language files.
3. Run `npm run i18n:check` to verify 100% dictionary completeness.
