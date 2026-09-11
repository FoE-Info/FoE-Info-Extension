---
trigger: model_decision
description: Mandate that all user-visible text, tooltips, and labels use internationalization (i18n) bindings rather than hardcoded English strings.
---

# Rule: Internationalization (i18n) Compliance

Forge of Empires extensions support multi-language locales. Hardcoding English strings in HTML templates or dynamically generated DOM elements breaks the user experience for non-English players.

---

## 1. Template Localization

All user-visible static headers, labels, buttons, and placeholders must include localization bindings:
* For templates using `data-i18n` attributes:
  ```html
  <!-- GOOD -->
  <h5><span data-i18n="collection">Building Collection Times</span></h5>
  <button class="btn btn-sm" data-i18n="load">Load Data</button>

  <!-- BAD -->
  <h5>Building Collection Times</h5>
  <button class="btn btn-sm">Load Data</button>
  ```
* Ensure every user-facing label or button has a corresponding localization key.

---

## 2. Dynamic JavaScript Rendering

When constructing dynamic HTML or tooltips in JavaScript:
* Always use `t('key')` from `src/js/utils/i18n.js` (or `translateContainer(container)` for DOM subtrees).
* Use parameter interpolation for dynamic values:
  ```javascript
  const message = t('reward_received', playerName, fpAmount);
  ```
* Never concatenate raw untranslated English words into the DOM.

---

## 3. Key Synchronization

Whenever a new key is added:
1. Add it to the canonical English locale source (`src/i18n/en.json`).
2. Propagate the key across all other language files using `npm run i18n:fix`.
3. Run `npm run i18n:check` to verify key completeness across all 7 locales (`de`, `el`, `en`, `es`, `fr`, `gr`, `it`).
