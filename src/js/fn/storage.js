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

async function setStorage(name, value) {
  try {
    await browser.storage.local.set({
      [name]: value,
    });
  } catch (e) {
    console.error('Error setting storage index:', name, e);
  }
}

async function getStorage(name) {
  try {
    const result = await browser.storage.local.get(name);
    return result ? result[name] : undefined;
  } catch (e) {
    console.error('Error retrieving storage index:', name, e);
    return undefined;
  }
}

async function removeStorage(name) {
  try {
    await browser.storage.local.remove(name);
  } catch (e) {
    console.error('Error removing storage index:', name, e);
  }
}

export { setStorage as set, getStorage as get, removeStorage as remove };
