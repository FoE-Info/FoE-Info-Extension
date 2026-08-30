/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */

import browser from 'webextension-polyfill';

function setStorage(name, value) {
  try {
    if (browser && browser.storage && browser.storage.local) {
      browser.storage.local
        .set({ [name]: value })
        .catch((err) => console.warn('setStorage error:', err));
    }
  } catch (e) {
    console.warn('setStorage exception:', e);
  }
}

function getStorage(name) {
  try {
    if (browser && browser.storage && browser.storage.local) {
      return browser.storage.local
        .get(name)
        .then((result) => (result ? result[name] : null))
        .catch((err) => {
          console.warn('getStorage error:', err);
          return null;
        });
    }
  } catch (e) {
    console.warn('getStorage exception:', e);
  }
  return Promise.resolve(null);
}

function removeStorage(name) {
  try {
    if (browser && browser.storage && browser.storage.local) {
      browser.storage.local
        .remove(name)
        .catch((err) => console.warn('removeStorage error:', err));
    }
  } catch (e) {
    console.warn('removeStorage exception:', e);
  }
}

export { setStorage as set, getStorage as get, removeStorage as remove };
