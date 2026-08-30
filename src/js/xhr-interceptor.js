// In MAIN world: Monkey-patch XMLHttpRequest to intercept /game/json responses
if (typeof window !== 'undefined' && !window.__foe_info_xhr_patched) {
  window.__foe_info_xhr_patched = true;

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
        if (url && url.includes('/game/json')) {
          window.postMessage(
            {
              type: 'FOE_INFO_XHR',
              url: url,
              body: this.responseText,
            },
            '*',
          );
        }
      } catch (e) {}
    });
    return send.apply(this, arguments);
  };
}
