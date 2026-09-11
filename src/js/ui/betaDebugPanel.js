const element = require('./AddElement.js');
require('../fn/liveNameResolver.js');

let betaCollapsed = false;

function toggleBeta() {
  betaCollapsed = !betaCollapsed;
  const betaText = document.getElementById('betaText');
  betaText?.classList?.toggle('show', !betaCollapsed);
  element.updateIcon('betaicon', 'betaText', betaCollapsed);
}

function renderBetaPanel(beta, value, total) {
  const previousText = document.getElementById('betaText')?.innerHTML || '';
  beta.innerHTML = `${element.close()}<p id="betaTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#betaText" aria-expanded="${!betaCollapsed}" aria-controls="betaText" style="cursor: pointer; user-select: none;"><span class="header-icon collapse-toggle fw-bold font-monospace" id="betaicon" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!betaCollapsed}" aria-controls="betaText" data-bs-target="#betaText" data-bs-toggle="collapse">${betaCollapsed ? '[+]' : '[-]'}</span> <strong>Town Hall</strong> ${value}FP Total: ${total}FP</p><div id="betaText" class="resize collapse ${betaCollapsed ? '' : 'show'}" style="max-height: 20em !important; overflow-y: auto !important;">${previousText}</div>`;
  beta.className = 'alert alert-dismissible alert-success';
  document.getElementById('betaicon')?.addEventListener('click', toggleBeta);
}

function appendBetaText(line) {
  const betaText =
    typeof document !== 'undefined' ?
      document.getElementById('betaText')
    : null;
  if (betaText) betaText.innerHTML += line;
}

function resetBetaPanel() {
  const betaText =
    typeof document !== 'undefined' ?
      document.getElementById('betaText')
    : null;
  // This debug panel is meant to eventually list every production type in
  // the city; right now it only tracks Forge Points, so label it as such
  // until the other types are added.
  if (betaText) {
    betaText.innerHTML =
      '<small class="text-muted d-block mb-1">Forge Points Production</small>';
  }
}

module.exports = { renderBetaPanel, appendBetaText, resetBetaPanel };
module.exports.default = module.exports;
