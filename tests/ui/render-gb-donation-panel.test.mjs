import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';

test('renderGbDonationPanel UI Module Suite', async (t) => {
  const panelPkg = await import('../../src/js/ui/gbDonationPanel.js');
  const { renderGbDonationPanel, getSafe, getDonations, getFriendlyDonation } =
    panelPkg.default || panelPkg;

  await t.test('getFriendlyDonation returns colored badge string', () => {
    const donation = new BigNumber(100);
    const reward = new BigNumber(120);
    const lock = new BigNumber(80);

    const htmlGreen = getFriendlyDonation(donation, reward, 190, lock);
    assert.ok(htmlGreen.includes('green'));
    assert.ok(htmlGreen.includes('1.9: 100FP'));

    const htmlRed = getFriendlyDonation(donation, new BigNumber(90), 190, lock);
    assert.ok(htmlRed.includes('red'));
  });

  await t.test(
    'getSafe computes safe flags and suggested donation amounts',
    () => {
      const GBrewards = [500, 250, 100, 50, 0];
      const Top = [0, 0, 0, 0, 0, 0];
      const { safe, donateSuggest } = getSafe({
        place: 1,
        GBrewards,
        currentPercent: 190,
        remaining: 1500,
        Top,
      });

      assert.equal(safe.length, 5);
      assert.equal(donateSuggest.length, 5);
      // 500 * 1.9 = 950 suggested
      assert.equal(donateSuggest[0].toNumber(), 950);
    },
  );

  await t.test('getDonations formats copy snippet string', () => {
    const safe = [true, false, true, false, false];
    const donateSuggest = [
      new BigNumber(950),
      new BigNumber(475),
      new BigNumber(190),
      new BigNumber(95),
      new BigNumber(0),
    ];

    const snippet = getDonations({
      place: 1,
      safe,
      donateSuggest,
      showOptions: { hideUnsafe: false },
    });

    assert.ok(snippet.includes('P1(950)'));
    assert.ok(snippet.includes('P2(475)'));
    assert.ok(snippet.includes('invest-good'));
    assert.ok(snippet.includes('invest-bad'));
  });

  await t.test(
    'renderGbDonationPanel renders cleanly into container without throwing',
    () => {
      const mockContainer = {
        innerHTML: '',
        style: { display: 'none' },
      };

      renderGbDonationPanel({
        GBselected: {
          name: 'The Arc',
          level: 80,
          total: 2000,
          current: 500,
          connected: true,
        },
        showOptions: { showDonation: true },
        donation2DIV: mockContainer,
        Top: [0, 0, 0, 0, 0, 0],
        GBrewards: [500, 250, 100, 50, 10],
        currentPercent: 190,
        City: { ArcBonus: 90 },
        PlayerID: 12345,
        PlayerName: 'TestPlayer',
        MyInfo: { name: 'TestPlayer' },
      });

      assert.ok(mockContainer.innerHTML.length > 0);
      assert.ok(mockContainer.innerHTML.includes('The Arc 81'));
      assert.ok(mockContainer.innerHTML.includes('GB'));
      assert.ok(mockContainer.innerHTML.includes('Donation'));
      assert.equal(mockContainer.style.display, '');
    },
  );

  await t.test(
    'renderGbDonationPanel clears container when showDonation is false',
    () => {
      const mockContainer = {
        innerHTML: 'previous content',
        style: {},
      };

      renderGbDonationPanel({
        GBselected: { name: 'Statue of Zeus' },
        showOptions: { showDonation: false },
        donation2DIV: mockContainer,
      });

      assert.equal(mockContainer.innerHTML, '');
    },
  );

  await t.test('getSafe uses BigNumber ROUND_HALF_UP in fallback mode', () => {
    // Reward 15 at 190% is 28.5, should round half-up to 29
    const { donateSuggest } = getSafe({
      place: 1,
      GBrewards: [15, 0, 0, 0, 0],
      currentPercent: 190,
      remaining: 100,
      Top: [0, 0, 0, 0, 0, 0],
      calculateSuggestedDonation: null,
    });
    assert.equal(donateSuggest[0].toNumber(), 29);
  });

  await t.test(
    'renderGbDonationPanel renders freeTextLabel with valid accessibility attributes',
    () => {
      const mockContainer = {
        innerHTML: '',
        style: { display: 'none' },
      };

      renderGbDonationPanel({
        GBselected: { name: 'The Arc', level: 10, total: 500, current: 100 },
        showOptions: { showDonation: true },
        donation2DIV: mockContainer,
        GBrewards: [50, 25, 10, 5, 0],
        currentPercent: 190,
      });

      assert.ok(mockContainer.innerHTML.includes('id="freeTextLabel"'));
      assert.ok(mockContainer.innerHTML.includes('role="button"'));
      assert.ok(mockContainer.innerHTML.includes('tabindex="0"'));
      assert.ok(
        mockContainer.innerHTML.includes('data-bs-target="#donationText3"'),
      );
      assert.ok(!mockContainer.innerHTML.includes('href="#donationText3"'));
    },
  );

  await t.test(
    'keeps package inventory balance out of the donation card',
    () => {
      const mockContainer = { innerHTML: '', style: { display: 'none' } };
      renderGbDonationPanel({
        GBselected: { name: 'The Arc', level: 80, total: 2000, current: 500 },
        showOptions: { showDonation: true },
        donation2DIV: mockContainer,
        availablePackageForgePoints: 1250,
      });

      assert.ok(!mockContainer.innerHTML.includes('data-i18n="packages"'));
    },
  );

  await t.test(
    'omits package balance badge when availablePackageForgePoints is 0 or missing',
    () => {
      const mockContainer = { innerHTML: '', style: { display: 'none' } };
      renderGbDonationPanel({
        GBselected: { name: 'The Arc', level: 80, total: 2000, current: 500 },
        showOptions: { showDonation: true },
        donation2DIV: mockContainer,
        availablePackageForgePoints: 0,
      });

      assert.ok(!mockContainer.innerHTML.includes('data-i18n="packages"'));
    },
  );
});

test('support request line exists only when its spot list contains eligible positions', async () => {
  const panelPkg = await import('../../src/js/ui/gbDonationPanel.js');
  const { renderGbDonationPanel } = panelPkg.default || panelPkg;
  for (const { hideUnsafe, safe, shown } of [
    { hideUnsafe: true, safe: false, shown: false },
    { hideUnsafe: false, safe: false, shown: true },
    { hideUnsafe: true, safe: true, shown: true },
  ]) {
    const container = { innerHTML: '', style: {} };
    const result = renderGbDonationPanel({
      GBselected: {
        name: 'The Arc',
        level: 10,
        total: 1000,
        current: 100,
        connected: true,
      },
      PlayerName: 'Overlord Negan',
      MyInfo: { name: 'Overlord Negan' },
      showOptions: { showDonation: true, hideUnsafe },
      donation2DIV: container,
      donationSuffix: ' 1.9',
      GBrewards: [100, 50, 20, 10, 5],
      evaluatePlaces: () => ({
        foundPlace: true,
        place: 1,
        outcome: safe ? 'safe' : 'loss',
        donation: new BigNumber(200),
        rewardFP: new BigNumber(100),
        percent: 0,
        donateCustom: new BigNumber(190),
        safe: [safe, false, false, false, false],
        donateSuggest: [190, 95, 38, 19, 9].map((x) => new BigNumber(x)),
        netValue: 0,
        hasReward: true,
        band: safe ? 'green' : 'red',
        ownerAdd: 0,
      }),
    });
    assert.equal(container.innerHTML.includes("id='copyText'"), shown);
    assert.equal(!!result.copyText, shown);
    if (shown) {
      assert.match(result.copyText, /P1\(190\)/);
      assert.match(result.copyText, /1\.9<\/div>$/);
    } else assert.doesNotMatch(container.innerHTML, /Overlord Arc|1\.9<\/div>/);
  }
});
