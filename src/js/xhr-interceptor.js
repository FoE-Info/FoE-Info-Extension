// In MAIN world: Monkey-patch XMLHttpRequest and fetch to intercept /game/json and metadata responses
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

  XHR.open = function (method, url) {
    this._foeUrl = url;
    return open.apply(this, arguments);
  };

  XHR.send = function () {
    this.addEventListener('load', function () {
      try {
        const url = this._foeUrl || this.responseURL;
        if (isFoeUrl(url)) {
          const targetOrigin = window.location.origin;
          if (!targetOrigin || targetOrigin === 'null') return;
          window.postMessage(
            {
              type: 'FOE_INFO_XHR',
              url: url,
              body: this.responseText,
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
          response
            .clone()
            .text()
            .then((body) => {
              window.postMessage(
                {
                  type: 'FOE_INFO_XHR',
                  url: url,
                  body: body,
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
}
