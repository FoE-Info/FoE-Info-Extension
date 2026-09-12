import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  escapeHTML,
  fAgestring,
  fFormatNumber,
  fNumber,
  formatEntityId,
  fResourceShortName,
  fRewardShortName,
  fRound,
  fTitleCase,
} from '../../src/js/utils/formatters.js';

describe('Formatters Utility Suite', () => {
  describe('escapeHTML', () => {
    it('returns empty string for null and undefined', () => {
      assert.equal(escapeHTML(null), '');
      assert.equal(escapeHTML(undefined), '');
    });

    it('escapes standard HTML special characters', () => {
      assert.equal(escapeHTML('&'), '&amp;');
      assert.equal(escapeHTML('<'), '&lt;');
      assert.equal(escapeHTML('>'), '&gt;');
      assert.equal(escapeHTML('"'), '&quot;');
      assert.equal(escapeHTML("'"), '&#039;');
    });

    it('sanitizes script tags and XSS payloads', () => {
      const malicious = '<script>alert("XSS & \'injection\'")</script>';
      const expected =
        '&lt;script&gt;alert(&quot;XSS &amp; &#039;injection&#039;&quot;)&lt;/script&gt;';
      assert.equal(escapeHTML(malicious), expected);
    });

    it('leaves plain text intact', () => {
      assert.equal(escapeHTML('Hello World 123'), 'Hello World 123');
    });

    it('stringifies numbers and booleans correctly', () => {
      assert.equal(escapeHTML(12345), '12345');
      assert.equal(escapeHTML(true), 'true');
    });
  });

  describe('formatEntityId', () => {
    it('returns empty string for falsy input', () => {
      assert.equal(formatEntityId(''), '');
      assert.equal(formatEntityId(null), '');
      assert.equal(formatEntityId(undefined), '');
    });

    it('handles primitive string and number ids', () => {
      assert.equal(
        formatEntityId('X_ProgressiveEra_Landmark1'),
        'X_ProgressiveEra_Landmark1',
      );
      assert.equal(formatEntityId(42), '42');
    });

    it('extracts id from object properties (value, id, identifier)', () => {
      assert.equal(
        formatEntityId({ value: 'B_BronzeAge_Residential1' }),
        'B_BronzeAge_Residential1',
      );
      assert.equal(formatEntityId({ id: 'city_hall' }), 'city_hall');
      assert.equal(formatEntityId({ identifier: 'guild_raid' }), 'guild_raid');
    });
  });

  describe('fResourceShortName', () => {
    it('maps special hardcoded resources', () => {
      assert.equal(fResourceShortName('sacrificial_offerings'), 'Offerings');
      assert.equal(fResourceShortName('something else'), 'something');
    });

    it('resolves names from custom lookup dictionary', () => {
      const customLookup = {
        strategy_points: 'Forge Points',
        money: 'Coins',
        supplies: 'Supplies',
      };
      assert.equal(
        fResourceShortName('strategy_points', customLookup),
        'Forge Points',
      );
      assert.equal(fResourceShortName('money', customLookup), 'Coins');
    });

    it('returns raw key if not found in lookup', () => {
      assert.equal(fResourceShortName('unknown_token', {}), 'unknown_token');
    });

    it('falls back to known display aliases when the lookup misses', () => {
      assert.equal(fResourceShortName('strategy_points', {}), 'Forge Points');
      assert.equal(fResourceShortName('strategy_point', {}), 'Forge Point');
      assert.equal(fResourceShortName('money', {}), 'Coins');
      assert.equal(fResourceShortName('medals', {}), 'Medals');
      assert.equal(fResourceShortName('premium', {}), 'Diamonds');
      assert.equal(fResourceShortName('clan_power', {}), 'Guild Power');
    });

    it('resolves one-argument lookups via globalThis.ResourceNames', (t) => {
      const hadOwn = Object.prototype.hasOwnProperty.call(
        globalThis,
        'ResourceNames',
      );
      const previous = globalThis.ResourceNames;
      t.after(() => {
        if (hadOwn) globalThis.ResourceNames = previous;
        else delete globalThis.ResourceNames;
      });

      globalThis.ResourceNames = { raw_iron: 'Iron' };
      assert.equal(fResourceShortName('raw_iron'), 'Iron');
    });
  });

  describe('fTitleCase', () => {
    it('converts snake_case ids to Title Case labels', () => {
      assert.equal(fTitleCase('rogue'), 'Rogue');
      assert.equal(fTitleCase('imperial_guard'), 'Imperial Guard');
      assert.equal(fTitleCase('strategy_points'), 'Strategy Points');
    });

    it('returns empty string for nullish input', () => {
      assert.equal(fTitleCase(null), '');
      assert.equal(fTitleCase(undefined), '');
      assert.equal(fTitleCase(''), '');
    });
  });

  describe('fRewardShortName', () => {
    it('shortens selection kit fragment descriptions', () => {
      assert.equal(
        fRewardShortName('Fragment of Statue Of Honor Selection Kit'),
        'SoH Fragment',
      );
      assert.equal(
        fRewardShortName('Statue Of Honor Selection Kit'),
        'SoH Kit',
      );
      assert.equal(
        fRewardShortName('Fragment of The Great Elephant Selection Kit'),
        'Elephant Fragment',
      );
    });

    it('strips count prefixes like "1 ", "5 ", "5x ", "10 "', () => {
      assert.equal(fRewardShortName('1 Blueprint'), 'Blueprint');
      assert.equal(fRewardShortName('5 Forge Points'), 'Forge Points');
      assert.equal(fRewardShortName('5x Rogues'), 'Rogues');
      assert.equal(fRewardShortName('5x Rogue'), 'Rogues');
      assert.equal(fRewardShortName('10 Medals'), 'Medals');
      assert.equal(fRewardShortName('25 Diamonds'), 'Diamonds');
    });

    it('categorizes generic reward names', () => {
      assert.equal(fRewardShortName('500 Coins'), 'Coins');
      assert.equal(fRewardShortName('Random Goods'), 'Goods');
      assert.equal(fRewardShortName('Extra Supplies'), 'Supplies');
      assert.equal(fRewardShortName('Rogue Hideout'), 'Rogues');
      assert.equal(fRewardShortName('Medals Package'), 'Medals');
      assert.equal(fRewardShortName('Large Forge Points'), 'Forge Points');
    });

    it('returns unmodified reward if no rule matches', () => {
      assert.equal(
        fRewardShortName('Custom Avatar Item'),
        'Custom Avatar Item',
      );
    });

    it('handles falsy input safely', () => {
      assert.equal(fRewardShortName(null), '');
      assert.equal(fRewardShortName(''), '');
    });
  });

  describe('fRound', () => {
    it('rounds to two decimals by default', () => {
      assert.equal(fRound(3.14159), 3.14);
      assert.equal(fRound(1.25, 1), 1.3);
      assert.equal(fRound(1.24, 1), 1.2);
    });

    it('honours an explicit decimal count', () => {
      assert.equal(fRound(3.14159, 3), 3.142);
      assert.equal(fRound(3.14159, 0), 3);
      assert.equal(fRound(2.5, 0), 3);
    });

    it('clamps negative decimal counts to integers', () => {
      assert.equal(fRound(5.7, -3), 6);
    });

    it('coerces numeric strings', () => {
      assert.equal(fRound('3.14159', 2), 3.14);
    });

    it('returns 0 for nullish, non-finite, and non-numeric input', () => {
      assert.equal(fRound(null), 0);
      assert.equal(fRound(undefined), 0);
      assert.equal(fRound(NaN), 0);
      assert.equal(fRound(Infinity), 0);
      assert.equal(fRound('not-a-number'), 0);
    });
  });

  describe('fNumber', () => {
    it('passes finite numbers through unchanged', () => {
      assert.equal(fNumber(42), 42);
      assert.equal(fNumber(3.5), 3.5);
      assert.equal(fNumber(0), 0);
    });

    it('parses numeric strings with separators and whitespace', () => {
      assert.equal(fNumber('42'), 42);
      assert.equal(fNumber('1,234.5'), 1234.5);
      assert.equal(fNumber(' 1 234 '), 1234);
    });

    it('returns the fallback for invalid input', () => {
      assert.equal(fNumber(null), 0);
      assert.equal(fNumber(undefined), 0);
      assert.equal(fNumber(''), 0);
      assert.equal(fNumber('abc'), 0);
      assert.equal(fNumber(NaN), 0);
      assert.equal(fNumber(Infinity), 0);
      assert.equal(fNumber('abc', -1), -1);
    });
  });

  describe('fFormatNumber', () => {
    it('groups thousands with locale separators', () => {
      assert.equal(fFormatNumber(1234567), '1,234,567');
      assert.equal(fFormatNumber(1234567, 'en-US'), '1,234,567');
      assert.equal(fFormatNumber(1234567.891), '1,234,567.891');
    });

    it('formats negatives and zero', () => {
      assert.equal(fFormatNumber(-1234), '-1,234');
      assert.equal(fFormatNumber(0), '0');
    });

    it('parses numeric strings', () => {
      assert.equal(fFormatNumber('10000'), '10,000');
    });

    it('returns "0" for nullish and invalid input', () => {
      assert.equal(fFormatNumber(null), '0');
      assert.equal(fFormatNumber(undefined), '0');
      assert.equal(fFormatNumber(''), '0');
      assert.equal(fFormatNumber('abc'), '0');
      assert.equal(fFormatNumber(Infinity), '0');
    });
  });

  describe('fAgestring', () => {
    it('splits camel-cased era keys into spaced labels', () => {
      assert.equal(fAgestring('BronzeAge'), 'Bronze Age');
      assert.equal(fAgestring('EarlyMiddleAge'), 'Early Middle Age');
      assert.equal(fAgestring('SpaceAgeMars'), 'Space Age Mars');
      assert.equal(
        fAgestring('SpaceAgeAsteroidBelt'),
        'Space Age Asteroid Belt',
      );
      assert.equal(fAgestring('StellarAgeDiscovery'), 'Stellar Age Discovery');
      assert.equal(fAgestring('NoAge'), 'No Age');
    });

    it('returns already-spaced values unchanged', () => {
      assert.equal(fAgestring('Colonial Age'), 'Colonial Age');
    });

    it('handles nullish and empty input', () => {
      assert.equal(fAgestring(null), '');
      assert.equal(fAgestring(undefined), '');
      assert.equal(fAgestring(''), '');
      assert.equal(fAgestring('   '), '');
    });

    it('passes unknown non-camel keys through untouched', () => {
      assert.equal(fAgestring('AA'), 'AA');
    });
  });
});
