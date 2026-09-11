import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DATE_PRESETS,
  formatDate,
  formatDateTime,
  formatInTimeZone,
  formatPattern,
  formatRelativeTime,
  formatTime,
  setTimeFormattingConfig,
} from '../../src/js/utils/date.js';

describe('Date & Time Formatting Engine', () => {
  // Fixed test date: 2026-09-07 15:05:09 UTC
  // We'll test with a fixed local date object to avoid timezone discrepancies
  const fixedDate = new Date(2026, 8, 7, 15, 5, 9); // Month is 0-indexed: 8 = September
  const fixedTimestampSec = Math.floor(fixedDate.getTime() / 1000);
  const fixedTimestampMs = fixedDate.getTime();

  describe('formatPattern token replacement', () => {
    it('replaces year tokens correctly', () => {
      assert.equal(formatPattern(fixedDate, 'YYYY'), '2026');
      assert.equal(formatPattern(fixedDate, 'YY'), '26');
    });

    it('replaces month and day tokens with zero-padding', () => {
      assert.equal(formatPattern(fixedDate, 'MM'), '09');
      assert.equal(formatPattern(fixedDate, 'DD'), '07');
    });

    it('replaces 24-hour time tokens correctly', () => {
      assert.equal(formatPattern(fixedDate, 'HH:mm:ss'), '15:05:09');
      assert.equal(formatPattern(fixedDate, 'HH:mm'), '15:05');
    });

    it('replaces 12-hour time tokens with AM/PM', () => {
      assert.equal(formatPattern(fixedDate, 'hh:mm:ss A'), '03:05:09 PM');
      assert.equal(formatPattern(fixedDate, 'hh:mm a'), '03:05 pm');

      // Morning test (09:05:00)
      const morningDate = new Date(2026, 8, 7, 9, 5, 0);
      assert.equal(formatPattern(morningDate, 'hh:mm:ss A'), '09:05:00 AM');
      assert.equal(formatPattern(morningDate, 'hh:mm a'), '09:05 am');
    });

    it('handles midnight and noon correctly in 12-hour mode', () => {
      const midnight = new Date(2026, 8, 7, 0, 10, 0);
      assert.equal(formatPattern(midnight, 'hh:mm A'), '12:10 AM');

      const noon = new Date(2026, 8, 7, 12, 10, 0);
      assert.equal(formatPattern(noon, 'hh:mm A'), '12:10 PM');
    });

    it('preserves literal characters and separators', () => {
      assert.equal(
        formatPattern(fixedDate, 'DD.MM.YYYY [at] HH:mm:ss'),
        '07.09.2026 at 15:05:09',
      );
    });
  });

  describe('formatDate', () => {
    it('formats European date (DD.MM.YYYY) by default', () => {
      assert.equal(formatDate(fixedDate), '07.09.2026');
    });

    it('accepts timestamps in seconds', () => {
      assert.equal(formatDate(fixedTimestampSec), '07.09.2026');
    });

    it('accepts timestamps in milliseconds', () => {
      assert.equal(formatDate(fixedTimestampMs), '07.09.2026');
    });

    it('supports custom date patterns', () => {
      assert.equal(formatDate(fixedDate, 'YYYY-MM-DD'), '2026-09-07');
      assert.equal(formatDate(fixedDate, 'MM/DD/YYYY'), '09/07/2026');
    });

    it('returns empty string for invalid or falsy input', () => {
      assert.equal(formatDate(null), '');
      assert.equal(formatDate(undefined), '');
      assert.equal(formatDate(0), '');
      assert.equal(formatDate('invalid-date'), '');
    });
  });

  describe('formatTime', () => {
    it('formats 24-hour time (HH:mm:ss) by default', () => {
      assert.equal(formatTime(fixedDate), '15:05:09');
    });

    it('accepts seconds timestamp', () => {
      assert.equal(formatTime(fixedTimestampSec), '15:05:09');
    });

    it('supports custom time patterns', () => {
      assert.equal(formatTime(fixedDate, 'HH:mm'), '15:05');
      assert.equal(formatTime(fixedDate, 'hh:mm:ss A'), '03:05:09 PM');
    });

    it('returns empty string for invalid or falsy input', () => {
      assert.equal(formatTime(null), '');
      assert.equal(formatTime(undefined), '');
      assert.equal(formatTime(0), '');
    });
  });

  describe('formatDateTime', () => {
    it('formats European full datetime (DD.MM.YYYY HH:mm:ss) by default', () => {
      assert.equal(formatDateTime(fixedDate), '07.09.2026 15:05:09');
    });

    it('accepts seconds timestamp', () => {
      assert.equal(formatDateTime(fixedTimestampSec), '07.09.2026 15:05:09');
    });

    it('supports custom datetime patterns', () => {
      assert.equal(
        formatDateTime(fixedDate, 'YYYY-MM-DD HH:mm:ss'),
        '2026-09-07 15:05:09',
      );
      assert.equal(
        formatDateTime(fixedDate, 'MM/DD/YYYY hh:mm:ss A'),
        '09/07/2026 03:05:09 PM',
      );
    });

    it('returns empty string for invalid or falsy input', () => {
      assert.equal(formatDateTime(null), '');
      assert.equal(formatDateTime(undefined), '');
      assert.equal(formatDateTime(0), '');
    });
  });

  describe('DATE_PRESETS', () => {
    it('contains standard European and international presets', () => {
      assert.ok(DATE_PRESETS.date.includes('DD.MM.YYYY'));
      assert.ok(DATE_PRESETS.date.includes('YYYY-MM-DD'));
      assert.ok(DATE_PRESETS.time.includes('HH:mm:ss'));
      assert.ok(DATE_PRESETS.time.includes('HH:mm'));
      assert.ok(DATE_PRESETS.dateTime.includes('DD.MM.YYYY HH:mm:ss'));
      assert.ok(DATE_PRESETS.dateTime.includes('YYYY-MM-DD HH:mm:ss'));
    });
  });

  describe('dynamic user configuration via setTimeFormattingConfig', () => {
    it('switches default format according to user configuration', () => {
      setTimeFormattingConfig({
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'YYYY-MM-DD HH:mm',
      });

      assert.equal(formatDate(fixedDate), '2026-09-07');
      assert.equal(formatTime(fixedDate), '15:05');
      assert.equal(formatDateTime(fixedDate), '2026-09-07 15:05');

      // Reset to defaults
      setTimeFormattingConfig(null);
      assert.equal(formatDate(fixedDate), '07.09.2026');
      assert.equal(formatTime(fixedDate), '15:05:09');
      assert.equal(formatDateTime(fixedDate), '07.09.2026 15:05:09');
    });

    it('supports custom pattern override in configuration', () => {
      setTimeFormattingConfig({
        customPattern: 'DD/MM/YYYY [at] HH:mm:ss',
      });

      assert.equal(formatDateTime(fixedDate), '07/09/2026 at 15:05:09');

      setTimeFormattingConfig(null);
    });
  });

  describe('localized tokens via Intl.DateTimeFormat', () => {
    it('formats short and long month names', () => {
      assert.equal(formatPattern(fixedDate, 'MMM', 'en-US'), 'Sep');
      assert.equal(formatPattern(fixedDate, 'MMMM', 'en-US'), 'September');
    });

    it('formats short and long weekday names', () => {
      assert.equal(formatPattern(fixedDate, 'ddd', 'en-US'), 'Mon');
      assert.equal(formatPattern(fixedDate, 'dddd', 'en-US'), 'Monday');
    });

    it('supports localized tokens inside larger patterns', () => {
      assert.equal(
        formatPattern(fixedDate, 'ddd, DD MMM YYYY', 'en-US'),
        'Mon, 07 Sep 2026',
      );
    });

    it('localizes month and weekday names for other locales', () => {
      assert.equal(formatPattern(fixedDate, 'MMMM', 'de-DE'), 'September');
      assert.equal(formatPattern(fixedDate, 'ddd', 'de-DE'), 'Mo');
    });
  });

  describe('formatRelativeTime via Intl.RelativeTimeFormat', () => {
    const base = new Date(2026, 8, 7, 15, 0, 0);

    it('formats future times', () => {
      const future = new Date(base.getTime() + 2 * 3600 * 1000);
      assert.equal(formatRelativeTime(future, base, 'en'), 'in 2 hours');
    });

    it('formats past times', () => {
      const past = new Date(base.getTime() - 3 * 86400 * 1000);
      assert.equal(formatRelativeTime(past, base, 'en'), '3 days ago');
    });

    it('formats sub-minute differences', () => {
      const soon = new Date(base.getTime() + 30 * 1000);
      assert.equal(formatRelativeTime(soon, base, 'en'), 'in 30 seconds');
    });

    it('returns empty string for invalid or falsy input', () => {
      assert.equal(formatRelativeTime(null, base, 'en'), '');
      assert.equal(formatRelativeTime(0, base, 'en'), '');
    });
  });

  describe('formatInTimeZone via Intl.DateTimeFormat', () => {
    it('formats time in an explicit IANA time zone', () => {
      const utc = new Date(Date.UTC(2026, 8, 7, 13, 5, 0));
      assert.equal(
        formatInTimeZone(utc, {
          locale: 'de-DE',
          timeZone: 'Europe/Berlin',
          hour12: false,
        }),
        '15:05',
      );
    });

    it('returns empty string for invalid input', () => {
      assert.equal(formatInTimeZone(null, { timeZone: 'Europe/Berlin' }), '');
    });
  });
});
