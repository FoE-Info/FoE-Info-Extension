import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import BigNumber from 'bignumber.js';
import { renderHeaderPanel } from '../../src/js/ui/renderHeaderPanel.js';

describe('renderHeaderPanel UI Module', () => {
  function createMockMilitary() {
    const zeroPair = { att: new BigNumber(150), def: new BigNumber(120) };
    const gbgPair = { att: new BigNumber(500), def: new BigNumber(450) };
    const gePair = { att: new BigNumber(200), def: new BigNumber(180) };
    const qiPair = { att: new BigNumber(80), def: new BigNumber(60) };
    return {
      red: { base: zeroPair, gbg: gbgPair, ge: gePair, qi: qiPair },
      blue: { base: zeroPair, gbg: gbgPair, ge: gePair, qi: qiPair },
    };
  }

  it('renders complete city info header card with score and city boosts', () => {
    const stats = {
      coins: { total: new BigNumber(1000000), boostPercent: 120 },
      supplies: { total: new BigNumber(500000), boostPercent: 85 },
      fp: { total: 450, boostPercent: 15, boostable: 400, unboostable: 50 },
      goods: { total: new BigNumber(2000), boostPercent: 20 },
      units: { daily: 12, traz: 12 },
      military: createMockMilitary(),
      special: {
        arcPercent: new BigNumber(90.6),
        chatBonus: new BigNumber(350),
        goodsPerQuest: new BigNumber(28),
      },
    };

    const playerInfo = {
      isOwnCity: true,
      name: 'TitanLord',
      era: 'SpaceAgeTitan',
      score: 125000000,
      guild: 'Starlight Vanguard',
    };

    const html = renderHeaderPanel('header', stats, playerInfo, {
      exactNumbers: true,
    });

    // Player Points & Identity
    assert.ok(html.includes('TitanLord'), 'Includes player name');
    assert.ok(html.includes('Starlight Vanguard'), 'Includes guild');
    assert.ok(html.includes('Space Age Titan'), 'Includes formatted era');
    assert.ok(html.includes('125,000,000'), 'Includes formatted player score');

    // City Boosts
    assert.ok(html.includes('Arc'), 'Includes Arc bonus');
    assert.ok(html.includes('90.6%'), 'Includes Arc percent');
    assert.ok(html.includes('CF'), 'Includes Château Frontenac bonus');
    assert.ok(html.includes('Coins'), 'Includes coins bonus');
    assert.ok(html.includes('120%'), 'Includes coins boost percentage');
    assert.ok(html.includes('Supplies'), 'Includes supplies bonus');
    assert.ok(html.includes('85%'), 'Includes supplies boost percentage');

    // Military Boosts
    assert.ok(html.includes('Attackers'), 'Includes base attackers');
    assert.ok(html.includes('GBG Attackers'), 'Includes GBG attackers');
    assert.ok(html.includes('GE Attackers'), 'Includes GE attackers');
    assert.ok(html.includes('QI Attackers'), 'Includes QI attackers');
  });

  it('renders compact score when exactNumbers is false', () => {
    const stats = {
      coins: { total: new BigNumber(0), boostPercent: 0 },
      supplies: { total: new BigNumber(0), boostPercent: 0 },
      fp: { total: 0, boostPercent: 0 },
      goods: { total: new BigNumber(0), boostPercent: 0 },
      units: { daily: 0, traz: 0 },
      military: createMockMilitary(),
      special: {
        arcPercent: new BigNumber(0),
        chatBonus: new BigNumber(0),
      },
    };

    const playerInfo = {
      isOwnCity: true,
      name: 'PlayerCompact',
      era: 'ModernEra',
      score: 125000000,
    };

    const html = renderHeaderPanel('header', stats, playerInfo, {
      exactNumbers: false,
    });
    assert.ok(html.includes('125.0M'), 'Includes compact formatted score');
  });
});
