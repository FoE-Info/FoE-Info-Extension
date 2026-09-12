/** Extension popup controller. */
import browser from 'webextension-polyfill';

document.querySelector('#go-to-options').addEventListener('click', function () {
  // console.debug('options');
  if (browser.runtime.openOptionsPage) {
    browser.runtime.openOptionsPage();
  } else {
    window.open(browser.runtime.getURL('options.html'));
  }
});
