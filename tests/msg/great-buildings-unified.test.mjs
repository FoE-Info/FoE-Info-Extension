import assert from 'node:assert/strict';
import test from 'node:test';

test('Great Buildings Unified Panel & Registry Suite', async (t) => {
  const gbRegistryPkg =
    await import('../../src/js/state/GreatBuildingRegistry.js');
  const {
    calculateLevelCost,
    registerGreatBuilding,
    registerGreatBuildings,
    getGreatBuilding,
    reset,
  } = gbRegistryPkg.default || gbRegistryPkg;

  const gbDonationPkg = await import('../../src/js/msg/GbDonationService.js');
  const {
    extractRankingParams,
    getSelfContribution,
    syncGbSelected,
    calculateSafeSpots,
  } = gbDonationPkg.default || gbDonationPkg;

  t.beforeEach(() => {
    reset();
  });

  await t.test(
    'registerGreatBuilding caches buildings and retrieves by player and entity id',
    () => {
      const entity = {
        id: 777,
        cityentity_id: 'X_SpaceAgeTitan_Landmark1',
        name: 'Saturn VI Gate',
        player_id: 1001,
        player_name: 'StellarCommander',
        level: 118,
        max_level: 119,
        state: {
          invested_forge_points: 2500,
          forge_points_for_level_up: 10469,
        },
      };

      const registered = registerGreatBuilding(entity, 1001);
      assert.ok(registered);
      assert.equal(registered.level, 118);
      assert.equal(registered.max_level, 119);
      assert.equal(registered.total, 10469);
      assert.equal(registered.current, 2500);

      const byComposite = getGreatBuilding(1001, 777);
      assert.equal(byComposite?.name, 'Saturn VI Gate');

      const byEntity = getGreatBuilding(null, 777);
      assert.equal(byEntity?.name, 'Saturn VI Gate');
    },
  );

  await t.test(
    'calculateLevelCost computes geometric progression for level > 10',
    () => {
      // Mock landmark with level 10 = 600 FP
      const mockMeta = {
        strategy_points_for_upgrade: [
          60, 100, 160, 240, 320, 420, 500, 560, 580, 600,
        ],
      };

      // Level 10 cost
      const cost10 = calculateLevelCost(mockMeta, 10);
      assert.equal(cost10, 600);

      // Level 11 cost: Math.ceil(600 * 1.025^(11-9)) = Math.ceil(600 * 1.025^2) = Math.ceil(630.375) = 631
      const cost11 = calculateLevelCost(mockMeta, 11);
      assert.equal(cost11, 631);

      // Level 12 cost: Math.ceil(600 * 1.025^3) = Math.ceil(646.13) = 647
      const cost12 = calculateLevelCost(mockMeta, 12);
      assert.equal(cost12, 647);
    },
  );

  await t.test(
    'extractRankingParams extracts entityId, playerId, and level from various RPC payloads',
    () => {
      // Array payload [entityId, playerId, level]
      const p1 = extractRankingParams({ requestData: [777, 1001, 119] });
      assert.deepEqual(p1, { entityId: 777, playerId: 1001, level: 119 });

      // In context
      const p2 = extractRankingParams({}, null, {
        requestData: [888, 2002, 80],
      });
      assert.deepEqual(p2, { entityId: 888, playerId: 2002, level: 80 });

      // In postData JSON string
      const p3 = extractRankingParams({}, null, {
        request: {
          postData: JSON.stringify([
            {
              requestClass: 'GreatBuildingsService',
              requestMethod: 'getConstructionRanking',
              requestData: [999, 3003, 100],
            },
          ]),
        },
      });
      assert.deepEqual(p3, { entityId: 999, playerId: 3003, level: 100 });
    },
  );

  await t.test(
    'syncGbSelected updates GBselected without falsely locking level 118/119',
    () => {
      const GBselected = {
        id: 0,
        level: 0,
        max_level: 0,
        current: 0,
        total: 0,
        name: '',
      };

      const gbData = {
        id: 777,
        level: 118,
        max_level: 119,
        current: 2500,
        total: 10469,
        name: 'Stellar Warship',
      };

      syncGbSelected(GBselected, gbData);

      assert.equal(GBselected.level, 118);
      assert.equal(GBselected.max_level, 119);
      assert.equal(GBselected.total, 10469);
      assert.equal(GBselected.current, 2500);

      // Lock condition: max_level > 0 && level >= max_level
      const isLocked =
        GBselected.max_level > 0 && GBselected.level >= GBselected.max_level;
      assert.equal(isLocked, false, 'Level 118/119 must NOT be locked');
    },
  );

  await t.test(
    'getSelfContribution extracts the self investors cumulative forge_points only (not reward rows)',
    () => {
      // Statue of Zeus lvl 155 (total 18761), viewed by owner Overlord Negan:
      // rankings carry the self row (no rank) with cumulative invested FP and
      // reward rows for ranks 1-5 whose forge_points are base rewards, NOT invested.
      const rankings = [
        {
          player: { player_id: 7560963, is_self: true, name: 'Overlord Negan' },
          forge_points: 13176,
        },
        { rank: 1, player: { player_id: 7 }, forge_points: 1470 },
        { rank: 2, player: { player_id: 8 }, forge_points: 735 },
        { rank: 3, player: { player_id: 9 }, forge_points: 245 },
        { rank: 4, player: { player_id: 10 }, forge_points: 60 },
        { rank: 5, player: { player_id: 11 }, forge_points: 10 },
      ];

      const selfInvested = getSelfContribution(rankings, 7560963);
      assert.equal(selfInvested, 13176, 'must use self row forge_points');

      // Lock math must match verified reopen numbers:
      const total = 18761;
      const remaining = total - selfInvested;
      assert.equal(remaining, 5585);
      assert.equal(Math.ceil(remaining / 2), 2793);

      // First donation: self row cumulative 6839 -> remaining 11922 -> Lock 5961
      const afterFirstDonation = [
        {
          player: { player_id: 7560963, is_self: true },
          forge_points: 6839,
        },
      ];
      const firstInvested = getSelfContribution(afterFirstDonation, 7560963);
      assert.equal(Math.ceil((total - firstInvested) / 2), 5961);

      // Foreign GB viewed by a donor: self row is the viewers own contribution,
      // NOT the buildings current.
      const foreignRankings = [
        { rank: 1, player: { player_id: 42 }, forge_points: 9000 },
        {
          rank: 5,
          player: { player_id: 7560963, is_self: true },
          forge_points: 500,
        },
      ];
      const viewerSelf = getSelfContribution(foreignRankings, 7560963);
      assert.equal(viewerSelf, 500);
    },
  );

  await t.test(
    'calculateSafeSpots supports both own GB (deposit needed) and other player GB (investor lock)',
    () => {
      const gbData = {
        total: 1000,
        current: 200,
      };

      const rankings = [
        { rank: 1, forge_points: 100, reward: { strategy_point_amount: 200 } },
        { rank: 2, forge_points: 50, reward: { strategy_point_amount: 100 } },
      ];

      // 1.9x calculation with ROUND_CEIL
      const spots = calculateSafeSpots(gbData, rankings, 90, 190);
      assert.equal(spots.length >= 2, true);

      // Spot 1: base reward 200 * 1.9 = 380 FP
      assert.equal(spots[0].rewardFP, 380);
      assert.equal(typeof spots[0].lockFP, 'number');
      assert.equal(typeof spots[0].isSafe, 'boolean');

      // Spot 2: base reward 100 * 1.9 = 190 FP
      assert.equal(spots[1].rewardFP, 190);
      assert.equal(typeof spots[1].lockFP, 'number');
      assert.equal(typeof spots[1].isSafe, 'boolean');
    },
  );

  await t.test(
    'getConstruction reconstructs GBselected from GreatBuildingRegistry cache using request parameters',
    async () => {
      // 1. First, an entity is cached from getOtherPlayerCityMapEntity
      const rawEntity = {
        id: 999,
        player_id: 1001,
        cityentity_id: 'X_FutureEra_Landmark1',
        type: 'greatbuilding',
        level: 80,
        max_level: 85,
        connected: true,
        state: {
          invested_forge_points: 1500,
          forge_points_for_level_up: 5000,
        },
      };
      registerGreatBuilding(rawEntity, 1001);

      // Verify cached
      const cached = getGreatBuilding(1001, 999);
      assert.ok(cached, 'Building should be cached in registry');
      assert.equal(cached.level, 80);
      assert.equal(cached.total, 5000);
      assert.equal(cached.current, 1500);
      assert.equal(cached.name, 'The Arc');

      // 2. Now simulate legacyBridge routing with MessageDispatcher
      const bridgePkg = await import('../../src/js/protocol/legacyBridge.js');
      const { registerLegacyBridge } = bridgePkg.default || bridgePkg;
      const dispatcherPkg =
        await import('../../src/js/protocol/MessageDispatcher.js');
      const { MessageDispatcher } = dispatcherPkg.default || dispatcherPkg;
      const dispatcher = new MessageDispatcher();

      const mockGBselected = {
        id: 0,
        player: 0,
        name: '',
        level: 0,
        max_level: 0,
        total: 0,
        current: 0,
        connected: false,
      };

      let getConstructionCalled = false;
      const mockGetConstruction = (msg, data, context) => {
        getConstructionCalled = true;
        const params = extractRankingParams(msg, data, context);
        const cached = getGreatBuilding(params.playerId, params.entityId);
        if (cached) {
          syncGbSelected(mockGBselected, cached);
        }
      };

      registerLegacyBridge(dispatcher, {
        GBselected: mockGBselected,
        GreatBuildingRegistry: gbRegistryPkg.default || gbRegistryPkg,
        getConstruction: mockGetConstruction,
      });

      // 3. Dispatch OtherPlayerService.getOtherPlayerCityMapEntity
      await dispatcher.dispatchSingle({
        requestClass: 'OtherPlayerService',
        requestMethod: 'getOtherPlayerCityMapEntity',
        responseData: rawEntity,
      });

      assert.equal(mockGBselected.id, 999);
      assert.equal(mockGBselected.player, 1001);
      assert.equal(mockGBselected.name, 'The Arc');
      assert.equal(mockGBselected.level, 80);
      assert.equal(mockGBselected.total, 5000);
      assert.equal(mockGBselected.current, 1500);

      // 4. Dispatch GreatBuildingsService.getConstruction with requestData
      await dispatcher.dispatchSingle({
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getConstruction',
        requestData: [999, 1001],
        responseData: {
          rankings: [
            {
              rank: 1,
              player: { player_id: 2002, name: 'TopDonor' },
              forge_points: 1900,
              reward: { strategy_point_amount: 1000 },
            },
          ],
        },
      });

      assert.equal(getConstructionCalled, true);
      assert.equal(mockGBselected.id, 999);
      assert.equal(mockGBselected.player, 1001);
      assert.equal(mockGBselected.name, 'The Arc');
      assert.equal(mockGBselected.level, 80);
      assert.equal(mockGBselected.total, 5000);
      assert.equal(mockGBselected.current, 1500);
    },
  );

  await t.test(
    'reopening own GB after visiting another player updates GBselected and does not stay stuck on foreign GB',
    async () => {
      const bridgePkg = await import('../../src/js/protocol/legacyBridge.js');
      const { registerLegacyBridge } = bridgePkg.default || bridgePkg;
      const dispatcherPkg =
        await import('../../src/js/protocol/MessageDispatcher.js');
      const { MessageDispatcher } = dispatcherPkg.default || dispatcherPkg;
      const dispatcher = new MessageDispatcher();

      const mockGBselected = {
        id: 0,
        player: 0,
        player_name: '',
        name: '',
        level: 0,
        max_level: 0,
        total: 0,
        current: 0,
        connected: false,
      };

      let currentPlayerId = 0;
      let currentPlayerName = '';
      const mockSetPlayerName = (name, id) => {
        currentPlayerName = name;
        currentPlayerId = id;
        mockGBselected.player_name = name;
      };

      const mockMyInfo = {
        id: 7560963,
        name: 'Overlord Negan',
        player_name: 'Overlord Negan',
      };

      registerLegacyBridge(dispatcher, {
        GBselected: mockGBselected,
        GreatBuildingRegistry: gbRegistryPkg.default || gbRegistryPkg,
        setPlayerName: mockSetPlayerName,
        getPlayerName: (id) =>
          id === 7560963 ? 'Overlord Negan'
          : id === 777777 ? 'Bomberman'
          : '',
        MyInfo: mockMyInfo,
        startupService: () => {},
      });

      // 1. Startup arrives with own city entities (Château Frontenac, id: 104, level: 180)
      await dispatcher.dispatchSingle({
        requestClass: 'StartupService',
        requestMethod: 'getData',
        responseData: {
          user_data: {
            player_id: 7560963,
            user_name: 'Overlord Negan',
          },
          city_map: {
            entities: [
              {
                id: 104,
                cityentity_id: 'X_ProgressiveEra_Landmark2',
                type: 'greatbuilding',
                level: 180,
                max_level: 181,
                connected: 1,
                state: {
                  invested_forge_points: 0,
                  forge_points_for_level_up: 25000,
                },
              },
            ],
          },
        },
      });

      // 2. Player visits Bomberman (777777)'s Horizontriss-Siphon (54321)
      await dispatcher.dispatchSingle({
        requestClass: 'OtherPlayerService',
        requestMethod: 'getOtherPlayerCityMapEntity',
        responseData: {
          id: 54321,
          player_id: 777777,
          player_name: 'Bomberman',
          cityentity_id: 'X_FutureEra_Landmark1',
          type: 'greatbuilding',
          level: 31,
          max_level: 34,
          connected: 1,
          state: {
            invested_forge_points: 500,
            forge_points_for_level_up: 5000,
          },
        },
      });

      assert.equal(mockGBselected.id, 54321);
      assert.equal(mockGBselected.player, 777777);
      assert.equal(currentPlayerName, 'Bomberman');

      // 3. Player reopens their own Château Frontenac (id: 104)
      // Game client sends getConstructionRanking with requestData: [ 104 ]
      await dispatcher.dispatchSingle({
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getConstructionRanking',
        requestData: [104],
        responseData: [
          {
            rank: 1,
            player: { player_id: 2002, name: 'Donor1' },
            forge_points: 5750,
          },
        ],
      });

      // VERIFY: mockGBselected must be Château Frontenac, NOT Horizontriss-Siphon!
      assert.equal(mockGBselected.id, 104);
      assert.equal(mockGBselected.name, 'Château Frontenac');
      assert.equal(mockGBselected.level, 180);
      assert.equal(mockGBselected.player, 7560963);
      assert.equal(currentPlayerName, 'Overlord Negan');
    },
  );
});
