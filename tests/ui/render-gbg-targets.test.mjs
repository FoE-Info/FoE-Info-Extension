import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('GBG target renderer escapes untrusted message and sender text', () => {
  const previousDocument = globalThis.document;
  const targetContainer = {
    innerHTML: '',
    querySelectorAll: () => [],
  };
  globalThis.document = {
    getElementById: (id) => (id === 'targetsGBG' ? targetContainer : null),
  };

  try {
    const {
      renderTargetMessage,
    } = require('../../src/js/ui/renderGbgTargets.js');
    renderTargetMessage(
      {
        text: '<img src=x onerror=alert(1)>',
        sender: { name: '<svg onload=alert(2)>' },
        date: 1_700_000_000,
      },
      { setTargetMessageActive() {} },
    );

    assert.match(
      targetContainer.innerHTML,
      /&lt;img src=x onerror=alert\(1\)&gt;/,
    );
    assert.match(targetContainer.innerHTML, /&lt;svg onload=alert\(2\)&gt;/);
    assert.doesNotMatch(targetContainer.innerHTML, /<(?:img|svg)\b/i);
  } finally {
    if (previousDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previousDocument;
    }
  }
});
