import assert from 'node:assert/strict';
import test from 'node:test';
import BigNumber from 'bignumber.js';
import {
  formatCritStrikeHTML,
  formatUnitsHTML,
} from '../../src/js/ui/components/statFormatters.js';

test('Stat Formatters Sections & Boosts Suite', async (t) => {
  await t.test(
    'formatCritStrikeHTML returns empty string when neither AO nor CC built',
    () => {
      const html = formatCritStrikeHTML({});
      assert.equal(html, '');
    },
  );

  await t.test(
    'formatCritStrikeHTML renders single percentage when only AO is built',
    () => {
      const html = formatCritStrikeHTML({
        aoCriticalStrike: new BigNumber(33),
      });
      assert.match(
        html,
        /<span data-i18n="crit_strike">Crit Strike<\/span>: 33%/,
      );
      assert.doesNotMatch(html, /\(AO\)/);
    },
  );

  await t.test(
    'formatCritStrikeHTML renders single percentage when only CC is built',
    () => {
      const html = formatCritStrikeHTML({
        ccCriticalStrike: new BigNumber(25),
      });
      assert.match(
        html,
        /<span data-i18n="crit_strike">Crit Strike<\/span>: 25%/,
      );
      assert.doesNotMatch(html, /\(CC\)/);
    },
  );

  await t.test(
    'formatCritStrikeHTML renders total percentage when both AO and CC are built',
    () => {
      const html = formatCritStrikeHTML({
        aoCriticalStrike: new BigNumber(33),
        ccCriticalStrike: new BigNumber(25),
      });
      assert.match(
        html,
        /<span data-i18n="crit_strike">Crit Strike<\/span>: 58%/,
      );
      assert.doesNotMatch(html, /\(AO\)/);
      assert.doesNotMatch(html, /\(CC\)/);
    },
  );

  await t.test(
    'formatCritStrikeHTML rounds floating point inaccuracies (e.g. .00000002%) to clean total',
    () => {
      const html = formatCritStrikeHTML({
        aoCriticalStrike: new BigNumber(49.93),
        ccCriticalStrike: new BigNumber('20.00000002'),
      });
      assert.match(
        html,
        /<span data-i18n="crit_strike">Crit Strike<\/span>: 69\.93%/,
      );
      assert.doesNotMatch(html, /00000002/);
      assert.doesNotMatch(html, /\(AO\)/);
      assert.doesNotMatch(html, /\(CC\)/);
    },
  );

  await t.test(
    'formatUnitsHTML renders interactive popover when tooltip is present',
    () => {
      const html = formatUnitsHTML(
        {
          units: {
            daily: new BigNumber(120),
            tooltipHTML: '120 <strong>Alcatraz</strong><br>',
          },
        },
        {},
        'citystats',
        false,
      );
      assert.match(html, /data-bs-toggle="popover"/);
      assert.match(html, /data-bs-title="Daily Units"/);
      assert.match(html, /120/);
    },
  );

  await t.test(
    'formatUnitsHTML renders plain text when tooltip is absent',
    () => {
      const html = formatUnitsHTML(
        { units: { daily: new BigNumber(84) } },
        {},
        'citystats',
        false,
      );
      assert.doesNotMatch(html, /data-bs-toggle="popover"/);
      assert.match(html, /84/);
    },
  );

  await t.test('formatUnitsHTML floors fractional units to integer', () => {
    const html = formatUnitsHTML(
      { units: { daily: new BigNumber('3318.8') } },
      {},
      'citystats',
      true,
    );
    assert.match(html, /3,318/);
    assert.doesNotMatch(html, /3,318\.8/);
  });
});
