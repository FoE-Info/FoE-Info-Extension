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

const storageCache = Object.create(null);

function sanitizeKey(key) {
  if (typeof key !== 'string') return null;
  if (key === '__proto__' || key === 'constructor' || key === 'prototype')
    return null;
  return key;
}

function updateCache(obj) {
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const cleanKey = sanitizeKey(key);
      if (cleanKey) {
        storageCache[cleanKey] = obj[key];
      }
    }
  }
}

function setStorage(name, value) {
  const cleanKey = sanitizeKey(name);
  if (!cleanKey) return;
  try {
    storageCache[cleanKey] = value;
    if (browser && browser.storage && browser.storage.local) {
      browser.storage.local
        .set({ [cleanKey]: value })
        .catch((err) => console.warn('setStorage error:', err));
    }
  } catch (e) {
    console.warn('setStorage exception:', e);
  }
}

function getStorage(name) {
  const cleanKey = sanitizeKey(name);
  if (!cleanKey) return Promise.resolve(null);
  try {
    if (browser && browser.storage && browser.storage.local) {
      return browser.storage.local
        .get(cleanKey)
        .then((result) => {
          const val = result ? result[cleanKey] : null;
          if (val !== undefined) storageCache[cleanKey] = val;
          return val;
        })
        .catch((err) => {
          console.warn('getStorage error:', err);
          return storageCache[cleanKey] ?? null;
        });
    }
  } catch (e) {
    console.warn('getStorage exception:', e);
  }
  return Promise.resolve(storageCache[cleanKey] ?? null);
}

function getSync(name) {
  const cleanKey = sanitizeKey(name);
  return cleanKey && storageCache[cleanKey] !== undefined ?
      storageCache[cleanKey]
    : null;
}

function removeStorage(name) {
  const cleanKey = sanitizeKey(name);
  if (!cleanKey) return;
  try {
    delete storageCache[cleanKey];
    if (browser && browser.storage && browser.storage.local) {
      browser.storage.local
        .remove(cleanKey)
        .catch((err) => console.warn('removeStorage error:', err));
    }
  } catch (e) {
    console.warn('removeStorage exception:', e);
  }
}

export {
  setStorage as set,
  getStorage as get,
  getSync,
  removeStorage as remove,
  updateCache,
};
