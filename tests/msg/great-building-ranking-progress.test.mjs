import assert from 'node:assert/strict';
import test from 'node:test';
import { isPlacePassable } from '../../src/js/calc/GreatBuildingCalculator.js';
import donationService from '../../src/js/msg/GbDonationService.js';
import { createGreatBuildingsService } from '../../src/js/msg/GreatBuildingsService.js';
import { GreatBuildingsState } from '../../src/js/state/GreatBuildingDomainState.js';
import { evaluateGbDonationPlaces } from '../../src/js/ui/gbDonationPanel.js';
import { renderGbDonorsCard } from '../../src/js/ui/greatBuildingsPanel.js';

const { updateContributionProgress } = donationService;

test('Château Frontenac ranking refresh skips locked P3 and primes P4', () => {
  const state = new GreatBuildingsState();
  const selected = {
    id: 123,
    player: 7,
    name: 'Château Frontenac',
    level: 69,
    max_level: 98,
    total: 3652,
    current: 3062,
  };
  const service = createGreatBuildingsService({
    greatBuildingsState: state,
    gbRegistry: {
      getGreatBuilding: () => ({ ...selected }),
      calculateLevelCost: () => 3652,
    },
  });
  const rankings = [
    { forge_points: 449, player: { player_id: 7, is_self: true } },
    ...[1739, 874, 295, 0, 0].map((fp, i) => ({
      rank: i + 1,
      forge_points: fp,
      player: { player_id: 100 + i, name: `Donor${i + 1}` },
      reward: { strategy_point_amount: [915, 460, 155, 40, 10][i] },
    })),
  ];
  const observed = [];
  state.subscribe((store, channel) => {
    const payload = store[channel];
    observed.push(payload.GBselected?.current ?? payload.gbData?.current);
    if (channel === 'donors') renderGbDonorsCard(payload);
  });
  service.getConstructionRanking({
    requestData: [123, 7, 69],
    responseData: rankings,
  });
  assert.deepEqual(observed, [3357, 3357, 3357]);
  const donation = state.getDonation();
  assert.equal(donation.Top[2], 295);
  const result = evaluateGbDonationPlaces({
    ...donation,
    PlayerName: 'Owner',
    MyInfo: { name: 'Owner' },
    isPlacePassableFn: isPlacePassable,
  });
  assert.match(result.olddonationHTML, /4th/);
  assert.match(result.olddonationHTML, /Add<\/span> 143FP/);
  assert.doesNotMatch(result.olddonationHTML, /3rd|295FP/);
});

test('ranked viewer does not erase owner investment from progress', () => {
  const selected = { player: 7, total: 1000, current: 200 };
  updateContributionProgress(
    selected,
    [{ rank: 1, forge_points: 400, player: { player_id: 8, is_self: true } }],
    { playerId: 7, contribution: 400 },
    8,
  );
  assert.equal(selected.current, 600);
});
