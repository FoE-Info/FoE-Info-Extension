/**
 * gbgRenderBinding.js
 *
 * Subscribes the Guild Battlegrounds panels to the reactive
 * GuildBattlegroundState. Targets, battle result, leaderboard, and
 * building-cost cards repaint independently. Loaded for its side effect by
 * renderBindings.js.
 *
 * The renderer dependency graph is mixed CJS/ESM; ESM collaborators are
 * required defensively so the module stays importable in the Node test runner
 * (mirrors panelDispatcher.js). Webpack resolves them in the extension.
 */

const {
  guildBattlegroundState,
} = require('../state/GuildBattlegroundState.js');

let collapse = {};
let copy = {};
let element = {};
let helper = {};
let post_webstore = {};
let setBuildingCostSize = null;
let toolOptions = {};
let showOptions = {};
let battlegroundDIV = null;
let content = null;
let donationDIV = null;
let targets = null;
let url = {};

try {
  collapse = require('../fn/collapse.js');
} catch {}
try {
  copy = require('../fn/copy.js');
} catch {}
try {
  element = require('../fn/AddElement.js');
} catch {}
try {
  helper = require('../fn/helper.js');
} catch {}
try {
  post_webstore = require('../fn/post.js');
} catch {}
try {
  ({ setBuildingCostSize, toolOptions } = require('../fn/globals.js'));
} catch {}
try {
  ({ showOptions } = require('../vars/showOptions.js'));
} catch {}
try {
  ({
    battlegroundDIV,
    content,
    donationDIV,
    targets,
    url,
  } = require('../vars/state.js'));
} catch {}

const {
  buildBuildingCostsTableHTML,
  buildingCostCopy,
  renderBuildingCostCard,
} = require('./gbgProvinceView.js');
const {
  renderBattlegroundResultCard,
} = require('./renderBattlegroundResultCard.js');
const {
  renderTargetGeneratorPanel,
} = require('./renderTargetGeneratorCard.js');

let renderGbgLeaderboardPanel = null;
try {
  ({ renderGbgLeaderboardPanel } = require('./renderBattlegroundsPanel.js'));
} catch {}

function resolveTooltip() {
  try {
    return require('bootstrap').Tooltip;
  } catch {
    return null;
  }
}

function buildTargetParams(payload = {}) {
  return {
    targetsContainer: targets,
    showOptions,
    element,
    collapse,
    helper,
    url,
    post_webstore,
    targetPost: post_webstore?.postTargetGenToDiscord,
    Tooltip: resolveTooltip(),
    map: payload.map,
    signals: payload.signals,
    provinceDefs: payload.provinceDefs,
    volcanoProvinceDefs: payload.volcanoProvinceDefs,
    waterfallProvinceDefs: payload.waterfallProvinceDefs,
    currentParticipantId: payload.currentParticipantId,
    mapName: payload.mapName,
    epocTime: payload.epocTime,
    gameOrigin: payload.gameOrigin,
    targetText: payload.targetText,
    formatTime: payload.formatTime,
  };
}

function renderProvinceCosts(payload = {}) {
  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return null;

  let costsDiv = doc.getElementById('costs');
  if (!costsDiv) {
    costsDiv = doc.createElement('div');
    costsDiv.id = 'costs';
    if (content && typeof content.appendChild === 'function') {
      content.appendChild(costsDiv);
    }
  }

  const costsHTML = buildBuildingCostsTableHTML({
    map: payload.map,
    ProvinceDefs: payload.provinceDefs,
    mapName: payload.mapName,
    BuildingDefs: payload.buildingDefs,
    helper,
  });

  return renderBuildingCostCard({
    costsDiv,
    costsHTML,
    collapse,
    buildingCostCopy,
    toolOptions,
    setBuildingCostSize,
    helper,
    element,
    ResizeObserverClass:
      typeof ResizeObserver !== 'undefined' ? ResizeObserver : null,
  });
}

function buildResultOptions(payload = {}) {
  const targetEl =
    (typeof document !== 'undefined' &&
      document.getElementById('battleground')) ||
    battlegroundDIV ||
    donationDIV;

  return {
    targetEl,
    collapseState: collapse.collapseBattleground,
    helper,
    element,
    collapse,
    copy,
    url,
    post_webstore,
    onRow: payload.onRow,
  };
}

function bindGuildBattlegroundPanels(
  state = guildBattlegroundState,
  {
    renderTargets = renderTargetGeneratorPanel,
    renderResult = renderBattlegroundResultCard,
    renderLeaderboard = renderGbgLeaderboardPanel,
    renderCosts = renderProvinceCosts,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (channel === 'targets' || channel === 'all') {
      const payload = snapshot.getTargets();
      if (payload) renderTargets(buildTargetParams(payload));
    }
    if (channel === 'result' || channel === 'all') {
      const payload = snapshot.getResult();
      if (payload)
        renderResult(payload.responseData, buildResultOptions(payload));
    }
    if (channel === 'leaderboard' || channel === 'all') {
      const payload = snapshot.getLeaderboard();
      if (payload && typeof renderLeaderboard === 'function') {
        renderLeaderboard(payload.leaderboard, {
          translateContainer: helper?.translateContainer,
        });
      }
    }
    if (channel === 'province' || channel === 'all') {
      const payload = snapshot.getProvince();
      if (payload) renderCosts(payload);
    }
  });
}

bindGuildBattlegroundPanels();

module.exports = {
  bindGuildBattlegroundPanels,
  buildTargetParams,
  buildResultOptions,
  renderProvinceCosts,
};
module.exports.default = module.exports;
