/**
 * gbgTargetGenerator.js
 *
 * GBG target generator feature: province lock sorting, target token assembly,
 * card markup, and DOM event attachment.
 *
 * Extracted from gbgPanel.js because the target generator is a feature a user
 * names independently of the battleground result card, leaderboard, province
 * cost table, and roster views. It changes on its own schedule and shares no
 * state with them beyond the injected dependencies below.
 */

let createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});
try {
  ({ createLogger } = require('../utils/logger.js'));
} catch {}

const logger = createLogger('GbgTargetGenerator');

let GbgCalculator = {};
try {
  GbgCalculator = require('../calc/GbgCalculator.js');
} catch {}

let collapse = {};
try {
  collapse = require('../fn/collapse.js');
} catch {}

let post_webstore = {};
try {
  post_webstore = require('../fn/post.js');
} catch {}

let guildBattlegroundState = null;
try {
  ({ guildBattlegroundState } = require('../state/GuildDomainState.js'));
} catch {}

// ============================================================================
// 1. LOCK SORTING
// ============================================================================

function sortProvincesByLock(map = []) {
  const mapSorted = Array.from(map || []);
  mapSorted.sort((a, b) => {
    if (!a.lockedUntil) return 1;
    if (!b.lockedUntil) return -1;
    return (
      a.lockedUntil > b.lockedUntil ? 1
      : a.lockedUntil < b.lockedUntil ? -1
      : 0
    );
  });
  return mapSorted;
}

// ============================================================================
// 2. TOKEN ASSEMBLER
// ============================================================================

function buildTargetGeneratorTargets(params = {}) {
  const {
    map = [],
    signals = [],
    provinceDefs = [],
    volcanoProvinceDefs = [],
    waterfallProvinceDefs = [],
    currentParticipantId = 0,
    mapName = '',
    epocTime,
    showOptions: opts = {},
    gameOrigin = '',
    targetText = '',
    formatTime = null,
  } = params;

  const calculateAttrition =
    params.calculateProvinceAttrition ||
    GbgCalculator.calculateProvinceAttrition ||
    (() => ({ campsReady: 0, campsNotReady: 0 }));
  const formatSector =
    params.formatSectorName ||
    GbgCalculator.formatSectorName ||
    ((name) => name);
  const formatCamps =
    params.formatCampsText || GbgCalculator.formatCampsText || (() => '');
  const formatToken =
    params.formatTargetToken || GbgCalculator.formatTargetToken || (() => '');

  let textProvinceUnlocked = '';
  let textProvinceLocked = '';

  const mapSorted = sortProvincesByLock(map);
  const activeDefs =
    provinceDefs && provinceDefs.length > 0 ? provinceDefs
    : volcanoProvinceDefs && volcanoProvinceDefs.length > 0 ?
      volcanoProvinceDefs
    : waterfallProvinceDefs && waterfallProvinceDefs.length > 0 ?
      waterfallProvinceDefs
    : [];

  const isWaterfall =
    mapName === 'waterfall' ||
    (waterfallProvinceDefs.length > 0 && volcanoProvinceDefs.length === 0);

  mapSorted.forEach((province) => {
    signals.forEach((clan) => {
      const clanProvId =
        clan.provinceId !== undefined ? clan.provinceId : clan.id;
      const clanSignal = clan.signal !== undefined ? clan.signal : clan.type;

      if (province.id !== clanProvId || clanSignal !== 'focus') return;
      if (
        province.ownerId !== undefined &&
        currentParticipantId &&
        province.ownerId === currentParticipantId
      ) {
        return;
      }

      const thisdef = activeDefs.find(
        (def) => (def.id !== undefined ? def.id : 0) === (province.id ?? 0),
      );
      if (!thisdef) return;

      const connectedProvinces = (thisdef.connections || [])
        .map((connId) => mapSorted.find((p) => p.id === connId))
        .filter(Boolean);

      const { campsReady, campsNotReady } = calculateAttrition({
        connectedProvinces,
        currentParticipantId,
        currentEpoc: epocTime,
        gainAttritionChance: province.gainAttritionChance,
      });

      const sectorTag = formatSector(
        thisdef.name,
        isWaterfall ? 'waterfall' : mapName,
      );
      const campsText =
        opts.GBGshowSC && (campsReady || campsNotReady) ?
          formatCamps(campsReady, campsNotReady, true)
        : '';

      let timeText = '';
      if (province.lockedUntil && opts.GBGprovinceTime) {
        const time = new Date(province.lockedUntil * 1000);
        if (typeof formatTime === 'function') {
          timeText = formatTime(time, gameOrigin, opts);
        }
      }

      const text = formatToken({
        sectorTag,
        targetText: targetText ? String(targetText).trim() : undefined,
        campsText: campsText || undefined,
        timeText: timeText || undefined,
      });

      if (province.lockedUntil && opts.GBGprovinceTime) {
        if (textProvinceLocked !== '') textProvinceLocked += '<br>';
        textProvinceLocked += text;
      } else {
        if (textProvinceUnlocked !== '') textProvinceUnlocked += '<br>';
        textProvinceUnlocked += text;
      }
    });
  });

  return { textProvinceUnlocked, textProvinceLocked };
}

// ============================================================================
// 3. CARD MARKUP & EVENTS
// ============================================================================

function targetCopy(copyToClipboard) {
  copyToClipboard('#targetGenText');
  if (typeof document !== 'undefined') {
    const el = document.getElementById('targetGenText');
    if (el) console.debug(el.innerHTML);
  }
}

function bindTargetGeneratorEvents({
  onTargetCopy = null,
  onTargetPost = null,
  post_webstore: depPost = post_webstore,
  collapse: depCollapse = collapse,
  Tooltip = null,
} = {}) {
  if (typeof document === 'undefined') return;

  const copyBtn = document.getElementById('targetCopyID');
  if (copyBtn && typeof onTargetCopy === 'function') {
    copyBtn.addEventListener('click', onTargetCopy);
  }

  const postBtn = document.getElementById('targetGenPostID');
  const postHandler =
    typeof onTargetPost === 'function' ? onTargetPost
    : typeof depPost?.postTargetGenToDiscord === 'function' ?
      depPost.postTargetGenToDiscord
    : typeof depPost?.postTargetsToDiscord === 'function' ?
      depPost.postTargetsToDiscord
    : null;
  if (postBtn && postHandler) {
    postBtn.addEventListener('click', postHandler);
  }

  const labelEl = document.getElementById('targetGenLabel');
  if (labelEl && typeof depCollapse?.fCollapseTargetGen === 'function') {
    labelEl.addEventListener('click', (e) => {
      if (
        e?.target &&
        typeof e.target.closest === 'function' &&
        e.target.closest('#targetGenicon')
      ) {
        return;
      }
      depCollapse.fCollapseTargetGen();
    });
  }

  const iconEl = document.getElementById('targetGenicon');
  if (
    iconEl &&
    iconEl !== labelEl &&
    typeof depCollapse?.fCollapseTargetGen === 'function'
  ) {
    iconEl.addEventListener('click', () => {
      depCollapse.fCollapseTargetGen();
    });
  }

  const siegecamp_tooltip = document.getElementById('siegecamp_tooltip');
  if (siegecamp_tooltip && typeof Tooltip === 'function') {
    try {
      new Tooltip(siegecamp_tooltip, {
        html: true,
        delay: { show: 200, hide: 500 },
      });
    } catch {}
  }
}

function buildTargetGeneratorMarkup({
  targetsHTML = '',
  textProvinceUnlocked = '',
  textProvinceLocked = '',
  collapse: depCollapse = collapse,
} = {}) {
  const isShow = depCollapse?.collapseTargetGen === false ? 'show' : '';
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
  collapse: depCollapse = collapse,
  targetCopy: onTargetCopy = null,
  targetPost: onTargetPost = null,
  Tooltip = null,
  post_webstore: depPost = post_webstore,
} = {}) {
  if (textProvinceUnlocked || textProvinceLocked) {
    const markup = buildTargetGeneratorMarkup({
      targetsHTML,
      textProvinceUnlocked,
      textProvinceLocked,
      collapse: depCollapse,
    });
    if (targetGenerator) targetGenerator.innerHTML = markup;
    bindTargetGeneratorEvents({
      onTargetCopy,
      onTargetPost,
      post_webstore: depPost,
      collapse: depCollapse,
      Tooltip,
    });
    return markup;
  }
  if (targetGenerator) targetGenerator.innerHTML = '';
  return '';
}

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
    showOptions: depShowOptions = {},
    gameOrigin = '',
    targetText = '',
    element: depElement = {},
    collapse: depCollapse = {},
    helper: depHelper = {},
    url: depUrl = {},
    post_webstore: depPostWebstore = {},
    targetCopy: onTargetCopy = null,
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
      showOptions: depShowOptions,
      gameOrigin,
      targetText,
      formatTime,
    });

  if (
    (!isChatActive || params.signalChanged) &&
    !textProvinceUnlocked &&
    !textProvinceLocked
  ) {
    logger.debug('target generator cleared: no focus provinces resolved');
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
  sortProvincesByLock,
  buildTargetGeneratorTargets,
  targetCopy,
  bindTargetGeneratorEvents,
  buildTargetGeneratorMarkup,
  renderTargetGeneratorCard,
  renderTargetGeneratorPanel,
};
module.exports.default = module.exports;
