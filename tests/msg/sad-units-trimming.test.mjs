import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  armyUnitManagementService,
  clearArmyUnits,
} from '../../src/js/msg/ArmyUnitManagementService.js';

describe('SAD Unit Name Trimming Suite', () => {
  beforeEach(() => {
    clearArmyUnits();
  });

  it('trims FGX- prefix from Stellar Age Discovery unit names', () => {
    const payload = {
      responseData: [
        {
          unitTypeId: 'StellarAgeDiscovery_heavy',
          unattached: 700,
          attached: 0,
        },
      ],
    };

    const deps = {
      MilitaryDefs: {
        StellarAgeDiscovery_heavy: {
          name: 'FGX-102 Anvil',
          era: 'StellarAgeDiscovery',
        },
      },
      helper: {
        fGVGagesname: () => 'SAD',
        fLevelfromAge: () => 20,
      },
    };

    const result = armyUnitManagementService(payload, deps);
    assert.equal(result.unitsPerEra.length, 1);
    assert.equal(result.unitsPerEra[0].text, 'SAD: Anvil 700');
  });

  it('trims various FGX- numbers case-insensitively', () => {
    const payload = {
      responseData: [
        { unitTypeId: 'sad_1', count: 100 },
        { unitTypeId: 'sad_2', count: 200 },
        { unitTypeId: 'sad_3', count: 300 },
      ],
    };

    const deps = {
      MilitaryDefs: {
        sad_1: { name: 'FGX-101 Skyrider', era: 'StellarAgeDiscovery' },
        sad_2: { name: 'fgx-105 Assassin', era: 'StellarAgeDiscovery' },
        sad_3: { name: 'FGX-104 Hammer', era: 'StellarAgeDiscovery' },
      },
      helper: {
        fGVGagesname: () => 'SAD',
        fLevelfromAge: () => 20,
      },
    };

    const result = armyUnitManagementService(payload, deps);
    const texts = result.unitsPerEra.map((u) => u.text);
    assert.ok(texts.includes('SAD: Skyrider 100'));
    assert.ok(texts.includes('SAD: Assassin 200'));
    assert.ok(texts.includes('SAD: Hammer 300'));
  });

  it('leaves standard non-FGX unit names intact', () => {
    const payload = {
      responseData: [{ unitTypeId: 'fe_heavy', count: 50 }],
    };

    const deps = {
      MilitaryDefs: {
        fe_heavy: { name: 'Hover Tank', era: 'FutureEra' },
      },
      helper: {
        fGVGagesname: () => 'FE',
        fLevelfromAge: () => 14,
      },
    };

    const result = armyUnitManagementService(payload, deps);
    assert.equal(result.unitsPerEra[0].text, 'FE: Hover Tank 50');
  });
});
