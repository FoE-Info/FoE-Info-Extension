/**
 * GbgSignalPayloadHandler.js
 *
 * Shared Guild Battlegrounds signal payload resolver and list mutation helpers.
 * Centralizes the near-duplicate data/context extraction previously inlined in
 * GuildBattlegroundService.setSignal, removeSignal, and updateSignal.
 */
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GbgSignalPayloadHandler');

function resolveRequestPayloadItems(context) {
  if (Array.isArray(context?.requestPayload)) return context.requestPayload;
  if (context?.requestPayload && typeof context.requestPayload === 'object') {
    return [context.requestPayload];
  }
  return [];
}

function resolvePostText(context) {
  return (
    context?.request?.request?.postData?.text ||
    context?.request?.postData?.text ||
    context?.postData?.text ||
    (typeof context?.postData === 'string' ? context.postData : null) ||
    (typeof context?.request?.postData === 'string' ? context.request.postData
    : typeof context?.request?.request?.postData === 'string' ?
      context.request.request.postData
    : null)
  );
}

/**
 * Resolves the raw signal data array from the message, payload, or network context.
 * @param {Object} msg JSON-RPC envelope
 * @param {Array} [payload] Pre-resolved payload
 * @param {Object} [context] Network request context
 * @param {string} requestMethod RPC method used to match postData request items
 * @returns {Array} resolved data array (never null)
 */
export function resolveSignalData(msg, payload, context, requestMethod) {
  let data =
    Array.isArray(payload) && payload.length > 0 ? payload
    : Array.isArray(msg?.requestData) && msg.requestData.length > 0 ?
      msg.requestData
    : Array.isArray(msg?.responseData) && msg.responseData.length > 0 ?
      msg.responseData
    : Array.isArray(msg) && msg.length > 0 ? msg
    : [];

  if (data.length === 0 && context) {
    const reqPayloadItems = resolveRequestPayloadItems(context);
    if (reqPayloadItems.length > 0) {
      const match =
        (msg?.requestId !== undefined ?
          reqPayloadItems.find((r) => r && r.requestId === msg.requestId)
        : null) ||
        reqPayloadItems.find(
          (r) =>
            r &&
            (r.requestMethod === requestMethod ||
              r.requestClass?.includes('GuildBattleground')),
        ) ||
        reqPayloadItems[0];
      if (Array.isArray(match?.requestData) && match.requestData.length > 0) {
        data = match.requestData;
      }
    }

    if (data.length === 0) {
      const postText = resolvePostText(context);
      if (postText) {
        try {
          const parsed =
            typeof postText === 'string' ? JSON.parse(postText) : postText;
          const reqItems = Array.isArray(parsed) ? parsed : [parsed];
          const match = reqItems.find(
            (r) =>
              r &&
              (r.requestMethod === requestMethod ||
                r.requestClass?.includes('GuildBattleground')),
          );
          if (
            Array.isArray(match?.requestData) &&
            match.requestData.length > 0
          ) {
            data = match.requestData;
          }
        } catch {}
      }
    }
  }

  return data;
}

function resolveCandidateObject(msg, payload) {
  return (
    (payload && typeof payload === 'object' && !Array.isArray(payload) ?
      payload
    : null) ||
    ((
      msg?.responseData &&
      typeof msg.responseData === 'object' &&
      !Array.isArray(msg.responseData)
    ) ?
      msg.responseData
    : null) ||
    ((
      msg?.requestData &&
      typeof msg.requestData === 'object' &&
      !Array.isArray(msg.requestData)
    ) ?
      msg.requestData
    : null) ||
    (msg && typeof msg === 'object' && !Array.isArray(msg) ? msg : null)
  );
}

/**
 * Resolves provinceId and signal type from the data array or an object payload.
 * @returns {{provinceId: (number|undefined), signalType: (string|undefined)}}
 */
export function resolveSignalTarget(msg, payload, data) {
  let provinceId = Array.isArray(data) ? data[0] : undefined;
  let signalType = Array.isArray(data) ? data[1] : undefined;

  if (provinceId === undefined || provinceId === null) {
    const candidateObj = resolveCandidateObject(msg, payload);
    if (candidateObj) {
      provinceId = candidateObj.provinceId ?? candidateObj.id;
      signalType = candidateObj.type ?? candidateObj.signal ?? signalType;
    }
  }

  if (
    provinceId !== undefined &&
    provinceId !== null &&
    !isNaN(Number(provinceId))
  ) {
    provinceId = Number(provinceId);
  }

  logger?.debug('signal target resolved:', { provinceId, signalType });

  return { provinceId, signalType };
}

/**
 * Applies a focus/ignore signal change to a signals list.
 * @returns {Array} updated signals list
 */
export function applySignalToList(signals, provinceId, signalType) {
  const list = Array.isArray(signals) ? signals : [];

  if (signalType === 'ignore') {
    return list.filter(
      (p) => Number(p.id !== undefined ? p.id : p.provinceId) !== provinceId,
    );
  }

  if (signalType === 'focus') {
    const existing = list.find(
      (p) => Number(p.id !== undefined ? p.id : p.provinceId) === provinceId,
    );
    if (existing) {
      existing.id = provinceId;
      existing.provinceId = provinceId;
      existing.type = signalType;
      existing.signal = signalType;
    } else {
      list.push({
        id: provinceId,
        provinceId: provinceId,
        type: signalType,
        signal: signalType,
      });
    }
  }

  return list;
}

/**
 * Removes a province from a signals list.
 * @returns {Array} updated signals list
 */
export function removeSignalFromList(signals, provinceId) {
  const list = Array.isArray(signals) ? signals : [];
  return list.filter(
    (p) => Number(p.id !== undefined ? p.id : p.provinceId) !== provinceId,
  );
}
