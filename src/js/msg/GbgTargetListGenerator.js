/**
 * GbgTargetListGenerator.js
 *
 * Guild Battlegrounds target list generation engine.
 * Computes locked and unlocked attack targets from active signals and sector attrition.
 */

let calculateProvinceAttrition = () => ({ campsReady: 0, campsNotReady: 0 });
let formatCampsText = () => '';
let formatSectorName = (name) => name || '';
let formatTargetToken = (opts) => opts.sectorTag || '';
try {
  ({
    calculateProvinceAttrition,
    formatCampsText,
    formatSectorName,
    formatTargetToken,
  } = require('../calc/GbgCalculator.js'));
} catch {}

let timeGBG = () => '';
try {
  ({ timeGBG } = require('./GbgTimeFormatter.js'));
} catch {}

let createLogger = () => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
});
try {
  ({ createLogger } = require('../utils/logger.js'));
} catch {}

const logger = createLogger('GbgTargetListGenerator');

/**
 * Generates formatted target lists for active battleground focus signals.
 *
 * @param {Object} params
 * @param {Array} [params.map] List of map province states
 * @param {Array} [params.activeSignals] Currently active signals
 * @param {Array} [params.volcanoDefs] Volcano archipelago province definitions
 * @param {Array} [params.waterfallDefs] Waterfall archipelago province definitions
 * @param {string} [params.mapName] Map identifier ('waterfall' or other)
 * @param {number} [params.currentParticipantId] Current player's guild participant ID
 * @param {number} [params.epocTime] Current epoch time in seconds or ms
 * @param {string} [params.origin] Origin URL or code
 * @param {string} [params.gameOrigin] Fallback origin URL
 * @param {Object} [params.options] UI and format options (GBGshowSC, GBGprovinceTime, etc.)
 * @param {string} [params.targetText] Optional custom text token
 * @returns {{ textProvinceUnlocked: string, textProvinceLocked: string, targets: Array }}
 */
function generateTargetList({
  map = [],
  activeSignals = [],
  volcanoDefs = [],
  waterfallDefs = [],
  mapName = '',
  currentParticipantId = 0,
  epocTime = Date.now(),
  origin = '',
  gameOrigin = '',
  options = {},
  targetText = '',
} = {}) {
  let textProvinceUnlocked = '';
  let textProvinceLocked = '';
  const generatedTargets = [];

  const mapSorted = Array.isArray(map) ? Array.from(map) : [];
  mapSorted.sort((a, b) => {
    if (!a.lockedUntil) return 1;
    if (!b.lockedUntil) return -1;
    return (
      a.lockedUntil > b.lockedUntil ? 1
      : a.lockedUntil < b.lockedUntil ? -1
      : 0
    );
  });

  const isWaterfall =
    mapName === 'waterfall' ||
    (waterfallDefs.length > 0 && volcanoDefs.length === 0);
  const activeDefs =
    isWaterfall ? waterfallDefs
    : volcanoDefs.length > 0 ? volcanoDefs
    : [];

  mapSorted.forEach((province) => {
    activeSignals.forEach((clan) => {
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

      const { campsReady, campsNotReady } = calculateProvinceAttrition({
        connectedProvinces,
        currentParticipantId,
        currentEpoc: epocTime,
        gainAttritionChance: province.gainAttritionChance,
      });

      const sectorTag = formatSectorName(
        thisdef.name,
        isWaterfall ? 'waterfall' : mapName,
      );
      const campsText =
        options.GBGshowSC && (campsReady || campsNotReady) ?
          formatCampsText(campsReady, campsNotReady, true)
        : '';

      let timeText = '';
      if (province.lockedUntil && options.GBGprovinceTime) {
        const time = new Date(province.lockedUntil * 1000);
        timeText = timeGBG(time, origin || gameOrigin, options);
      }

      const text = formatTargetToken({
        sectorTag,
        targetText: targetText ? String(targetText).trim() : undefined,
        campsText: campsText || undefined,
        timeText: timeText || undefined,
      });

      if (province.lockedUntil && options.GBGprovinceTime) {
        if (textProvinceLocked !== '') textProvinceLocked += '<br>';
        textProvinceLocked += text;
      } else {
        if (textProvinceUnlocked !== '') textProvinceUnlocked += '<br>';
        textProvinceUnlocked += text;
      }

      generatedTargets.push({
        provinceId: province.id,
        tag: sectorTag,
        campsReady,
        campsNotReady,
        lockedUntil: province.lockedUntil || 0,
        text,
      });
    });
  });

  logger.debug('generateTargetList generated:', {
    targetCount: generatedTargets.length,
    unlockedLength: textProvinceUnlocked.length,
    lockedLength: textProvinceLocked.length,
  });

  return {
    textProvinceUnlocked,
    textProvinceLocked,
    targets: generatedTargets,
  };
}

module.exports = {
  generateTargetList,
};
module.exports.default = module.exports;
