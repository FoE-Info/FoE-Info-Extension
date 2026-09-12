/** Guild Expedition (#donationDIV2) panel renderer, extracted from GuildExpeditionService.js. */
const { createLogger } = require('../utils/logger.js');

const logger = createLogger('ExpeditionPanel');

const {
  wrapExpeditionCard,
  attachSubpanelToggle,
} = require('./expeditionTables.js');

// Single long-lived observer reused across renders. `attachTableHandlers`
// disconnects it before re-observing the freshly rendered nodes, so detached
// panels are never retained.
let expeditionResizeObserver = null;

function getExpeditionResizeObserver() {
  if (typeof ResizeObserver === 'undefined') return null;
  if (!expeditionResizeObserver) {
    expeditionResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect?.height) {
          try {
            require('../fn/globals.js')?.setExpeditionSize?.(
              entry.contentRect.height,
            );
          } catch {}
        }
      }
    });
  }
  return expeditionResizeObserver;
}

function getDonationDiv2() {
  if (typeof document !== 'undefined') {
    const el =
      document.getElementById('donationDIV2') ||
      document.getElementById('donation2DIV');
    if (el) return el;
  }
  try {
    return require('../state/state.js').donationDIV2 || null;
  } catch {
    return null;
  }
}

function attachTableHandlers(container) {
  if (typeof document === 'undefined') return;
  const copyBtn = document.getElementById('expeditionCopyID');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      try {
        require('../utils/copy.js')?.ExpeditionCopy?.();
      } catch {}
    });
  }
  const copyChampBtn = document.getElementById('geChampionshipCopyID');
  if (copyChampBtn) {
    copyChampBtn.addEventListener('click', () => {
      try {
        require('../utils/copy.js')?.ExpeditionCopy?.('geChampionshipText');
      } catch {}
    });
  }
  const copyContribBtn = document.getElementById('geContributionCopyID');
  if (copyContribBtn) {
    copyContribBtn.addEventListener('click', () => {
      try {
        require('../utils/copy.js')?.ExpeditionCopy?.('geContributionText');
      } catch {}
    });
  }

  const toggleBtn = document.getElementById('expeditionicon');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      try {
        require('../fn/collapse.js')?.fCollapseExpedition?.();
      } catch {}
    });
  }

  attachSubpanelToggle(
    'geInternationalToggle',
    'geInternationalIcon',
    'geInternationalCollapse',
  );
  attachSubpanelToggle(
    'geContributionToggle',
    'geContributionIcon',
    'geContributionCollapse',
  );

  const observer = getExpeditionResizeObserver();
  if (observer) {
    if (typeof observer.disconnect === 'function') observer.disconnect();
    const observeEl = (id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    };
    observeEl('expeditionText');
    observeEl('geChampionshipText');
    observeEl('geContributionText');
  }
  try {
    require('../fn/i18n.js')?.translateContainer?.(container);
  } catch {}
}

function renderExpeditionPanel(contentHtml) {
  const container = getDonationDiv2();
  if (!container) return null;

  if (!contentHtml) {
    container.innerHTML = '';
    logger.debug('expedition panel cleared');
    return container;
  }

  container.id = 'donationDIV2';
  container.innerHTML = wrapExpeditionCard(contentHtml);
  attachTableHandlers(container);
  logger.debug('expedition panel rendered', {
    contentLength: contentHtml.length,
  });
  return container;
}

module.exports = { renderExpeditionPanel, getDonationDiv2 };
module.exports.default = renderExpeditionPanel;
