import assert from 'node:assert/strict';
import test from 'node:test';

test('options initialization immediately populates from storage without blank delay', async () => {
  // Setup mock DOM
  const elements = {};
  const select = {
    id: 'worldSelector',
    options: [],
    value: '',
    appendChild(opt) {
      this.options.push(opt);
    },
    addEventListener() {},
  };
  const container = {
    classList: {
      classes: new Set(),
      add(cls) {
        this.classes.add(cls);
      },
      contains(cls) {
        return this.classes.has(cls);
      },
    },
    addEventListener() {},
  };

  const checkboxes = ['Stats', 'bonus', 'Incidents', 'showGalaxy'];
  for (const id of checkboxes) {
    elements[id] = { id, checked: false };
  }
  elements['worldSelector'] = select;
  elements['resetWorldBtn'] = { addEventListener() {} };
  elements['save'] = { addEventListener() {} };

  globalThis.document = {
    readyState: 'complete',
    getElementById: (id) => elements[id] || null,
    querySelector: (sel) => (sel === '.container' ? container : null),
    createElement: (tag) => {
      if (tag === 'option') {
        return { value: '', textContent: '', selected: false };
      }
      return {};
    },
    addEventListener() {},
  };

  // Mock webextension storage
  const mockStorage = {
    'global:settings': {
      knownWorlds: ['en7', 'en16'],
      lastActiveWorld: 'en7',
      language: 'en',
    },
    'world:en7': {
      showOptions: {
        showStats: true,
        showBonus: true,
        showIncidents: true,
        showGalaxy: true,
      },
      donation: { percent: 190 },
    },
  };

  globalThis.browser = {
    storage: {
      local: {
        get: async (key) => {
          if (key === null) return mockStorage;
          if (typeof key === 'string') return { [key]: mockStorage[key] };
          if (Array.isArray(key)) {
            const res = {};
            for (const k of key) {
              if (mockStorage[k] !== undefined) res[k] = mockStorage[k];
            }
            return res;
          }
          return {};
        },
        set: async (obj) => {
          Object.assign(mockStorage, obj);
        },
      },
      onChanged: {
        addListener() {},
      },
    },
    tabs: {
      query: async () => {
        return [
          { url: 'https://en7.forgeofempires.com/game/index', active: true },
        ];
      },
    },
  };

  const { initOptions } = await import('../../src/js/options.js');
  await initOptions();

  // Verified: selector is populated immediately with stored known worlds
  const optionValues = select.options.map((o) => o.value);
  assert.ok(optionValues.includes('en7'), 'en7 should be in selector');
  assert.ok(optionValues.includes('en16'), 'en16 should be in selector');
  assert.strictEqual(select.value, 'en7', 'en7 should be selected');

  // Verified: checkboxes are populated immediately from world settings
  assert.strictEqual(
    elements['Stats'].checked,
    true,
    'Stats should be checked',
  );
  assert.strictEqual(
    elements['bonus'].checked,
    true,
    'bonus should be checked',
  );
  assert.strictEqual(
    elements['Incidents'].checked,
    true,
    'Incidents should be checked',
  );

  // Verified: container has .loaded class to avoid FOUC
  assert.strictEqual(
    container.classList.contains('loaded'),
    true,
    'container should have loaded class',
  );
});

test('options auto-switches to en16 when active tab is on en16', async () => {
  const elements = {};
  const select = {
    id: 'worldSelector',
    options: [],
    value: '',
    appendChild(opt) {
      this.options.push(opt);
    },
    addEventListener() {},
  };
  elements['worldSelector'] = select;
  elements['Stats'] = { id: 'Stats', checked: false };
  elements['bonus'] = { id: 'bonus', checked: false };
  elements['resetWorldBtn'] = { addEventListener() {} };
  elements['save'] = { addEventListener() {} };

  globalThis.document = {
    readyState: 'complete',
    getElementById: (id) => elements[id] || null,
    querySelector: () => ({
      classList: { add() {} },
      addEventListener() {},
    }),
    createElement: (tag) => {
      if (tag === 'option')
        return { value: '', textContent: '', selected: false };
      return {};
    },
    addEventListener() {},
  };

  const mockStorage = {
    'global:settings': {
      knownWorlds: ['en7', 'en16'],
      lastActiveWorld: 'en7',
    },
    'world:en16': {
      showOptions: { showStats: false, showBonus: true },
      donation: { percent: 195 },
    },
  };

  globalThis.browser = {
    storage: {
      local: {
        get: async (key) => {
          if (key === null) return mockStorage;
          if (typeof key === 'string') return { [key]: mockStorage[key] };
          if (Array.isArray(key)) {
            const res = {};
            for (const k of key) {
              if (mockStorage[k] !== undefined) res[k] = mockStorage[k];
            }
            return res;
          }
          return {};
        },
        set: async (obj) => {
          Object.assign(mockStorage, obj);
        },
      },
      onChanged: { addListener() {} },
    },
    tabs: {
      query: async () => [
        { url: 'https://en16.forgeofempires.com/game/index', active: true },
      ],
    },
  };

  const { initOptions } = await import('../../src/js/options.js');
  await initOptions();

  assert.strictEqual(
    select.value,
    'en16',
    'should automatically switch to en16',
  );
  assert.strictEqual(elements['Stats'].checked, false);
  assert.strictEqual(elements['bonus'].checked, true);
});
