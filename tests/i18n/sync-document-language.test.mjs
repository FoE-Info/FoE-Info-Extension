/**
 * Tests for the i18n runtime: syncDocumentLanguage export and the
 * saved-locale restore path applying <html lang>.
 *
 * The engine runs in Node (no DOM), so a minimal globalThis.document stub is
 * installed to observe the attribute writes.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, it } from 'node:test';

const require = createRequire(import.meta.url);

/** Minimal document stub sufficient for syncDocumentLanguage. */
function makeDocumentStub() {
  const root = { lang: 'en', setAttribute: (k, v) => (root[k] = v) };
  return {
    documentElement: root,
    title: 'untitled',
  };
}

describe('syncDocumentLanguage', () => {
  let documentStub;
  beforeEach(() => {
    documentStub = makeDocumentStub();
    globalThis.document = documentStub;
  });
  afterEach(() => {
    delete globalThis.document;
  });

  it('is exported and sets <html lang> to the given locale', () => {
    const i18n = require('../../src/js/utils/i18n.js');
    assert.equal(typeof i18n.syncDocumentLanguage, 'function');

    i18n.syncDocumentLanguage('de');
    assert.equal(documentStub.documentElement.lang, 'de');

    i18n.syncDocumentLanguage('gr');
    assert.equal(documentStub.documentElement.lang, 'gr');
  });

  it('is a no-op outside a DOM environment (does not throw)', () => {
    const i18n = require('../../src/js/utils/i18n.js');
    delete globalThis.document;

    assert.doesNotThrow(() => i18n.syncDocumentLanguage('de'));
  });

  it('ignores empty/falsy locales', () => {
    const i18n = require('../../src/js/utils/i18n.js');
    documentStub.documentElement.lang = 'en';
    i18n.syncDocumentLanguage('');
    assert.equal(documentStub.documentElement.lang, 'en');
  });
});

describe('setLocale applies <html lang> (locale application + saved-locale restore path)', () => {
  let documentStub;
  beforeEach(() => {
    documentStub = makeDocumentStub();
    globalThis.document = documentStub;
  });
  afterEach(() => {
    delete globalThis.document;
    // Reset module state for the next test via a fresh require each time.
  });

  it('setLocale syncs document lang to the applied locale', () => {
    const i18n = require('../../src/js/utils/i18n.js');
    i18n.setLocale('fr');
    assert.equal(documentStub.documentElement.lang, 'fr');
    assert.equal(i18n.getLocale(), 'fr');
  });

  it('saved-locale restore: loading dictionaries then applying the saved locale sets its lang', () => {
    const i18n = require('../../src/js/utils/i18n.js');
    // Simulate the restore path: dictionaries loaded, then saved locale applied
    // (options.js initOptionsI18n and storageBootstrap jq.i18n({locale}) both
    // funnel through setLocale).
    i18n.loadTranslations('it', { hello: 'ciao' });
    i18n.setLocale('it');
    assert.equal(documentStub.documentElement.lang, 'it');

    // A later restore to another saved locale updates the attribute again.
    i18n.setLocale('es');
    assert.equal(documentStub.documentElement.lang, 'es');
  });

  it('setLocale still updates t() resolution (behaviour unchanged)', () => {
    const i18n = require('../../src/js/utils/i18n.js');
    i18n.loadTranslations('de', { greeting: 'Hallo' });
    i18n.setLocale('de');
    assert.equal(i18n.t('greeting'), 'Hallo');
    i18n.setLocale('en');
    assert.equal(i18n.t('greeting'), 'greeting');
  });

  it('rejects non-string locales without touching current state', () => {
    const i18n = require('../../src/js/utils/i18n.js');
    i18n.setLocale('en');
    i18n.setLocale(undefined);
    i18n.setLocale(42);
    assert.equal(i18n.getLocale(), 'en');
  });
});
