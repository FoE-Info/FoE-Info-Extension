# Bootstrap 5.3 JavaScript Lifecycle & Memory Hygiene

Guidelines for managing Bootstrap 5.3 component instances in Chrome Extension DevTools panels without memory leaks or jQuery dependencies.

---

## 1. Instance Management (No jQuery)

Bootstrap 5.3 provides native static methods on all component classes (`Popover`, `Tooltip`, `Collapse`, `Modal`, `Dropdown`, `Toast`).

### Good: Native Instance Retrieval
```javascript
import { Popover, Tooltip, Collapse } from 'bootstrap';

// Safely get existing instance or create a new one:
const popoverEl = document.getElementById('myPopover');
const popoverInstance = Popover.getOrCreateInstance(popoverEl, {
  container: 'body',
  html: true,
  trigger: 'hover focus',
});
```

### Bad: jQuery Wrappers (Deprecated)
```javascript
// BAD: Leaks memory and forces unnecessary jQuery dependency
$('#myPopover').popover({ container: 'body' });
```

---

## 2. Memory Leak Prevention & Lifecycle Teardown

In a Chrome extension DevTools panel, users switch between game tabs, reload cities, and visit other players hundreds of times. If Bootstrap components attached to removed DOM elements are not disposed of, detached DOM nodes accumulate and crash the DevTools process.

### The Teardown Protocol
Always dispose of component instances before removing or overwriting a DOM node:

```javascript
/**
 * Safely unmounts and disposes all Bootstrap tooltips and popovers
 * within a container before the container is modified or removed.
 */
export function disposeComponents(container) {
  if (!container) return;

  // 1. Dispose all Popovers
  const popovers = container.querySelectorAll('[data-bs-toggle="popover"]');
  popovers.forEach((el) => {
    const instance = Popover.getInstance(el);
    if (instance) {
      instance.dispose();
    }
  });

  // 2. Dispose all Tooltips
  const tooltips = container.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltips.forEach((el) => {
    const instance = Tooltip.getInstance(el);
    if (instance) {
      instance.dispose();
    }
  });
}
```

---

## 3. Dynamic Popover Initialization

When rendering dynamic HTML (e.g. from an InnoGames RPC response):

```javascript
export function initPopovers(container = document) {
  const elements = container.querySelectorAll('[data-bs-toggle="popover"]');
  elements.forEach((el) => {
    // Avoid double initialization
    if (Popover.getInstance(el)) return;

    Popover.getOrCreateInstance(el, {
      container: 'body',
      html: true,
      placement: el.getAttribute('data-bs-placement') || 'bottom',
      customClass: 'foe-popover',
    });
  });
}
```

**Key Invariant**: Always pass `container: 'body'` so popovers are positioned in the top-level document stacking context and are not clipped by parent `overflow: hidden` or narrow flex containers.
