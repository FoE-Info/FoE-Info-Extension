// In MAIN world: Monkey-patch XMLHttpRequest, fetch, and WebSocket to passively intercept /game/json and metadata responses
if (typeof window !== 'undefined' && !window.__foe_info_xhr_patched) {
  window.__foe_info_xhr_patched = true;

  const FOE_GAME_HOST = 'forgeofempires.com';
  const FOE_CDN_METADATA_HOSTS = ['foeen.innogamescdn.com'];
  const GAME_API_PATH_PREFIXES = ['/game/json'];

  /**
   * Suffix-match a hostname against a trusted base host (exact or subdomain).
   * Mirrors utils/intakePolicy.js, which this MAIN-world script cannot import.
   */
  function trustedHostMatches(hostname, trustedHost) {
    return hostname === trustedHost || hostname.endsWith(`.${trustedHost}`);
  }

  function isFoeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return (
      url.includes('/game/json') ||
      url.includes('metadata?id=') ||
      url.includes('/metadata') ||
      url.includes('/start/metadata')
    );
  }

  /**
   * Origin check for a WebSocket endpoint. Mirrors evaluateRequestOrigin() in
   * utils/intakePolicy.js: wss scheme, trusted host, game API path. The socket's
   * REAL url is checked here — dispatchWsText must never relabel a socket as
   * the page origin, which would make this gate tautological.
   */
  function isFoeWebSocketUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    let url;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch {
      return false;
    }
    if (url.protocol !== 'wss:') return false;
    const hostname = url.hostname.toLowerCase();
    const isGameHost = trustedHostMatches(hostname, FOE_GAME_HOST);
    const isCdnHost = FOE_CDN_METADATA_HOSTS.some((host) =>
      trustedHostMatches(hostname, host),
    );
    if (!isGameHost && !isCdnHost) return false;
    const path = url.pathname;
    return (
      GAME_API_PATH_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      ) || path === '/metadata'
    );
  }

  const XHR = XMLHttpRequest.prototype;
  const open = XHR.open;
  const send = XHR.send;

  let debugEnabled = false;

  window.addEventListener('message', (event) => {
    if (
      event.source !== window ||
      event.origin !== window.location.origin ||
      !event.data
    )
      return;
    if (event.data.type === 'FOE_INFO_DEBUG_SYNC') {
      if (typeof event.data.enabled === 'boolean') {
        debugEnabled = event.data.enabled;
      }
    }
  });

  function serializeBody(data) {
    if (!data) return null;
    if (typeof data === 'string') return data;
    try {
      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        return new TextDecoder('utf-8').decode(data);
      }
      if (typeof data === 'object') return JSON.stringify(data);
    } catch {}
    return null;
  }

  XHR.open = function (method, url) {
    this._foeUrl = url;
    return open.apply(this, arguments);
  };

  XHR.send = function (body) {
    this._foeBody = serializeBody(body);
    const sendUrl = this._foeUrl;
    if (debugEnabled && isFoeUrl(sendUrl)) {
      console.debug('[FoE-Info:XHRInterceptor] Outgoing XHR to:', sendUrl);
    }
    this.addEventListener('load', function () {
      try {
        const url = this._foeUrl || this.responseURL;
        const inventory =
          /^https:\/\/foeen\.innogamescdn\.com\/assets\/shared\/gui\/shop_inventory\//.test(
            url,
          );
        if (inventory || isFoeUrl(url)) {
          if (debugEnabled && !inventory) {
            console.debug(
              '[FoE-Info:XHRInterceptor] Intercepted XHR payload:',
              url,
              'Length:',
              this.responseText ? this.responseText.length : 0,
            );
          }
          const targetOrigin = window.location.origin;
          if (!targetOrigin || targetOrigin === 'null') return;
          window.postMessage(
            {
              type: 'FOE_INFO_XHR',
              url: url,
              body: inventory ? '' : this.responseText,
              postData: inventory ? null : this._foeBody,
            },
            targetOrigin,
          );
        }
      } catch (err) {
        if (debugEnabled) {
          console.debug(
            '[FoE-Info:XHRInterceptor] XHR load dispatch failed:',
            err && err.message ? err.message : err,
          );
        }
      }
    });
    return send.apply(this, arguments);
  };

  if (typeof window.fetch === 'function') {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      try {
        const url =
          typeof args[0] === 'string' ?
            args[0]
          : (args[0] && args[0].url) || '';
        if (isFoeUrl(url)) {
          const targetOrigin = window.location.origin;
          if (!targetOrigin || targetOrigin === 'null') return response;
          const postData = serializeBody(args[1] && args[1].body);
          response
            .clone()
            .text()
            .then((body) => {
              window.postMessage(
                {
                  type: 'FOE_INFO_XHR',
                  url: url,
                  body: body,
                  postData: postData,
                },
                targetOrigin,
              );
            })
            .catch((err) => {
              if (debugEnabled) {
                console.debug(
                  '[FoE-Info:XHRInterceptor] Fetch body read failed:',
                  err && err.message ? err.message : err,
                );
              }
            });
        }
      } catch (err) {
        if (debugEnabled) {
          console.debug(
            '[FoE-Info:XHRInterceptor] Fetch interception failed:',
            err && err.message ? err.message : err,
          );
        }
      }
      return response;
    };
  }

  if (typeof window.WebSocket === 'function') {
    const OriginalWebSocket = window.WebSocket;
    const observedSockets = new WeakSet();

    function dispatchWsText(rawData, socketUrl) {
      if (
        typeof rawData === 'string' &&
        (rawData.startsWith('[') || rawData.startsWith('{'))
      ) {
        if (debugEnabled) {
          console.debug(
            '[FoE-Info:XHRInterceptor] Intercepted WebSocket payload, length:',
            rawData.length,
          );
        }
        const targetOrigin = window.location.origin;
        if (!targetOrigin || targetOrigin === 'null') return;
        // The socket's real destination is the URL. Advertising
        // location.origin + '/game/json' here asserted an origin the socket
        // never proved, and the intake gate then accepted it unconditionally.
        window.postMessage(
          {
            type: 'FOE_INFO_XHR',
            url: socketUrl,
            body: rawData,
            postData: null,
          },
          targetOrigin,
        );
      }
    }

    function attachWsListener(ws) {
      if (!ws || observedSockets.has(ws)) return;
      observedSockets.add(ws);
      const socketUrl = typeof ws.url === 'string' ? ws.url : '';
      if (!isFoeWebSocketUrl(socketUrl)) {
        if (debugEnabled) {
          console.debug(
            '[FoE-Info:XHRInterceptor] Ignoring WebSocket to untrusted origin:',
            socketUrl,
          );
        }
        return;
      }
      try {
        ws.addEventListener(
          'message',
          function (evt) {
            try {
              if (evt.data === 'PONG') return;
              let rawData = evt.data;
              if (typeof rawData !== 'string') {
                if (
                  rawData instanceof ArrayBuffer ||
                  ArrayBuffer.isView(rawData)
                ) {
                  rawData = new TextDecoder('utf-8').decode(rawData);
                } else if (
                  typeof Blob !== 'undefined' &&
                  rawData instanceof Blob
                ) {
                  rawData
                    .text()
                    .then((text) => dispatchWsText(text, socketUrl))
                    .catch((err) => {
                      if (debugEnabled) {
                        console.debug(
                          '[FoE-Info:XHRInterceptor] WS Blob decode failed:',
                          err && err.message ? err.message : err,
                        );
                      }
                    });
                  return;
                }
              }
              dispatchWsText(rawData, socketUrl);
            } catch (err) {
              if (debugEnabled) {
                console.debug(
                  '[FoE-Info:XHRInterceptor] WS message dispatch failed:',
                  err && err.message ? err.message : err,
                );
              }
            }
          },
          { capture: false, passive: true },
        );
      } catch (err) {
        if (debugEnabled) {
          console.debug(
            '[FoE-Info:XHRInterceptor] WS listener attach failed:',
            err && err.message ? err.message : err,
          );
        }
      }
    }

    const origSend = OriginalWebSocket.prototype.send;
    OriginalWebSocket.prototype.send = function (...args) {
      attachWsListener(this);
      return origSend.apply(this, args);
    };

    const PatchedWebSocket = function (...args) {
      const ws = new OriginalWebSocket(...args);
      attachWsListener(ws);
      return ws;
    };
    PatchedWebSocket.prototype = OriginalWebSocket.prototype;

    for (const prop of Object.getOwnPropertyNames(OriginalWebSocket)) {
      if (!(prop in PatchedWebSocket)) {
        try {
          Object.defineProperty(
            PatchedWebSocket,
            prop,
            Object.getOwnPropertyDescriptor(OriginalWebSocket, prop),
          );
        } catch {}
      }
    }

    window.WebSocket = PatchedWebSocket;
  }
}
