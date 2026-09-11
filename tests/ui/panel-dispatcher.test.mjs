import assert from 'node:assert/strict';
import test from 'node:test';

const panelDispatcherPkg = await import('../../src/js/ui/panelDispatcher.js');
const {
  clearVisitPlayer,
  clearExpedition,
  clearForBattleground,
  clearForMainCity,
  clearStartup,
  clearCultural,
  renderTreasuryPanel,
} = panelDispatcherPkg.default || panelDispatcherPkg;

function createMockContainer(
  initialContent = '<div>test</div>',
  initialClass = 'some-class',
) {
  return {
    innerHTML: initialContent,
    className: initialClass,
    replaceChildren() {
      this.innerHTML = '';
    },
    querySelector: () => null,
  };
}

function createAllContainers() {
  return {
    cityinvested: createMockContainer(),
    output: createMockContainer(),
    overview: createMockContainer(),
    alerts: createMockContainer(),
    cityrewards: createMockContainer(),
    donationDIV: createMockContainer(),
    incidents: createMockContainer(),
    donation2DIV: createMockContainer(),
    donationDIV2: createMockContainer(),
    greatbuilding: createMockContainer(),
    gbInfoDIV: createMockContainer(),
    targets: createMockContainer(),
    guild: createMockContainer(),
    debug: createMockContainer(),
    info: createMockContainer(),
    citystats: createMockContainer(),
    visitstats: createMockContainer(),
    cultural: createMockContainer(),
    friendsDiv: createMockContainer(),
    armyDIV: createMockContainer(),
    treasury: createMockContainer(),
    treasuryLog: createMockContainer(),
  };
}

test('clearVisitPlayer empties expected containers and clears cultural className', () => {
  const containers = createAllContainers();
  clearVisitPlayer(containers);

  assert.equal(containers.cityinvested.innerHTML, '');
  assert.equal(containers.output.innerHTML, '');
  assert.equal(containers.overview.innerHTML, '');
  assert.equal(containers.donationDIV.innerHTML, '');
  assert.equal(containers.donation2DIV.innerHTML, '');
  assert.equal(containers.greatbuilding.innerHTML, '');
  assert.equal(containers.gbInfoDIV.innerHTML, '');
  assert.equal(containers.cultural.innerHTML, '');
  assert.equal(containers.cultural.className, '');
  assert.equal(containers.friendsDiv.innerHTML, '');
  assert.equal(containers.treasury.innerHTML, '');
});

test('clearExpedition empties expected containers and clears visitstats and cultural className', () => {
  const containers = createAllContainers();
  clearExpedition(containers);

  assert.equal(containers.cityinvested.innerHTML, '');
  assert.equal(containers.alerts.innerHTML, '');
  assert.equal(containers.incidents.innerHTML, '');
  assert.equal(containers.visitstats.innerHTML, '');
  assert.equal(containers.visitstats.className, '');
  assert.equal(containers.cultural.innerHTML, '');
  assert.equal(containers.cultural.className, '');
  assert.equal(containers.treasury.innerHTML, '');
});

test('clearForBattleground clears same containers as expedition', () => {
  const containers = createAllContainers();
  clearForBattleground(containers);

  assert.equal(containers.cityinvested.innerHTML, '');
  assert.equal(containers.alerts.innerHTML, '');
  assert.equal(containers.incidents.innerHTML, '');
  assert.equal(containers.visitstats.className, '');
  assert.equal(containers.cultural.className, '');
});

test('clearForMainCity empties incidents, targets, donation and resets visitstats and cultural class', () => {
  const containers = createAllContainers();
  clearForMainCity(containers);

  assert.equal(containers.incidents.innerHTML, '');
  assert.equal(containers.targets.innerHTML, '');
  assert.equal(containers.donationDIV.innerHTML, '');
  assert.equal(containers.visitstats.className, '');
  assert.equal(containers.cultural.className, '');
});

test('clearStartup empties all startup containers and executes resetState callback', () => {
  const containers = createAllContainers();
  let resetCalled = false;
  const resetState = {
    GuildDonations: [1, 2, 3],
    GuildTreasury: ['a', 'b'],
    GuildsGoods: [10],
    Bonus: { aid: 5, spoils: 2, diplomatic: 1, strike: 4 },
    reset: () => {
      resetCalled = true;
    },
    clearRewardsState: () => {},
  };

  clearStartup(containers, resetState);

  assert.equal(containers.cityinvested.innerHTML, '');
  assert.equal(containers.cityrewards.innerHTML, '');
  assert.equal(containers.citystats.innerHTML, '');
  assert.equal(containers.armyDIV.innerHTML, '');
  assert.equal(resetCalled, true);
  assert.equal(resetState.GuildDonations.length, 0);
  assert.equal(resetState.GuildTreasury.length, 0);
  assert.equal(resetState.GuildsGoods.length, 0);
  assert.equal(resetState.Bonus.aid, 0);
});

test('clearCultural empties expected containers and clears visitstats className', () => {
  const containers = createAllContainers();
  clearCultural(containers);

  assert.equal(containers.cityinvested.innerHTML, '');
  assert.equal(containers.overview.innerHTML, '');
  assert.equal(containers.visitstats.innerHTML, '');
  assert.equal(containers.visitstats.className, '');
  assert.equal(containers.armyDIV.innerHTML, '');
});

test('renderTreasuryPanel does nothing if resources is missing', () => {
  const containers = createAllContainers();
  renderTreasuryPanel(null, { containers });
  assert.equal(containers.cityinvested.innerHTML, '<div>test</div>');
});

test('renderTreasuryPanel clears containers and halts if showOptions.showTreasury is false', () => {
  const containers = createAllContainers();
  renderTreasuryPanel(
    { goods: 10 },
    {
      containers,
      showOptions: { showTreasury: false },
    },
  );

  assert.equal(containers.cityinvested.innerHTML, '');
  assert.equal(containers.overview.innerHTML, '');
  assert.equal(containers.cultural.className, '');
  assert.equal(containers.treasury.innerHTML, '<div>test</div>');
});

test('renderTreasuryPanel renders table and goods rows when showTreasury is true', () => {
  const containers = createAllContainers();
  const listeners = {};
  const mockDoc = {
    getElementById: (id) => ({
      addEventListener: (evt, fn) => {
        listeners[id] = listeners[id] || {};
        listeners[id][evt] = fn;
      },
    }),
    body: {},
  };

  let initCalledWith = null;
  let translatedTarget = null;

  renderTreasuryPanel(
    { wood: 50, stone: 100, medals: 500 },
    {
      containers,
      showOptions: { showTreasury: true },
      toolOptions: { treasurySize: 320 },
      collapse: { collapseTreasury: false, fCollapseTreasury: () => {} },
      element: {
        close: () => '<button class="close-btn"></button>',
        icon: () => '<span class="icon"></span>',
        copy: () => '<button class="copy-btn"></button>',
      },
      helper: {
        numAges: 2,
        fLevelfromAge: (era) => (era === 'BronzeAge' ? 1 : 2),
        fGVGagesname: (era) =>
          era === 'BronzeAge' ? 'Bronze Age' : 'Iron Age',
      },
      ResourceDefs: [
        { id: 'wood', era: 'BronzeAge', name: 'Wood' },
        { id: 'stone', era: 'IronAge', name: 'Stone' },
      ],
      copy: { TreasuryCopy: () => {} },
      initTreasury: (res) => {
        initCalledWith = res;
      },
      translateContainer: (el) => {
        translatedTarget = el;
      },
      document: mockDoc,
    },
  );

  assert.ok(containers.treasury.innerHTML.includes('Guild Treasury:'));
  assert.ok(containers.treasury.innerHTML.includes('height: 320px'));
  assert.ok(containers.treasury.innerHTML.includes('Iron Age'));
  assert.ok(containers.treasury.innerHTML.includes('Stone'));
  assert.ok(containers.treasury.innerHTML.includes('Bronze Age'));
  assert.ok(containers.treasury.innerHTML.includes('Wood'));
  assert.ok(containers.treasury.innerHTML.includes('Medals'));
  assert.ok(containers.treasury.innerHTML.includes('500'));
  assert.ok(initCalledWith);
  assert.equal(translatedTarget, mockDoc.body);
  assert.ok(listeners['treasuryCopyID']?.click);
  assert.ok(listeners['treasuryicon']?.click);
});

test('renderTreasuryPanel renders Map<string, BigNumber> with descending era sort and no resource counter', async () => {
  const BigNumber = (await import('bignumber.js')).default;
  const mockTreasuryDiv = {
    id: 'treasury',
    innerHTML: '',
    classList: { contains: () => false, remove: () => {} },
    style: { display: 'none' },
    querySelector: () => null,
  };
  const prevDoc = globalThis.document;
  globalThis.document = {
    getElementById: (id) => (id === 'treasury' ? mockTreasuryDiv : null),
  };

  try {
    const reserves = new Map([
      ['granite', new BigNumber(1200)],
      ['alabaster', new BigNumber(850)],
      ['iron', new BigNumber(400)],
      ['medals', new BigNumber(50000)],
    ]);

    renderTreasuryPanel(reserves, {
      helper: {
        numAges: 4,
        fLevelfromAge: (era) => {
          if (era === 'EarlyMiddleAge') return 3;
          if (era === 'IronAge') return 2;
          return 1;
        },
        fGVGagesname: (era) => {
          if (era === 'EarlyMiddleAge') return 'Early Middle Age';
          if (era === 'IronAge') return 'Iron Age';
          return 'Bronze Age';
        },
        escapeHTML: (s) => s,
      },
      ResourceDefs: [
        { id: 'iron', era: 'IronAge', name: 'Iron' },
        { id: 'granite', era: 'EarlyMiddleAge', name: 'Granite' },
        { id: 'alabaster', era: 'EarlyMiddleAge', name: 'Alabaster' },
      ],
      showOptions: { showTreasury: true },
    });

    // 1. Unhides
    assert.equal(mockTreasuryDiv.style.display, '');

    // 2. No resource counter in header
    assert.match(mockTreasuryDiv.innerHTML, /Guild Treasury:/);
    assert.doesNotMatch(mockTreasuryDiv.innerHTML, /\(\d+\s+Resources?\)/i);

    // 3. Era headers exist with .goods-era-header class
    assert.match(
      mockTreasuryDiv.innerHTML,
      /<td colspan="2" class="goods-era-header">Early Middle Age<\/td>/,
    );
    assert.match(
      mockTreasuryDiv.innerHTML,
      /<td colspan="2" class="goods-era-header">Iron Age<\/td>/,
    );

    // 4. Descending era ordering: Early Middle Age appears BEFORE Iron Age
    const emaIndex = mockTreasuryDiv.innerHTML.indexOf('Early Middle Age');
    const ironAgeIndex = mockTreasuryDiv.innerHTML.indexOf('Iron Age');
    assert.ok(emaIndex !== -1 && ironAgeIndex !== -1);
    assert.ok(
      emaIndex < ironAgeIndex,
      'Higher era (EMA) must appear before lower era (Iron Age)',
    );

    // 5. Friendly names and formatted amounts
    assert.match(mockTreasuryDiv.innerHTML, /Granite/);
    assert.match(mockTreasuryDiv.innerHTML, /1,200/);
    assert.match(mockTreasuryDiv.innerHTML, /Alabaster/);
    assert.match(mockTreasuryDiv.innerHTML, /850/);
    assert.match(mockTreasuryDiv.innerHTML, /Iron/);
    assert.match(mockTreasuryDiv.innerHTML, /400/);

    // 6. Medals at bottom
    assert.match(mockTreasuryDiv.innerHTML, /Medals/);
    assert.match(mockTreasuryDiv.innerHTML, /50,000/);
    const medalsIndex = mockTreasuryDiv.innerHTML.indexOf('Medals');
    assert.ok(medalsIndex > ironAgeIndex, 'Medals must appear after era goods');
  } finally {
    globalThis.document = prevDoc;
  }
});
