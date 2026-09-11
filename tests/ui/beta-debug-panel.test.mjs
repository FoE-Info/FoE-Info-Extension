import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { describe, test } from 'node:test';

const require = createRequire(import.meta.url);

function createMockElement(id = '') {
  const listeners = new Map();
  const classes = new Set(['show']);
  const attrs = {};
  return {
    id,
    innerHTML: '',
    className: '',
    textContent: '',
    style: { height: '', maxHeight: '' },
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
      },
    },
    setAttribute(name, value) {
      attrs[name] = String(value);
    },
    getAttribute(name) {
      return attrs[name];
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatch(type) {
      (listeners.get(type) || []).forEach((listener) => listener({ type }));
    },
    click() {
      this.dispatch('click');
    },
  };
}

const elements = new Map([
  ['content', createMockElement('content')],
  ['beta', createMockElement('beta')],
  ['betaText', createMockElement('betaText')],
  ['betaicon', createMockElement('betaicon')],
]);

globalThis.document = {
  addEventListener() {},
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelectorAll() {
    return [];
  },
  createElement: (tag) => createMockElement(tag),
};
globalThis.window = globalThis;
globalThis.DEV = true;

const {
  appendBetaText,
  renderBetaPanel,
  resetBetaPanel,
} = require('../../src/js/ui/betaDebugPanel.js');

function createMockStorage(initial = {}) {
  const written = [];
  return {
    written,
    getSync(key) {
      return Object.prototype.hasOwnProperty.call(initial, key) ?
          initial[key]
        : null;
    },
    set(key, value) {
      written.push([key, value]);
      initial[key] = value;
    },
  };
}

function createMockResizeObserver() {
  const handles = [];
  class MockRO {
    constructor(callback) {
      this.callback = callback;
      handles.push(this);
    }
    observe() {}
    disconnect() {}
  }
  return { MockRO, handles };
}

const beta = elements.get('beta');
const betaText = elements.get('betaText');
const betaIcon = elements.get('betaicon');

describe('betaDebugPanel resizable collapse', () => {
  test('renders resizable collapse markup without inline max-height overrides', () => {
    renderBetaPanel(beta, 12, 12);

    assert.match(beta.innerHTML, /id="betaText"/);
    assert.match(beta.innerHTML, /class="resize collapse show"/);
    assert.match(beta.innerHTML, /data-bs-toggle="collapse"/);
    assert.match(beta.innerHTML, /data-bs-target="#betaText"/);
    assert.doesNotMatch(
      beta.innerHTML,
      /max-height/,
      'inline max-height must be removed in favor of .resize styling',
    );
    assert.doesNotMatch(
      beta.innerHTML,
      /overflow-y:\s*auto\s*!important/,
      'inline overflow override must be removed',
    );
  });

  test('has no manual click listener that double-toggles the collapse', () => {
    renderBetaPanel(beta, 12, 12);
    assert.equal(betaText.classList.contains('show'), true);

    betaIcon.click();
    assert.equal(
      betaText.classList.contains('show'),
      true,
      'clicking the icon must not manually toggle the DOM class (Bootstrap owns it)',
    );
  });

  test('collapse events keep the toggle icon in sync', () => {
    renderBetaPanel(beta, 12, 12);

    betaText.dispatch('hidden.bs.collapse');
    assert.equal(betaIcon.textContent, '[+]');
    assert.equal(betaIcon.getAttribute('aria-expanded'), 'false');

    betaText.dispatch('shown.bs.collapse');
    assert.equal(betaIcon.textContent, '[-]');
    assert.equal(betaIcon.getAttribute('aria-expanded'), 'true');
  });

  test('re-render preserves the collapsed state observed in the DOM', () => {
    betaText.classList.remove('show');
    beta.innerHTML = '';
    renderBetaPanel(beta, 12, 12);

    assert.match(beta.innerHTML, /class="resize collapse "/);
    assert.doesNotMatch(beta.innerHTML, /class="resize collapse show"/);
    assert.match(beta.innerHTML, /aria-expanded="false"/);
    assert.match(beta.innerHTML, /\[\+\]/);

    betaText.classList.add('show');
  });
});

describe('betaDebugPanel height persistence', () => {
  test('binds resize retention to beta:height with a 250px default', () => {
    const storage = createMockStorage();
    const { MockRO, handles } = createMockResizeObserver();

    renderBetaPanel(beta, 12, 12, { storage, ResizeObserver: MockRO });

    assert.equal(
      betaText.style.height,
      '250px',
      'expanded panel must initialize to the 250px default',
    );

    assert.equal(handles.length, 1, 'a ResizeObserver must be attached');
    handles[0].callback([{ contentRect: { height: 320 } }]);

    assert.deepEqual(
      storage.written.at(-1),
      ['beta:height', 320],
      'user resize must be persisted under the beta:height storage key',
    );
  });

  test('restores the persisted beta:height on render', () => {
    const storage = createMockStorage({ 'beta:height': 333 });
    const { MockRO } = createMockResizeObserver();

    renderBetaPanel(beta, 12, 12, { storage, ResizeObserver: MockRO });

    assert.equal(betaText.style.height, '333px');
  });
});

describe('betaDebugPanel text accumulation', () => {
  test('appendBetaText appends into the panel body only', () => {
    const storage = createMockStorage();
    const { MockRO } = createMockResizeObserver();
    renderBetaPanel(beta, 12, 12, { storage, ResizeObserver: MockRO });

    appendBetaText('<br>#1: 5FP');
    assert.match(betaText.innerHTML, /#1: 5FP/);
    assert.equal(beta.innerHTML.includes('#1: 5FP'), false);
  });

  test('resetBetaPanel restores the Forge Points Production label', () => {
    resetBetaPanel();
    assert.match(betaText.innerHTML, /Forge Points Production/);
  });
});
