import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  escapeDebugData,
  stripDebugStubs,
  makeDebugStubMarkup,
  isPanelVisible,
} = require('../../src/js/ui/cardVisibilityDebugStubs.js');

test('cardVisibilityDebugStubs suite', async (t) => {
  await t.test('escapeDebugData escapes HTML entities properly', () => {
    const raw = '<script>alert("x & y")</script>';
    const escaped = escapeDebugData(raw);
    assert.equal(
      escaped,
      '&lt;script&gt;alert(&quot;x &amp; y&quot;)&lt;/script&gt;',
    );
  });

  await t.test('stripDebugStubs removes existing debug stub containers', () => {
    const htmlWithStub =
      '<div>Content A</div><div class="alert alert-secondary debug-stub" data-foe-stub-for="testPanel">stub</div><div>Content B</div>';
    const stripped = stripDebugStubs(htmlWithStub);
    assert.equal(stripped, '<div>Content A</div><div>Content B</div>');
  });

  await t.test(
    'makeDebugStubMarkup builds alert element with data attribute',
    () => {
      const markup = makeDebugStubMarkup('myPanel', 'raw content data');
      assert.ok(markup.includes('data-foe-stub-for="myPanel"'));
      assert.ok(markup.includes('[DEBUG STUB]'));
      assert.ok(markup.includes('raw content data'));
    },
  );

  await t.test('isPanelVisible detects display: none correctly', () => {
    assert.equal(isPanelVisible(null), false);
    assert.equal(isPanelVisible({ style: { display: 'none' } }), false);
    assert.equal(isPanelVisible({ style: { display: '' } }), true);
    assert.equal(isPanelVisible({ style: { display: 'block' } }), true);
  });
});
