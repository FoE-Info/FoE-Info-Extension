import browser from 'webextension-polyfill';

// In ISOLATED world: Forward window messages to Extension panel script
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'FOE_INFO_XHR') {
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
