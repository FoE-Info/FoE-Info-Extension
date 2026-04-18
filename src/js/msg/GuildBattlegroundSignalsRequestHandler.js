import { removeSignal, setSignal } from './GuildBattlegroundService.js';

export function handleGuildBattlegroundSignalsRequest(
  msg,
  request,
  safeJsonParse,
) {
  if (!msg || msg.requestClass !== 'GuildBattlegroundSignalsService') {
    return false;
  }

  const payloadData = safeJsonParse?.(
    request?.request?.postData?.text,
    'GuildBattlegroundSignalsService requestData',
  );

  const payload =
    Array.isArray(payloadData) && payloadData[0] ?
      payloadData[0].requestData
    : null;

  if (msg.requestMethod === 'setSignal') {
    if (payload) setSignal(msg, payload);
    return true;
  }

  if (msg.requestMethod === 'removeSignal') {
    if (payload) removeSignal(msg, payload);
    return true;
  }

  return false;
}
