import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import allyPkg from '../../src/js/msg/AllyService.js';
import armyPkg from '../../src/js/msg/ArmyUnitManagementService.js';
import autoAidPkg from '../../src/js/msg/AutoAidService.js';
import boostPkg from '../../src/js/msg/BoostService.js';
import castlePkg from '../../src/js/msg/CastleSystemService.js';
import tavernPkg from '../../src/js/msg/FriendsTavernService.js';
import hiddenPkg from '../../src/js/msg/HiddenRewardService.js';
import inventoryPkg from '../../src/js/msg/InventoryService.js';
import exchangePkg from '../../src/js/msg/ItemExchangeService.js';
import metadataPkg from '../../src/js/msg/MetadataService.js';
import outpostPkg from '../../src/js/msg/OutpostService.js';
import questPkg from '../../src/js/msg/QuestService.js';
import registryPkg from '../../src/js/msg/registerServices.js';
import resourcePkg from '../../src/js/msg/ResourceService.js';
import timePkg from '../../src/js/msg/TimeService.js';
import treasuryPkg from '../../src/js/msg/TreasuryService.js';
import { registerLegacyBridge } from '../../src/js/protocol/legacyBridge.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';
import storePkg from '../../src/js/state/MetadataStore.js';

const { MessageDispatcher, messageDispatcher } = dispatcherPkg;
const { metadataStore } = storePkg;
const { armyUnitManagementService, clearArmyUnits } = armyPkg;
const { HiddenRewardService, hiddenRewardService } = hiddenPkg;
const { CastleSystemService, castleSystemService } = castlePkg;
const { BoostService, boostService } = boostPkg;
const { AllyService, allyService } = allyPkg;
const { InventoryService, inventoryService } = inventoryPkg;
const { OutpostService, outpostService } = outpostPkg;
const { AutoAidService, autoAidService } = autoAidPkg;
const { FriendsTavernService, friendsTavernService } = tavernPkg;
const { TreasuryService, treasuryService } = treasuryPkg;
const { QuestService, questService } = questPkg;
const { ItemExchangeService, itemExchangeService } = exchangePkg;
const { TimeService, timeService } = timePkg;

function loadFixture(filename) {
  const filePath = new URL(
    `../../tests/fixtures/rpc/${filename}`,
    import.meta.url,
  );
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('Domain Services Protocol & Registration Suite', async (t) => {
  // Test 1: Global singletons registered by the central registry
  await t.test(
    'Singletons are instantiated and registered on messageDispatcher',
    async () => {
      assert.ok(hiddenRewardService instanceof HiddenRewardService);
      assert.ok(castleSystemService instanceof CastleSystemService);
      assert.ok(boostService instanceof BoostService);
      assert.ok(allyService instanceof AllyService);
      assert.ok(inventoryService instanceof InventoryService);
      assert.ok(outpostService instanceof OutpostService);
      assert.ok(autoAidService instanceof AutoAidService);
      assert.ok(friendsTavernService instanceof FriendsTavernService);
      assert.ok(treasuryService instanceof TreasuryService);
      assert.ok(questService instanceof QuestService);
      assert.ok(itemExchangeService instanceof ItemExchangeService);
      assert.ok(timeService instanceof TimeService);

      // Test routing via default messageDispatcher singleton across services
      registryPkg.registerAllServices(messageDispatcher);
      const hiddenFixture = loadFixture('HiddenRewardService.getOverview.json');
      const timeFixture = loadFixture('TimeService.updateTime.json');
      const batchRes = await messageDispatcher.dispatchBatch([
        {
          __class__: 'ServerRequest',
          requestClass: 'HiddenRewardService',
          requestMethod: 'getOverview',
          responseData: hiddenFixture,
        },
        {
          __class__: 'ServerRequest',
          requestClass: 'TimeService',
          requestMethod: 'updateTime',
          responseData: timeFixture,
        },
      ]);
      assert.equal(batchRes.succeeded, 2);
      assert.deepEqual(
        batchRes.results.map(({ result }) => result.success),
        [true, true],
      );
    },
  );

  // Test 2: ResourceService (Player Resource Bag & Goods Inventory)
  await t.test(
    'ResourceService: parses playerResourceBag and extracts FP and goods',
    async () => {
      const { getPlayerResourceBag, getPlayerResources } = resourcePkg;
      const fixture = loadFixture('ResourceService.getPlayerResourceBag.json');

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'ResourceService',
        requestMethod: 'getPlayerResourceBag',
        responseData: fixture,
      };

      const res = getPlayerResourceBag(msg);
      assert.ok(res);
      assert.equal(res.strategy_points, 37732);
      assert.equal(res.advanced_dna_data, 49993);
      assert.equal(res.asteroid_ice, 27237);
      assert.equal(res.mars_ore, 23241);
      assert.equal(res.promethium, 70576);
      assert.equal(res.orichalcum, 67845);
      assert.equal(res.money, 52493792449);
      assert.equal(res.supplies, 22037079714);

      // Assert Resources export and availableFP updated
      assert.equal(resourcePkg.Resources.strategy_points, 37732);
      assert.equal(resourcePkg.availableFP, 37732);

      // Test direct payload format
      const directRes = getPlayerResources(fixture);
      assert.equal(directRes.strategy_points, 37732);
      assert.equal(directRes.mars_ore, 23241);

      // Dispatcher integration via legacy bridge and ResourceService.register
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, { getPlayerResources });
      if (resourcePkg.register) resourcePkg.register(dispatcher);
      const dispatchRes = await dispatcher.dispatchBatch([
        msg,
        {
          __class__: 'ServerRequest',
          requestClass: 'TradeService',
          requestMethod: 'getTradeOffers',
          responseData: [],
        },
        {
          __class__: 'ServerRequest',
          requestClass: 'InventoryService',
          requestMethod: 'getItems',
          responseData: [],
        },
      ]);
      assert.equal(dispatchRes.succeeded, 3);
    },
  );

  // Test 3: ArmyUnitManagementService (Unit Counts & Rogue Calculations)
  await t.test(
    'ArmyUnitManagementService: parses armyInfo, calculates rogues and unit breakdown',
    async () => {
      clearArmyUnits();
      const fixture = {
        counts: [
          { unitTypeId: 'rogue', unattached: 50, attached: 10 },
          { unitTypeId: 'champion', unattached: 20, attached: 5 },
        ],
      };

      const msg = {
        __class__: 'ServerRequest',
        requestClass: 'ArmyUnitManagementService',
        requestMethod: 'getArmyInfo',
        responseData: fixture,
      };

      const res = armyUnitManagementService(msg);
      assert.ok(res);
      assert.equal(res.success, true);
      assert.equal(res.rogues, 60);
      assert.equal(res.allUnits, 25);
      assert.equal(res.totalUnits, 85);
      assert.equal(res.armyUnits['rogue'], 60);
      assert.equal(res.armyUnits['champion'], 25);

      // Direct array payload format
      const directRes = armyUnitManagementService({
        responseData: fixture.counts,
      });
      assert.ok(directRes);
      assert.equal(directRes.rogues, 60);
      assert.equal(directRes.allUnits, 25);

      // Dispatcher integration via legacy bridge
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, { armyUnitManagementService });

      const dispatchInfoRes = await dispatcher.dispatchBatch([msg]);
      assert.equal(dispatchInfoRes.succeeded, 1);
      assert.equal(dispatchInfoRes.results[0].result.rogues, 60);

      const dispatchOverviewRes = await dispatcher.dispatchBatch([
        {
          __class__: 'ServerRequest',
          requestClass: 'ArmyUnitManagementService',
          requestMethod: 'getArmyOverview',
          responseData: fixture,
        },
      ]);
      assert.equal(dispatchOverviewRes.succeeded, 1);
      assert.equal(dispatchOverviewRes.results[0].result.rogues, 60);

      // Multi-era and Stellar Age Discovery (SAD) unit resolution
      metadataStore.registerUnits([
        {
          unitTypeId: 'StellarAgeDiscovery_heavy_melee',
          name: 'FGX-102 Anvil',
          era: 'StellarAgeDiscovery',
        },
        {
          unitTypeId: 'galactic_juggernaut',
          name: 'Galactic Juggernaut',
          era: 'SpaceAgeSpaceHub',
        },
        { unitTypeId: 'rifleman', name: 'Rifleman', era: 'IndustrialAge' },
      ]);

      const sadFixture = {
        counts: [
          { unitTypeId: 'StellarAgeDiscovery_heavy_melee', count: 500 },
          { unitTypeId: 'galactic_juggernaut', count: 141799 },
          { unitTypeId: 'rifleman', count: 674 },
        ],
      };
      const sadRes = armyUnitManagementService({
        responseData: sadFixture,
      });
      assert.ok(sadRes);
      assert.equal(sadRes.allUnits, 500 + 141799 + 674);
      assert.ok(
        sadRes.unitsPerEra.some((u) => u.text.startsWith('SAD: Anvil 500')),
        'Expected SAD unit Anvil with SAD prefix',
      );
      assert.ok(
        sadRes.unitsPerEra.some((u) =>
          u.text.startsWith('SASH: Galactic Juggernaut 141799'),
        ),
        'Expected SASH unit Galactic Juggernaut with SASH prefix',
      );
      assert.ok(
        sadRes.unitsPerEra.some((u) => u.text.startsWith('InA: Rifleman 674')),
        'Expected InA unit Rifleman with InA prefix',
      );
    },
  );

  // Test 4: Shared RPC keys are owned by modern services, not the bridge
  await t.test(
    'legacyBridge: defers BoostService.getAllBoosts to the modern service',
    async () => {
      const dispatcher = new MessageDispatcher();
      let captured = null;
      registerLegacyBridge(dispatcher, {
        boostServiceAllBoosts: (msg) => {
          captured = msg;
        },
      });

      const res = await dispatcher.dispatchSingle({
        __class__: 'ServerRequest',
        requestClass: 'BoostService',
        requestMethod: 'getAllBoosts',
        responseData: [],
      });

      assert.equal(captured, null);
      assert.deepEqual(res, {
        unhandled: true,
        requestClass: 'BoostService',
        requestMethod: 'getAllBoosts',
      });
    },
  );

  // Test 5: MetadataService: ResearchTechnology & AllyMetadata route to store without throwing
  await t.test(
    'MetadataService: ResearchTechnology & AllyMetadata route to store without throwing',
    async () => {
      metadataStore.reset();
      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, {});
      const processEntry = metadataPkg.processMetadataEntry;

      processEntry({
        __class__: 'ResearchTechnology',
        id: 'tech_arc_extended',
        name: 'Extended Tests of the Arc',
        era: 'ProgressiveEra',
      });
      processEntry({
        __class__: 'AllyMetadata',
        id: 'ally_greek_warrior',
        name: 'Greek Warrior',
        era: 'IronAge',
      });

      assert.equal(metadataStore.technologies.size, 1);
      assert.equal(
        metadataStore.technologies.get('tech_arc_extended').name,
        'Extended Tests of the Arc',
      );
      assert.equal(metadataStore.allies.size, 1);
      assert.equal(
        metadataStore.allies.get('ally_greek_warrior').name,
        'Greek Warrior',
      );
    },
  );

  // Test 6: ResourceService: singular getResourceDefinition merges without wiping catalogue
  await t.test(
    'ResourceService: singular getResourceDefinition merges without wiping catalogue',
    async () => {
      resourcePkg.getResourceDefinitions({
        responseData: [
          { id: 'strategy_points', name: 'Forge Points', era: 'NoAge' },
          { id: 'goods_0', name: 'Current Era Goods', era: 'ContemporaryEra' },
        ],
      });
      const before = resourcePkg.ResourceDefs.length;

      resourcePkg.getResourceDefinition({
        responseData: { id: 'guild_power', name: 'Guild Power', era: 'NoAge' },
      });
      assert.equal(resourcePkg.ResourceDefs.length, before + 1);
      assert.equal(resourcePkg.ResourceNames.guild_power, 'Guild Power');

      resourcePkg.getResourceDefinition({
        responseData: {
          id: 'strategy_points',
          name: 'Forge Points (updated)',
          era: 'NoAge',
        },
      });
      assert.equal(
        resourcePkg.ResourceDefs.length,
        before + 1,
        'updated entry must not duplicate',
      );
      assert.equal(
        resourcePkg.ResourceNames.strategy_points,
        'Forge Points (updated)',
      );
    },
  );
});
