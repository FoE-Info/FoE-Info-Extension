import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildContributionTable,
  buildInternationalTable,
  wrapChampionshipCard,
  wrapContributionCard,
} from '../../src/js/ui/expeditionTables.js';

test('Split GE Panels Suite', async (t) => {
  await t.test('wrapChampionshipCard renders independent alert card', () => {
    const tableHtml = buildInternationalTable([
      { rank: 1, name: 'Top Guild', server: 'en1', points: '120%' },
    ]);
    const cardHtml = wrapChampionshipCard(tableHtml, false, 250);

    assert.match(cardHtml, /id="geChampionshipCard"/);
    assert.match(cardHtml, /id="geChampionshipLabel"/);
    assert.match(cardHtml, /id="geChampionshipIcon"/);
    assert.match(cardHtml, /\[-\]/);
    assert.match(cardHtml, /id="geChampionshipCopyID"/);
    assert.match(cardHtml, /id="geChampionshipText"/);
    assert.match(cardHtml, /resize-both/);
    assert.match(cardHtml, /Top Guild/);
    assert.match(
      cardHtml,
      /data-i18n="ge_championship">GE Championship<\/span>/,
    );
    assert.match(tableHtml, /--bs-table-color:\s*inherit;/);
  });

  await t.test('wrapContributionCard renders independent alert card', () => {
    const tableHtml = buildContributionTable([
      {
        player: { name: 'Knight' },
        currentTrial: 12,
        expeditionPoints: 45000,
        solvedEncounters: 30,
      },
    ]);
    const cardHtml = wrapContributionCard(tableHtml, true, 200);

    assert.match(cardHtml, /id="geContributionCard"/);
    assert.match(cardHtml, /id="geContributionLabel"/);
    assert.match(cardHtml, /id="geContributionIcon"/);
    assert.match(cardHtml, /\[\+\]/);
    assert.match(cardHtml, /id="geContributionCopyID"/);
    assert.match(cardHtml, /id="geContributionText"/);
    assert.match(cardHtml, /resize-both/);
    assert.match(cardHtml, /Knight/);
    assert.match(
      cardHtml,
      /data-i18n="ge_member_contributions">GE Leaderboard<\/span>/,
    );
    assert.match(tableHtml, /--bs-table-color:\s*inherit;/);
  });
});
