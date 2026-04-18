import { removeSignal, setSignal } from './GuildBattlegroundService';
import { HandlerMessage } from './types';

type GuildBattlegroundSignalsRequest = {
  request?: {
    postData?: {
      text?: string;
    };
  };
};

type GuildBattlegroundSignalsMessage = HandlerMessage;

export function handleGuildBattlegroundSignalsRequest(
  msg: GuildBattlegroundSignalsMessage,
  request: GuildBattlegroundSignalsRequest,
  safeJsonParse:
    | ((raw: string | undefined, context: string) => unknown)
    | undefined,
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
