/**
 * renderTargetGeneratorCard.js
 *
 * GBG Target Generator card rendering, alert header construction, and container orchestration.
 * Calculation/token assembly delegated to targetTokenAssembler.js; event binding delegated
 * to targetGeneratorEvents.js to maintain modular line-budget constraints (<= 250 lines).
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GbgTargetGen');
} catch {
  logger = { debug() {}, info() {}, warn() {}, error() {} };
}

let guildBattlegroundState = null;
try {
  ({ guildBattlegroundState } = require('../state/GuildBattlegroundState.js'));
} catch {}

const gbgProvinceView = require('./gbgProvinceView.js');
const {
  sortProvincesByLock,
  buildTargetGeneratorTargets,
} = require('./targetTokenAssembler.js');
const { bindTargetGeneratorEvents } = require('./targetGeneratorEvents.js');

function targetCopy() {
  gbgProvinceView.copyToClipboard('#targetGenText');
  if (typeof document !== 'undefined') {
    const el = document.getElementById('targetGenText');
    if (el) console.debug(el.innerHTML);
  }
}

function buildTargetGeneratorMarkup({
  targetsHTML = '',
  textProvinceUnlocked = '',
  textProvinceLocked = '',
  collapse = {},
} = {}) {
  const isShow = collapse?.collapseTargetGen === false ? 'show' : '';
  const separator = textProvinceUnlocked !== '' ? '<br>' : '';
  return (
    targetsHTML +
    `<div id="targetGenCollapse" class="collapse ${isShow}"><p id="targetGenText">` +
    textProvinceUnlocked +
    separator +
    textProvinceLocked +
    `</p></div>`
  );
}

function renderTargetGeneratorCard({
  targetGenerator,
  targetsHTML = '',
  textProvinceUnlocked = '',
  textProvinceLocked = '',
  collapse = {},
  targetCopy: onTargetCopy = targetCopy,
  targetPost: onTargetPost = null,
  Tooltip = null,
  helper = {},
  url = {},
  post_webstore = {},
} = {}) {
  if (textProvinceUnlocked || textProvinceLocked) {
    const markup = buildTargetGeneratorMarkup({
      targetsHTML,
      textProvinceUnlocked,
      textProvinceLocked,
      collapse,
    });
    if (targetGenerator) targetGenerator.innerHTML = markup;
    bindTargetGeneratorEvents({
      onTargetCopy,
      onTargetPost,
      post_webstore,
      collapse,
      Tooltip,
    });
    return markup;
  }
  if (targetGenerator) targetGenerator.innerHTML = '';
  return '';
}

/**
 * Renders the GBG Target Generator card. Resolves/creates the #targetsGBG
 * container, builds the alert header with copy/webhook controls and the
 * unlocked/locked target text, then delegates mounting and listener wiring
 * to renderTargetGeneratorCard.
 */
function renderTargetGeneratorPanel(params = {}) {
  const {
    targetsContainer = null,
    map = [],
    signals = [],
    provinceDefs = [],
    volcanoProvinceDefs = [],
    waterfallProvinceDefs = [],
    currentParticipantId = 0,
    mapName = '',
    epocTime,
    showOptions = {},
    gameOrigin = '',
    targetText = '',
    element: depElement = {},
    collapse: depCollapse = {},
    helper: depHelper = {},
    url: depUrl = {},
    post_webstore: depPostWebstore = {},
    targetCopy: onTargetCopy = targetCopy,
    targetPost: onTargetPost = null,
    Tooltip = null,
    formatTime = null,
  } = params;

  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return '';

  const isChatActive =
    params.guildBattlegroundState?.isTargetMessageActive?.() ??
    guildBattlegroundState?.isTargetMessageActive?.() ??
    false;

  const existingTargetsGBG = doc.getElementById('targetsGBG');
  if (
    existingTargetsGBG &&
    typeof existingTargetsGBG.innerHTML === 'string' &&
    existingTargetsGBG.innerHTML.includes('targetText') &&
    isChatActive &&
    !params.signalChanged
  ) {
    return '';
  }

  let targetGenerator = doc.createElement('div');
  if (doc.getElementById('targetsGBG')) {
    targetGenerator = doc.getElementById('targetsGBG');
  } else {
    targetGenerator.id = 'targetsGBG';
    if (
      targetsContainer &&
      typeof targetsContainer.appendChild === 'function'
    ) {
      targetsContainer.appendChild(targetGenerator);
    }
  }

  const timerId = Math.random().toString(36).substr(2, 5);
  const canPost =
    depUrl?.discordTargetURL &&
    ((typeof depHelper?.checkGBG === 'function' && depHelper.checkGBG()) ||
      Boolean(depHelper?.MyGuildPermissions & 64));
  const postBtnHTML =
    canPost && typeof depElement?.post === 'function' ?
      depElement.post(
        'targetGenPostID',
        'primary',
        'right',
        depCollapse.collapseTargetGen,
      )
    : '';
  const copyBtnHTML =
    typeof depElement?.copy === 'function' ?
      depElement.copy(
        'targetCopyID',
        'primary',
        'right',
        depCollapse.collapseBattleground,
      )
    : '';
  const iconHTML =
    typeof depElement?.icon === 'function' ?
      depElement.icon(
        'targetGenicon',
        'targetGenCollapse',
        depCollapse.collapseTargetGen,
      )
    : '';

  const targetsHTML =
    `<div class="alert-${timerId} alert alert-info alert-dismissible show" role="status" aria-live="polite">` +
    (typeof depElement?.close === 'function' ? depElement.close() : '') +
    postBtnHTML +
    copyBtnHTML +
    `<p id="targetGenLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#targetGenCollapse" aria-expanded="${!depCollapse.collapseTargetGen}" aria-controls="targetGenCollapse" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">` +
    iconHTML +
    `<strong>GBG Target Generator:</strong></p>`;

  const { textProvinceUnlocked, textProvinceLocked } =
    buildTargetGeneratorTargets({
      map,
      signals,
      provinceDefs,
      volcanoProvinceDefs,
      waterfallProvinceDefs,
      currentParticipantId,
      mapName,
      epocTime,
      showOptions,
      gameOrigin,
      targetText,
      formatTime,
    });

  logger?.debug('renderTargetGeneratorPanel summary:', {
    textProvinceUnlocked,
    textProvinceLocked,
    signalsCount: Array.isArray(signals) ? signals.length : 0,
  });

  if (
    (!isChatActive || params.signalChanged) &&
    !textProvinceUnlocked &&
    !textProvinceLocked
  ) {
    if (targetGenerator) {
      targetGenerator.innerHTML = '';
    }
    return '';
  }

  return renderTargetGeneratorCard({
    targetGenerator,
    targetsHTML,
    textProvinceUnlocked,
    textProvinceLocked,
    collapse: depCollapse,
    targetCopy: onTargetCopy,
    targetPost: onTargetPost,
    Tooltip,
    helper: depHelper,
    url: depUrl,
    post_webstore: depPostWebstore,
  });
}

module.exports = {
  renderTargetGeneratorCard,
  renderTargetGeneratorPanel,
  buildTargetGeneratorTargets,
  sortProvincesByLock,
  buildTargetGeneratorMarkup,
  targetCopy,
};
module.exports.default = module.exports;
