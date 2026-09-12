import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { formatShieldCountdown } =
  await import('../../src/js/msg/OtherPlayerService.js');

// Fixed clock: 2027-01-15T08:00:00Z. InnoGames `expireTime` is Unix seconds.
const NOW_MS = 1_800_000_000_000;
const NOW_SECONDS = NOW_MS / 1000;

describe('OtherPlayerService city-protection shield countdown (J-5)', () => {
  it('treats expireTime as Unix seconds and counts down to now', () => {
    // 1 hour remaining -> hours are always shown, minutes/seconds trailing
    assert.equal(
      formatShieldCountdown(NOW_SECONDS + 3600, NOW_MS),
      '1:0:',
      'one hour remaining must render 1:0:',
    );
  });

  it('renders multi-day protections with day pluralization', () => {
    // 2 days + 3 hours = 183600 seconds
    assert.equal(
      formatShieldCountdown(NOW_SECONDS + 183600, NOW_MS),
      '2 Days 3:',
    );
    // Exactly 1 day uses the singular label
    assert.equal(
      formatShieldCountdown(NOW_SECONDS + 86400, NOW_MS),
      '1 Day 0:',
    );
  });

  it('renders sub-hour protections as minutes:seconds', () => {
    // 5 minutes + 3 seconds = 303 seconds
    assert.equal(formatShieldCountdown(NOW_SECONDS + 303, NOW_MS), '0:5:3');
  });

  it('also tolerates millisecond timestamps defensively via resolveDate', () => {
    assert.equal(
      formatShieldCountdown(NOW_MS + 3600 * 1000, NOW_MS),
      '1:0:',
      'millisecond input must resolve to the same countdown',
    );
  });

  it('returns empty string for unparseable or non-positive expiries', () => {
    assert.equal(formatShieldCountdown(0, NOW_MS), '');
    assert.equal(formatShieldCountdown(-1, NOW_MS), '');
    assert.equal(formatShieldCountdown(null, NOW_MS), '');
    assert.equal(formatShieldCountdown(undefined, NOW_MS), '');
  });
});
