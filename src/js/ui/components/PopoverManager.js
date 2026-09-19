/**
 * PopoverManager.js
 *
 * Native HTML Popover API and CSS Anchor Positioning lifecycle manager for DevTools panels.
 * Provides unified, top-layer interactive popovers and tooltips without Popper.js/Bootstrap JS overhead.
 * Handles hover delays, selection retention, light-dismiss, and accessibility bindings.
 */

let logger = null;
try {
  const { createLogger } = require('../../utils/logger.js');
  logger = createLogger('PopoverManager');
} catch {
  logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

let activeTrigger = null;
let showTimer = null;
let hideTimer = null;
let isSelecting = false;

/**
 * Ensures the single top-layer #foe-popover element exists in the DOM.
 * @param {Document} [doc]
 * @returns {HTMLElement|null}
 */
function getOrCreatePopoverElement(doc) {
  const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
  if (!targetDoc || !targetDoc.body) return null;

  let popoverEl = targetDoc.getElementById('foe-popover');
  if (!popoverEl) {
    popoverEl = targetDoc.createElement('div');
    popoverEl.id = 'foe-popover';
    popoverEl.setAttribute('popover', 'auto');
    targetDoc.body.appendChild(popoverEl);
    bindPopoverElementEvents(popoverEl);
  }
  return popoverEl;
}

/**
 * Binds hover, selection, and toggle events to the top-layer popover container.
 * @param {HTMLElement} popoverEl
 */
function bindPopoverElementEvents(popoverEl) {
  if (!popoverEl || popoverEl._foeBound) return;
  popoverEl._foeBound = true;

  popoverEl.addEventListener('mouseenter', () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  });

  popoverEl.addEventListener('mouseleave', (e) => {
    if (
      activeTrigger &&
      (activeTrigger === e.relatedTarget ||
        activeTrigger.contains?.(e.relatedTarget))
    ) {
      return;
    }
    hideActivePopover();
  });

  popoverEl.addEventListener('mousedown', () => {
    isSelecting = true;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    const targetWin = popoverEl.ownerDocument?.defaultView || window;
    targetWin.addEventListener(
      'mouseup',
      () => {
        if (isSelecting) {
          isSelecting = false;
          if (
            popoverEl.matches?.(':hover') === false &&
            (!activeTrigger || activeTrigger.matches?.(':hover') === false)
          ) {
            hideActivePopover();
          }
        }
      },
      { once: true },
    );
  });

  popoverEl.addEventListener('toggle', (e) => {
    if (e.newState === 'closed') {
      clearActiveAnchor();
    }
  });
}

/**
 * Clears the active anchor CSS property and resets aria-expanded on trigger.
 */
function clearActiveAnchor() {
  if (activeTrigger) {
    try {
      activeTrigger.style.removeProperty('anchor-name');
      activeTrigger.setAttribute('aria-expanded', 'false');
    } catch {}
    activeTrigger = null;
  }
}

/**
 * Shows the native popover anchored to the specified trigger element.
 * @param {HTMLElement} triggerEl
 */
function showPopoverForTrigger(triggerEl) {
  if (!triggerEl) return;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (showTimer) return;

  showTimer = setTimeout(() => {
    showTimer = null;
    const doc = triggerEl.ownerDocument || document;
    const popoverEl = getOrCreatePopoverElement(doc);
    if (!popoverEl) return;

    if (activeTrigger && activeTrigger !== triggerEl) {
      clearActiveAnchor();
    }

    activeTrigger = triggerEl;
    try {
      triggerEl.style.setProperty('anchor-name', '--active-popover-trigger');
      triggerEl.setAttribute('aria-expanded', 'true');
    } catch {}

    const title =
      triggerEl.getAttribute('data-bs-title') ||
      triggerEl.getAttribute('data-title') ||
      triggerEl.getAttribute('data-foe-title') ||
      triggerEl.getAttribute('title') ||
      '';

    // Store title in data-foe-title and clear title to prevent native browser tooltip collision
    if (triggerEl.hasAttribute('title')) {
      triggerEl.setAttribute('data-foe-title', title);
      triggerEl.removeAttribute('title');
    }

    const content =
      triggerEl.getAttribute('data-bs-content') ||
      triggerEl.getAttribute('data-content') ||
      '';

    if (!title && !content) {
      clearActiveAnchor();
      return;
    }

    if (!content && title) {
      // Compact tooltip variant
      popoverEl.className = 'popover-compact';
      popoverEl.textContent = title;
    } else {
      // Rich popover variant
      popoverEl.className = '';
      let html = '';
      if (title) {
        html += `<h3 class="popover-header">${title}</h3>`;
      }
      html += `<div class="popover-body">${content}</div>`;
      popoverEl.innerHTML = html;
    }

    if (typeof popoverEl.showPopover === 'function') {
      try {
        popoverEl.showPopover();
      } catch (err) {
        logger.debug('showPopover error:', err);
      }
    }
  }, 80);
}

/**
 * Hides the native popover after a grace delay.
 * @param {HTMLElement} [triggerEl]
 */
function hidePopoverForTrigger(triggerEl) {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  if (hideTimer) clearTimeout(hideTimer);

  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (isSelecting) return;

    const doc = triggerEl?.ownerDocument || document;
    const popoverEl = doc?.getElementById?.('foe-popover');
    if (popoverEl && popoverEl.matches?.(':hover')) return;

    hideActivePopover(doc);
  }, 350);
}

/**
 * Immediately closes the active popover and clears state.
 * @param {Document} [doc]
 */
function hideActivePopover(doc) {
  clearActiveAnchor();
  const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
  const popoverEl = targetDoc?.getElementById?.('foe-popover');
  if (popoverEl && typeof popoverEl.hidePopover === 'function') {
    try {
      popoverEl.hidePopover();
    } catch (err) {
      logger.debug('hidePopover error:', err);
    }
  }
}

/**
 * Initializes and binds interactive tooltips and popovers within a container element.
 * Retains exact backward compatibility signature for existing callers.
 *
 * @param {HTMLElement} container Container element
 */
function initPopovers(container) {
  if (!container || typeof container.querySelectorAll !== 'function') return;

  try {
    const triggers = container.querySelectorAll(
      '[data-bs-toggle="popover"], [data-popover], [data-bs-toggle="tooltip"], [data-tooltip]',
    );

    triggers.forEach((el) => {
      if (el._foePopoverBound) return;
      el._foePopoverBound = true;

      // Accessibility setup
      if (typeof el.setAttribute === 'function') {
        if (!el.getAttribute('role')) {
          el.setAttribute('role', 'button');
        }
        if (!el.hasAttribute('tabindex')) {
          el.setAttribute('tabindex', '0');
        }
        el.setAttribute('aria-haspopup', 'dialog');
        el.setAttribute('aria-expanded', 'false');
      }

      el.addEventListener('mouseenter', () => showPopoverForTrigger(el));
      el.addEventListener('mouseleave', (e) => {
        const doc = el.ownerDocument || document;
        const popoverEl = doc?.getElementById?.('foe-popover');
        if (
          popoverEl &&
          e.relatedTarget &&
          (popoverEl === e.relatedTarget ||
            popoverEl.contains?.(e.relatedTarget))
        ) {
          return;
        }
        hidePopoverForTrigger(el);
      });

      el.addEventListener('focus', () => showPopoverForTrigger(el));
      el.addEventListener('blur', () => hidePopoverForTrigger(el));

      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const doc = el.ownerDocument || document;
        const popoverEl = doc?.getElementById?.('foe-popover');
        if (activeTrigger === el && popoverEl?.matches?.(':popover-open')) {
          hideActivePopover(doc);
        } else {
          showPopoverForTrigger(el);
        }
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          hideActivePopover(el.ownerDocument || document);
        }
      });
    });
  } catch (err) {
    logger.debug('initPopovers error:', err);
  }
}

module.exports = {
  initPopovers,
  hideActivePopover,
  getOrCreatePopoverElement,
};
module.exports.default = initPopovers;
