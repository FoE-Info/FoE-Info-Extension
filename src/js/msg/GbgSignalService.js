/**
 * GbgSignalService.js
 *
 * Dedicated signal routing, attrition reduction, and target list generation
 * engine for Guild Battlegrounds (GBG). Decoupled from Discord webhooks.
 */

const { getAttritionReduction } = require('../calc/GbgCalculator.js');
const { getServerMarket, timeGBG } = require('./GbgTimeFormatter.js');
const {
  generateTargetList: generateTargetListExtracted,
} = require('./GbgTargetListGenerator.js');

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
    } catch (e) {}
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

function generateTargetList(options = {}) {
  const activeSignals =
    options.activeSignals !== undefined ? options.activeSignals : signals;
  return generateTargetListExtracted({
    ...options,
    activeSignals,
  });
}

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
};
module.exports.default = module.exports;
