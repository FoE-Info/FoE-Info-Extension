import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

function createElement(id = '') {
  const listeners = new Map();
  const classes = new Set(['show']);
  return {
    id,
    innerHTML: '',
    className: '',
    classList: {
      toggle(name, force) {
        if (force === undefined ? !classes.has(name) : force) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
      remove(name) {
        classes.delete(name);
      },
    },
    style: {},
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    trigger(type) {
      (listeners.get(type) || []).forEach((listener) => listener({ type }));
    },
    click() {
      (listeners.get('click') || []).forEach((listener) => listener());
    },
    setAttribute() {},
  };
}

const elements = new Map([
  ['content', createElement('content')],
  ['beta', createElement('beta')],
  ['betaText', createElement('betaText')],
  ['betaicon', createElement('betaicon')],
]);
const pendingSpan = {
  dataset: { id: 'W_MultiAge_GR23A11' },
  textContent: 'W_MultiAge_GR23A11',
  classList: {
    removed: false,
    remove(name) {
      if (name === 'pending-name') this.removed = true;
    },
  },
};
globalThis.document = {
  addEventListener() {},
  getElementById(id) {
    return elements.get(id) || null;
  },
  querySelectorAll(selector) {
    return selector === '.pending-name' ? [pendingSpan] : [];
  },
  createElement: (tag) => createElement(tag),
};
globalThis.window = globalThis;
globalThis.DEV = true;

const { appendBetaText, renderBetaPanel, resetBetaPanel } =
  await import('../../src/js/ui/betaDebugPanel.js');
const metadataService = await import('../../src/js/msg/MetadataService.js');
const { metadataStore } = await import('../../src/js/state/MetadataStore.js');
const { triggerMetadataUpdated } = metadataService.default || metadataService;

test('debug beta panel collapses, closes, and accumulates inner text', () => {
  const beta = elements.get('beta');
  const betaText = elements.get('betaText');
  const betaIcon = elements.get('betaicon');

  renderBetaPanel(beta, 12, 12);
  assert.match(beta.innerHTML, /id="betaText"/);
  assert.match(beta.innerHTML, /data-bs-dismiss="alert"/);

  // Bootstrap owns the collapse show class; no manual click toggle may
  // fight it. Icon state is synced from the Bootstrap collapse events.
  assert.equal(betaText.classList.contains('show'), true);
  betaIcon.click();
  assert.equal(
    betaText.classList.contains('show'),
    true,
    'manual icon click must not toggle the collapse class',
  );

  betaText.trigger('hidden.bs.collapse');
  assert.equal(betaIcon.textContent, '[+]');
  betaText.trigger('shown.bs.collapse');
  assert.equal(betaIcon.textContent, '[-]');

  appendBetaText('<br>#1: 5FP');
  appendBetaText('<br>#2: 7FP');
  assert.match(betaText.innerHTML, /#1: 5FP/);
  assert.match(betaText.innerHTML, /#2: 7FP/);
  assert.equal(beta.innerHTML.includes('#1: 5FP'), false);

  appendBetaText(
    '<br>#3: <span class="pending-name" data-id="W_MultiAge_GR23A11">W_MultiAge_GR23A11</span> 9FP',
  );
  assert.match(betaText.innerHTML, /pending-name/);
  metadataStore.registerEntity({
    id: 'W_MultiAge_GR23A11',
    name: 'Neo Colossus',
  });
  triggerMetadataUpdated();
  assert.equal(pendingSpan.textContent, 'Neo Colossus');
  assert.equal(pendingSpan.classList.removed, true);
});

test('startup beta branches tag unresolved names and render resolved names', () => {
  const source = fs.readFileSync(
    new URL(
      '../../src/js/calc/entities/CityEntityHarvestCalculator.js',
      import.meta.url,
    ),
    'utf8',
  );
  assert.equal(
    (
      source.match(
        /trimmedName\s*&&\s*trimmedName\s*!==\s*(?:cid|mapID\.cityentity_id)/g,
      ) || []
    ).length,
    2,
  );
  assert.match(source, /<strong>\$\{trimmedName\}<\/strong>/);
  assert.match(
    source,
    /class="pending-name" data-id="\$\{(?:cid|mapID\.cityentity_id)\}"/,
  );
});

test('resetBetaPanel clears accumulated content between startupService runs', () => {
  const betaText = elements.get('betaText');
  appendBetaText('<br>#1: 5FP Total: 5FP <strong>Some Building</strong>');
  assert.match(betaText.innerHTML, /Some Building/);

  resetBetaPanel();
  assert.doesNotMatch(betaText.innerHTML, /Some Building/);
  assert.match(betaText.innerHTML, /Forge Points Production/);

  appendBetaText('<br>#1: 5FP Total: 5FP <strong>Some Building</strong>');
  assert.equal((betaText.innerHTML.match(/Some Building/g) || []).length, 1);
});

test('resetBetaPanel labels the panel as Forge Points Production only, pending other production types', () => {
  const betaText = elements.get('betaText');
  resetBetaPanel();
  assert.match(
    betaText.innerHTML,
    /Forge Points Production/,
    'panel should be labeled since it only tracks FP production for now',
  );
});

test('startupService resets the beta panel at the start of each run to avoid duplicate entries', () => {
  const source = fs.readFileSync(
    new URL('../../src/js/msg/StartupService.js', import.meta.url),
    'utf8',
  );
  assert.match(
    source,
    /appendBetaText,\s*resetBetaPanel\s*}\s*from\s*'\.\.\/ui\/betaDebugPanel\.js'/,
  );
  assert.match(
    source,
    /if \(DEV && checkDebug\(\)\) \{\s*resetBetaPanel\(\);\s*\}/,
  );
});
