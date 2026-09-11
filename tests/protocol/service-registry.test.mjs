import assert from 'node:assert/strict';
import test from 'node:test';
import registryPkg from '../../src/js/msg/registerServices.js';
import { MessageDispatcher } from '../../src/js/protocol/MessageDispatcher.js';

const { registerAllServices } = registryPkg;

test('Service Registry - registers all modern domain services onto MessageDispatcher', () => {
  const dispatcher = new MessageDispatcher();
  registerAllServices(dispatcher);

  const expectedHandlers = [
    'HiddenRewardService.getOverview',
    'CastleSystemService.getOverview',
    'CastleSystemService.getCastleSystemPlayer',
    'BoostService.getAllBoosts',
    'BoostService.getTimerBoost',
    'AllyService.getAssignedAllies',
    'InventoryService.getItems',
    'InventoryService.getGreatBuildings',
    'OutpostService.getAll',
    'OutpostService.startEraOutpost',
    'AutoAidService.getStates',
    'FriendsTavernService.getOtherTavernStates',
    'FriendsTavernService.getSittingPlayersCount',
    'ClanService.getTreasuryLogs',
    'ResourceService.getTreasuryBag',
    'QuestService.getUpdates',
    'QuestService.getQuestPeriods',
    'QuestService.getQuestCategoryTimes',
    'ItemExchangeService.getConfig',
    'TimeService.updateTime',
    'TimeService.getTime',
  ];

  for (const handlerKey of expectedHandlers) {
    assert.equal(
      typeof dispatcher.handlers.get(handlerKey),
      'function',
      `Handler for ${handlerKey} must be registered`,
    );
  }
});

test('Service Registry - dispatches multi-domain batch without errors', async () => {
  const dispatcher = new MessageDispatcher();
  registerAllServices(dispatcher);

  const batch = [
    {
      __class__: 'ServerRequest',
      requestClass: 'TimeService',
      requestMethod: 'updateTime',
      responseData: { time: 1725516000 },
    },
    {
      __class__: 'ServerRequest',
      requestClass: 'HiddenRewardService',
      requestMethod: 'getOverview',
      responseData: [
        {
          hiddenRewardId: 101,
          type: 'incident',
          startTime: 1725510000,
          expireTime: 1725520000,
        },
      ],
    },
    {
      __class__: 'ServerRequest',
      requestClass: 'CastleSystemService',
      requestMethod: 'getCastleSystemPlayer',
      responseData: {
        castleLevel: 8,
        currentPoints: 25000,
      },
    },
  ];

  const result = await dispatcher.dispatchBatch(batch);
  assert.equal(result.total, 3);
  assert.equal(result.succeeded, 3);
  assert.equal(result.failed, 0);
});
