/**
 * GbgSignalService.js
 *
 * Dedicated signal routing, attrition reduction, target list generation,
 * and time formatting engine for Guild Battlegrounds (GBG).
 */

const {
  getAttritionReduction,
  calculateProvinceAttrition,
  formatCampsText,
  formatSectorName,
  formatTargetToken,
} = require('../calc/GbgCalculator.js');

let resolveDate = (d) => (d ? new Date(d) : null);
let formatInTimeZone = (d) => (d ? d.toISOString() : '');
let getTimeFormattingConfig = () => ({});
try {
  ({
    resolveDate,
    formatInTimeZone,
    getTimeFormattingConfig,
  } = require('../utils/date.js'));
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

const logger = createLogger('GbgSignalService');

// ============================================================================
// 1. TIME FORMATTING & SERVER MARKET
// ============================================================================

const SERVER_TIMEZONES = {
  en: { timeZone: 'Europe/London', locale: 'en-GB', hour12: false },
  zz: { timeZone: 'Europe/London', locale: 'en-GB', hour12: false },
  us: { timeZone: 'America/New_York', locale: 'en-US', hour12: true },
  de: { timeZone: 'Europe/Berlin', locale: 'de-DE', hour12: false },
  fr: { timeZone: 'Europe/Paris', locale: 'fr-FR', hour12: false },
  gr: { timeZone: 'Europe/Athens', locale: 'el-GR', hour12: false },
  fi: { timeZone: 'Europe/Helsinki', locale: 'fi-FI', hour12: false },
  ru: { timeZone: 'Europe/Moscow', locale: 'ru-RU', hour12: false },
  es: { timeZone: 'Europe/Madrid', locale: 'es-ES', hour12: false },
  it: { timeZone: 'Europe/Rome', locale: 'it-IT', hour12: false },
  nl: { timeZone: 'Europe/Amsterdam', locale: 'nl-NL', hour12: false },
  pl: { timeZone: 'Europe/Warsaw', locale: 'pl-PL', hour12: false },
  br: { timeZone: 'America/Sao_Paulo', locale: 'pt-BR', hour12: false },
};

/**
 * Resolves market code (e.g. 'en', 'zz', 'us', 'de') from game origin URL.
 * @param {string} origin
 * @returns {string} Market code
 */
function getServerMarket(origin) {
  if (!origin || typeof origin !== 'string') return 'en';
  const clean = origin.trim().toLowerCase();
  if (clean.includes('zz') || clean.includes('beta')) return 'zz';
  const hostMatch = clean.match(
    /(?:https?:\/\/)?([a-z]{2,3})\d*\.forgeofempires\.com/i,
  );
  if (hostMatch && hostMatch[1]) {
    return hostMatch[1];
  }
  const prefixMatch = clean.match(/^(?:https?:\/\/)?([a-z]{2,3})\d*/i);
  if (prefixMatch && prefixMatch[1]) {
    return prefixMatch[1];
  }
  return 'en';
}

/**
 * Formats a date for GBG target display in server or local time mode.
 * @param {Date|number|string} date
 * @param {string|Object} [origin]
 * @param {Object} [options]
 * @returns {string} Formatted time string (e.g. '@ 20:00')
 */
function timeGBG(
  date,
  origin = typeof globalThis.GameOrigin !== 'undefined' ?
    globalThis.GameOrigin
  : '',
  options = {},
) {
  if (!date) return '';
  if (typeof origin === 'object' && origin !== null) {
    options = origin;
    origin =
      typeof globalThis.GameOrigin !== 'undefined' ? globalThis.GameOrigin : '';
  }
  const d = resolveDate(date);
  if (!d) return '';

  const timeMode =
    options?.GBGtimeMode ||
    (typeof globalThis.showOptions !== 'undefined' &&
      globalThis.showOptions?.GBGtimeMode) ||
    'server';

  if (timeMode === 'local') {
    let is12Hour = false;
    try {
      const cfg = getTimeFormattingConfig();
      is12Hour = /\bhh\b|[Aa]/.test(
        cfg.customPattern || cfg.timeFormat || cfg.dateTimeFormat,
      );
    } catch (err) {
      logger.debug('Failed to get time formatting config:', err);
    }
    if (is12Hour) {
      const h24 = d.getHours();
      const h12 = h24 % 12 || 12;
      const hours = String(h12).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      return `@ ${hours}:${minutes} ${ampm}`;
    }
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `@ ${hours}:${minutes}`;
  }

  const market = getServerMarket(origin);
  const config = SERVER_TIMEZONES[market] || {
    timeZone: 'Europe/Berlin',
    locale: 'de-DE',
    hour12: false,
  };

  const formatted = formatInTimeZone(d, {
    locale: config.locale,
    timeZone: config.timeZone,
    hour12: config.hour12,
  });

  return `@ ${formatted}`;
}
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

// ============================================================================
// 3. SIGNAL ROUTING & ATTRITION REDUCTION
// ============================================================================

let signals = [];

function getSignals() {
  return signals;
}

function clearSignals() {
  signals.length = 0;
}

function setSignals(newSignals) {
  signals.length = 0;
  if (Array.isArray(newSignals)) {
    signals.push(...newSignals);
  }
}

function extractSignalData(msg, payload, context) {
  if (Array.isArray(payload) && payload.length > 0) return payload;
  if (Array.isArray(msg?.requestData) && msg.requestData.length > 0) {
    return msg.requestData;
  }
  if (Array.isArray(context?.requestData) && context.requestData.length > 0) {
    return context.requestData;
  }
  if (
    Array.isArray(context?.request?.requestData) &&
    context.request.requestData.length > 0
  ) {
    return context.request.requestData;
  }

  const postText =
    context?.request?.request?.postData?.text ||
    context?.request?.postData?.text ||
    (typeof context?.request?.postData === 'string' ?
      context.request.postData
    : null);
  if (postText) {
    try {
      const parsed = JSON.parse(postText);
      const reqItems = Array.isArray(parsed) ? parsed : [parsed];
      const match =
        (msg?.requestId !== undefined ?
          reqItems.find((r) => r && r.requestId === msg.requestId)
        : null) ||
        reqItems.find(
          (r) =>
            r &&
            (r.requestMethod === 'setSignal' ||
              r.requestMethod === 'updateSignal' ||
              r.requestMethod === 'removeSignal' ||
              r.requestClass?.includes('GuildBattleground')),
        ) ||
        reqItems[0];
      if (Array.isArray(match?.requestData) && match.requestData.length > 0) {
        return match.requestData;
      }
    } catch {
      // Best-effort parse of intercepted GBG signal post data; malformed
      // payloads fall through to the next resolution strategy.
      logger?.debug?.('resolveSignalData: postText parse failed');
    }
  }

  if (Array.isArray(msg?.responseData) && msg.responseData.length > 0) {
    return msg.responseData;
  }
  if (Array.isArray(msg) && msg.length > 0) return msg;
  if (Array.isArray(context) && context.length > 0) return context;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(msg?.requestData)) return msg.requestData;
  if (Array.isArray(msg?.responseData)) return msg.responseData;
  if (Array.isArray(msg)) return msg;
  if (Array.isArray(context?.requestData)) return context.requestData;
  if (Array.isArray(context)) return context;

  const candidateObj =
    ((
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      (payload.provinceId !== undefined || payload.id !== undefined)
    ) ?
      payload
    : null) ||
    ((
      msg &&
      typeof msg === 'object' &&
      !Array.isArray(msg) &&
      (msg.provinceId !== undefined || msg.id !== undefined)
    ) ?
      msg
    : null) ||
    ((
      msg?.responseData &&
      typeof msg.responseData === 'object' &&
      !Array.isArray(msg.responseData) &&
      (msg.responseData.provinceId !== undefined ||
        msg.responseData.id !== undefined)
    ) ?
      msg.responseData
    : null);
  if (candidateObj) {
    const pid = candidateObj.provinceId ?? candidateObj.id;
    const stype = candidateObj.type ?? candidateObj.signal;
    return [pid, stype];
  }

  return [];
}

function setSignal(msg, payload, context) {
  const data = extractSignalData(msg, payload, context);
  const provinceId = data[0];
  const signalType = data[1];
  if (provinceId === undefined || provinceId === null) return signals;

  if (signalType === 'ignore') {
    signals = signals.filter(
      (p) => (p.id !== undefined ? p.id : p.provinceId) !== provinceId,
    );
  } else if (signalType === 'focus') {
    const existing = signals.find(
      (p) => (p.id !== undefined ? p.id : p.provinceId) === provinceId,
    );
    if (existing) {
      existing.id = provinceId;
      existing.provinceId = provinceId;
      existing.type = signalType;
      existing.signal = signalType;
    } else {
      signals.push({
        id: provinceId,
        provinceId,
        type: signalType,
        signal: signalType,
      });
    }
  }
  logger.debug('setSignal applied:', {
    provinceId,
    signalType,
    count: signals.length,
  });
  return signals;
}

function removeSignal(msg, payload, context) {
  const data = extractSignalData(msg, payload, context);
  const provinceId = data[0];
  if (provinceId === undefined || provinceId === null) return signals;

  signals = signals.filter(
    (p) => (p.id !== undefined ? p.id : p.provinceId) !== provinceId,
  );
  logger.debug('removeSignal applied:', { provinceId, count: signals.length });
  return signals;
}

function onProvinceConquered(provinceId) {
  if (provinceId === undefined || provinceId === null) return signals;
  signals = signals.filter(
    (p) =>
      Number(p.id !== undefined ? p.id : p.provinceId) !== Number(provinceId),
  );
  logger.debug('onProvinceConquered applied:', {
    provinceId,
    count: signals.length,
  });
  return signals;
}

function attritionReduction(building) {
  return getAttritionReduction(building);
}

const gbgSignalService = {
  attritionReduction,
  clearSignals,
  extractSignalData,
  generateTargetList,
  getSignals,
  getServerMarket,
  onProvinceConquered,
  removeSignal,
  setSignal,
  setSignals,
  timeGBG,
  SERVER_TIMEZONES,
};

module.exports = {
  attritionReduction,
  clearSignals,
  extractSignalData,
  generateTargetList,
  getSignals,
  getServerMarket,
  onProvinceConquered,
  removeSignal,
  setSignal,
  setSignals,
  timeGBG,
  SERVER_TIMEZONES,
  gbgSignalService,
};
module.exports.default = module.exports;
