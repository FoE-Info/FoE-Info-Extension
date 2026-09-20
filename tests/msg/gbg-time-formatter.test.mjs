import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getServerMarket,
  SERVER_TIMEZONES,
  timeGBG,
} from '../../src/js/msg/GbgTimeFormatter.js';

describe('GbgTimeFormatter Suite', () => {
  describe('getServerMarket', () => {
    it('returns market code for valid standard URLs', () => {
      assert.equal(getServerMarket('https://en7.forgeofempires.com'), 'en');
      assert.equal(getServerMarket('https://us12.forgeofempires.com'), 'us');
      assert.equal(getServerMarket('https://de3.forgeofempires.com'), 'de');
      assert.equal(getServerMarket('https://fr1.forgeofempires.com'), 'fr');
      assert.equal(getServerMarket('http://es5.forgeofempires.com'), 'es');
    });

    it('returns zz for beta and zz origins', () => {
      assert.equal(getServerMarket('https://zz1.forgeofempires.com'), 'zz');
      assert.equal(getServerMarket('beta.forgeofempires.com'), 'zz');
      assert.equal(getServerMarket('zz'), 'zz');
    });

    it('handles prefixes without full domain', () => {
      assert.equal(getServerMarket('us15'), 'us');
      assert.equal(getServerMarket('de2'), 'de');
      assert.equal(getServerMarket('en0'), 'en');
    });

    it('falls back to "en" for invalid, null, or empty origins', () => {
      assert.equal(getServerMarket(''), 'en');
      assert.equal(getServerMarket(null), 'en');
      assert.equal(getServerMarket(undefined), 'en');
      assert.equal(getServerMarket(123), 'en');
    });
  });

  describe('SERVER_TIMEZONES map', () => {
    it('defines accurate timezones for supported markets', () => {
      assert.equal(SERVER_TIMEZONES.en.timeZone, 'Europe/London');
      assert.equal(SERVER_TIMEZONES.us.timeZone, 'America/New_York');
      assert.equal(SERVER_TIMEZONES.de.timeZone, 'Europe/Berlin');
      assert.equal(SERVER_TIMEZONES.us.hour12, true);
      assert.equal(SERVER_TIMEZONES.de.hour12, false);
    });
  });

  describe('timeGBG formatting', () => {
    const fixedEpochSec = 1700000000; // 2023-11-14T22:13:20.000Z

    it('returns empty string for null, undefined, or invalid dates', () => {
      assert.equal(timeGBG(null), '');
      assert.equal(timeGBG(undefined), '');
      assert.equal(timeGBG(''), '');
      assert.equal(timeGBG('invalid-date-string'), '');
    });

    it('formats server time with "@ " prefix for European markets', () => {
      const formatted = timeGBG(
        fixedEpochSec,
        'https://de1.forgeofempires.com',
      );
      assert.match(formatted, /^@ \d{2}:\d{2}$/);
    });

    it('formats server time with AM/PM for US market', () => {
      const formatted = timeGBG(
        fixedEpochSec,
        'https://us1.forgeofempires.com',
      );
      assert.match(formatted, /^@ \d{1,2}:\d{2}\s*(?:AM|PM)$/i);
    });

    it('supports options passed as second argument', () => {
      const localResult = timeGBG(fixedEpochSec, { GBGtimeMode: 'local' });
      assert.match(localResult, /^@ \d{1,2}:\d{2}/);
    });
  });
});
