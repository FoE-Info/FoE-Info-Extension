/**
 * panelResize.js
 *
 * Manages resizing, collapse transitions, and size persistence for collapsible
 * resizable panels (e.g. Army, Goods, Treasury, Expedition).
 *
 * Invariants:
 * 1. Restores the panel to its default or custom size on expand, preventing
 *    expansion to full content height.
 * 2. Ignores collapse and expand transitions in ResizeObserver to prevent
 *    intermediate or max-content heights from corrupting stored settings.
 * 3. Smoothly animates expansion to the target size rather than the full scroll height.
 * 4. Automatically detects and persists genuine user resizing.
 */

const { createLogger } = require('../utils/logger.js');
const logger = createLogger('PanelResize');

function bindResizableCollapse({
  element,
  initialSize = 185,
  minSize = 50,
  onResize,
  ResizeObserverClass,
} = {}) {
  if (!element) return null;

  let currentSize =
    typeof initialSize === 'number' && initialSize >= minSize ?
      Math.round(initialSize)
    : minSize;
  let isTransitioning = false;
  let transitionTimer = null;

  if (element.classList && element.classList.contains('show')) {
    element.style.height = `${currentSize}px`;
  }

  if (typeof element.addEventListener === 'function') {
    element.addEventListener('show.bs.collapse', () => {
      isTransitioning = true;
      if (transitionTimer) {
        clearTimeout(transitionTimer);
        transitionTimer = null;
      }
      element.style.maxHeight = `${currentSize}px`;
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          element.style.height = `${currentSize}px`;
        });
      }
      logger.debug('show.bs.collapse', { currentSize });
    });

    element.addEventListener('shown.bs.collapse', () => {
      element.style.height = `${currentSize}px`;
      element.style.maxHeight = '';
      if (transitionTimer) clearTimeout(transitionTimer);
      transitionTimer = setTimeout(() => {
        isTransitioning = false;
        transitionTimer = null;
      }, 60);
      logger.debug('shown.bs.collapse restored height', { currentSize });
    });

    element.addEventListener('hide.bs.collapse', () => {
      isTransitioning = true;
      if (transitionTimer) {
        clearTimeout(transitionTimer);
        transitionTimer = null;
      }
      element.style.maxHeight = '';
      logger.debug('hide.bs.collapse');
    });

    element.addEventListener('hidden.bs.collapse', () => {
      isTransitioning = false;
      logger.debug('hidden.bs.collapse');
    });
  }

  const RO =
    ResizeObserverClass ||
    (typeof ResizeObserver !== 'undefined' ? ResizeObserver : null);

  let resizeObserver = null;
  if (RO) {
    try {
      resizeObserver = new RO((entries) => {
        if (isTransitioning) return;
        if (
          element.classList?.contains('collapsing') ||
          (element.classList && !element.classList.contains('show'))
        ) {
          return;
        }
        for (const entry of entries) {
          const height = entry.contentRect?.height;
          if (typeof height === 'number' && height >= minSize) {
            const rounded = Math.round(height);
            if (Math.abs(rounded - currentSize) >= 2) {
              currentSize = rounded;
              logger.debug('User resized panel', { newSize: currentSize });
              if (typeof onResize === 'function') {
                onResize(currentSize);
              }
            }
          }
        }
      });
      resizeObserver.observe(element);
    } catch (err) {
      logger.warn('Failed to observe element resize', err);
    }
  }

  return {
    resizeObserver,
    getCurrentSize: () => currentSize,
    setCurrentSize: (size) => {
      if (typeof size === 'number' && size >= minSize) {
        currentSize = Math.round(size);
        if (element.classList && element.classList.contains('show')) {
          element.style.height = `${currentSize}px`;
        }
      }
    },
    disconnect: () => {
      if (resizeObserver && typeof resizeObserver.disconnect === 'function') {
        resizeObserver.disconnect();
      }
      if (transitionTimer) {
        clearTimeout(transitionTimer);
        transitionTimer = null;
      }
    },
  };
}

module.exports = {
  bindResizableCollapse,
};
module.exports.default = module.exports;
