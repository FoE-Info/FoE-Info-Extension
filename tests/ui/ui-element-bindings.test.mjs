import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createMockElement(id = '') {
  const listeners = new Map();
  const classes = new Set();
  return {
    id,
    innerHTML: '',
    className: '',
    style: {},
    classList: {
      contains(name) {
        return classes.has(name);
      },
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
      toggle(name, force) {
        const next = force === undefined ? !classes.has(name) : force;
        if (next) classes.add(name);
        else classes.delete(name);
        return next;
      },
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    listenerCount(type) {
      return (listeners.get(type) || []).length;
    },
    dispatch(type, event = {}) {
      (listeners.get(type) || []).forEach((listener) =>
        listener({ type, ...event }),
      );
    },
  };
}

function createMockBrowser(overrides = {}) {
  const state = { openOptionsCalls: 0, reloadCalls: 0, alerts: [] };
  const browser = {
    state,
    runtime: {
      getManifest: () => ({ name: 'FoE-Info', version: '1.2.3' }),
      getURL: (resource) => `chrome-extension://test/${resource}`,
      openOptionsPage: async () => {
        state.openOptionsCalls += 1;
      },
      onInstalled: { addListener() {} },
      onUpdateAvailable: { addListener() {} },
      onMessage: { addListener() {} },
      requestUpdateCheck: async () => 'no_update',
      reload: () => {
        state.reloadCalls += 1;
      },
    },
    storage: {
      local: {
        getBytesInUse: async () => 2048,
        get: async () => ({}),
      },
      onChanged: { addListener() {}, removeListener() {} },
    },
    ...overrides,
  };
  return browser;
}

const mockWindow = {
  addEventListener(type, listener) {
    if (!mockWindow._listeners.has(type)) mockWindow._listeners.set(type, []);
    mockWindow._listeners.get(type).push(listener);
  },
  _listeners: new Map(),
  open() {},
  matchMedia() {
    return {
      listeners: [],
      addEventListener(type, listener) {
        this.listeners.push(listener);
      },
      dispatch({ matches }) {
        this.listeners.forEach((listener) => listener({ matches }));
      },
    };
  },
};

const targetDocument = {
  body: createMockElement('body'),
  querySelector: () => optionsButton,
  getElementById: () => null,
  addEventListener() {},
};

const optionsButton = createMockElement('go-to-options');

globalThis.window = mockWindow;
globalThis.document = targetDocument;

const {
  bindOptionsButton,
  bindWindowMessageListener,
  bindThemeToggle,
} = require('../../src/js/ui/uiElementBindings.js');

describe('uiElementBindings UI listeners', () => {
  test('bindOptionsButton opens options page when browserObj.runtime.openOptionsPage exists', async () => {
    const browser = createMockBrowser();
    const result = bindOptionsButton(targetDocument, browser, window);
    assert.ok(result);
    assert.equal(result.id, 'go-to-options');
    await browser.runtime.openOptionsPage();
    assert.equal(browser.state.openOptionsCalls, 1);
  });

  test('bindOptionsButton falls back to win.open when openOptionsPage missing', async () => {
    const browserWithRuntimeOverrides = {
      ...createMockBrowser(),
      runtime: { ...createMockBrowser().runtime, openOptionsPage: undefined },
    };
    const result = bindOptionsButton(
      targetDocument,
      browserWithRuntimeOverrides,
      window,
    );
    assert.ok(result);
    assert.equal(result.id, 'go-to-options');
  });

  test('bindOptionsButton returns null when document missing', () => {
    const browser = createMockBrowser();
    const result = bindOptionsButton(null, browser, window);
    assert.strictEqual(result, null);
  });

  test('bindOptionsButton returns null when optionsButton missing', () => {
    const browser = createMockBrowser();
    const mockDoc = { querySelector: () => null };
    const result = bindOptionsButton(mockDoc, browser, window);
    assert.strictEqual(result, null);
  });

  test('bindWindowMessageListener attaches message event listener', () => {
    const result = bindWindowMessageListener(window);
    assert.ok(result);
    assert.equal(result, window);
    const listeners = window._listeners.get('message');
    assert.equal(listeners.length, 1);
  });

  test('bindWindowMessageListener returns null when window missing', () => {
    const result = bindWindowMessageListener(null);
    assert.strictEqual(result, null);
  });

  test('bindThemeToggle attaches change event listener for dark mode', () => {
    let themeChangeCalled = false;
    let themeChangeMatches = false;
    const onThemeChange = (matches) => {
      themeChangeCalled = true;
      themeChangeMatches = matches;
    };
    const media = bindThemeToggle(window, targetDocument, onThemeChange);
    assert.ok(media);
    media.dispatch({ matches: true });
    assert.ok(themeChangeCalled);
    assert.strictEqual(themeChangeMatches, true);
    assert.strictEqual(targetDocument.body.classList.contains('bg-dark'), true);
    assert.strictEqual(
      targetDocument.body.classList.contains('text-light'),
      true,
    );
  });

  test('bindThemeToggle attaches change event listener for light mode', () => {
    let themeChangeCalled = false;
    let themeChangeMatches = false;
    const onThemeChange = (matches) => {
      themeChangeCalled = true;
      themeChangeMatches = matches;
    };
    const media = bindThemeToggle(window, targetDocument, onThemeChange);
    assert.ok(media);
    media.dispatch({ matches: false });
    assert.ok(themeChangeCalled);
    assert.strictEqual(themeChangeMatches, false);
    assert.strictEqual(
      targetDocument.body.classList.contains('bg-dark'),
      false,
    );
    assert.strictEqual(
      targetDocument.body.classList.contains('text-light'),
      false,
    );
  });

  test('bindThemeToggle returns null when window missing', () => {
    const result = bindThemeToggle(null, targetDocument, () => {});
    assert.strictEqual(result, null);
  });
});
