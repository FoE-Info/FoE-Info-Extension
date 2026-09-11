import assert from 'node:assert/strict';
import test from 'node:test';
import legacyBridgePkg from '../../src/js/protocol/legacyBridge.js';
import { MessageDispatcher } from '../../src/js/protocol/MessageDispatcher.js';

const { registerLegacyBridge } = legacyBridgePkg;

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
    'ClanService.getTreasuryBag routes to getTreasuryBag handler in legacyBridge',
    async () => {
      let treasuryBagCalled = false;
      let bagPayload = null;

      const dispatcher = new MessageDispatcher();
      registerLegacyBridge(dispatcher, {
        getTreasuryBag: (msg) => {
          treasuryBagCalled = true;
          bagPayload = msg.responseData;
        },
      });

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

      assert.equal(treasuryBagCalled, true);
      assert.deepEqual(bagPayload.resources.resources, {
        iron: 500,
        cloth: 300,
      });
    },
  );
});
