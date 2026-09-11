/**
 * renderHeaderPanel.js
 *
 * Dedicated UI panel renderer for the City Info Header card (#header).
 * Integrates Player Points, Era, Guild, Daily Production, Combat Boosts
 * (Base, GBG, GE, QI), and City Boosts (Arc, CF, Coins, Supplies).
 * Dual CJS/ESM compatible.
 */

const { createLogger } = require('../utils/logger.js');
const { renderCityStats } = require('./renderCityStats.js');

let logger = null;
try {
  logger = createLogger('HeaderPanel');
} catch {}

/**
 * Renders the City Info Header into #header (or fallback #citystats).
 *
 * @param {HTMLElement|string} [containerOrId='header'] Target element or selector
 * @param {Object} [stats={}] City calculated stats
 * @param {Object} [playerInfo={}] Player identity & score info
 * @param {Object} [options={}] UI render options
 * @returns {string} Generated card HTML
 */
function renderHeaderPanel(
  containerOrId = 'header',
  stats = {},
  playerInfo = {},
  options = {},
) {
  let targetId = 'header';
  if (typeof containerOrId === 'string') {
    targetId = containerOrId.replace(/^#/, '');
  } else if (containerOrId && containerOrId.id) {
    targetId = containerOrId.id;
  }

  // If specified target does not exist in DOM, check header then citystats
  if (typeof document !== 'undefined') {
    if (
      !document.getElementById(targetId) &&
      document.getElementById('header')
    ) {
      targetId = 'header';
    } else if (
      !document.getElementById(targetId) &&
      document.getElementById('citystats')
    ) {
      targetId = 'citystats';
    }
  }

  if (logger) {
    logger.debug('renderHeaderPanel invoked', {
      targetId,
      player: playerInfo.name,
      score: playerInfo.score,
      era: playerInfo.era,
    });
  }

  return renderCityStats(targetId, stats, playerInfo, options);
}

module.exports = {
  renderHeaderPanel,
};
module.exports.default = renderHeaderPanel;
