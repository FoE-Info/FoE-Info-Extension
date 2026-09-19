import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import {
  bindDonationEvents,
  buildClassicDonationHeader,
  getDonations,
  getFriendlyDonation,
  getSafe,
} from '../../src/js/ui/gbDonationFormatters.js';

test('gbDonationFormatters Helper Suite', async (t) => {
  await t.test('getFriendlyDonation handles green and red styles', () => {
    const green = getFriendlyDonation(
      new BigNumber(100),
      new BigNumber(120),
      190,
      new BigNumber(80),
    );
    assert.match(green, /green/);
    assert.match(green, /1\.9: 100FP/);

    const red = getFriendlyDonation(
      new BigNumber(100),
      new BigNumber(80),
      190,
      new BigNumber(80),
    );
    assert.match(red, /red/);

    const bandRed = getFriendlyDonation(
      new BigNumber(100),
      new BigNumber(120),
      190,
      new BigNumber(80),
      'red',
    );
    assert.match(bandRed, /red/);
  });

  await t.test('getSafe calculates safe and suggested donations', () => {
    const res = getSafe({
      place: 1,
      GBrewards: [100, 50, 20, 10, 0],
      currentPercent: 190,
      remaining: 500,
      Top: [0, 0, 0, 0, 0, 0],
    });
    assert.equal(res.safe.length, 5);
    assert.equal(res.donateSuggest.length, 5);
    assert.equal(res.donateSuggest[0].toNumber(), 190);
  });

  await t.test('getDonations formats copy snippet', () => {
    const snippet = getDonations({
      place: 1,
      safe: [true, false, false, false, false],
      donateSuggest: [
        new BigNumber(190),
        new BigNumber(95),
        new BigNumber(0),
        new BigNumber(0),
        new BigNumber(0),
      ],
      showOptions: { hideUnsafe: false },
    });
    assert.match(snippet, /P1\(190\)/);
    assert.match(snippet, /P2\(95\)/);
  });

  await t.test(
    'buildClassicDonationHeader generates HTML with indicators',
    () => {
      const html = buildClassicDonationHeader({
        isCollapsed: false,
        iconHtml: '<i>-</i>',
        closeBtn: '<btn>x</btn>',
        copyBtn: '<btn>copy</btn>',
        packageBadgeHtml: '<span>Packages</span>',
        getPlayerLink: (n) => `<a href="#">${n}</a>`,
        PlayerName: 'LordVader',
        GBselected: { name: 'Death Star', level: 10, connected: false },
        PlayerID: 111,
        escapeFn: (s) => s,
        isGbLocked: true,
        checkInactive: () => '<p>INACTIVE</p>',
      });

      assert.match(html, /alert-secondary/);
      assert.match(html, /LordVader/);
      assert.match(html, /Death Star 11/);
      assert.match(html, /DISCONNECTED/);
      assert.match(html, /LOCKED/);
      assert.match(html, /INACTIVE/);
    },
  );

  await t.test(
    'bindDonationEvents does not throw in headless environment',
    () => {
      assert.doesNotThrow(() => {
        bindDonationEvents({
          getUseNewPanel: () => false,
          setUseNewPanel: () => {},
        });
      });
    },
  );
});
