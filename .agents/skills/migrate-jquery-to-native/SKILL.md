---
name: migrate-jquery-to-native
description: "Replace legacy jQuery with modern Web APIs and fetch."
---

# Migrate jQuery to Native Web APIs

This runbook guides migrating legacy jQuery constructs across the FoE-Info Extension codebase to modern, dependency-free ECMAScript and native Web APIs (`querySelector`, `addEventListener`, `fetch`, CSS/Web Animations).

---

## 1. Applicability Guard & When to Use

FoE-Info is actively transitioning to native DOM and modern Web APIs:
- Refactoring legacy files in `src/js/` that still use `$()` selectors, jQuery event bindings, or Ajax.
- Removing deprecated jQuery methods or cleaning up DOM manipulation bottlenecks.
- Replacing legacy jQuery i18n calls with the native `src/js/utils/i18n.js` engine.

---

## 2. Core Migration Cheat Sheet

| Legacy jQuery Pattern | Native Web API Replacement |
| :--- | :--- |
| `$(selector)` / `$('.class')` | `document.querySelector(selector)` / `document.querySelectorAll(selector)` |
| `$(parent).find(child)` | `parent.querySelectorAll(child)` |
| `$el.on('click', fn)` | `el.addEventListener('click', fn)` |
| `$(parent).on('click', sel, fn)` | `parent.addEventListener('click', (e) => { const target = e.target.closest(sel); if (target && parent.contains(target)) fn.call(target, e); })` |
| `$el.addClass(c)` / `$el.removeClass(c)` | `el.classList.add(c)` / `el.classList.remove(c)` |
| `$el.toggleClass(c, bool)` | `el.classList.toggle(c, bool)` |
| `$el.css('display', 'none')` / `$el.hide()` | `el.style.display = 'none'` (or native `el.hidden = true`) |
| `$el.attr('id')` / `$el.prop('checked')` | `el.getAttribute('id')` / `el.checked` |
| `$el.data('key')` / `$el.data('key', val)` | `el.dataset.key` / `el.dataset.key = val` |
| `$el.empty()` / `$el.remove()` | `el.replaceChildren()` / `el.remove()` |
| `$el.append(html)` / `$el.html(str)` | `el.append(node)` / `el.textContent = str` (avoid unsafe `.innerHTML`) |
| `$.ajax({ url, success, error })` | `fetch(url, { signal }).then(r => r.json()).catch(err => ...)` |
| `$(document).ready(fn)` | Top-level ES module execution or `document.addEventListener('DOMContentLoaded', fn)` |

---

## 3. Localization & i18n Invariants

- The extension uses a native vanilla translation engine in `src/js/utils/i18n.js` (`t()`, `translateContainer()`).
- Replace `$.i18n('key')` or `$el.i18n()` with:
  ```javascript
  import { t, translateContainer } from '../utils/i18n.js';
  const label = t('my_key');
  translateContainer(domElement);
  ```
- Do NOT introduce new calls to the legacy `$.fn.i18n` bridge.

---

## 4. XSS Security & DOM Safety

- Replace `$el.html(untrusted)` with safe DOM building, `textContent`, or `<template>` element cloning.
- Audit all migrated DOM insertions to prevent Cross-Site Scripting (XSS).
- Use `element.replaceChildren()` instead of `element.innerHTML = ''` to clear children safely.

---

## 5. Verification Checklist

1. [ ] Zero new jQuery imports or `$()` calls introduced in touched files.
2. [ ] All event handlers cleanly detached on component teardown or using modern `AbortSignal` listeners.
3. [ ] Event delegation correctly uses `e.target.closest(selector)`.
4. [ ] Run `npm test` and `npm run check` to verify linting and tests pass.

---

## Modern Web Guidance (Project Overlay)

Apply the `modern-web-guidance` library with the FoE-Info overlay: [modern-web-guidance](../modern-web-guidance/SKILL.md) and [project conventions](../modern-web-guidance/references/project-conventions.md).
Primary reference categories: `js/`, `ui-behaviors/`, `ui-atoms/`.
Uphold:
- prefer native popover/`<dialog>`/`<details>`
- batch DOM writes (no `innerHTML +=`)
- route timestamps through `resolveDate()`
