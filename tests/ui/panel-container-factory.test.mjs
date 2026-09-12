import assert from 'node:assert/strict';
import test from 'node:test';

function createMockDOM() {
  const elementsById = new Map();

  function createElement(tagName) {
    const el = {
      tagName: tagName.toUpperCase(),
      id: '',
      className: '',
      innerHTML: '',
      children: [],
      childNodes: [],
      parentNode: null,
      style: {},
      attributes: new Map(),
      listeners: {},
      classList: {
        classes: new Set(),
        toggle(cls) {
          if (this.classes.has(cls)) this.classes.delete(cls);
          else this.classes.add(cls);
        },
      },
      setAttribute(k, v) {
        this.attributes.set(k, v);
      },
      getAttribute(k) {
        return this.attributes.get(k) ?? null;
      },
      addEventListener(event, fn) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(fn);
      },
      removeEventListener: () => {},
      insertBefore(newNode, referenceNode) {
        if (!newNode) return newNode;
        if (newNode.parentNode && newNode.parentNode.removeChild) {
          newNode.parentNode.removeChild(newNode);
        }
        newNode.parentNode = this;
        const refIdx =
          referenceNode ? this.children.indexOf(referenceNode) : -1;
        if (refIdx !== -1) {
          this.children.splice(refIdx, 0, newNode);
          this.childNodes.splice(refIdx, 0, newNode);
        } else {
          this.children.push(newNode);
          this.childNodes.push(newNode);
        }
        if (newNode.id) elementsById.set(newNode.id, newNode);
        return newNode;
      },
      appendChild(child) {
        if (!child) return child;
        if (child.parentNode && child.parentNode.removeChild) {
          child.parentNode.removeChild(child);
        }
        child.parentNode = this;
        this.children.push(child);
        this.childNodes.push(child);
        if (child.id) elementsById.set(child.id, child);
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
          this.children.splice(idx, 1);
          this.childNodes.splice(idx, 1);
          child.parentNode = null;
          if (child.id) elementsById.delete(child.id);
        }
        return child;
      },
      contains(target) {
        if (!target) return false;
        if (target === this) return true;
        for (const child of this.children) {
          if (child === target) return true;
          if (child.contains && child.contains(target)) return true;
        }
        return false;
      },
    };
    return el;
  }

  const body = createElement('body');
  body.id = 'body';
  elementsById.set('body', body);

  const contentEl = createElement('div');
  contentEl.id = 'content';
  elementsById.set('content', contentEl);
  body.appendChild(contentEl);

  const mockDocument = {
    body,
    createElement,
    getElementById(id) {
      return elementsById.get(id) || null;
    },
  };

  return {
    mockDocument,
    contentEl,
    createElement,
    elementsById,
  };
}

test('panelContainerFactory - ensureContainerMounted safeguards mounting and order', async () => {
  const mod = await import('../../src/js/ui/panelContainerFactory.js');
  const { ensureContainerMounted } = mod.default || mod;

  const { contentEl, createElement } = createMockDOM();
  const el1 = createElement('div');
  el1.id = 'panel1';

  // Mounts when not contained
  ensureContainerMounted(contentEl, el1, 'panel1');
  assert.equal(contentEl.children.length, 1);
  assert.equal(contentEl.children[0].id, 'panel1');

  // Idempotent when already mounted
  ensureContainerMounted(contentEl, el1, 'panel1');
  assert.equal(contentEl.children.length, 1);

  // Inserts before reference node
  const el2 = createElement('div');
  ensureContainerMounted(contentEl, el2, 'panel0', el1);
  assert.equal(contentEl.children.length, 2);
  assert.equal(contentEl.children[0].id, 'panel0');
  assert.equal(contentEl.children[1].id, 'panel1');

  // Safe with null arguments
  assert.doesNotThrow(() => ensureContainerMounted(null, el1, 'id'));
  assert.doesNotThrow(() => ensureContainerMounted(contentEl, null, 'id'));
});

test('panelContainerFactory - setupPanelContainers handles missing content/document safely', async () => {
  const mod = await import('../../src/js/ui/panelContainerFactory.js');
  const { setupPanelContainers } = mod.default || mod;

  const res1 = setupPanelContainers(null, {}, {});
  assert.deepEqual(res1, {});

  const res2 = setupPanelContainers({}, {}, null);
  assert.deepEqual(res2, {});
});

test('panelContainerFactory - setupPanelContainers mounts 15 primary panels and secondary panels', async () => {
  const mod = await import('../../src/js/ui/panelContainerFactory.js');
  const { setupPanelContainers } = mod.default || mod;

  const { mockDocument, contentEl, createElement, elementsById } =
    createMockDOM();
  const sharedHeader = createElement('div');
  sharedHeader.id = 'header';
  elementsById.set('header', sharedHeader);

  const sharedDonation2 = createElement('div');
  sharedDonation2.id = 'donation2';
  elementsById.set('donation2', sharedDonation2);

  const panels = setupPanelContainers(
    contentEl,
    {
      header: sharedHeader,
      donation2DIV: sharedDonation2,
    },
    mockDocument,
  );

  assert.ok(panels.header, 'header panel created');
  assert.equal(panels.header, sharedHeader, 'shared header adopted');
  assert.ok(panels.donation2, 'donation2 panel created');
  assert.equal(panels.donation2, sharedDonation2, 'shared donation2 adopted');

  // Verify key primary panels
  assert.ok(panels.incidents, 'incidents panel exists');
  assert.ok(panels.army, 'army panel exists');
  assert.ok(panels.rewards, 'rewards panel exists');
  assert.ok(panels.gbDonation, 'gbDonation panel exists');
  assert.ok(panels.gbInfo, 'gbInfo panel exists');
  assert.ok(panels.gbContributors, 'gbContributors panel exists');
  assert.ok(panels.gbgTargetGenerator, 'gbgTargetGenerator panel exists');
  assert.ok(panels.battlegrounds, 'battlegrounds panel exists');
  assert.ok(panels.gbgLeaderboard, 'gbgLeaderboard panel exists');
  assert.ok(panels.geChampionship, 'geChampionship panel exists');
  assert.ok(panels.geContributions, 'geContributions panel exists');
  assert.ok(panels.goodsInventory, 'goodsInventory panel exists');
  assert.ok(panels.guildOverview, 'guildOverview panel exists');
  assert.ok(panels.treasury, 'treasury panel exists');
  assert.ok(panels.quantumLeaderboard, 'quantumLeaderboard panel exists');
  assert.ok(panels.quantumContributions, 'quantumContributions panel exists');

  // Verify secondary / utility panels
  assert.ok(panels.citystats, 'citystats panel exists');
  assert.ok(panels.visitstats, 'visitstats panel exists');
  assert.ok(panels.galaxyDIV, 'galaxyDIV panel exists');
  assert.ok(panels.buildingsDIV, 'buildingsDIV panel exists');
  assert.ok(panels.cultural, 'cultural panel exists');
  assert.ok(panels.bonusDIV, 'bonusDIV panel exists');
  assert.ok(panels.output, 'output panel exists');
  assert.ok(panels.friendsDiv, 'friendsDiv panel exists');
  assert.ok(panels.clipboard, 'clipboard panel exists');
  assert.ok(panels.debug, 'debug panel exists');
  assert.ok(panels.modal, 'modal panel exists');
  assert.ok(panels.testModal, 'testModal panel exists');
});
