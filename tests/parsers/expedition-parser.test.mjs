import assert from 'node:assert/strict';
import test from 'node:test';
import parserPkg from '../../src/js/parsers/expeditionParser.js';

const { extractTrialLevel, extractInternationalExpeditionEntries } = parserPkg;

test('expeditionParser - extractTrialLevel', async (t) => {
  await t.test('reads the first available trial field, defaulting to 1', () => {
    assert.equal(extractTrialLevel({ currentTrial: 4 }), 4);
    assert.equal(extractTrialLevel({ trial: 5 }), 5);
    assert.equal(extractTrialLevel({ trialLevel: 3 }), 3);
    assert.equal(extractTrialLevel({ state: { currentTrial: 2 } }), 2);
    assert.equal(extractTrialLevel({ state: { trial: 7 } }), 7);
    assert.equal(extractTrialLevel({}), 1);
    assert.equal(extractTrialLevel(null), 1);
    assert.equal(extractTrialLevel({ trial: 0 }), 1);
    assert.equal(extractTrialLevel({ trial: 'nope' }), 1);
  });
});

test('expeditionParser - extractInternationalExpeditionEntries', async (t) => {
  await t.test('merges ranking and participants with rank sorting', () => {
    const entries = extractInternationalExpeditionEntries({
      responseData: {
        ranking: [
          { participantId: 2, rank: 1, points: 900 },
          { participantId: 1, rank: 2, points: 500 },
        ],
        participants: [
          { id: 1, name: 'Alpha', worldName: 'en1' },
          { id: 2, name: 'Beta', worldName: 'en2' },
        ],
      },
    });

    assert.deepEqual(entries, [
      { rank: 1, name: 'Beta', server: 'en2', points: 900 },
      { rank: 2, name: 'Alpha', server: 'en1', points: 500 },
    ]);
  });

  await t.test('accepts plain arrays and defaults rank by index', () => {
    const entries = extractInternationalExpeditionEntries([
      { name: 'Guild B', points: 10 },
      { guildName: 'Guild A', progress: 99 },
    ]);

    assert.deepEqual(entries, [
      { rank: 1, name: 'Guild B', server: '', points: 10 },
      { rank: 2, name: 'Guild A', server: '', points: 99 },
    ]);
  });

  await t.test('returns [] for empty input', () => {
    assert.deepEqual(extractInternationalExpeditionEntries(null), []);
    assert.deepEqual(extractInternationalExpeditionEntries({}), []);
  });
});
