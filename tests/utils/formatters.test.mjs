import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  escapeHTML,
  formatEntityId,
  fResourceShortName,
  fRewardShortName,
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
});
