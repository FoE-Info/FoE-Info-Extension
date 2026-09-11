import browser from 'webextension-polyfill';

// In ISOLATED world: Forward window messages to Extension panel script
if (typeof window !== 'undefined' && !window.__foe_info_bridge_active) {
  window.__foe_info_bridge_active = true;

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin)
      return;
    if (
      event.data &&
      event.data.type === 'FOE_INFO_XHR' &&
      typeof event.data.url === 'string' &&
      typeof event.data.body === 'string'
    ) {
      try {
        browser.runtime
          .sendMessage({
            type: 'FOE_INFO_NET_DATA',
            url: event.data.url,
            body: event.data.body,
          })
          .catch(() => {});
      } catch (e) {}
    }
  });
}
