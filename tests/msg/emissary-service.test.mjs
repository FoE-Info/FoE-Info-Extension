import assert from 'node:assert/strict';
import test from 'node:test';
import { City } from '../../src/js/state/CityState.js';

test('EmissaryService - extracts strategy points and units from emissary bonuses', async () => {
  const emissaryPkg = await import('../../src/js/msg/EmissaryService.js');
  const { emissaryService } = emissaryPkg.default || emissaryPkg;

  City.baseUnits = 50;

  const mockPayload = {
    responseData: [
      {
        id: 'emissary_1',
        bonus: {
          type: 'strategy_points',
          subType: 'strategy_points',
          amount: 2,
        },
      },
      {
        id: 'emissary_2',
        bonus: {
          type: 'unit',
          subType: 'random_unit',
          amount: 4,
        },
      },
      {
        id: 'emissary_3',
        bonus: null,
      },
    ],
  };

  const result = emissaryService(mockPayload);

  assert.equal(result.emissaryFp, 2);
  assert.equal(result.emissaryUnits, 4);
  assert.equal(result.totalUnits, 54);

  assert.equal(City.emissaryFp, 2);
  assert.equal(City.emissaryUnits, 4);
  assert.equal(City.TrazUnits, 54);
});

test('EmissaryService - handles empty or non-array payloads safely', async () => {
  const emissaryPkg = await import('../../src/js/msg/EmissaryService.js');
  const { emissaryService } = emissaryPkg.default || emissaryPkg;

  City.baseUnits = 20;

  const resultNull = emissaryService(null);
  assert.equal(resultNull.emissaryFp, 0);
  assert.equal(resultNull.emissaryUnits, 0);
  assert.equal(resultNull.totalUnits, 20);

  const resultEmpty = emissaryService({ responseData: {} });
  assert.equal(resultEmpty.emissaryFp, 0);
  assert.equal(resultEmpty.emissaryUnits, 0);
});

test('EmissaryService - registers RPC routes with dispatcher', async () => {
  const emissaryPkg = await import('../../src/js/msg/EmissaryService.js');
  const { EmissaryService } = emissaryPkg.default || emissaryPkg;

  const service = new EmissaryService();
  const registered = [];
  const mockDispatcher = {
    register: (serviceName, method, handler) => {
      registered.push({ serviceName, method, handler });
    },
  };

  service.register(mockDispatcher);

  assert.equal(registered.length, 2);
  assert.equal(registered[0].serviceName, 'EmissaryService');
  assert.equal(registered[0].method, 'getOverview');
  assert.equal(registered[1].serviceName, 'EmissaryService');
  assert.equal(registered[1].method, 'getAssigned');
});
