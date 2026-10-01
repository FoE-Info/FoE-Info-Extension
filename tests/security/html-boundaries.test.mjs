import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDocument } from 'htmlparser2';
import goods from '../../src/js/calc/goodsTooltipFormatter.js';
import post from '../../src/js/fn/post.js';
import * as html from '../../src/js/utils/html.mjs';

const { sanitizeHTML, htmlToText } = html;

function elements(markup) {
  const out = [];
  function visit(node) {
    if (node.type === 'tag' || node.type === 'script' || node.type === 'style')
      out.push(node);
    for (const child of node.children || []) visit(child);
  }
  visit(parseDocument(markup));
  return out;
}

for (const payload of [
  '<script>alert(1)</script><span onclick="alert(1)">safe</span>',
  '<svg><a onload="alert(1)">bad</a></svg><math><mtext>bad</mtext></math>',
  '<a href="javascript:alert(1)">link</a><a href="jav&#x61;script:alert(1)">encoded</a>',
  '<iframe srcdoc="<script>alert(1)</script>"></iframe><object data="data:text/html,bad"></object>',
  '<span style="background-image:url(javascript:alert(1))" onmouseover="alert(1)">text</span>',
  '<input autofocus onfocus="alert(1)"><img src=x onerror="alert(1)">',
]) {
  test(`rich markup rejects active content: ${payload.slice(0, 45)}`, () => {
    const sanitized = sanitizeHTML(payload);
    for (const el of elements(sanitized)) {
      assert.ok(
        !['script', 'svg', 'math', 'iframe', 'object', 'img'].includes(el.name),
      );
      for (const [name, value] of Object.entries(el.attribs)) {
        assert.ok(!name.startsWith('on'));
        if (name === 'href')
          assert.ok(
            value === '' ||
              ['https:', 'http:'].includes(
                new URL(value, 'https://example.test').protocol,
              ),
          );
        if (name === 'style')
          assert.ok(!value.toLowerCase().includes('javascript:'));
      }
    }
  });
}

test('rich markup retains collapse/copy controls, tables and harmless styling', () => {
  const sanitized = sanitizeHTML(
    '<button id="copy" type="button" class="badge" data-i18n="copy" aria-label="Copy">Copy</button><div id="body" data-bs-target="#body" style="display: none; cursor: pointer;"><table><tr><th scope="col">Name</th><td colspan="2">Value</td></tr></table></div>',
  );
  const nodes = elements(sanitized);
  assert.equal(
    nodes.find((n) => n.name === 'button').attribs['data-i18n'],
    'copy',
  );
  assert.equal(
    nodes.find((n) => n.name === 'div').attribs['data-bs-target'],
    '#body',
  );
  assert.equal(nodes.find((n) => n.name === 'th').attribs.scope, 'col');
  assert.match(
    nodes.find((n) => n.name === 'div').attribs.style,
    /display:\s*none/,
  );
});

test('plain text parsing excludes hidden blocks and decodes entities exactly once', () => {
  assert.equal(
    htmlToText(
      '<script>secret</script><style>hidden</style>A &amp;lt;b&amp;gt;<br>B &#x26; C',
    ),
    'A &lt;b&gt;\nB & C',
  );
  assert.equal(
    post.sanitizeDiscordText('<p>A &amp;lt;b&amp;gt;</p><p>B</p>'),
    'A &lt;b&gt;\nB',
  );
  assert.equal(
    htmlToText('<table><tr><td>A</td><td>B</td></tr></table>', { table: true }),
    'A\tB\t\n',
  );
  assert.equal(
    htmlToText('<script>hidden</script ><p>visible</p>'),
    'visible\n',
  );
});

test('goods tooltip attributes cannot break out of the span', () => {
  const markup = goods.fGoodsHTML(
    'ba',
    { BronzeAge: '<br>" onmouseover="evil &amp; x' },
    { ba: 5 },
    0,
  );
  const nodes = elements(markup);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].name, 'span');
  assert.ok(!Object.hasOwn(nodes[0].attribs, 'onmouseover'));
  assert.match(nodes[0].attribs.title, /" onmouseover="evil/);
  assert.equal(
    nodes[0].attribs['data-bs-title'],
    '<br>" onmouseover="evil &amp; x',
  );
});

test('reward names cannot mutate bucket prototypes', async () => {
  const { addToBucket } = await import('../../src/js/ui/rewardCategories.js');
  const bucket = {};
  const originalPrototype = Object.getPrototypeOf(bucket);
  addToBucket({ rewardsGeneric: bucket }, 'expedition', '__proto__', 5);
  addToBucket({ rewardsGeneric: bucket }, 'expedition', '__proto__', 3);
  assert.equal(Object.getPrototypeOf(bucket), originalPrototype);
  assert.equal(Object.getOwnPropertyDescriptor(bucket, '__proto__').value, 8);
  const { showReward } = await import('../../src/js/ui/RewardRenderer.mjs');
  const { clearRewardsState, rewardsBySource } =
    await import('../../src/js/state/state.mjs');
  clearRewardsState();
  try {
    showReward('expedition', { type: 'item', name: '__proto__', amount: 2 });
    assert.equal(Object.getPrototypeOf(rewardsBySource.expedition), null);
    assert.equal(rewardsBySource.expedition.__proto__, 2);
  } finally {
    clearRewardsState();
  }
});

test('reward name cleanup handles long whitespace and preserves normal names', async () => {
  const { normalizeRewardName } =
    await import('../../src/js/ui/rewardNames.js');
  assert.equal(
    normalizeRewardName(' '.repeat(100000) + 'Item - Active'),
    'Item',
  );
  assert.equal(normalizeRewardName('Item' + ' '.repeat(100000)), 'Item');
  assert.equal(normalizeRewardName(' 8x Item - Active '), 'Item');
  assert.equal(normalizeRewardName('Item-Active'), 'Item-Active');
});

test('player-name accessor reads current names and legacy strings', async () => {
  const { playerNameCache, getPlayerName } =
    await import('../../src/js/state/state.mjs');
  const key = 'security-test-player';
  const previous = playerNameCache[key];
  try {
    playerNameCache[key] = 'Legacy';
    assert.equal(getPlayerName(key), 'Legacy');
    playerNameCache[key] = {
      currentName: 'Current',
      previousNames: ['Legacy'],
    };
    assert.equal(getPlayerName(key), 'Current');
    playerNameCache[key] = { notFound: true };
    assert.equal(getPlayerName(key), '');
  } finally {
    if (previous === undefined) delete playerNameCache[key];
    else playerNameCache[key] = previous;
  }
});
