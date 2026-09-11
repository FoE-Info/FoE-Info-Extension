// In MAIN world: Monkey-patch XMLHttpRequest, fetch, and WebSocket to passively intercept /game/json and metadata responses
if (typeof window !== 'undefined' && !window.__foe_info_xhr_patched) {
  window.__foe_info_xhr_patched = true;

  function isFoeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return (
      url.includes('/game/json') ||
      url.includes('metadata?id=') ||
      url.includes('/metadata') ||
      url.includes('/start/metadata')
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
        if (isFoeUrl(url)) {
          if (debugEnabled) {
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
              body: this.responseText,
              postData: this._foeBody,
            },
            targetOrigin,
          );
        }
      } catch {
        // Ignore serialization or transmission errors
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
            .catch(() => {});
        }
      } catch {
        // Ignore fetch interception errors
      }
      return response;
    };
  }

  if (typeof window.WebSocket === 'function') {
    const OriginalWebSocket = window.WebSocket;
    const observedSockets = new WeakSet();

    function dispatchWsText(rawData) {
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
        window.postMessage(
          {
            type: 'FOE_INFO_XHR',
            url: window.location.origin + '/game/json?source=ws',
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
                    .then(dispatchWsText)
                    .catch(() => {});
                  return;
                }
              }
              dispatchWsText(rawData);
            } catch {}
          },
          { capture: false, passive: true },
        );
      } catch {}
    }

    const origSend = OriginalWebSocket.prototype.send;
    OriginalWebSocket.prototype.send = function (data) {
      attachWsListener(this);
      return origSend.apply(this, arguments);
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
