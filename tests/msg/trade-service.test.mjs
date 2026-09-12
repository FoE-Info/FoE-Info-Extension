import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  TradeService,
  tradeService,
  normalizeTradeOffer,
  parseTradeOffers,
  calculateTradeRatio,
  classifyFairTrade,
  isFairTrade,
  getEraRelationship,
  formatRatioLabel,
} = require('../../src/js/msg/TradeService.js');

const BUNDLE_PATH = new URL(
  '../fixtures/rpc/har/economy/marketplace_trades.json',
  import.meta.url,
);

function loadOffers() {
  const bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8'));
  const capture = bundle.captures.find(
    (c) =>
      c.requestClass === 'TradeService' && c.requestMethod === 'getTradeOffers',
  );
  return capture.responseData;
}

const ERA_BY_GOOD = {
  advanced_dna_data: 'SpaceAgeJupiterMoon',
  isolated_molecules: 'SpaceAgeTitan',
  wine: 'BronzeAge',
  dye: 'BronzeAge',
};
const resolveEra = (goodId) => ERA_BY_GOOD[goodId] || null;

test('TradeService: getTradeOffers parsing from HAR capture', async (t) => {
  const responseData = loadOffers();

  await t.test('captures the full 3,109 trade offers', () => {
    const offers = parseTradeOffers(responseData);
    assert.equal(offers.length, 3109);
  });

  await t.test('normalizes offer, need and merchant fields', () => {
    const [first] = parseTradeOffers(responseData);
    assert.equal(first.id, 49797288);
    assert.equal(first.offerGoodId, 'advanced_dna_data');
    assert.equal(first.offerValue.toNumber(), 400);
    assert.equal(first.needGoodId, 'isolated_molecules');
    assert.equal(first.needValue.toNumber(), 200);
    assert.equal(first.quantity, 1);
    assert.ok(first.createdAt > 0);
    assert.equal(first.merchant.playerId, 4389159);
    assert.equal(first.merchant.name, 'rufforth177');
    assert.equal(first.merchant.isNeighbor, true);
  });

  await t.test('accepts both wrapped and bare response shapes', () => {
    assert.equal(parseTradeOffers({ offers: responseData }).length, 3109);
    assert.equal(parseTradeOffers([]).length, 0);
    assert.equal(parseTradeOffers(null).length, 0);
  });
});

test('TradeService: trade ratio calculation', async (t) => {
  await t.test('computes offer:need ratios as BigNumber', () => {
    const ratio2 = calculateTradeRatio({
      offerValue: 400,
      needValue: 200,
    });
    assert.equal(ratio2.valid, true);
    assert.equal(ratio2.ratio.toNumber(), 2);
    assert.equal(ratio2.label, '2:1');

    const ratio1 = calculateTradeRatio({ offerValue: 300, needValue: 300 });
    assert.equal(ratio1.ratio.toNumber(), 1);
    assert.equal(ratio1.label, '1:1');

    const half = calculateTradeRatio({ offerValue: 200, needValue: 400 });
    assert.equal(half.ratio.toNumber(), 0.5);
    assert.equal(half.label, '1:2');
  });

  await t.test('reads nested raw offer/need objects', () => {
    const ratio = calculateTradeRatio({
      offer: { value: 100 },
      need: { value: 50 },
    });
    assert.equal(ratio.ratio.toNumber(), 2);
  });

  await t.test('returns an invalid ratio when need value is zero', () => {
    const invalid = calculateTradeRatio({ offerValue: 100, needValue: 0 });
    assert.equal(invalid.valid, false);
    assert.equal(invalid.ratio, null);
  });

  await t.test('formats non-canonical ratios without float drift', () => {
    assert.equal(formatRatioLabel(0.5882352941), '0.5882:1');
    assert.equal(formatRatioLabel(3), '3:1');
  });
});

test('TradeService: era relationship resolution', async (t) => {
  await t.test('detects same-era, adjacent-era and distant pairs', () => {
    assert.equal(
      getEraRelationship('wine', 'dye', resolveEra).relationship,
      'same',
    );
    assert.equal(
      getEraRelationship('advanced_dna_data', 'isolated_molecules', resolveEra)
        .relationship,
      'adjacent',
    );
    assert.equal(
      getEraRelationship('wine', 'isolated_molecules', resolveEra).relationship,
      'distant',
    );
  });

  await t.test('reports unknown when a good era cannot be resolved', () => {
    const result = getEraRelationship('wine', 'mystery_good', resolveEra);
    assert.equal(result.relationship, 'unknown');
    assert.equal(result.needEra, null);
  });
});

test('TradeService: fair trade classification', async (t) => {
  await t.test('same era + 1:1 is fair', () => {
    const offer = normalizeTradeOffer({
      offer: { good_id: 'wine', value: 100 },
      need: { good_id: 'dye', value: 100 },
    });
    const result = classifyFairTrade(offer, { resolveEra });
    assert.equal(result.fair, true);
    assert.equal(result.category, 'same-era');
    assert.equal(result.label, '1:1');
  });

  await t.test('adjacent era + 2:1 and 1:2 are fair', () => {
    const olderForNewer = normalizeTradeOffer({
      offer: { good_id: 'advanced_dna_data', value: 400 },
      need: { good_id: 'isolated_molecules', value: 200 },
    });
    const older = classifyFairTrade(olderForNewer, { resolveEra });
    assert.equal(older.fair, true);
    assert.equal(older.category, 'adjacent-era');
    assert.equal(older.label, '2:1');
    assert.equal(older.eraDistance, 1);

    const newerForOlder = normalizeTradeOffer({
      offer: { good_id: 'isolated_molecules', value: 200 },
      need: { good_id: 'advanced_dna_data', value: 400 },
    });
    const newer = classifyFairTrade(newerForOlder, { resolveEra });
    assert.equal(newer.fair, true);
    assert.equal(newer.label, '1:2');
    assert.equal(newer.eraDistance, -1);
  });

  await t.test('same era + wrong ratio is unfair', () => {
    const offer = normalizeTradeOffer({
      offer: { good_id: 'wine', value: 1 },
      need: { good_id: 'dye', value: 10 },
    });
    const result = classifyFairTrade(offer, { resolveEra });
    assert.equal(result.fair, false);
    assert.equal(result.category, 'unfair');
    assert.equal(result.eraRelationship, 'same');
  });

  await t.test('distant era + 1:1 is unfair', () => {
    const offer = normalizeTradeOffer({
      offer: { good_id: 'wine', value: 100 },
      need: { good_id: 'isolated_molecules', value: 100 },
    });
    const result = classifyFairTrade(offer, { resolveEra });
    assert.equal(result.fair, false);
    assert.equal(result.eraRelationship, 'distant');
  });

  await t.test(
    'falls back to canonical value ratios without a resolver',
    () => {
      const same = classifyFairTrade(
        normalizeTradeOffer({ offer: { value: 50 }, need: { value: 50 } }),
      );
      assert.equal(same.fair, true);
      assert.equal(same.category, 'same-era');

      const adjacent = classifyFairTrade(
        normalizeTradeOffer({ offer: { value: 200 }, need: { value: 100 } }),
      );
      assert.equal(adjacent.fair, true);
      assert.equal(adjacent.category, 'adjacent-era');

      const unfair = classifyFairTrade(
        normalizeTradeOffer({ offer: { value: 300 }, need: { value: 100 } }),
      );
      assert.equal(unfair.fair, false);
    },
  );

  await t.test('isFairTrade mirrors classifyFairTrade', () => {
    const offer = normalizeTradeOffer({
      offer: { good_id: 'advanced_dna_data', value: 400 },
      need: { good_id: 'isolated_molecules', value: 200 },
    });
    assert.equal(isFairTrade(offer, { resolveEra }), true);
  });
});

test('TradeService: real fixture classification parity', async (t) => {
  const responseData = loadOffers();
  const offers = parseTradeOffers(responseData).map((offer) => ({
    offer,
    result: classifyFairTrade(offer, { resolveEra }),
  }));

  await t.test(
    'classifies the dominant canonical ratios in the capture',
    () => {
      const counts = { '1:1': 0, '2:1': 0, '1:2': 0 };
      for (const { result } of offers) {
        if (counts[result.label] !== undefined) counts[result.label]++;
      }
      assert.equal(counts['1:1'], 454);
      assert.equal(counts['2:1'], 357);
      assert.equal(counts['1:2'], 1676);
    },
  );

  await t.test('classifies the real adjacent-era offer as fair', () => {
    const adjacent = offers.find(
      ({ offer }) =>
        offer.offerGoodId === 'advanced_dna_data' &&
        offer.needGoodId === 'isolated_molecules',
    );
    assert.ok(adjacent);
    assert.equal(adjacent.result.fair, true);
    assert.equal(adjacent.result.category, 'adjacent-era');
  });
});

test('TradeService: instance API', async (t) => {
  await t.test('ingests offers and exposes fair trades', () => {
    const service = new TradeService({ resolveEra });
    const res = service.getTradeOffers({ responseData: loadOffers() });
    assert.equal(res.success, true);
    assert.equal(res.count, 3109);
    assert.equal(service.getOffers().length, 3109);
    assert.ok(service.getTradeOffer(49797288));
    assert.equal(service.getTradeOffer(999999999), null);
    assert.ok(service.getFairTrades().length > 0);
  });

  await t.test('singleton parses without an explicit resolver', () => {
    const res = tradeService.getTradeOffers({ responseData: loadOffers() });
    assert.equal(res.count, 3109);
  });
});
