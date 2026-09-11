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
import '../css/options.scss';
import {
  populateForm,
  readGlobalSettingsFromForm,
  readWorldSettingsFromForm,
} from './ui/optionsForm.js';
import {
  getGlobalSettings,
  getWorldSettings,
  initStorage,
  registerKnownWorld,
  resetWorldSettings,
  sanitizeWorldId,
  saveWorldSettings,
  setWorld,
} from './utils/storage.js';

let activeWorld = 'en7';
let autoSaveTimer = null;
let toastTimer = null;

export async function detectActiveGameTab() {
  const foeRegex = /^https?:\/\/([a-z]+[1-9][0-9]*)\.forgeofempires\.com/i;
  try {
    if (browser.tabs?.query) {
      const activeTabs = await browser.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (activeTabs?.[0]?.url) {
        const match = activeTabs[0].url.match(foeRegex);
        if (match?.[1]) return sanitizeWorldId(match[1]);
      }
      const anyActive = await browser.tabs.query({
        active: true,
        url: '*://*.forgeofempires.com/*',
      });
      if (anyActive?.[0]?.url) {
        const match = anyActive[0].url.match(foeRegex);
        if (match?.[1]) return sanitizeWorldId(match[1]);
      }
    }
  } catch (err) {
    console.warn('Unable to query browser tabs:', err);
  }
  return null;
}

export async function discoverOpenGameWorlds() {
  const foeRegex = /^https?:\/\/([a-z]+[1-9][0-9]*)\.forgeofempires\.com/i;
  const worlds = [];
  try {
    if (browser.tabs?.query) {
      const tabs = await browser.tabs.query({
        url: '*://*.forgeofempires.com/*',
      });
      for (const tab of tabs || []) {
        if (tab.url) {
          const match = tab.url.match(foeRegex);
          if (match?.[1]) {
            const w = sanitizeWorldId(match[1]);
            if (!worlds.includes(w)) worlds.push(w);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Unable to query game tabs:', err);
  }
  return worlds;
}

export async function detectActiveWorld(globals) {
  const detected = await detectActiveGameTab();
  if (detected && !detected.endsWith('0')) return detected;
  if (globals?.lastActiveWorld && !globals.lastActiveWorld.endsWith('0')) {
    return sanitizeWorldId(globals.lastActiveWorld);
  }
  const validKnown = globals?.knownWorlds?.filter((w) => !w.endsWith('0'));
  if (validKnown?.length) {
    return sanitizeWorldId(validKnown[0]);
  }
  return 'en7';
}

function renderWorldSelector(knownWorlds, currentWorld) {
  const select = document.getElementById('worldSelector');
  if (!select) return;
  select.innerHTML = '';
  const filtered = [...knownWorlds, currentWorld].filter(
    (w) => w && !w.endsWith('0'),
  );
  const worlds = Array.from(new Set(filtered));
  for (const w of worlds) {
    const opt = document.createElement('option');
    opt.value = w;
    opt.textContent = w.toUpperCase();
    if (w === currentWorld) opt.selected = true;
    select.appendChild(opt);
  }
  select.value = currentWorld;
}

function showSaveToast(message = 'Settings saved automatically.') {
  const toast = document.getElementById('saveToast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 2500);
}

async function saveCurrentSettings() {
  const worldSettings = readWorldSettingsFromForm();
  await saveWorldSettings(activeWorld, worldSettings);
  const globalForm = readGlobalSettingsFromForm();
  const globals = await getGlobalSettings();
  const updatedGlobals = {
    ...globals,
    language: globalForm.language,
    timeFormatting: globalForm.timeFormatting,
    lastActiveWorld: activeWorld,
  };
  await browser.storage.local.set({ 'global:settings': updatedGlobals });
  try {
    const { setTimeFormattingConfig } = require('./utils/date.js');
    setTimeFormattingConfig(globalForm.timeFormatting);
  } catch {}
}

function onFormInput(e) {
  if (
    e.target &&
    (e.target.id === 'worldSelector' ||
      e.target.id === 'resetWorldBtn' ||
      e.target.id === 'save')
  ) {
    return;
  }
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    await saveCurrentSettings();
    showSaveToast();
  }, 300);
}

async function onWorldChange(e) {
  const nextWorld = sanitizeWorldId(e.target.value);
  if (nextWorld === activeWorld) return;
  clearTimeout(autoSaveTimer);
  await saveCurrentSettings();

  activeWorld = nextWorld;
  setWorld(activeWorld);

  const globals = await getGlobalSettings();
  await browser.storage.local.set({
    'global:settings': { ...globals, lastActiveWorld: activeWorld },
  });

  const newSettings = await getWorldSettings(activeWorld);
  populateForm(newSettings, globals);
}

async function onResetWorld() {
  const confirmed = confirm(
    `Reset settings for world "${activeWorld.toUpperCase()}" to fresh install defaults?`,
  );
  if (!confirmed) return;
  clearTimeout(autoSaveTimer);
  const fresh = await resetWorldSettings(activeWorld);
  const globals = await getGlobalSettings();
  populateForm(fresh, globals);
  showSaveToast(`World "${activeWorld.toUpperCase()}" reset to defaults.`);
}

async function onExplicitSave() {
  clearTimeout(autoSaveTimer);
  await saveCurrentSettings();
  showSaveToast('Settings saved.');
}

async function initOptions() {
  await initStorage();
  const globals = await getGlobalSettings();

  const discovered = await discoverOpenGameWorlds();
  for (const w of discovered) {
    if (!w.endsWith('0')) {
      await registerKnownWorld(w);
    }
  }

  const detected = await detectActiveGameTab();
  const activeDetected = detected && !detected.endsWith('0') ? detected : null;
  const initialWorld = sanitizeWorldId(
    activeDetected ||
      (globals.lastActiveWorld && !globals.lastActiveWorld.endsWith('0') ?
        globals.lastActiveWorld
      : globals.knownWorlds?.find((w) => !w.endsWith('0')) || 'en7'),
  );
  activeWorld = initialWorld;
  setWorld(activeWorld);

  const refreshedGlobals = await getGlobalSettings();
  const validKnown = refreshedGlobals.knownWorlds?.filter(
    (w) => !w.endsWith('0'),
  ) || [initialWorld];
  renderWorldSelector(validKnown, activeWorld);

  const worldSettings = await getWorldSettings(activeWorld);
  populateForm(worldSettings, refreshedGlobals);

  document
    .getElementById('worldSelector')
    ?.addEventListener('change', onWorldChange);
  document
    .getElementById('resetWorldBtn')
    ?.addEventListener('click', onResetWorld);
  document.getElementById('save')?.addEventListener('click', onExplicitSave);

  const dateTimeFormatEl = document.getElementById('dateTimeFormat');
  const customPatternDiv = document.getElementById('customPatternDiv');
  if (dateTimeFormatEl && customPatternDiv) {
    dateTimeFormatEl.addEventListener('change', () => {
      customPatternDiv.style.display =
        dateTimeFormatEl.value === 'custom' ? '' : 'none';
    });
  }

  const container = document.querySelector('.container') || document.body;
  container.addEventListener('input', onFormInput);
  container.addEventListener('change', onFormInput);
}

document.addEventListener('DOMContentLoaded', initOptions);
