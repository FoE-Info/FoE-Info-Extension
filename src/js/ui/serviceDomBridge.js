const { sanitizeHTML } = require('../utils/html.mjs');
/**
 * serviceDomBridge.js
 *
 * Centralized DOM access layer for msg/ services. Extracted to enforce
 * docs/architecture.md §42 layer purity: services must not touch the DOM
 * directly. Every function here is a thin, stateless adapter over
 * document.getElementById / createElement / innerHTML for a well-known
 * panel element. Data logic stays in the service; rendering stays in
 * ui/ panel modules. This bridge handles the cross-boundary lookup and
 * mutation that cannot be fully delegated to a panel module because the
 * service is the originating call site.
 */
const {
  updateActivePopoverContent,
} = require('./components/PopoverManager.js');

const { translateContainer } = require('../utils/i18n.js');

function translateDynamicMarkup(container) {
  if (typeof translateContainer === 'function') {
    translateContainer(container);
  }
}

const logger = (() => {
  try {
    return require('../utils/logger.js').createLogger('ServiceDomBridge');
  } catch {
    return { debug() {}, warn() {} };
  }
})();

// ---------------------------------------------------------------------------
// 1. Citystats container (StartupService)
// ---------------------------------------------------------------------------

/**
 * Returns the existing `#citystats` element or creates one and prepends it
 * to `#content` (or `<body>` / `<html>` as fallback). Previously lived in
 * StartupService.ensureCitystatsContainer.
 */
function getCitystatsEl() {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById('citystats');
  if (!el) {
    el = document.createElement('div');
    const root =
      document.getElementById('content') ||
      document.body ||
      document.documentElement;
    if (root) root.insertBefore(el, root.childNodes[0] || null);
    el.id = 'citystats';
    logger.debug('Created #citystats container');
  }
  return el;
}

// ---------------------------------------------------------------------------
// 2. FP & Clan Goods spans (StartupService renderLiveCityStats)
// ---------------------------------------------------------------------------

/**
 * Updates the `#fp` span with the daily forge-point total and boost
 * breakdown tooltip. Previously inlined in StartupService.renderLiveCityStats.
 *
 * @param {number} opts.forgePoints - Final FP count for the day
 * @param {string} opts.fpTooltipHTML - Pre-formatted popover HTML
 * @param {boolean} [opts.boostAlreadyAdded] - If true, skip the boost append
 */
function updateFpDisplay({ forgePoints, fpTooltipHTML, boostAlreadyAdded }) {
  if (typeof document === 'undefined') return;
  const fpSpan = document.getElementById('fp');
  if (!fpSpan) return;

  const label = document.createElement('span');
  label.setAttribute('data-i18n', 'daily');
  fpSpan.replaceChildren(label, document.createTextNode(`: ${forgePoints}FP`));
  translateDynamicMarkup(fpSpan);

  if (fpTooltipHTML && !boostAlreadyAdded) {
    fpSpan.setAttribute('data-bs-content', fpTooltipHTML);
  }
}

/**
 * Updates the `#clanGoods` span with the boosted clan-goods total and
 * popover tooltip. Previously inlined in StartupService.renderLiveCityStats.
 *
 * @param {number} opts.clanGoods - Boosted clan-goods total
 * @param {string} [opts.tooltipHTML] - Pre-formatted popover HTML
 */
function updateClanGoodsDisplay({ clanGoods, tooltipHTML }) {
  if (typeof document === 'undefined') return;
  const clanSpan = document.getElementById('clanGoods');
  if (!clanSpan) return;

  const label = document.createElement('span');
  label.setAttribute('data-i18n', 'guildgoods');
  clanSpan.replaceChildren(label, document.createTextNode(`: ${clanGoods}`));
  translateDynamicMarkup(clanSpan);
  if (tooltipHTML) {
    clanSpan.setAttribute('data-bs-content', tooltipHTML);
  }
}

// ---------------------------------------------------------------------------
// 3. Startup finish-render wiring (StartupService startupService)
// ---------------------------------------------------------------------------

/**
 * Attaches the copy-button click handler and runs translateContainer on
 * the document body. Previously inlined in the `finishRender` callback of
 * StartupService.startupService.
 *
 * @param {object}   opts
 * @param {object}   [opts.copy]        - copy module with fCityStatsCopy
 * @param {boolean}  [opts.collapseStats] - If true, skip the copy-button bind
 * @param {Function} [opts.translateContainer] - i18n translateContainer
 */
function wireStartupFinishRender({ copy, collapseStats, translateContainer }) {
  if (typeof document === 'undefined') return;

  if (!collapseStats) {
    const copyBtn = document.getElementById('citystatsCopyID');
    if (copyBtn && copy?.fCityStatsCopy) {
      copyBtn.addEventListener('click', copy.fCityStatsCopy);
    }
  }

  if (typeof translateContainer === 'function' && document.body) {
    translateContainer(document.body);
  }
}

// ---------------------------------------------------------------------------
// 4. GBG panel clearing (GuildBattlegroundService clearBattleground)
// ---------------------------------------------------------------------------

/**
 * Clears the `#costs` and `#targetsGBG` panels when the battleground
 * state is reset. Previously inlined in GuildBattlegroundService.
 */
function clearBattlegroundDisplay() {
  if (typeof document === 'undefined') return;
  const costsEl = document.getElementById('costs');
  if (costsEl) costsEl.innerHTML = '';
  const targetsGbgEl = document.getElementById('targetsGBG');
  if (targetsGbgEl) targetsGbgEl.innerHTML = '';
}

// ---------------------------------------------------------------------------
// 5. City-rewards container lookup (GbDonationService / GreatBuildingsService)
// ---------------------------------------------------------------------------

/**
 * Resolves the rewards container element. Tries `#cityrewards`, then
 * `#rewards`. Previously duplicated in both GbDonationService and
 * GreatBuildingsService.
 *
 * @returns {HTMLElement|null}
 */
function findCityRewardsContainer() {
  if (typeof document === 'undefined') return null;
  return (
    document.getElementById('cityrewards') || document.getElementById('rewards')
  );
}

// ---------------------------------------------------------------------------
// 6. Visit container (OtherPlayerService)
// ---------------------------------------------------------------------------

/**
 * Clears the `#visit` panel when a new visited-city RPC arrives.
 * Previously inlined in OtherPlayerService.otherPlayerService.
 */
function clearVisitDisplay() {
  if (typeof document === 'undefined') return;
  const visitEl = document.getElementById('visit');
  if (visitEl) visitEl.innerHTML = '';
}

// ---------------------------------------------------------------------------
// 7. Guild overview visibility (OtherPlayerService guildHandler)
// ---------------------------------------------------------------------------

/**
 * Un-hides the `#guildOverview` panel when a guild RPC arrives.
 * Previously inlined in OtherPlayerService guildHandler.
 */
function showGuildOverview() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('guildOverview');
  if (!el) return;
  if (el.classList?.contains('d-none')) {
    el.classList.remove('d-none');
  }
  if (el.style) {
    el.style.display = '';
  }
}

// ---------------------------------------------------------------------------
// 8. Available forge-points display (InventoryService)
// ---------------------------------------------------------------------------

/**
 * Sets the `#availableFPID` text to the computed forge-point sum.
 * Previously inlined in InventoryService.getItems.
 *
 * @param {number|string} fpSum
 */
function updateAvailableFpDisplay(fpSum) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('availableFPID');
  if (el) el.textContent = String(fpSum);
}

// ---------------------------------------------------------------------------
// 9. GBG target-message rendering (ConversationService)
// ---------------------------------------------------------------------------

/**
 * Renders a GBG target alert into `#targetsGBG`. This is the full DOM
 * render that was previously the `renderTargetMessage` function inside
 * ConversationService. It creates the container if absent, injects the
 * HTML, and wires Bootstrap alert / collapse listeners.
 *
 * @param {object} opts
 * @param {string} opts.html          - Fully-formed inner HTML string
 * @param {object} opts.collapse      - Collapse state module
 * @param {object} [opts.postTargets] - postTargetsToDiscord function
 * @param {object} [opts.state]       - guildBattlegroundState
 * @returns {{ alertEl: HTMLElement|null, timerId: string }}
 */
function renderGbgTargetMessage({
  html,
  collapse: collapseMod,
  postTargets,
  state: gbgState,
}) {
  if (typeof document === 'undefined') {
    return { alertEl: null, timerId: '' };
  }

  let targetsGBG = document.getElementById('targetsGBG');
  if (!targetsGBG) {
    targetsGBG = document.createElement('div');
    targetsGBG.id = 'targetsGBG';
    const targets = document.getElementById('targets');
    if (targets && typeof targets.appendChild === 'function') {
      targets.appendChild(targetsGBG);
    }
  }

  targetsGBG.innerHTML = sanitizeHTML(html);
  translateDynamicMarkup(targetsGBG);

  const timerId = Math.random().toString(36).substr(2, 5);

  // Wire label click → collapse toggle
  const targetLabel = document.getElementById('targetLabel');
  if (targetLabel && collapseMod?.fCollapseTarget) {
    targetLabel.addEventListener('click', collapseMod.fCollapseTarget);
  }

  // Wire post button click
  if (postTargets) {
    const postBtn = document.getElementById('targetPostID');
    if (postBtn) {
      postBtn.addEventListener('click', postTargets);
    }
  }

  // Wire Bootstrap alert close
  const alertEl = document.getElementById(`alert-${timerId}`);
  if (alertEl) {
    const handleClose = () => {
      gbgState?.setTargetMessageActive?.(false);
    };
    alertEl.addEventListener('closed.bs.alert', handleClose);
    alertEl
      ?.querySelector?.('.btn-close')
      ?.addEventListener?.('click', handleClose);
  }

  return { alertEl, timerId };
}

function refreshFpPopover(html) {
  if (!html || typeof document === 'undefined') return;
  const el = document.getElementById('fp');
  if (!el) return;
  updateActivePopoverContent(el, html);
  // Bootstrap popovers are optional alongside the native popover manager.
  try {
    require('bootstrap')
      .Popover.getInstance(el)
      ?.setContent({ '.popover-body': html });
  } catch {}
}

function applyStartupLocale(locale) {
  if (typeof $ !== 'undefined' && typeof $.i18n === 'function')
    $.i18n({ locale });
}

module.exports = {
  refreshFpPopover,
  applyStartupLocale,
  getCitystatsEl,
  updateFpDisplay,
  updateClanGoodsDisplay,
  wireStartupFinishRender,
  clearBattlegroundDisplay,
  findCityRewardsContainer,
  clearVisitDisplay,
  showGuildOverview,
  updateAvailableFpDisplay,
  renderGbgTargetMessage,
};
module.exports.default = module.exports;
