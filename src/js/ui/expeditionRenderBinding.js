/**
 * expeditionRenderBinding.js
 *
 * Subscribes the Guild Expedition panel to the reactive ExpeditionState. The
 * binding builds the combined International/Contribution content and hands it
 * to the panel renderer. Loaded for its side effect by the panel entry.
 */

const { expeditionState } = require('../state/ExpeditionState.js');
const { buildExpeditionContentHtml } = require('./expeditionTables.js');
const { renderExpeditionPanel } = require('./renderExpeditionPanel.js');

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('ExpeditionRenderBinding');
} catch {}

function resolveShowOptions() {
  try {
    const mod = require('../vars/showOptions.js');
    return mod.showOptions || mod || {};
  } catch {
    return {};
  }
}

function renderExpeditionFromState(state, options) {
  const contentHtml = buildExpeditionContentHtml(
    state.getInternationalEntries(),
    state.getContributionEntries(),
    options || {},
  );
  renderExpeditionPanel(contentHtml);
}

function bindExpeditionPanel(
  state = expeditionState,
  {
    renderExpedition = renderExpeditionFromState,
    getOptions = resolveShowOptions,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (
      channel !== 'international' &&
      channel !== 'contribution' &&
      channel !== 'all'
    ) {
      return;
    }
    logger?.debug?.('expedition state published', { channel });
    renderExpedition(snapshot, getOptions());
  });
}

bindExpeditionPanel();

module.exports = { bindExpeditionPanel, renderExpeditionFromState };
module.exports.default = module.exports;
