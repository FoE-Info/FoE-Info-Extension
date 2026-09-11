/**
 * renderIncidentsPanel.js
 *
 * Standalone UI card renderer for active and upcoming city incidents.
 * Fully decoupled from Harvest / Building Collection Times (#buildings).
 * Renders into #incidents container.
 * Dual CJS/ESM compatible.
 */

const { createLogger } = require('../utils/logger.js');
const {
  fShowIncidents,
  fIncidentName,
  buildIncidentTooltip,
  buildIncidentMarkup,
  INCIDENT_LOOKUP,
} = require('./incidentsPanel.js');

let logger = null;
try {
  logger = createLogger('IncidentsPanel');
} catch {}

/**
 * Renders the standalone incidents panel card into the DOM.
 *
 * @param {HTMLElement|null} [targetEl=null] Target container (defaults to #incidents)
 * @param {Object} [context={}] Runtime state options
 */
function renderIncidentsPanel(targetEl = null, context = {}) {
  const target =
    targetEl ||
    (typeof document !== 'undefined' ?
      document.getElementById('incidents')
    : null);

  const rewards =
    context.hiddenRewards ||
    (typeof window !== 'undefined' ? window.hiddenRewards : []);

  if (logger) {
    logger.debug('renderIncidentsPanel invoked', {
      hasTarget: !!target,
      rewardsCount: rewards ? rewards.length : 0,
    });
  }

  return fShowIncidents(target, context);
}

module.exports = {
  renderIncidentsPanel,
  fShowIncidents: renderIncidentsPanel,
  fIncidentName,
  buildIncidentTooltip,
  buildIncidentMarkup,
  INCIDENT_LOOKUP,
};
module.exports.default = renderIncidentsPanel;
