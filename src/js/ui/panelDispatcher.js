/**
 * panelDispatcher.js
 *
 * Container clearing dispatch routines and view state transitions.
 * Delegates Guild Treasury rendering to src/js/ui/renderTreasuryPanel.js.
 * Dual CJS/ESM exports.
 */

let defaultResourceDefs = null;
try {
  const stateModule = require('../state/state.js');
  defaultResourceDefs = stateModule.ResourceDefs;
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

const {
  renderTreasuryPanel,
  clearForTreasury,
} = require('./renderTreasuryPanel.js');

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

function clearVisitPlayer() {
  setCurrentView('OTHER_PLAYER');
}

function clearExpedition() {
  setCurrentView('GE');
}

function clearForBattleground() {
  setCurrentView('GBG');
}

function clearForMainCity() {
  setCurrentView('OWN_CITY');
}

function clearStartup(containers = {}, resetState = {}) {
  setCurrentView('OWN_CITY');
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

function clearCultural() {
  setCurrentView('SETTLEMENT');
}

const panelDispatcher = {
  clearVisitPlayer,
  clearExpedition,
  clearForBattleground,
  clearForMainCity,
  clearStartup,
  clearCultural,
  clearForTreasury,
  renderTreasuryPanel,
  defaultResourceDefs,
};

module.exports = {
  ...panelDispatcher,
  default: panelDispatcher,
};
