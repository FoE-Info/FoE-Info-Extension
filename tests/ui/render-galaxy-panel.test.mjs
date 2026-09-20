import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import metadataService from '../../src/js/msg/MetadataService.js';
import metadataState from '../../src/js/state/MetadataStore.js';
import { setCurrentView } from '../../src/js/ui/cardVisibility.js';
import { renderGalaxyPanel } from '../../src/js/ui/renderGalaxyPanel.js';

const { triggerMetadataUpdated } = metadataService;
const { metadataStore } = metadataState;

function createMockElement(id = '') {
  const listeners = new Map();
  return {
    id,
    style: { display: 'none' },
    innerHTML: '',
    addEventListener(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    click() {
      const handlers = listeners.get('click') || [];
      for (const h of handlers) h();
    },
    querySelector(selector) {
      if (selector === '#galaxyID') {
        const match = this.innerHTML.match(
          /<span id=["']galaxyID["']>([^<]+)<\/span>/,
        );
        return match ? { textContent: match[1] } : null;
      }
      if (selector === '#galaxyTextLabel') {
        if (this.innerHTML.includes('id="galaxyTextLabel"')) {
          const el = createMockElement('galaxyTextLabel');
          return el;
        }
        return null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (
        selector === '.pending-name' &&
        this.innerHTML.includes('pending-name')
      ) {
        return [this.pendingSpan].filter(Boolean);
      }
      return [];
    },
  };
}

describe('renderGalaxyPanel Suite', () => {
  let container;
  let doc;
  let elementsById;

  beforeEach(() => {
    elementsById = new Map();
    container = createMockElement('galaxy');
    elementsById.set('galaxy', container);

    doc = {
      getElementById(id) {
        if (!elementsById.has(id)) {
          const el = createMockElement(id);
          elementsById.set(id, el);
        }
        return elementsById.get(id);
      },
      querySelectorAll(selector) {
        return container.querySelectorAll(selector);
      },
    };
    globalThis.document = doc;
  });

  it('hides container when charges are 0 and not in debug mode', () => {
    const candidates = [
      { id: 1, name: 'B1', fp: 10, state: 'ProductionFinishedState' },
    ];
    renderGalaxyPanel({
      container,
      candidates,
      charges: 0,
      currentEpoch: 1700000000,
      isDebug: false,
    });
    assert.equal(container.style.display, 'none');
  });

  it('hides the panel in the GBG context even with charges', (t) => {
    t.after(() => setCurrentView(null));
    setCurrentView('GBG');
    const candidates = [
      { id: 1, name: 'B1', fp: 30, state: 'ProductionFinishedState' },
    ];
    renderGalaxyPanel({
      container,
      candidates,
      charges: 3,
      currentEpoch: 1700000000,
      isDebug: false,
    });
    assert.equal(container.style.display, 'none');
  });

  it('renders top ready buildings and shows container when charges > 0', () => {
    const candidates = [
      { id: 1, name: 'Winner Plaza', fp: 30, state: 'ProductionFinishedState' },
      {
        id: 2,
        name: 'Pirate Hideout',
        fp: 20,
        state: 'ProductionFinishedState',
      },
      { id: 3, name: 'Small Shrine', fp: 5, state: 'ProductionFinishedState' },
    ];

    renderGalaxyPanel({
      container,
      candidates,
      charges: 2,
      currentEpoch: 1700000000,
      isDebug: false,
      isCollapsed: false,
    });

    assert.equal(container.style.display, 'block');
    assert.ok(container.innerHTML.includes('30FP Winner Plaza'));
    assert.ok(container.innerHTML.includes('20FP Pirate Hideout'));
    assert.ok(!container.innerHTML.includes('Small Shrine')); // Capped by 2 charges
    assert.ok(container.innerHTML.includes('id="galaxyID">2</span>'));
    assert.match(
      container.innerHTML,
      /<div id="galaxyText"[^>]*>\s*<div class="foe-panel-body">/,
    );
  });

  it('binds toggle collapse callback to galaxyicon', () => {
    let toggled = false;
    const candidates = [
      { id: 1, name: 'B1', fp: 15, state: 'ProductionFinishedState' },
    ];

    renderGalaxyPanel({
      container,
      candidates,
      charges: 1,
      currentEpoch: 1700000000,
      onToggleCollapse: () => {
        toggled = true;
      },
    });

    const icon = doc.getElementById('galaxyicon');
    assert.ok(icon);
    icon.click();
    assert.equal(toggled, true);
  });

  it('backfills unresolved candidate names after metadata updates', () => {
    const pendingSpan = {
      dataset: { id: 'W_MultiAge_TEST_GALAXY' },
      textContent: 'W_MultiAge_TEST_GALAXY',
      classList: {
        removed: false,
        remove(name) {
          if (name === 'pending-name') this.removed = true;
        },
      },
    };
    container.pendingSpan = pendingSpan;

    renderGalaxyPanel({
      container,
      candidates: [
        {
          id: 1,
          name: '<span class="pending-name" data-id="W_MultiAge_TEST_GALAXY">W_MultiAge_TEST_GALAXY</span>',
          fp: 15,
          state: 'ProductionFinishedState',
        },
      ],
      charges: 1,
    });

    assert.match(container.innerHTML, /pending-name/);
    metadataStore.registerEntity({
      id: 'W_MultiAge_TEST_GALAXY',
      name: 'Test Galaxy',
    });
    triggerMetadataUpdated();
    assert.equal(pendingSpan.textContent, 'Test Galaxy');
    assert.equal(pendingSpan.classList.removed, true);
  });

  it('hides container and clears innerHTML when showOptions.showGalaxy is false', () => {
    const candidates = [
      { id: 1, name: 'Winner Plaza', fp: 30, state: 'ProductionFinishedState' },
    ];

    renderGalaxyPanel({
      container,
      candidates,
      charges: 5,
      currentEpoch: 1700000000,
      showOptions: { showGalaxy: false },
    });

    assert.equal(container.style.display, 'none');
    assert.equal(container.innerHTML, '');
  });

  it('groups duplicate buildings with identical collection time and FP in debug mode', () => {
    const candidates = [
      {
        id: 1,
        name: 'Eternal Market',
        fp: 504,
        state: 'ProducingState',
        transition: 1700010000,
      },
      {
        id: 2,
        name: 'Eternal Market',
        fp: 504,
        state: 'ProducingState',
        transition: 1700010000,
      },
      {
        id: 3,
        name: 'Ascended Snowdrop Garden',
        fp: 270,
        state: 'ProductionFinishedState',
        transition: 0,
      },
    ];

    renderGalaxyPanel({
      container,
      candidates,
      charges: 0,
      currentEpoch: 1700000000,
      isDebug: true,
      isCollapsed: false,
    });

    assert.equal(container.style.display, 'block');
    assert.match(
      container.innerHTML,
      /2x 504FP Eternal Market \[\d{2}:\d{2}:\d{2}\]/,
    );
    assert.match(
      container.innerHTML,
      /1x 270FP Ascended Snowdrop Garden \[READY\]/,
    );
  });

  it('lists duplicate buildings with different collection times on separate lines in debug mode', () => {
    const candidates = [
      {
        id: 1,
        name: 'Eternal Market',
        fp: 504,
        state: 'ProducingState',
        transition: 1700010000,
      },
      {
        id: 2,
        name: 'Eternal Market',
        fp: 504,
        state: 'ProducingState',
        transition: 1700020000,
      },
    ];

    renderGalaxyPanel({
      container,
      candidates,
      charges: 0,
      currentEpoch: 1700000000,
      isDebug: true,
      isCollapsed: false,
    });

    assert.equal(container.style.display, 'block');
    const matches = container.innerHTML.match(/1x 504FP Eternal Market/g);
    assert.equal(matches?.length, 2);
  });

  it('groups duplicate ready buildings in normal mode up to charge limit', () => {
    const candidates = [
      {
        id: 1,
        name: 'Snowdrop Garden',
        fp: 270,
        state: 'ProductionFinishedState',
      },
      {
        id: 2,
        name: 'Snowdrop Garden',
        fp: 270,
        state: 'ProductionFinishedState',
      },
      {
        id: 3,
        name: 'Snowdrop Garden',
        fp: 270,
        state: 'ProductionFinishedState',
      },
    ];

    renderGalaxyPanel({
      container,
      candidates,
      charges: 2,
      currentEpoch: 1700000000,
      isDebug: false,
      isCollapsed: false,
    });

    assert.equal(container.style.display, 'block');
    assert.ok(container.innerHTML.includes('2x 270FP Snowdrop Garden'));
  });

  it('showGalaxy and updateGalaxy delegate seamlessly', async () => {
    const { showGalaxy, updateGalaxy } =
      await import('../../src/js/ui/renderGalaxyPanel.js');
    assert.equal(typeof showGalaxy, 'function');
    assert.equal(typeof updateGalaxy, 'function');
  });
});
