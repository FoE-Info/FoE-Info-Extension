import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

const containerBindingPkg = await import('../../src/js/ui/containerBinding.js');
const {
  mountPanels,
  safeguardOutputContainers,
  setupPanelHeader,
  setupPanelContainers,
} = containerBindingPkg.default || containerBindingPkg;

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
        if (newNode.id) {
          elementsById.set(newNode.id, newNode);
        }
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
        if (child.id) {
          elementsById.set(child.id, child);
        }
        return child;
      },
      removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
          this.children.splice(idx, 1);
          const cIdx = this.childNodes.indexOf(child);
          if (cIdx !== -1) this.childNodes.splice(cIdx, 1);
          child.parentNode = null;
        }
        return child;
      },
      contains(target) {
        if (this === target) return true;
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

  const doc = {
    body,
    createElement,
    getElementById: (id) => elementsById.get(id) || null,
  };

  globalThis.document = doc;
  globalThis.window = {
    bootstrap: {},
    foeRpcLog: [],
  };

  return { doc, elementsById, createElement };
}

test('Container Binding & DOM Lifecycle Suite', async (t) => {
  const { doc, createElement } = createMockDOM();

  await t.test(
    'src/js/state/state.js assigns id="targets" and id="donation2" on DOM creation',
    () => {
      const stateSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/state/state.js'),
        'utf8',
      );

      assert.match(
        stateSource,
        /if\s*\(\s*targets\s*&&\s*!targets\.id\s*\)\s*targets\.id\s*=\s*['"]targets['"]/,
        'state.js must assign id="targets" to targets container',
      );
      assert.match(
        stateSource,
        /if\s*\(\s*donation2DIV\s*&&\s*!donation2DIV\.id\s*\)\s*donation2DIV\.id\s*=\s*['"]donation2['"]/,
        'state.js must assign id="donation2" to donation2DIV container',
      );
      assert.match(
        stateSource,
        /export\s+var\s+battlegroundDIV\s*=/,
        'state.js must export battlegroundDIV container',
      );
      assert.match(
        stateSource,
        /export\s+var\s+gbgLeaderboardDIV\s*=/,
        'state.js must export gbgLeaderboardDIV container',
      );
    },
  );

  await t.test(
    'src/js/index.js does not shadow donation2DIV, targets, donationDIV, or output and binds shared state containers',
    () => {
      const indexSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/index.js'),
        'utf8',
      );

      assert.doesNotMatch(
        indexSource,
        /export\s+var\s+donation2DIV\s*=\s*document\.createElement/,
        'src/js/index.js must not shadow donation2DIV with a local document.createElement declaration',
      );
      assert.doesNotMatch(
        indexSource,
        /export\s+var\s+targets\s*=\s*document\.createElement/,
        'src/js/index.js must not shadow targets with a local document.createElement declaration',
      );
      assert.doesNotMatch(
        indexSource,
        /export\s+var\s+donationDIV\s*=\s*document\.createElement/,
        'src/js/index.js must not shadow donationDIV with a local document.createElement declaration',
      );
      assert.doesNotMatch(
        indexSource,
        /export\s+var\s+output\s*=\s*document\.createElement/,
        'src/js/index.js must not shadow output with a local document.createElement declaration',
      );

      assert.match(
        indexSource,
        /donation2DIV/,
        'src/js/index.js must import donation2DIV from state',
      );
      assert.match(
        indexSource,
        /targets/,
        'src/js/index.js must import targets from state',
      );
      assert.match(
        indexSource,
        /battlegroundDIV/,
        'src/js/index.js must import battlegroundDIV from state',
      );
      assert.match(
        indexSource,
        /gbgLeaderboardDIV/,
        'src/js/index.js must import gbgLeaderboardDIV from state',
      );
    },
  );

  await t.test(
    'src/js/msg/GreatBuildingsService.js exports fCheckOutput and safeguards donation2DIV',
    () => {
      const gbSource = fs.readFileSync(
        path.join(ROOT_DIR, 'src/js/msg/GreatBuildingsService.js'),
        'utf8',
      );

      assert.match(
        gbSource,
        /export\s+function\s+fCheckOutput/,
        'GreatBuildingsService.js must export fCheckOutput function',
      );
      assert.match(
        gbSource,
        /donation2DIV\.id\s*=\s*['"]donation2['"]/,
        'fCheckOutput must safeguard donation2DIV.id = "donation2"',
      );
      assert.match(
        gbSource,
        /contentEl\.appendChild\(donation2DIV\)/,
        'fCheckOutput must safeguard contentEl.appendChild(donation2DIV)',
      );
    },
  );

  await t.test(
    'containerBinding module mounts panels and updates live DOM in #content',
    () => {
      const content = createElement('div');
      content.id = 'content';
      doc.body.appendChild(content);

      const targets = createElement('div');
      const donation2DIV = createElement('div');

      mountPanels(content, { targets, donation2DIV });

      assert.strictEqual(
        content.contains(targets),
        true,
        '#content must contain targets',
      );
      assert.strictEqual(
        targets.id,
        'targets',
        'targets container must have id="targets"',
      );

      assert.strictEqual(
        content.contains(donation2DIV),
        true,
        '#content must contain donation2DIV',
      );
      assert.strictEqual(
        donation2DIV.id,
        'donation2',
        'donation2DIV must have id="donation2"',
      );

      donation2DIV.innerHTML = '<div class="test-donor">Donor Info</div>';
      assert.strictEqual(
        donation2DIV.innerHTML,
        '<div class="test-donor">Donor Info</div>',
      );
      assert.strictEqual(
        content.contains(donation2DIV),
        true,
        'donation2DIV remains mounted in #content after innerHTML mutation',
      );

      const targetChild = createElement('div');
      targetChild.id = 'targetsGBG';
      targets.appendChild(targetChild);

      assert.strictEqual(
        content.contains(targetChild),
        true,
        'Child appended to targets must be contained within #content',
      );

      // Verify re-appending when detached
      content.removeChild(donation2DIV);
      assert.strictEqual(
        content.contains(donation2DIV),
        false,
        'donation2DIV is detached',
      );

      safeguardOutputContainers(content, { donation2DIV });
      assert.strictEqual(
        content.contains(donation2DIV),
        true,
        'safeguardOutputContainers must re-append donation2DIV if detached',
      );
    },
  );

  await t.test(
    'setupPanelHeader creates title element, dark-mode body styles, logo, and settings button',
    () => {
      const { doc } = createMockDOM();
      let debugToggled = false;

      const title = setupPanelHeader({
        darkMode: 'dark',
        extName: 'FoE-Info-Test',
        onToggleDebug: () => {
          debugToggled = true;
        },
        targetDocument: doc,
      });

      assert.ok(title);
      assert.equal(title.id, 'title');
      assert.match(title.className, /bg-dark/);

      const logo = doc.getElementById('logo');
      assert.ok(logo);
      assert.equal(logo.src, '/icons/Icon48.png');

      logo.listeners?.click?.[0]?.();
      assert.equal(debugToggled, true);

      const optionsBtn = doc.getElementById('go-to-options');
      assert.ok(optionsBtn);
      assert.equal(optionsBtn.getAttribute('aria-label'), 'Open Settings');
    },
  );

  await t.test(
    'setupPanelHeader renders bug icon when debugEnabled is true and toggles dynamically',
    async () => {
      const { doc } = createMockDOM();
      let clickCount = 0;

      const title = setupPanelHeader({
        darkMode: false,
        extName: 'FoE-Info-Test',
        debugEnabled: true,
        onToggleDebug: () => {
          clickCount++;
        },
        targetDocument: doc,
      });

      assert.ok(title);
      const bugLogo = doc.getElementById('logo');
      assert.ok(bugLogo);
      assert.equal(bugLogo.tagName, 'SPAN');
      assert.equal(bugLogo.textContent, 'bug_report');

      // Click should be wired on bug icon
      bugLogo.listeners?.click?.[0]?.();
      assert.equal(clickCount, 1);
    },
  );

  await t.test(
    'setupPanelContainers mounts all standard and shared panels in #content',
    () => {
      const { doc, createElement } = createMockDOM();
      const content = createElement('div');
      content.id = 'content';
      doc.body.appendChild(content);

      const sharedTargets = createElement('div');
      const sharedDonation2 = createElement('div');

      const containers = setupPanelContainers(
        content,
        {
          targets: sharedTargets,
          donation2DIV: sharedDonation2,
        },
        doc,
      );

      assert.equal(containers.citystats.id, 'citystats');
      assert.equal(containers.alerts.id, 'alerts');
      assert.equal(sharedTargets.id, 'targets');
      assert.equal(sharedDonation2.id, 'donation2');
      assert.equal(containers.overview.id, 'overview');
      assert.equal(containers.armyDIV.id, 'army');
      assert.equal(containers.goodsDIV.id, 'goods');
      assert.equal(containers.guild.id, 'guild');
      assert.equal(containers.modal.id, 'modal');
      assert.equal(containers.testModal.id, 'testModal');

      assert.equal(content.contains(containers.citystats), true);
      assert.equal(content.contains(sharedTargets), true);
      assert.equal(content.contains(sharedDonation2), true);
      assert.equal(content.contains(containers.modal), true);

      // Verify 15-Panel exact vertical order
      const expected15Panels = [
        'header',
        'incidents',
        'army',
        'rewards',
        'gbDonation',
        'gbInfo',
        'gbContributors',
        'gbgTargetGenerator',
        'battlegrounds',
        'gbgLeaderboard',
        'geChampionship',
        'geContributions',
        'goodsInventory',
        'guildOverview',
        'treasury',
      ];

      const directChildrenIds = content.children.slice(0, 15).map((c) => c.id);
      assert.deepEqual(
        directChildrenIds,
        expected15Panels,
        'First 15 children of #content must match the 15-panel vertical sequence',
      );

      // Verify GB suite sequence within the hierarchy: gbDonation -> gbInfo -> gbContributors
      const gbDonationIdx = content.children.indexOf(containers.gbDonation);
      const gbInfoIdx = content.children.indexOf(containers.gbInfo);
      const gbContributorsIdx = content.children.indexOf(
        containers.gbContributors,
      );
      assert.ok(
        gbDonationIdx !== -1 && gbInfoIdx !== -1 && gbContributorsIdx !== -1,
        'GB panels must be direct children of #content',
      );
      assert.ok(
        gbDonationIdx < gbInfoIdx,
        `GB Donation (${gbDonationIdx}) must precede GB Info (${gbInfoIdx})`,
      );
      assert.ok(
        gbInfoIdx < gbContributorsIdx,
        `GB Info (${gbInfoIdx}) must precede GB contributors (${gbContributorsIdx})`,
      );

      // Verify GBG suite sequence within the hierarchy: targets -> battlegrounds -> leaderboard
      const targetsIdx = content.children.indexOf(
        containers.gbgTargetGenerator,
      );
      const battlegroundIdx = content.children.indexOf(
        containers.battlegrounds,
      );
      const gbgLeaderboardIdx = content.children.indexOf(
        containers.gbgLeaderboard,
      );
      const guildOverviewIdx = content.children.indexOf(
        containers.guildOverview,
      );
      assert.ok(
        targetsIdx !== -1 &&
          battlegroundIdx !== -1 &&
          gbgLeaderboardIdx !== -1 &&
          guildOverviewIdx !== -1,
        'GBG and guild panels must be direct children of #content',
      );
      assert.ok(
        targetsIdx < battlegroundIdx,
        `Target generator (${targetsIdx}) must precede Battlegrounds Changes (${battlegroundIdx})`,
      );
      assert.ok(
        battlegroundIdx < gbgLeaderboardIdx,
        `Battlegrounds Changes (${battlegroundIdx}) must precede Leaderboard (${gbgLeaderboardIdx})`,
      );
      assert.ok(
        gbgLeaderboardIdx < guildOverviewIdx,
        `Leaderboard (${gbgLeaderboardIdx}) must precede Guild Overview (${guildOverviewIdx})`,
      );
    },
  );
});
