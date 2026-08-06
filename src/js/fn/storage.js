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

const pendingWriteTimers = new Map();
const pendingWritePayloads = new Map();

async function setStorage(name, value) {
  if (pendingWriteTimers.has(name)) {
    clearTimeout(pendingWriteTimers.get(name));
    pendingWriteTimers.delete(name);
  }
  pendingWritePayloads.delete(name);
  try {
    await browser.storage.local.set({
      [name]: value,
    });
  } catch (e) {
    console.error('Error setting storage index:', name, e);
  }
}

function setDebouncedStorage(name, value, delayMs = 1000) {
  pendingWritePayloads.set(name, value);
  if (pendingWriteTimers.has(name)) {
    clearTimeout(pendingWriteTimers.get(name));
  }
  const timer = setTimeout(async () => {
    pendingWriteTimers.delete(name);
    const val = pendingWritePayloads.get(name);
    pendingWritePayloads.delete(name);
    try {
      await browser.storage.local.set({
        [name]: val,
      });
    } catch (e) {
      console.error('Error in debounced storage setting:', name, e);
    }
  }, delayMs);
  pendingWriteTimers.set(name, timer);
}

async function flushPendingWrites() {
  for (const [name, timer] of pendingWriteTimers.entries()) {
    clearTimeout(timer);
  }
  pendingWriteTimers.clear();
  if (pendingWritePayloads.size === 0) return;
  const obj = {};
  for (const [name, val] of pendingWritePayloads.entries()) {
    obj[name] = val;
  }
  pendingWritePayloads.clear();
  try {
    await browser.storage.local.set(obj);
  } catch (e) {
    console.error('Error flushing pending storage writes:', e);
  }
}

async function getStorage(name) {
  if (pendingWritePayloads.has(name)) {
    return pendingWritePayloads.get(name);
  }
  try {
    const result = await browser.storage.local.get(name);
    return result ? result[name] : undefined;
  } catch (e) {
    console.error('Error retrieving storage index:', name, e);
    return undefined;
  }
}

async function removeStorage(name) {
  if (pendingWriteTimers.has(name)) {
    clearTimeout(pendingWriteTimers.get(name));
    pendingWriteTimers.delete(name);
  }
  pendingWritePayloads.delete(name);
  try {
    await browser.storage.local.remove(name);
  } catch (e) {
    console.error('Error removing storage index:', name, e);
  }
}

export {
  setStorage as set,
  setDebouncedStorage as setDebounced,
  flushPendingWrites as flush,
  getStorage as get,
  removeStorage as remove,
};

