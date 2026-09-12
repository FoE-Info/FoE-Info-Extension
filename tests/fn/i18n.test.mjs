import assert from 'node:assert/strict';
import test from 'node:test';
import pkg from '../../src/js/fn/i18n.js';

const {
  getLocale,
  loadTranslations,
  setLocale,
  setupI18nBridge,
  t,
  translateContainer,
} = pkg;

test('i18n - Locale setting and fallback translation', () => {
  loadTranslations('en', {
    bonus: 'Bonus',
    greeting: 'Hello $1, you have $2 points',
  });
  loadTranslations('de', {
    bonus: 'Bonus (DE)',
  });

  setLocale('en');
  assert.equal(getLocale(), 'en');
  assert.equal(t('bonus'), 'Bonus');
  assert.equal(
    t('greeting', 'Player1', '100'),
    'Hello Player1, you have 100 points',
  );

  // Switch to German
  setLocale('de');
  assert.equal(t('bonus'), 'Bonus (DE)');
  // Fallback to English for missing key
  assert.equal(
    t('greeting', 'Player1', '100'),
    'Hello Player1, you have 100 points',
  );
  // Unknown key returns key name
  assert.equal(t('unknown_key'), 'unknown_key');
});

test('i18n - translateContainer DOM scanner', () => {
  setLocale('en');
  loadTranslations('en', {
    load: 'Load Game',
    reward: 'Rewards',
  });

  const children = [
    {
      getAttribute: (attr) => (attr === 'data-i18n' ? 'load' : null),
      textContent: 'old',
    },
    {
      getAttribute: (attr) => (attr === 'data-i18n' ? 'reward' : null),
      textContent: 'old',
    },
  ];

  const mockContainer = {
    getAttribute: () => null,
    querySelectorAll: (selector) =>
      selector.includes('[data-i18n]') ? children : [],
  };

  translateContainer(mockContainer);
  assert.equal(children[0].textContent, 'Load Game');
  assert.equal(children[1].textContent, 'Rewards');
});

test('i18n - translateContainer applies title, aria-label and placeholder', () => {
  setLocale('en');
  loadTranslations('en', {
    close: 'Close',
    search: 'Search',
    copy: 'Copy',
  });

  function makeEl(attrs) {
    return {
      textContent: '',
      attributes: { ...attrs },
      getAttribute(k) {
        return this.attributes[k] ?? null;
      },
      setAttribute(k, v) {
        this.attributes[k] = v;
      },
    };
  }

  const titleEl = makeEl({ 'data-i18n-title': 'close' });
  const ariaEl = makeEl({ 'data-i18n-aria-label': 'copy' });
  const placeholderEl = makeEl({ 'data-i18n-placeholder': 'search' });

  const mockContainer = {
    getAttribute: () => null,
    querySelectorAll: () => [titleEl, ariaEl, placeholderEl],
  };

  translateContainer(mockContainer);
  assert.equal(titleEl.getAttribute('title'), 'Close');
  assert.equal(ariaEl.getAttribute('aria-label'), 'Copy');
  assert.equal(placeholderEl.getAttribute('placeholder'), 'Search');
});

test('i18n - Legacy jQuery bridge shim', async () => {
  const mockJQuery = function () {
    return {
      each: (fn) => fn(0, {}),
    };
  };
  mockJQuery.fn = {};

  const globalScope = {
    jQuery: mockJQuery,
    $: mockJQuery,
  };

  setupI18nBridge(globalScope);

  assert.equal(typeof globalScope.$.i18n, 'function');
  assert.equal(typeof globalScope.$.fn.i18n, 'function');

  // Check load().done() compatibility
  let doneCalled = false;
  await new Promise((resolve) => {
    globalScope.$.i18n()
      .load({
        en: { testBridge: 'Bridge Works' },
      })
      .done(() => {
        doneCalled = true;
        resolve();
      });
  });

  assert.equal(doneCalled, true);
  assert.equal(globalScope.$.i18n('testBridge'), 'Bridge Works');
});

test('i18n - Fallback $ bridge when neither jQuery nor $ is defined', () => {
  const emptyScope = {};
  setupI18nBridge(emptyScope);

  assert.equal(typeof emptyScope.$, 'function');
  assert.equal(typeof emptyScope.$.i18n, 'function');
  assert.equal(emptyScope.$.i18n.debug, false);
  // Setting debug property does not throw
  emptyScope.$.i18n.debug = true;
  assert.equal(emptyScope.$.i18n.debug, true);
});
