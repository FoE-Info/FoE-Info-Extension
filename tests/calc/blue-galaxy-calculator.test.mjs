import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeEconomicScore,
  createGalaxyCandidate,
  extractEntityFp,
  filterAndSortGalaxyCandidates,
  getTopReadyGalaxyBuildings,
  updateCandidateState,
} from '../../src/js/calc/BlueGalaxyCalculator.js';

describe('BlueGalaxyCalculator Suite', () => {
  it('ignores Great Buildings for Blue Galaxy doubling', () => {
    const gbEntity = {
      id: 101,
      cityentity_id: 'X_OceanicFuture_Landmark3',
      type: 'greatbuilding',
      state: {
        __class__: 'ProductionFinishedState',
        current_product: {
          product: { resources: { strategy_points: 50 } },
        },
      },
    };
    assert.equal(extractEntityFp(gbEntity), 0);
    assert.equal(createGalaxyCandidate(gbEntity), null);
  });

  it('extracts FP from current_product in ProducingState', () => {
    const building = {
      id: 201,
      cityentity_id: 'W_MultiAge_CUP22A11',
      type: 'generic_building',
      state: {
        __class__: 'ProducingState',
        next_state_transition_at: 1700000500,
        current_product: {
          product: { resources: { strategy_points: 12 } },
        },
      },
    };
    assert.equal(extractEntityFp(building), 12);
    const candidate = createGalaxyCandidate(building);
    assert.deepEqual(candidate, {
      id: 201,
      cityentity_id: 'W_MultiAge_CUP22A11',
      name: 'W_MultiAge_CUP22A11',
      fp: 12,
      state: 'ProducingState',
      transition: 1700000500,
    });
  });

  it('extracts FP from productionOption products array', () => {
    const building = {
      id: 202,
      cityentity_id: 'W_MultiAge_GR25D1',
      type: 'generic_building',
      state: {
        __class__: 'ProducingState',
        next_state_transition_at: 1700000600,
        productionOption: {
          products: [
            {
              playerResources: {
                resources: { strategy_points: 25 },
              },
            },
          ],
        },
      },
    };
    assert.equal(extractEntityFp(building), 25);
    const candidate = createGalaxyCandidate(building);
    assert.equal(candidate.fp, 25);
  });

  it('extracts FP from mock metadataStore when building is in ProductionFinishedState without current_product', () => {
    const mockStore = {
      getCityEntity(id) {
        if (id === 'W_MultiAge_WILD24A15') {
          return {
            components: {
              AllAge: {
                production: {
                  options: [
                    {
                      products: [
                        {
                          playerResources: {
                            resources: { strategy_points: 30 },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          };
        }
        return null;
      },
    };

    const building = {
      id: 203,
      cityentity_id: 'W_MultiAge_WILD24A15',
      type: 'generic_building',
      state: {
        __class__: 'ProductionFinishedState',
        next_state_transition_at: 2147483647,
      },
    };

    const fp = extractEntityFp(building, mockStore);
    assert.equal(fp, 30);
    const candidate = createGalaxyCandidate(building, mockStore);
    assert.equal(candidate.fp, 30);
    assert.equal(candidate.state, 'ProductionFinishedState');
  });

  it('sorts candidates in descending order of FP', () => {
    const candidates = [
      { id: 1, fp: 10, name: 'B1' },
      { id: 2, fp: 35, name: 'B2' },
      { id: 3, fp: 20, name: 'B3' },
    ];
    const sorted = filterAndSortGalaxyCandidates(candidates);
    assert.deepEqual(
      sorted.map((c) => c.fp),
      [35, 20, 10],
    );
  });

  it('filters for ready buildings up to the number of available charges', () => {
    const currentTime = 1700000000;
    const candidates = [
      { id: 1, fp: 50, state: 'ProducingState', transition: currentTime + 500 }, // Not ready
      {
        id: 2,
        fp: 40,
        state: 'ProductionFinishedState',
        transition: 2147483647,
      }, // Ready
      { id: 3, fp: 30, state: 'ProducingState', transition: currentTime - 10 }, // Ready
      {
        id: 4,
        fp: 20,
        state: 'ProductionFinishedState',
        transition: 2147483647,
      }, // Ready
      {
        id: 5,
        fp: 10,
        state: 'ProductionFinishedState',
        transition: 2147483647,
      }, // Ready
    ];

    // With 2 charges, should pick top 2 ready buildings (id 2 with 40FP and id 3 with 30FP)
    const top = getTopReadyGalaxyBuildings(candidates, 2, currentTime);
    assert.equal(top.length, 2);
    assert.equal(top[0].id, 2);
    assert.equal(top[0].fp, 40);
    assert.equal(top[1].id, 3);
    assert.equal(top[1].fp, 30);
  });

  it('updates candidate state and transition time on building pickup', () => {
    const candidates = [
      {
        id: 10,
        fp: 25,
        state: 'ProductionFinishedState',
        transition: 2147483647,
      },
      {
        id: 20,
        fp: 15,
        state: 'ProductionFinishedState',
        transition: 2147483647,
      },
    ];

    const updatedEntity = {
      id: 10,
      state: {
        __class__: 'ProducingState',
        next_state_transition_at: 1700086400,
      },
    };

    updateCandidateState(candidates, updatedEntity);
    assert.equal(candidates[0].state, 'ProducingState');
    assert.equal(candidates[0].transition, 1700086400);
  });

  it('extracts FP using metadataStore.getEntity fallback', () => {
    const mockStore = {
      getEntity(id) {
        if (id === 'W_MultiAge_WILD24A15') {
          return {
            components: {
              AllAge: {
                production: {
                  options: [
                    {
                      products: [
                        {
                          playerResources: {
                            resources: { strategy_points: 42 },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          };
        }
        return null;
      },
    };

    const building = {
      id: 204,
      cityentity_id: 'W_MultiAge_WILD24A15',
      type: 'generic_building',
      state: {
        __class__: 'ProductionFinishedState',
        next_state_transition_at: 2147483647,
      },
    };

    const fp = extractEntityFp(building, mockStore);
    assert.equal(fp, 42);
  });

  describe('economic ranking', () => {
    const weights = {
      fpWeight: 1,
      goodsWeight: 0.2,
      olderGoodsWeight: 0.1,
    };

    it('ranks a 50-goods building above a 2 FP building when weights active', () => {
      const candidates = [
        { id: 1, fp: 2, goods: 0, olderGoods: 0, name: 'Small FP' },
        { id: 2, fp: 0, goods: 50, olderGoods: 0, name: 'Goods' },
      ];
      const sorted = filterAndSortGalaxyCandidates(candidates, weights);
      assert.equal(sorted[0].id, 2);
      assert.equal(computeEconomicScore(sorted[0], weights).toString(), '10');
    });

    it('keeps FP ordering as default when no weights provided', () => {
      const candidates = [
        { id: 1, fp: 2, goods: 50, name: 'Goods' },
        { id: 2, fp: 10, goods: 0, name: 'FP' },
      ];
      const sorted = filterAndSortGalaxyCandidates(candidates);
      assert.equal(sorted[0].id, 2);
    });

    it('applies older goods weight when computing score', () => {
      const score = computeEconomicScore(
        { fp: 1, goods: 10, olderGoods: 20 },
        weights,
      );
      assert.equal(score.toString(), '5');
    });

    it('honours weights in getTopReadyGalaxyBuildings ranking', () => {
      const currentEpoch = 1700000000;
      const candidates = [
        {
          id: 1,
          fp: 2,
          goods: 0,
          state: 'ProductionFinishedState',
          transition: 2147483647,
        },
        {
          id: 2,
          fp: 0,
          goods: 50,
          state: 'ProductionFinishedState',
          transition: 2147483647,
        },
      ];
      const top = getTopReadyGalaxyBuildings(
        candidates,
        1,
        currentEpoch,
        false,
        weights,
      );
      assert.equal(top.length, 1);
      assert.equal(top[0].id, 2);
    });
  });
});
