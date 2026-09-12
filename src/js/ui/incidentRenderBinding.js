/**
 * incidentRenderBinding.js
 *
 * Subscribes the incidents panel renderer to the reactive IncidentState.
 * Renders into #incidents container when incidents or serverTime change.
 * Loaded for its side effect by renderBindings.js composition root.
 */

const { incidentState } = require('../state/IncidentState.js');

let incidentsPanelPkg = null;
try {
  incidentsPanelPkg = require('./incidentsPanel.js');
} catch {}

let showOptionsPkg = null;
try {
  showOptionsPkg = require('../vars/showOptions.js');
} catch {}

let globalsPkg = null;
try {
  globalsPkg = require('../fn/globals.js');
} catch {}

function bindIncidentPanels(
  state = incidentState,
  {
    renderer = incidentsPanelPkg?.fShowIncidents ||
      incidentsPanelPkg?.renderIncidentsPanel,
    targetEl = null,
    showOptions = showOptionsPkg?.showOptions,
    collapseIncidents = globalsPkg?.collapseIncidents,
    fCollapseIncidents = globalsPkg?.fCollapseIncidents,
  } = {},
) {
  if (!state || typeof state.subscribe !== 'function') return () => {};
  return state.subscribe((snapshot, channel) => {
    if (
      channel !== 'incidents' &&
      channel !== 'serverTime' &&
      channel !== 'all'
    ) {
      return;
    }
    if (typeof renderer !== 'function') return;

    const incidents = snapshot.getIncidents?.() || [];
    const serverTime = snapshot.getServerTime?.() || 0;

    const doc = typeof document !== 'undefined' ? document : null;
    const target = targetEl || (doc ? doc.getElementById('incidents') : null);

    renderer(target, {
      hiddenRewards: incidents,
      serverTime,
      showOptions:
        typeof showOptions === 'function' ? showOptions() : showOptions,
      collapseIncidents,
      fCollapseIncidents,
    });
  });
}

bindIncidentPanels();

module.exports = { bindIncidentPanels };
module.exports.default = module.exports;
