import assert from 'node:assert/strict';
import test from 'node:test';
import { socialState } from '../../src/js/state/SocialState.js';
import {
  buildCardFooter,
  checkInactive,
  gbTabEmpty,
  gbTabNotSafe,
  gbTabSafe,
  getDonations_new,
  getPlayerLink,
  inactiveHTML,
  resolveCardParams,
} from '../../src/js/ui/gbPlaceTableRows.js';

test('gbPlaceTableRows UI Helper Suite', async (t) => {
  await t.test(
    'resolveCardParams extracts properties from config object',
    () => {
      const cfg = resolveCardParams({
        place: 2,
        currentPercent: 195,
        donation: 250,
        rewardFP: 300,
        donateCustom: 290,
        playerName: 'PlayerAlpha',
        playerId: 1234,
        gbData: { name: 'Cape Canaveral', current: 100, total: 500, level: 10 },
      });

      assert.equal(cfg.place, 2);
      assert.equal(cfg.currentPercent, 195);
      assert.equal(cfg.donation, 250);
      assert.equal(cfg.rewardFP, 300);
      assert.equal(cfg.donateCustom, 290);
      assert.equal(cfg.playerName, 'PlayerAlpha');
      assert.equal(cfg.playerId, 1234);
      assert.equal(cfg.remaining, 400);
    },
  );

  await t.test('buildCardFooter returns empty if not owner', () => {
    const footer = buildCardFooter({
      playerName: 'OtherPlayer',
      myInfo: { name: 'MySelf' },
      place: 1,
      topInvestors: [0],
      donateCustom: 100,
      remaining: 500,
      safe: [true],
      donateSuggest: [100],
    });
    assert.equal(footer, '');
  });

  await t.test(
    'buildCardFooter generates safe add instructions for owner',
    () => {
      const footer = buildCardFooter({
        playerName: 'MySelf',
        myInfo: { name: 'MySelf' },
        place: 1,
        topInvestors: [0],
        donateCustom: 100,
        remaining: 500,
        safe: [true],
        donateSuggest: [100],
        currentPercent: 190,
        gbData: { name: 'Statue of Zeus', current: 0, total: 500 },
      });
      assert.match(footer, /card-footer/);
      assert.match(footer, /data-i18n="add"/);
      assert.match(footer, /data-i18n="safe"/);
      assert.match(footer, /P1\(100\)/);
    },
  );

  await t.test('gbTabSafe renders safe card markup with profit badge', () => {
    const html = gbTabSafe({
      place: 1,
      currentPercent: 190,
      donation: 100,
      rewardFP: 150,
      donateCustom: 150,
      gbData: {
        name: 'The Arc',
        current: 50,
        total: 200,
        level: 10,
        max_level: 11,
      },
      playerName: 'Tester',
      playerId: 555,
    });
    assert.match(html, /alert-success/);
    assert.match(html, /1st/);
    assert.match(html, /\[\+50 FP\]/);
  });

  await t.test('gbTabNotSafe renders warning or danger card markup', () => {
    const html = gbTabNotSafe({
      place: 3,
      currentPercent: 190,
      donation: 200,
      rewardFP: 180,
      donateCustom: 190,
      gbData: {
        name: 'The Arc',
        current: 50,
        total: 500,
        level: 10,
        max_level: 11,
      },
      playerName: 'Tester',
      playerId: 555,
    });
    assert.match(html, /alert-danger/);
    assert.match(html, /3rd/);
    assert.match(html, /\[-20 FP\]/);
  });

  await t.test('gbTabEmpty renders empty placeholder card', () => {
    const html = gbTabEmpty({
      gbData: { name: 'Alcatraz', level: 20 },
      playerName: 'Tester',
      playerId: 555,
      currentPercent: 190,
    });
    assert.match(html, /Alcatraz \[21\]/);
    assert.match(html, />-<\/strong>/);
  });

  await t.test('checkInactive and inactiveHTML inspect social lists', () => {
    assert.match(
      inactiveHTML([{ player_id: 88, is_active: false, is_self: false }], 88),
      /INACTIVE/,
    );
    socialState.setLists({
      hoodlist: [{ player_id: 88, is_active: false, is_self: false }],
    });
    assert.match(checkInactive(88), /INACTIVE/);
    assert.equal(checkInactive(9999), '');
  });

  await t.test('getPlayerLink generates valid links', () => {
    const link = getPlayerLink('Commander', 4321, 'us1');
    assert.match(link, /foe\.scoredb\.io\/us1\/Player\/4321/);
  });

  await t.test('getDonations_new aggregates donation suggestions', () => {
    const res = getDonations_new(
      1,
      [true, false, true, false, false],
      [190, 95, 45, 15, 5],
    );
    assert.match(res, /P3\(45\)/);
    assert.match(res, /P1\(190\)/);
    assert.doesNotMatch(res, /P2/);
  });
});
