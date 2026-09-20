/**
 * targetTokenAssembler.js
 *
 * Pure target token assembly and province lock sorting for the GBG Target Generator.
 * Extracted from renderTargetGeneratorCard.js to preserve single-responsibility
 * and modular line-budget constraints (<= 250 lines).
 */

let logger = null;
try {
  const { createLogger } = require('../utils/logger.js');
  logger = createLogger('TargetTokenAssembler');
} catch {
  logger = { debug() {}, info() {}, warn() {}, error() {} };
}

let GbgCalculator = {};
try {
  GbgCalculator = require('../calc/GbgCalculator.js');
} catch {}

/**
 * Sorts provinces so locked sectors (soonest unlock first) are processed
 * first, preserving the legacy checkProvinces ordering.
 *
 * @param {Array} map Array of province state objects
 * @returns {Array} Sorted copy of map
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
 *
 * @param {Object} params Target generator calculation parameters
 * @returns {{ textProvinceUnlocked: string, textProvinceLocked: string }}
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

  logger?.debug('buildTargetGeneratorTargets assembled:', {
    textProvinceUnlocked,
    textProvinceLocked,
    signalMatches: (signals || []).length,
  });

  return { textProvinceUnlocked, textProvinceLocked };
}

module.exports = {
  sortProvincesByLock,
  buildTargetGeneratorTargets,
};
module.exports.default = module.exports;
