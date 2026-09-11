const element = require('./AddElement.js');
require('../fn/liveNameResolver.js');
const panelResize = require('./panelResize.js');
const { createLogger } = require('../utils/logger.js');

let storage = null;
try {
  storage = require('../utils/storage.js');
} catch {
  storage = null;
}

const logger = createLogger('BetaDebugPanel');

const BETA_HEIGHT_KEY = 'beta:height';
const BETA_DEFAULT_HEIGHT = 250;
const BETA_MIN_SIZE = 50;

let betaResizeController = null;

function readBetaHeight(store = storage) {
  try {
    const stored = store?.getSync?.(BETA_HEIGHT_KEY);
    if (typeof stored === 'number' && stored >= BETA_MIN_SIZE) {
      return Math.round(stored);
    }
  } catch {
    // storage unavailable in headless environments
  }
  return BETA_DEFAULT_HEIGHT;
}

function saveBetaHeight(height, store = storage) {
  if (typeof height !== 'number' || height < BETA_MIN_SIZE) return;
  const rounded = Math.round(height);
  try {
    store?.set?.(BETA_HEIGHT_KEY, rounded);
    logger.debug('Persisted beta panel height', { height: rounded });
  } catch {
    // storage unavailable in headless environments
  }
}

function bindBetaCollapse(betaText, deps = {}) {
  if (!betaText) return;
  const store = deps.storage || storage;

  if (typeof betaResizeController?.disconnect === 'function') {
    betaResizeController.disconnect();
  }
  betaResizeController = null;

  const bindFn =
    deps.bindResizableCollapse || panelResize?.bindResizableCollapse;
  if (typeof bindFn === 'function') {
    betaResizeController = bindFn({
      element: betaText,
      initialSize: readBetaHeight(store),
      minSize: BETA_MIN_SIZE,
      onResize:
        typeof deps.onResize === 'function' ?
          deps.onResize
        : (height) => saveBetaHeight(height, store),
      ResizeObserverClass: deps.ResizeObserver,
    });
  }

  if (typeof betaText.addEventListener === 'function') {
    betaText.addEventListener('hidden.bs.collapse', () => {
      element.updateIcon('betaicon', 'betaText', true);
    });
    betaText.addEventListener('shown.bs.collapse', () => {
      element.updateIcon('betaicon', 'betaText', false);
    });
  }
}

function renderBetaPanel(beta, value, total, deps = {}) {
  if (!beta) return;
  const store = deps.storage || storage;
  const previousEl =
    typeof document !== 'undefined' ?
      document.getElementById('betaText')
    : null;
  const previousText = previousEl?.innerHTML || '';
  const collapsed =
    previousEl ? !previousEl.classList?.contains('show') : false;
  const initialHeight = readBetaHeight(store);

  beta.innerHTML = `${element.close()}<p id="betaTextLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#betaText" aria-expanded="${!collapsed}" aria-controls="betaText" style="cursor: pointer; user-select: none;"><span class="header-icon collapse-toggle fw-bold font-monospace" id="betaicon" role="button" tabindex="0" aria-label="Toggle section" aria-expanded="${!collapsed}" aria-controls="betaText" data-bs-target="#betaText" data-bs-toggle="collapse">${collapsed ? '[+]' : '[-]'}</span> <strong>Town Hall</strong> ${value}FP Total: ${total}FP</p><div id="betaText" class="resize collapse ${collapsed ? '' : 'show'}">${previousText}</div>`;
  beta.className = 'alert alert-dismissible alert-success';

  const betaText =
    typeof document !== 'undefined' ?
      document.getElementById('betaText')
    : null;
  bindBetaCollapse(betaText, deps);
  logger.debug('Rendered beta panel', {
    value,
    total,
    collapsed,
    initialHeight,
  });
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
