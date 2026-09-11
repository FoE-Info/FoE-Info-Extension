import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractPlayerPoints,
  parseUserAccount,
} from '../../src/js/parsers/accountParser.js';

describe('accountParser', () => {
  describe('extractPlayerPoints', () => {
    it('returns 0 for null or undefined input', () => {
      assert.equal(extractPlayerPoints(null), 0);
      assert.equal(extractPlayerPoints(undefined), 0);
      assert.equal(extractPlayerPoints('not-an-object'), 0);
    });

    it('extracts points from rank_points', () => {
      assert.equal(extractPlayerPoints({ rank_points: 1234567 }), 1234567);
      assert.equal(extractPlayerPoints({ rank_points: '9876543' }), 9876543);
    });

    it('extracts points from player_points', () => {
      assert.equal(extractPlayerPoints({ player_points: 54321 }), 54321);
    });

    it('extracts points from score', () => {
      assert.equal(extractPlayerPoints({ score: 99999 }), 99999);
    });

    it('extracts points from points', () => {
      assert.equal(extractPlayerPoints({ points: 8888 }), 8888);
    });

    it('follows precedence rank_points > player_points > score > points', () => {
      assert.equal(
        extractPlayerPoints({
          rank_points: 100,
          player_points: 200,
          score: 300,
          points: 400,
        }),
        100,
      );
      assert.equal(
        extractPlayerPoints({
          player_points: 200,
          score: 300,
          points: 400,
        }),
        200,
      );
      assert.equal(
        extractPlayerPoints({
          score: 300,
          points: 400,
        }),
        300,
      );
    });

    it('returns 0 for NaN or non-finite values', () => {
      assert.equal(extractPlayerPoints({ rank_points: 'invalid' }), 0);
      assert.equal(extractPlayerPoints({ rank_points: Infinity }), 0);
    });
  });

  describe('parseUserAccount', () => {
    it('returns default empty account for invalid input', () => {
      const parsed = parseUserAccount(null);
      assert.deepEqual(parsed, {
        id: 0,
        name: '',
        clan: '',
        clanId: 0,
        createdAt: 0,
        era: '',
        score: 0,
        permissions: {},
      });
    });

    it('normalizes full InnoGames user_data payload', () => {
      const rawUser = {
        player_id: 104523,
        user_name: 'KronikPillow',
        clan_name: 'Iron Vanguard',
        clan_id: 884,
        createdAt: 1609459200,
        era: 'SpaceAgeTitan',
        rank_points: 45281900,
        clan_permissions: { admin: true, member: true },
      };

      const parsed = parseUserAccount(rawUser);
      assert.equal(parsed.id, 104523);
      assert.equal(parsed.name, 'KronikPillow');
      assert.equal(parsed.clan, 'Iron Vanguard');
      assert.equal(parsed.clanId, 884);
      assert.equal(parsed.createdAt, 1609459200);
      assert.equal(parsed.era, 'SpaceAgeTitan');
      assert.equal(parsed.score, 45281900);
      assert.deepEqual(parsed.permissions, { admin: true, member: true });
    });

    it('handles alternative property keys and whitespace', () => {
      const altUser = {
        id: '2050',
        name: '  PlayerOne  ',
        clan: '  Wolves  ',
        clanId: '99',
        created_at: '1700000000',
        era: 'FutureEra',
        score: '1500000',
        permissions: { founder: true },
      };

      const parsed = parseUserAccount(altUser);
      assert.equal(parsed.id, 2050);
      assert.equal(parsed.name, 'PlayerOne');
      assert.equal(parsed.clan, 'Wolves');
      assert.equal(parsed.clanId, 99);
      assert.equal(parsed.createdAt, 1700000000);
      assert.equal(parsed.era, 'FutureEra');
      assert.equal(parsed.score, 1500000);
      assert.deepEqual(parsed.permissions, { founder: true });
    });
  });
});
