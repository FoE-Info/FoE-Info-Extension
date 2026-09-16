import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');

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

const targetDocument = {
  body: createMockElement('body'),
  querySelector: () => optionsButton,
  getElementById: () => null,
  addEventListener() {},
};

const optionsButton = createMockElement('go-to-options');
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

globalThis.window = mockWindow;
globalThis.document = targetDocument;

const {
  initIndexUiBindings,
  bootstrapExtensionUi,
  bindOptionsButton,
  bindWindowMessageListener,
  bindThemeToggle,
  logStorageUsage,
  bindRuntimeLifecycle,
  buildStorageDeps,
} = require('../../src/js/ui/indexUiBindings.js');

describe('indexUiBindings UI listeners', () => {
  test('options button opens the extension options page', async () => {
    const browser = createMockBrowser();
    const button = createMockElement('go-to-options');
    const doc = { querySelector: () => button };

    const bound = bindOptionsButton(doc, browser, mockWindow);
    assert.equal(bound, button);
    assert.equal(button.listenerCount('click'), 1);

    button.dispatch('click');
    await Promise.resolve();
    assert.equal(browser.state.openOptionsCalls, 1);
  });

  test('window message listener is attached and does not throw', () => {
    const win = createMockElement('window');
    const bound = bindWindowMessageListener(win);

    assert.equal(bound, win);
    assert.equal(win.listenerCount('message'), 1);
    assert.doesNotThrow(() => win.dispatch('message', { data: { ok: true } }));
  });

  test('theme listener toggles dark classes and reports the change', () => {
    const changed = [];
    const media = bindThemeToggle(mockWindow, targetDocument, (matches) =>
      changed.push(matches),
    );

    media.dispatch({ matches: true });
    assert.equal(targetDocument.body.classList.contains('bg-dark'), true);
    assert.equal(targetDocument.body.classList.contains('text-light'), true);
    assert.deepEqual(changed, [true]);

    media.dispatch({ matches: false });
    assert.equal(targetDocument.body.classList.contains('bg-dark'), false);
    assert.deepEqual(changed, [true, false]);
  });

  test('storage usage logging reads getBytesInUse', async () => {
    let calls = 0;
    const browser = createMockBrowser();
    browser.storage.local.getBytesInUse = async () => {
      calls += 1;
      return 512;
    };

    logStorageUsage(browser);
    await Promise.resolve();
    assert.equal(calls, 1);
  });
});

describe('indexUiBindings runtime lifecycle', () => {
  test('registers installed/update listeners and reports updates', () => {
    const registered = {};
    const browser = createMockBrowser();
    browser.runtime.onInstalled = {
      addListener(listener) {
        registered.installed = listener;
      },
    };
    browser.runtime.onUpdateAvailable = {
      addListener(listener) {
        registered.updateAvailable = listener;
      },
    };
    browser.runtime.requestUpdateCheck = async () => 'no_update';
    const alerts = [];

    bindRuntimeLifecycle({
      browser,
      tool: { name: 'FoE-Info', version: '1.2.3' },
      alertFn: (message) => alerts.push(message),
    });

    assert.equal(typeof registered.installed, 'function');
    assert.equal(typeof registered.updateAvailable, 'function');

    registered.installed({ reason: 'update', previousVersion: '1.0.0' });
    assert.match(alerts.at(-1), /updated from 1\.0\.0 to 1\.2\.3/);

    registered.updateAvailable({ version: '2.0.0' });
    assert.equal(browser.state.reloadCalls, 1);
    assert.match(alerts.at(-1), /updating to version 2\.0\.0/);
  });
});

describe('indexUiBindings initIndexUiBindings', () => {
  test('uses all injected msg service functions by identity', () => {
    const injected = {
      renderLiveCityStats() {},
      startupService() {},
      setCurrentPercent() {},
      setResourceDefs() {},
      processMetadataData() {},
      getServiceLastStartupMsg() {},
    };

    const storageDeps = buildStorageDeps(injected);

    for (const [name, dependency] of Object.entries(injected)) {
      assert.equal(storageDeps[name], dependency, `${name} must be forwarded`);
    }
  });

  test('bootstrapExtensionUi forwards injected msg service functions', () => {
    const injected = {
      renderLiveCityStats() {},
      startupService() {},
      setCurrentPercent() {},
      setResourceDefs() {},
      processMetadataData() {},
      getServiceLastStartupMsg() {},
    };

    const { storageDeps } = bootstrapExtensionUi({
      ...injected,
      browser: createMockBrowser(),
      window: mockWindow,
      document: { querySelector: () => null, body: createMockElement('body') },
    });

    for (const [name, dependency] of Object.entries(injected)) {
      assert.equal(storageDeps[name], dependency, `${name} must be forwarded`);
    }
  });

  test('injected startup message getter reads its mutable backing value', () => {
    let serviceLastStartupMsg = { id: 'initial' };
    const getServiceLastStartupMsg = () => serviceLastStartupMsg;
    const storageDeps = buildStorageDeps({ getServiceLastStartupMsg });

    assert.equal(
      storageDeps.getServiceLastStartupMsg,
      getServiceLastStartupMsg,
    );
    assert.deepEqual(storageDeps.getServiceLastStartupMsg(), { id: 'initial' });

    serviceLastStartupMsg = { id: 'updated' };
    assert.deepEqual(storageDeps.getServiceLastStartupMsg(), { id: 'updated' });
  });

  test('initializes safely in a mock DOM without throwing', async () => {
    const browser = createMockBrowser();
    const button = createMockElement('go-to-options');
    const doc = {
      querySelector: () => button,
      body: createMockElement('body'),
    };

    let result;
    assert.doesNotThrow(() => {
      result = initIndexUiBindings({
        browser,
        window: mockWindow,
        document: doc,
        tool: { name: 'FoE-Info', version: '1.2.3' },
        alertFn: () => {},
        getLanguage: () => 'auto',
      });
    });

    assert.equal(button.listenerCount('click'), 1);
    assert.ok(result.storageDeps);
    assert.equal(result.storageDeps.browser, browser);

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(globalThis.window, mockWindow);
  });

  test('index.js wires initIndexUiBindings and stays within the size cap', () => {
    const indexSource = fs.readFileSync(
      path.join(ROOT_DIR, 'src/js/index.js'),
      'utf8',
    );

    assert.match(
      indexSource,
      /import\s+\{\s*initIndexUiBindings\s*\}\s+from\s+'\.\/ui\/indexUiBindings\.js'/,
      'index.js must import initIndexUiBindings',
    );
    assert.match(
      indexSource,
      /initIndexUiBindings\(\{/,
      'index.js must invoke initIndexUiBindings()',
    );

    const lineCount = indexSource.split('\n').length;
    assert.ok(
      lineCount <= 600,
      `src/js/index.js must stay <= 600 lines (was ${lineCount})`,
    );
  });

  test('msg service dependencies are imported and injected only by index.js', () => {
    const uiSource = fs.readFileSync(
      path.join(ROOT_DIR, 'src/js/ui/indexUiBindings.js'),
      'utf8',
    );
    const indexSource = fs.readFileSync(
      path.join(ROOT_DIR, 'src/js/index.js'),
      'utf8',
    );

    assert.doesNotMatch(
      uiSource,
      /['"]\.\.\/msg\//,
      'indexUiBindings.js must not import or require msg modules',
    );

    const expectedImports = new Map([
      ['./msg/StartupService.js', ['renderLiveCityStats', 'startupService']],
      ['./msg/GreatBuildingsService.js', ['setCurrentPercent']],
      ['./msg/ResourceService.js', ['setResourceDefs']],
      ['./msg/MetadataService.js', ['processMetadataData']],
    ]);
    for (const [modulePath, names] of expectedImports) {
      const escapedPath = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const importMatch = indexSource.match(
        new RegExp(`import\\s+\\{([\\s\\S]*?)\\}\\s+from\\s+'${escapedPath}'`),
      );
      assert.ok(importMatch, `index.js must import from ${modulePath}`);
      for (const name of names) {
        assert.match(importMatch[1], new RegExp(`\\b${name}\\b`));
      }
    }

    const initCall = indexSource.match(
      /initIndexUiBindings\(\{([\s\S]*?)\n\}\);/,
    );
    assert.ok(initCall, 'index.js must configure initIndexUiBindings()');
    for (const name of [
      'renderLiveCityStats',
      'startupService',
      'setCurrentPercent',
      'setResourceDefs',
      'processMetadataData',
    ]) {
      assert.match(initCall[1], new RegExp(`\\b${name}\\s*,`));
    }

    const startupImport = indexSource.match(
      /import\s+\{([\s\S]*?)\}\s+from\s+'\.\/msg\/StartupService\.js'/,
    );
    assert.ok(
      startupImport,
      'index.js must import StartupService dependencies',
    );
    assert.match(
      startupImport[1],
      /\blastStartupMsg\s+as\s+serviceLastStartupMsg\b/,
      'index.js must import the live service startup message binding',
    );
    assert.match(
      initCall[1],
      /getServiceLastStartupMsg:\s*\(\)\s*=>\s*serviceLastStartupMsg/,
      'index.js must inject a getter over the live service binding',
    );
  });
});
