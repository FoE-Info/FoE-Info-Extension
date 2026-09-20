/**
 * treasuryPanelEvents.js
 *
 * Attaches event listeners (copy, collapse toggle, icon) and observes resizable height for Guild Treasury.
 * Decoupled from src/js/ui/renderTreasuryPanel.js.
 * Dual CJS/ESM exports.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('TreasuryPanelEvents');
} catch {}

let defaultPanelResize = null;
try {
  defaultPanelResize = require('./panelResize.js');
} catch {}

function bindTreasuryEvents({
  treasuryContainer,
  doc,
  cpy,
  col,
  treasuryHeight,
  setTreasuryHeight,
  bindResizableCollapse,
  ResizeObs,
}) {
  if (!treasuryContainer) return;

  logger?.debug('Binding treasury panel events', {
    hasDoc: Boolean(doc),
    hasContainer: Boolean(treasuryContainer),
  });

  const copyBtn =
    (typeof treasuryContainer.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryCopyID')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryCopyID')
    : null);
  if (copyBtn && typeof cpy?.TreasuryCopy === 'function') {
    copyBtn.addEventListener('click', cpy.TreasuryCopy);
  }

  const labelBtn =
    (typeof treasuryContainer.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryTextLabel')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryTextLabel')
    : null);
  if (labelBtn && typeof col?.fCollapseTreasury === 'function') {
    labelBtn.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#treasuryicon')
      ) {
        return;
      }
      col.fCollapseTreasury();
    });
  }

  const iconBtn =
    (typeof treasuryContainer.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryicon')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryicon')
    : null);
  if (
    iconBtn &&
    iconBtn !== labelBtn &&
    typeof col?.fCollapseTreasury === 'function'
  ) {
    iconBtn.addEventListener('click', () => {
      col.fCollapseTreasury();
    });
  }

  const treasuryDiv =
    (typeof treasuryContainer.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryText')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryText')
    : null);
  if (treasuryDiv) {
    const bindFn =
      bindResizableCollapse || defaultPanelResize?.bindResizableCollapse;
    if (bindFn) {
      bindFn({
        element: treasuryDiv,
        initialSize: treasuryHeight,
        minSize: 80,
        onResize: setTreasuryHeight,
        ResizeObserverClass: ResizeObs,
      });
    } else if (ResizeObs) {
      try {
        const resizeObserver = new ResizeObs((entries) => {
          for (const entry of entries) {
            const height = entry.contentRect?.height;
            const isCollapsing =
              treasuryDiv.classList?.contains('collapsing') ||
              (treasuryDiv.classList &&
                !treasuryDiv.classList.contains('show'));
            if (typeof height === 'number' && height >= 80 && !isCollapsing) {
              setTreasuryHeight(height);
            }
          }
        });
        resizeObserver.observe(treasuryDiv);
      } catch (err) {
        console.error('[FoEInfo] Failed to observe treasuryDiv resize:', err);
      }
    }
  }
}

module.exports = {
  bindTreasuryEvents,
  default: {
    bindTreasuryEvents,
  },
};
