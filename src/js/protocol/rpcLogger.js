/**
 * rpcLogger.js
 *
 * Dedicated protocol logging helper for InnoGames JSON-RPC messages.
 * Maintains rolling in-memory RPC log buffer and outputs colored console logs.
 */

import { createLogger, isDebugEnabled } from '../utils/logger.js';

const rpcLogger = createLogger('RPC');

export const rpcLog = [];
if (typeof window !== 'undefined') {
  window.foeRpcLog = rpcLog;
}

export function logRpcMessage(msg, isHandled) {
  if (!msg || typeof msg !== 'object') return;
  const reqClass = msg.requestClass || msg.__class__ || 'Metadata/Unknown';
  const reqMethod = msg.requestMethod || 'N/A';
  const debug = isDebugEnabled();

  const entry = {
    timestamp: new Date().toISOString(),
    requestClass: reqClass,
    requestMethod: reqMethod,
    requestId: msg.requestId ?? null,
    handled: !!isHandled,
    responseData:
      debug ?
        msg.responseData !== undefined ?
          msg.responseData
        : msg
      : `${reqClass}.${reqMethod}`,
  };

  rpcLog.push(entry);
  if (rpcLog.length > 500) {
    rpcLog.shift();
  }

  const tag = isHandled ? '[HANDLED]' : '[UNHANDLED]';
  const style =
    isHandled ?
      'color: #2e7d32; font-weight: bold;'
    : 'color: #d32f2f; font-weight: bold;';

  if (debug) {
    console.groupCollapsed(
      `%c[FoE-RPC] ${tag} ${reqClass}.${reqMethod}`,
      style,
    );
    console.debug('Full Message:', msg);
    console.debug('Response Data:', entry.responseData);
    console.groupEnd();
    rpcLogger.debug(`${tag} ${reqClass}.${reqMethod}`, {
      requestClass: reqClass,
      requestMethod: reqMethod,
      requestId: entry.requestId,
      responseData: entry.responseData,
    });
  } else {
    console.debug(`[FoE-RPC] ${tag} ${reqClass}.${reqMethod}`, msg);
  }
}
