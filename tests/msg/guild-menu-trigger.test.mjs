import assert from 'node:assert/strict';
import test from 'node:test';
import treasuryPkg from '../../src/js/msg/TreasuryService.js';
import legacyBridgePkg from '../../src/js/protocol/legacyBridge.js';
import { MessageDispatcher } from '../../src/js/protocol/MessageDispatcher.js';

const { registerLegacyBridge } = legacyBridgePkg;
const { TreasuryService } = treasuryPkg;

test('Guild Menu RPC Ingestion Suite', async (t) => {
  await t.test(
    'ClanService RPCs route to otherPlayerServiceUpdateActions and expand guild panel',
    async () => {
      let routedPayload = null;
      let routedOptions = null;

      const mockOtherPlayerServiceUpdateActions = (payload, options) => {
        routedPayload = payload;
        routedOptions = options;
      };

      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, {
        otherPlayerServiceUpdateActions: mockOtherPlayerServiceUpdateActions,
        gbRegistry: { registerGreatBuilding: () => {} },
      });

      // 1. ClanService.getOverview
      await dispatcher.dispatchBatch([
        {
          __class__: 'ServerRequest',
          requestClass: 'ClanService',
          requestMethod: 'getOverview',
          responseData: {
            members: [
              { player_id: 101, name: 'GuildLeader' },
              { player_id: 102, name: 'GuildMember' },
            ],
          },
        },
      ]);
      assert.ok(routedPayload);
      assert.equal(routedOptions?.autoExpandGuild, true);

      // 2. ClanService.getOwnClanData
      routedPayload = null;
      routedOptions = null;
      await dispatcher.dispatchBatch([
        {
          __class__: 'ServerRequest',
          requestClass: 'ClanService',
          requestMethod: 'getOwnClanData',
          responseData: {
            members: [{ player_id: 101, name: 'GuildLeader' }],
          },
        },
      ]);
      assert.ok(routedPayload);
      assert.equal(routedOptions?.autoExpandGuild, true);

      // 3. ClanService.getMembers
      routedPayload = null;
      routedOptions = null;
      await dispatcher.dispatchBatch([
        {
          __class__: 'ServerRequest',
          requestClass: 'ClanService',
          requestMethod: 'getMembers',
          responseData: [{ player_id: 101, name: 'GuildLeader' }],
        },
      ]);
      assert.ok(routedPayload);
      assert.equal(routedOptions?.autoExpandGuild, true);
    },
  );

  await t.test(
    'ClanService.getTreasuryBag is owned by the modern TreasuryService',
    async () => {
      const service = new TreasuryService();
      const dispatcher = new MessageDispatcher();
      service.register(dispatcher);

      // Dispatch ClanService.getTreasuryBag from captured HAR
      await dispatcher.dispatchBatch([
        {
          __class__: 'ServerRequest',
          requestClass: 'ClanService',
          requestMethod: 'getTreasuryBag',
          responseData: {
            __class__: 'ClanTreasuryBag',
            resources: {
              resources: {
                iron: 500,
                cloth: 300,
              },
            },
          },
        },
      ]);

      assert.equal(service.getReserve('iron').toString(), '500');
      assert.equal(service.getReserve('cloth').toString(), '300');
    },
  );
});
