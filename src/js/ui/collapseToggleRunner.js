/**
 * collapseToggleRunner.js
 *
 * Declarative executor and helper for panel collapse toggles, managing icon
 * state updates, copy element visibility, tooltip cleanup, and persistence.
 */

const { createLogger } = require('../utils/logger.js');

const logger = createLogger('CollapseToggleRunner');

function getBootstrap() {
  if (typeof window !== 'undefined' && window.bootstrap) {
    return window.bootstrap;
  }
  try {
    return require('bootstrap');
  } catch {
    return null;
  }
}

function getStorage() {
  try {
    return require('../utils/storage.js');
  } catch {
    try {
      return require('../fn/storage.js');
    } catch {
      return null;
    }
  }
}

function getElement() {
  try {
    return require('./AddElement.js');
  } catch {
    try {
      return require('../fn/AddElement.js');
    } catch {
      return null;
    }
  }
}

/**
 * Hides all active Bootstrap popovers and tooltips.
 *
 * @param {Document|null} [doc]
 * @param {Object|null} [bs]
 */
function hideAllTooltips(doc = null, bs = null) {
  const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
  if (!targetDoc || typeof targetDoc.querySelectorAll !== 'function') {
    return;
  }
  const bootstrapInstance = bs || getBootstrap();
  if (!bootstrapInstance) {
    return;
  }

  if (bootstrapInstance.Popover?.getOrCreateInstance) {
    const popoverTriggerList = targetDoc.querySelectorAll(
      '[data-bs-toggle="popover"]',
    );
    for (const popoverEl of popoverTriggerList) {
      try {
        bootstrapInstance.Popover.getOrCreateInstance(popoverEl).hide();
      } catch (err) {
        logger.debug('Popover hide error:', err);
      }
    }
  }

  if (bootstrapInstance.Tooltip?.getOrCreateInstance) {
    const tooltipTriggerList = targetDoc.querySelectorAll(
      '[data-bs-toggle="tooltip"]',
    );
    for (const tooltipEl of tooltipTriggerList) {
      try {
        bootstrapInstance.Tooltip.getOrCreateInstance(tooltipEl).hide();
      } catch (err) {
        logger.debug('Tooltip hide error:', err);
      }
    }
  }
}

/**
 * Executes a collapse toggle specification.
 *
 * @param {Object} spec
 * @param {() => boolean} spec.get Current collapse state getter
 * @param {(val: boolean) => void} spec.set New collapse state setter
 * @param {string} [spec.key] Persistence key
 * @param {boolean} [spec.persist] Whether to persist state in storage
 * @param {boolean} [spec.hideTooltips] Whether to hide tooltips on toggle
 * @param {Array<string|{id: string, display?: string}>} [spec.copyEls]
 * @param {Array<{iconId: string|(() => string), targetId: string|(() => string)}>} [spec.icons]
 * @param {(next: boolean, doc?: Document) => void} [spec.onToggle] Custom callback
 * @param {Object} [deps]
 * @returns {boolean} The new collapse state
 */
function executeToggle(spec, deps = {}) {
  const targetDoc =
    deps.doc || (typeof document !== 'undefined' ? document : null);
  const stor = deps.storage || getStorage();
  const el = deps.element || getElement();
  const bs = deps.bootstrap || getBootstrap();

  if (spec.hideTooltips) {
    hideAllTooltips(targetDoc, bs);
  }

  const next = !spec.get();
  spec.set(next);

  if (spec.persist && spec.key && stor?.setCollapse) {
    stor.setCollapse(spec.key, next);
  }

  if (targetDoc) {
    if (Array.isArray(spec.copyEls)) {
      for (const item of spec.copyEls) {
        const id = typeof item === 'string' ? item : item.id;
        const display = (typeof item === 'object' && item.display) || 'block';
        const copyEl = targetDoc.getElementById(id);
        if (copyEl) {
          copyEl.style.display = next ? 'none' : display;
        }
      }
    }

    if (typeof spec.onToggle === 'function') {
      spec.onToggle(next, targetDoc);
    }
  }

  if (Array.isArray(spec.icons)) {
    for (const icon of spec.icons) {
      const iconId =
        typeof icon.iconId === 'function' ?
          icon.iconId(targetDoc)
        : icon.iconId;
      const targetId =
        typeof icon.targetId === 'function' ?
          icon.targetId(targetDoc)
        : icon.targetId;
      el?.updateIcon?.(iconId, targetId, next);
    }
  }

  return next;
}

/**
 * Creates a zero-argument toggle handler for a spec.
 *
 * @param {Object} spec
 * @param {Object} [deps]
 * @returns {() => boolean}
 */
function createToggle(spec, deps = {}) {
  return () => executeToggle(spec, deps);
}

module.exports = {
  executeToggle,
  createToggle,
  hideAllTooltips,
};
