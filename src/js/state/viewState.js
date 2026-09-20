/**
 * viewState.js
 *
 * State bridge for active view context (OWN_CITY, GBG, GE, QI, SETTLEMENT, OTHER_PLAYER).
 * Decouples domain services in src/js/msg/ from direct presentation dependencies in src/js/ui/.
 */

let cardVis = null;
try {
  cardVis = require('../ui/cardVisibility.js');
} catch {}

function setCurrentView(view) {
  if (typeof cardVis?.setCurrentView === 'function') {
    cardVis.setCurrentView(view);
  }
}

function getCurrentView() {
  return typeof cardVis?.getCurrentView === 'function' ?
      cardVis.getCurrentView()
    : 'OWN_CITY';
}

module.exports = {
  setCurrentView,
  getCurrentView,
};
module.exports.default = module.exports;
