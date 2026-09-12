import assert from 'node:assert/strict';
import test from 'node:test';
import { socialState } from '../../src/js/state/SocialState.js';
import gbDonationPkg from '../../src/js/ui/gbDonationTables.js';

const {
  fPercentBanded,
  fDonationSuggest,
  getPlayerLink,
  getDonations_new,
  getPlaceValues,
  checkInactive,
  gbTabSafe,
  gbTabNotSafe,
  gbTabEmpty,
} = gbDonationPkg.default || gbDonationPkg;

test('gbDonationTables UI Suite', async (t) => {
  await t.test(
    'fPercentBanded assigns correct badge classes by profit margin',
    () => {
      assert.equal(fPercentBanded(25), 'green');
      assert.equal(fPercentBanded(20), 'green');
      assert.equal(fPercentBanded(15), 'invest-good');
      assert.equal(fPercentBanded(10), 'invest-good');
      assert.equal(fPercentBanded(8), 'invest-fair');
      assert.equal(fPercentBanded(5), '');
      assert.equal(fPercentBanded(0), '');
      assert.equal(fPercentBanded(-10), '');
    },
  );

  await t.test(
    'fDonationSuggest calculates suggested donation with half-up rounding',
    () => {
      // 100 * 1.9 = 190
      assert.equal(fDonationSuggest(100, 190).toNumber(), 190);
      // 5 * 1.9 = 9.5 -> 10
      assert.equal(fDonationSuggest(5, 190).toNumber(), 10);
      // 15 * 1.9 = 28.5 -> 29
      assert.equal(fDonationSuggest(15, 190).toNumber(), 29);
    },
  );

  await t.test('getPlayerLink generates valid ScoreDB profile URL', () => {
    const link = getPlayerLink('TestCommander', 12345, 'en7');
    assert.match(link, /href="https:\/\/foe\.scoredb\.io\/en7\/Player\/12345"/);
    assert.match(link, />TestCommander<\/a>/);
  });

  await t.test(
    'getDonations_new formats copy footer for safe positions',
    () => {
      const safe = [true, true, false, false, false];
      const donateSuggest = [190, 95, 50, 20, 10];
      const footer = getDonations_new(1, safe, donateSuggest);
      assert.match(footer, /P2\(95\)/);
      assert.match(footer, /P1\(190\)/);
      assert.doesNotMatch(footer, /P3/);
    },
  );

  await t.test(
    'getPlaceValues computes lock FP, reward, profit, and percent',
    () => {
      const gbData = { total: 1000, current: 200, name: 'The Arc' };
      const topInvestors = [0, 0, 0, 0, 0];
      const rewards = [300, 150, 50, 10, 0];

      // Place 1 as a potential donor: lock is ceil(800 / 2) = 400 FP.
      // Base reward = 300. Arc boost (90% = 1.9x): 300 * 1.9 = 570 FP.
      // NET is measured against the lock: 570 - 400 = 170.
      const p1 = getPlaceValues(gbData, 1, topInvestors, rewards, 190, 90);
      assert.equal(p1.remaining, 800);
      assert.equal(p1.donation.toNumber(), 400);
      assert.equal(p1.rewardFP.toNumber(), 570);
      assert.equal(p1.donateCustom.toNumber(), 570);
      assert.equal(p1.committedCost.toNumber(), 400);
      assert.equal(p1.net.toNumber(), 170);
      assert.equal(p1.profit, '170');
      assert.equal(p1.profitNum, 170);
      assert.equal(p1.percent.toNumber(), 42);
      assert.equal(p1.outcome, 'profit');
      assert.equal(p1.band, 'green');
    },
  );

  await t.test('marks a potential donor loss as red', () => {
    const values = getPlaceValues(
      { total: 60011, current: 59488 },
      3,
      [2771, 1570, 520, 128, 30],
      [260, 130, 260, 65, 15],
      190,
      100,
    );
    assert.equal(values.donation.toNumber(), 522);
    assert.equal(values.rewardFP.toNumber(), 520);
    assert.equal(values.donateCustom.toNumber(), 494);
    assert.equal(values.committedCost.toNumber(), 522);
    assert.equal(values.profitNum, -2);
    assert.equal(values.outcome, 'loss');
    assert.equal(values.band, 'red');
  });

  await t.test('gbTabSafe renders card markup with alert-success', () => {
    const html = gbTabSafe({
      place: 1,
      currentPercent: 190,
      donation: 400,
      rewardFP: 570,
      donateCustom: 570,
      gbData: {
        name: 'The Arc',
        level: 80,
        max_level: 81,
        current: 200,
        total: 1000,
      },
      playerName: 'Player1',
      playerId: 999,
    });

    assert.match(html, /alert-success/);
    assert.match(html, /1st/);
    assert.match(html, /400 FP/);
    assert.match(html, /570 FP/);
    assert.match(html, /\[\+170 FP\]/);
  });

  await t.test('gbTabNotSafe renders card markup with alert-danger', () => {
    const html = gbTabNotSafe({
      place: 2,
      currentPercent: 190,
      donation: 300,
      rewardFP: 250,
      donateCustom: 285,
      gbData: {
        name: 'Statue of Zeus',
        level: 10,
        max_level: 11,
        current: 100,
        total: 600,
      },
      playerName: 'Player2',
      playerId: 888,
    });

    assert.match(html, /alert-danger/);
    assert.match(html, /2nd/);
    assert.match(html, /300 FP/);
    assert.match(html, /\[-50 FP\]/);
  });

  await t.test(
    'positional donation cards retain lock profit and copy amounts',
    () => {
      for (const render of [gbTabSafe, gbTabNotSafe]) {
        const html = render(
          1,
          190,
          400,
          570,
          570,
          [570, 285, 95, 19, 0],
          [300, 150, 50, 10, 0],
          true,
          false,
          [true, true, false, false, false],
          {
            playerName: 'Owner',
            myInfo: { name: 'Owner' },
            gbData: { name: 'The Arc', total: 1000, current: 200 },
          },
        );
        assert.match(html, /\[\+?170 FP\]/);
        assert.match(html, /P2\(285\).*P1\(570\)/);
        assert.doesNotMatch(html, /P3\(/);
      }
    },
  );

  await t.test('gbTabEmpty renders placeholder table', () => {
    const html = gbTabEmpty({
      gbData: { name: 'Himeji Castle', level: 50 },
      playerName: 'Player3',
      playerId: 777,
      currentPercent: 190,
    });

    assert.match(html, /alert-danger/);
    assert.match(html, /Himeji Castle \[51\]/);
    assert.match(html, />-<\/strong>/);
  });

  await t.test(
    'checkInactive reads the live social lists from SocialState',
    () => {
      socialState.setLists({
        hoodlist: [{ player_id: 42, is_active: false, is_self: false }],
      });

      assert.match(checkInactive(42), /INACTIVE/);
      assert.doesNotMatch(checkInactive(999), /INACTIVE/);
    },
  );
});
