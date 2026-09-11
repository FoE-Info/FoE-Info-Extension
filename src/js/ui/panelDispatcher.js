/**
 * panelDispatcher.js
 *
 * Container clearing dispatch routines and Guild Treasury card rendering.
 * Decoupled from monolithic src/js/index.js.
 * Dual CJS/ESM exports.
 */

let defaultElement = null;
let defaultCollapse = null;
let defaultCopy = null;
let defaultHelper = null;
let defaultShowOptions = null;
let defaultToolOptions = null;
let defaultSetTreasurySize = null;
let defaultResourceDefs = null;
let defaultTranslateContainer = null;

try {
  defaultElement = require('../fn/AddElement.js');
} catch {}
try {
  defaultCollapse = require('../fn/collapse.js');
} catch {}
try {
  defaultCopy = require('../fn/copy.js');
} catch {}
try {
  defaultHelper = require('../fn/helper.js');
} catch {}
try {
  const showOptModule = require('../vars/showOptions.js');
  defaultShowOptions =
    showOptModule.showOptions || showOptModule.default || showOptModule;
} catch {}
try {
  const globalsModule = require('../fn/globals.js');
  defaultToolOptions = globalsModule.toolOptions;
  defaultSetTreasurySize = globalsModule.setTreasurySize;
} catch {}
try {
  const resModule = require('../msg/ResourceService.js');
  defaultResourceDefs = resModule.ResourceDefs;
} catch {}
try {
  const i18nModule = require('../fn/i18n.js');
  defaultTranslateContainer = i18nModule.translateContainer;
} catch {}
let defaultPanelResize = null;
try {
  defaultPanelResize = require('./panelResize.js');
} catch {}

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('PanelDispatcher');
} catch {}

let setCurrentView = () => {};
try {
  ({ setCurrentView } = require('./cardVisibility.js'));
} catch {}

let renderSequence = 0;

function clearElement(el, resetClass = false) {
  if (!el) return;
  if (typeof el.replaceChildren === 'function') {
    el.replaceChildren();
  }
  el.innerHTML = '';
  if (resetClass) {
    el.className = '';
  }
}

function clearVisitPlayer(containers = {}) {
  const seq = ++renderSequence;
  logger?.debug('UI clear & re-render triggered: VisitPlayer', {
    seq,
    timestamp: Date.now(),
  });
  clearElement(containers.cityinvested);
  clearElement(containers.output);
  clearElement(containers.overview);
  clearElement(containers.donationDIV);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.cultural, true);
  clearElement(containers.friendsDiv);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);
}

function clearExpedition(containers = {}) {
  clearElement(containers.cityinvested);
  clearElement(containers.overview);
  clearElement(containers.alerts);
  clearElement(containers.donationDIV);
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.visitstats, true);
  clearElement(containers.cultural, true);
  clearElement(containers.friendsDiv);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);
}

function clearForBattleground(containers = {}) {
  setCurrentView('GBG');
  clearExpedition(containers);
}

function clearForMainCity(containers = {}) {
  setCurrentView('CITY');
  const seq = ++renderSequence;
  logger?.debug('UI clear & re-render triggered: MainCity', {
    seq,
    timestamp: Date.now(),
  });
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.targets);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.donationDIV);
  clearElement(containers.visitstats, true);
  clearElement(containers.cultural, true);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);
}

function clearStartup(containers = {}, resetState = {}) {
  setCurrentView('CITY');
  const seq = ++renderSequence;
  logger?.debug('UI clear & re-render triggered: Startup', {
    seq,
    timestamp: Date.now(),
  });
  clearElement(containers.cityinvested);
  clearElement(containers.output);
  clearElement(containers.overview);
  clearElement(containers.alerts);
  clearElement(containers.cityrewards);
  clearElement(containers.donationDIV);
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.citystats);
  clearElement(containers.visitstats, true);
  clearElement(containers.cultural, true);
  clearElement(containers.friendsDiv);
  clearElement(containers.armyDIV);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);

  if (typeof resetState.reset === 'function') {
    resetState.reset();
  }
  if (Array.isArray(resetState.GuildDonations)) {
    resetState.GuildDonations.length = 0;
  }
  if (Array.isArray(resetState.GuildTreasury)) {
    resetState.GuildTreasury.length = 0;
  }
  if (Array.isArray(resetState.GuildsGoods)) {
    resetState.GuildsGoods.length = 0;
  }
  if (resetState.Bonus && typeof resetState.Bonus === 'object') {
    resetState.Bonus.aid = 0;
    resetState.Bonus.spoils = 0;
    resetState.Bonus.diplomatic = 0;
    resetState.Bonus.strike = 0;
  }
  if (typeof resetState.clearRewardsState === 'function') {
    resetState.clearRewardsState();
  }
}

function clearCultural(containers = {}) {
  clearElement(containers.cityinvested);
  clearElement(containers.overview);
  clearElement(containers.donationDIV);
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.visitstats, true);
  clearElement(containers.friendsDiv);
  clearElement(containers.armyDIV);
  clearElement(containers.treasury);
  clearElement(containers.treasuryLog);
}

function clearForTreasury(containers = {}) {
  clearElement(containers.cityinvested);
  clearElement(containers.output);
  clearElement(containers.overview);
  clearElement(containers.alerts);
  clearElement(containers.donationDIV);
  clearElement(containers.incidents);
  clearElement(containers.donation2DIV);
  clearElement(containers.donationDIV2);
  clearElement(containers.greatbuilding);
  clearElement(containers.gbInfoDIV);
  clearElement(containers.guild);
  clearElement(containers.debug);
  clearElement(containers.info);
  clearElement(containers.visitstats, true);
  clearElement(containers.cultural, true);
  clearElement(containers.friendsDiv);
}

function getResourceAmount(res, id) {
  if (!res) return 0;
  const val = res instanceof Map ? res.get(id) : res[id];
  if (val == null) return 0;
  if (typeof val.toNumber === 'function') return val.toNumber();
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

function renderTreasuryPanel(resources, deps = {}) {
  if (!resources) return;
  const containers = deps.containers || deps;
  if (containers && typeof containers === 'object') {
    clearForTreasury(containers);
  }

  const showOpts = deps.showOptions || defaultShowOptions;
  if (showOpts && showOpts.showTreasury === false) return;

  const doc =
    deps.document || (typeof document !== 'undefined' ? document : null);
  const treasuryContainer =
    deps.treasury ||
    containers.treasury ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasury')
    : null);
  if (!treasuryContainer) return;

  if (treasuryContainer.classList?.contains('d-none')) {
    treasuryContainer.classList.remove('d-none');
  }
  if (treasuryContainer.style) {
    treasuryContainer.style.display = '';
  }

  let elem = deps.element || defaultElement;
  if (!elem) {
    try {
      elem = require('../fn/AddElement.js');
    } catch {}
  }
  elem = elem || {};

  let col = deps.collapse || defaultCollapse;
  if (!col) {
    try {
      col = require('../fn/collapse.js');
    } catch {}
  }
  col = col || {};

  let toolOpts = deps.toolOptions || defaultToolOptions;
  if (!toolOpts) {
    try {
      toolOpts = require('../fn/globals.js').toolOptions;
    } catch {}
  }
  toolOpts = toolOpts || {};

  let help = deps.helper || defaultHelper;
  if (!help) {
    try {
      help = require('../fn/helper.js');
    } catch {}
  }
  help = help || {};

  let rssDefs = deps.ResourceDefs || defaultResourceDefs;
  if (!rssDefs || rssDefs.length === 0) {
    try {
      const resModule = require('../msg/ResourceService.js');
      rssDefs = resModule.ResourceDefs;
    } catch {}
  }
  if (!rssDefs || rssDefs.length === 0) {
    try {
      const stateModule = require('../state/state.js');
      rssDefs = stateModule.ResourceDefs;
    } catch {}
  }
  rssDefs = rssDefs || [];

  let cpy = deps.copy || defaultCopy;
  if (!cpy) {
    try {
      cpy = require('../fn/copy.js');
    } catch {}
  }
  cpy = cpy || {};

  const ResizeObs =
    deps.ResizeObserver ||
    (typeof ResizeObserver !== 'undefined' ? ResizeObserver : null);
  let setTreasuryHeight = deps.setTreasurySize || defaultSetTreasurySize;
  if (!setTreasuryHeight) {
    try {
      setTreasuryHeight = require('../fn/globals.js').setTreasurySize;
    } catch {}
  }
  setTreasuryHeight = setTreasuryHeight || (() => {});

  let translate = deps.translateContainer || defaultTranslateContainer;
  if (!translate) {
    try {
      translate = require('../fn/i18n.js').translateContainer;
    } catch {}
  }
  translate = translate || (() => {});

  const closeHtml =
    typeof elem.close === 'function' ?
      elem.close()
    : '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
  const isCollapsed = Boolean(col.collapseTreasury);
  const iconHtml =
    typeof elem.icon === 'function' ?
      elem.icon('treasuryicon', 'treasuryText', isCollapsed)
    : '';
  const copyHtml =
    typeof elem.copy === 'function' ?
      elem.copy('treasuryCopyID', 'success', 'right', isCollapsed)
    : '';
  const rawTreasuryHeight = toolOpts.treasurySize;
  const treasuryHeight =
    typeof rawTreasuryHeight === 'number' && rawTreasuryHeight >= 80 ?
      rawTreasuryHeight
    : 200;

  let treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
	${closeHtml}<p id="treasuryTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#treasuryText" aria-expanded="${!isCollapsed}" aria-controls="treasuryText" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">`;
  treasuryHTML += iconHtml;
  treasuryHTML += `<strong><span data-i18n="treasury">Guild Treasury:</span></strong></p>`;
  treasuryHTML += copyHtml;
  treasuryHTML += `<div id="treasuryText" style="height: ${treasuryHeight}px" class="overflow-y resize collapse ${
    isCollapsed ? '' : 'show'
  }"><table id="treasurytable" class="goods-table w-100"><thead><tr><th class="text-start"><span data-i18n="type">Type</span></th><th class="text-end"><span data-i18n="amount">Amount</span></th></tr></thead><tbody>`;

  if (typeof deps.initTreasury === 'function') {
    deps.initTreasury(resources);
  }

  const numAges = help.numAges ?? 0;
  const matchedIds = new Set(['medals']);
  for (let i = 0; i < numAges; i++) {
    let eraTreasuryText = '';
    let currentEraName = '';
    rssDefs.forEach((rssDef) => {
      const amount = getResourceAmount(resources, rssDef.id);
      if (
        typeof help.fLevelfromAge === 'function' &&
        help.fLevelfromAge(rssDef.era) == numAges - i &&
        amount > 0
      ) {
        matchedIds.add(rssDef.id);
        if (typeof help.fGVGagesname === 'function') {
          currentEraName = help.fGVGagesname(rssDef.era);
        }
        if (!currentEraName) {
          currentEraName = rssDef.era;
        }
        const displayName = rssDef.name || rssDef.id;
        const safeName =
          typeof help.escapeHTML === 'function' ?
            help.escapeHTML(displayName)
          : displayName;
        eraTreasuryText += `<tr><td class="text-start">${safeName}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;
      }
    });
    if (eraTreasuryText) {
      treasuryHTML += `<tr><td colspan="2" class="goods-era-header">${currentEraName}</td></tr>${eraTreasuryText}`;
    }
  }

  const medals = getResourceAmount(resources, 'medals');
  if (medals > 0) {
    treasuryHTML += `<tr><td class="text-start">Medals</td><td class="text-end">${medals.toLocaleString()}</td></tr>`;
  }

  let otherTreasuryText = '';
  const allEntries =
    resources instanceof Map ?
      Array.from(resources.entries())
    : Object.entries(resources);
  for (const [resId] of allEntries) {
    if (!matchedIds.has(resId)) {
      const amount = getResourceAmount(resources, resId);
      if (amount > 0) {
        const displayName =
          (typeof help.fResourceShortName === 'function' ?
            help.fResourceShortName(resId)
          : null) || resId;
        const safeName =
          typeof help.escapeHTML === 'function' ?
            help.escapeHTML(displayName)
          : displayName;
        otherTreasuryText += `<tr><td class="text-start">${safeName}</td><td class="text-end">${amount.toLocaleString()}</td></tr>`;
      }
    }
  }
  if (otherTreasuryText) {
    treasuryHTML += `<tr><td colspan="2" class="goods-era-header">Other</td></tr>${otherTreasuryText}`;
  }

  treasuryContainer.innerHTML = treasuryHTML + `</tbody></table></div></div>`;

  const copyBtn =
    (typeof treasuryContainer.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryCopyID')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryCopyID')
    : null);
  if (copyBtn && typeof cpy.TreasuryCopy === 'function') {
    copyBtn.addEventListener('click', cpy.TreasuryCopy);
  }

  const labelBtn =
    (typeof treasuryContainer.querySelector === 'function' ?
      treasuryContainer.querySelector('#treasuryTextLabel')
    : null) ||
    (doc && typeof doc.getElementById === 'function' ?
      doc.getElementById('treasuryTextLabel')
    : null);
  if (labelBtn && typeof col.fCollapseTreasury === 'function') {
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
    typeof col.fCollapseTreasury === 'function'
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
      deps.bindResizableCollapse || defaultPanelResize?.bindResizableCollapse;
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

  if (doc && doc.body) {
    translate(doc.body);
  } else {
    translate(treasuryContainer);
  }
}

const panelDispatcher = {
  clearVisitPlayer,
  clearExpedition,
  clearForBattleground,
  clearForMainCity,
  clearStartup,
  clearCultural,
  renderTreasuryPanel,
};

module.exports = {
  ...panelDispatcher,
  default: panelDispatcher,
};
