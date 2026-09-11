/**
 * renderTargetGeneratorCard.js
 *
 * GBG Target Generator card rendering, signal matching, and attrition token
 * assembly, extracted from GuildBattlegroundService.checkProvinces.
 *
 * Kept separate from gbgProvinceView.js to respect the 600-line module cap.
 * `copyToClipboard` remains in gbgProvinceView.js and is reused there.
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('GbgTargetGen');
} catch {
  logger = { debug() {}, info() {}, warn() {}, error() {} };
}

let GbgCalculator = {};
try {
  GbgCalculator = require('../calc/GbgCalculator.js');
} catch {}

const gbgProvinceView = require('./gbgProvinceView.js');

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

    if (targetGenerator) {
      targetGenerator.innerHTML = markup;
    }

    if (typeof document !== 'undefined') {
      const copyBtn = document.getElementById('targetCopyID');
      if (copyBtn && typeof onTargetCopy === 'function') {
        copyBtn.addEventListener('click', onTargetCopy);
      }

      const postBtn = document.getElementById('targetGenPostID');
      const postHandler =
        typeof onTargetPost === 'function' ? onTargetPost
        : typeof post_webstore?.postTargetGenToDiscord === 'function' ?
          post_webstore.postTargetGenToDiscord
        : typeof post_webstore?.postTargetsToDiscord === 'function' ?
          post_webstore.postTargetsToDiscord
        : null;
      if (postBtn && postHandler) {
        postBtn.addEventListener('click', postHandler);
      }

      const labelEl = document.getElementById('targetGenLabel');
      if (labelEl && typeof collapse?.fCollapseTargetGen === 'function') {
        labelEl.addEventListener('click', (e) => {
          if (
            e?.target &&
            typeof e.target.closest === 'function' &&
            e.target.closest('#targetGenicon')
          ) {
            return;
          }
          collapse.fCollapseTargetGen();
        });
      }
      const iconEl = document.getElementById('targetGenicon');
      if (
        iconEl &&
        iconEl !== labelEl &&
        typeof collapse?.fCollapseTargetGen === 'function'
      ) {
        iconEl.addEventListener('click', () => {
          collapse.fCollapseTargetGen();
        });
      }

      const siegecamp_tooltip = document.getElementById('siegecamp_tooltip');
      if (siegecamp_tooltip && typeof Tooltip === 'function') {
        try {
          new Tooltip(siegecamp_tooltip, {
            html: true,
            delay: { show: 200, hide: 500 },
          });
        } catch (e) {}
      }
    }

    return markup;
  } else {
    if (targetGenerator) {
      targetGenerator.innerHTML = '';
    }
    return '';
  }
}

/**
 * Sorts provinces so locked sectors (soonest unlock first) are processed
 * first, preserving the legacy checkProvinces ordering.
 */
function sortProvincesByLock(map = []) {
  const mapSorted = Array.from(map || []);
  mapSorted.sort(function (a, b) {
    if (!a.lockedUntil) return 1;
    else if (!b.lockedUntil) return -1;
    else
      return (
        a.lockedUntil > b.lockedUntil ? 1
        : b.lockedUntil > a.lockedUntil ? -1
        : 0
      );
  });
  return mapSorted;
}

/**
 * Builds the unlocked/locked target token strings from the current map,
 * focus signals, and province definitions. Pure calculation: no DOM writes.
 */
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
    showOptions = {},
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

  mapSorted.forEach((province) => {
    // Check all signals - could be focus or ignore
    (signals || []).forEach((clan) => {
      const thisdef = activeDefs.find(
        (def) =>
          (def.id !== undefined ? def.id : 0) ==
          (province.id !== undefined ? province.id : 0),
      );
      const clanProvId =
        clan.provinceId !== undefined ? clan.provinceId : clan.id;
      const clanSignal = clan.signal !== undefined ? clan.signal : clan.type;
      if (thisdef && province.id == clanProvId && clanSignal == 'focus') {
        if (
          province.ownerId !== undefined &&
          currentParticipantId &&
          province.ownerId == currentParticipantId
        ) {
          return;
        }
        const connectedProvinces = (thisdef.connections || [])
          .map((connId) => mapSorted.find((p) => p.id == connId))
          .filter(Boolean);

        const currentEpoc =
          typeof epocTime === 'number' && epocTime > 1000000000 ?
            epocTime
          : Math.floor(Date.now() / 1000);

        const { campsReady, campsNotReady } = calculateAttrition({
          connectedProvinces,
          currentParticipantId,
          currentEpoc,
          gainAttritionChance: province.gainAttritionChance,
        });

        const sectorTag = formatSector(thisdef.name, mapName);
        const campsText =
          showOptions.GBGshowSC && (campsReady || campsNotReady) ?
            formatCamps(campsReady, campsNotReady, true)
          : '';

        let timeText = '';
        if (province.lockedUntil && showOptions.GBGprovinceTime) {
          const time = new Date(province.lockedUntil * 1000);
          timeText =
            typeof formatTime === 'function' ?
              formatTime(time, gameOrigin, showOptions)
            : '';
        }

        const text = formatToken({
          sectorTag,
          targetText:
            targetText && targetText.trim() ? targetText.trim() : undefined,
          campsText: campsText || undefined,
          timeText: timeText || undefined,
        });

        if (province.lockedUntil && showOptions.GBGprovinceTime) {
          if (textProvinceLocked != '') {
            textProvinceLocked += '<br>';
          }
          textProvinceLocked += text;
        } else {
          if (textProvinceUnlocked != '') textProvinceUnlocked += '<br>';
          textProvinceUnlocked += text;
        }
      }
    });
  });

  return { textProvinceUnlocked, textProvinceLocked };
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
  let targetsHTML = `<div class="alert-${timerId} alert alert-info alert-dismissible show" role="alert">`;
  targetsHTML +=
    typeof depElement?.close === 'function' ? depElement.close() : '';
  if (
    depUrl?.discordTargetURL &&
    ((typeof depHelper?.checkGBG === 'function' && depHelper.checkGBG()) ||
      Boolean(depHelper?.MyGuildPermissions & 64))
  ) {
    targetsHTML +=
      typeof depElement?.post === 'function' ?
        depElement.post(
          'targetGenPostID',
          'primary',
          'right',
          depCollapse.collapseTargetGen,
        )
      : '';
  }
  targetsHTML +=
    typeof depElement?.copy === 'function' ?
      depElement.copy(
        'targetCopyID',
        'primary',
        'right',
        depCollapse.collapseBattleground,
      )
    : '';
  targetsHTML += `<p id="targetGenLabel" role="button" tabindex="0" data-bs-toggle="collapse" data-bs-target="#targetGenCollapse" aria-expanded="${!depCollapse.collapseTargetGen}" aria-controls="targetGenCollapse" class="cursor-pointer user-select-none mb-0" style="cursor: pointer; user-select: none;">
      ${
        typeof depElement?.icon === 'function' ?
          depElement.icon(
            'targetGenicon',
            'targetGenCollapse',
            depCollapse.collapseTargetGen,
          )
        : ''
      }
        <strong>GBG Target Generator:</strong></p>`;

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
