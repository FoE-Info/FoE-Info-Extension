import assert from 'node:assert/strict';
import test from 'node:test';
import {
  gbDonationService,
  GbDonationService,
} from '../../src/js/msg/GbDonationService.js';
import {
  contributeForgePoints,
  getAvailablePackageForgePoints,
  getConstruction,
  getConstructionRanking,
  getContributions,
  greatBuildingsService,
  handleNewReward,
  register,
} from '../../src/js/msg/GreatBuildingsService.js';
import { registerAllServices } from '../../src/js/msg/registerServices.js';
import dispatcherPkg from '../../src/js/protocol/MessageDispatcher.js';

const { MessageDispatcher } = dispatcherPkg;

test('GreatBuildingsService Registration & Routing Suite', async (t) => {
  await t.test('exposes module singleton instance and registration API', () => {
    assert.ok(greatBuildingsService);
    assert.equal(typeof greatBuildingsService.register, 'function');
    assert.equal(typeof register, 'function');
    assert.equal(typeof getConstruction, 'function');
    assert.equal(typeof contributeForgePoints, 'function');
    assert.equal(typeof getConstructionRanking, 'function');
    assert.equal(typeof getContributions, 'function');
    assert.equal(typeof getAvailablePackageForgePoints, 'function');
    assert.equal(typeof handleNewReward, 'function');
  });

  await t.test(
    'register wires all 5 GreatBuildingsService routes and BlueprintService.newReward',
    () => {
      const registered = [];
      const dispatcher = {
        register(requestClass, method, handler) {
          registered.push([requestClass, method, handler]);
          return dispatcher;
        },
      };

      const result = greatBuildingsService.register(dispatcher);
      assert.ok(result);

      assert.deepEqual(
        registered.map(([cls, method]) => [cls, method]),
        [
          ['GreatBuildingsService', 'getConstruction'],
          ['GreatBuildingsService', 'contributeForgePoints'],
          ['GreatBuildingsService', 'getConstructionRanking'],
          ['GreatBuildingsService', 'getContributions'],
          ['GreatBuildingsService', 'getAvailablePackageForgePoints'],
          ['BlueprintService', 'newReward'],
        ],
      );
    },
  );

  await t.test(
    'dispatches through MessageDispatcher with custom options',
    async () => {
      const dispatcher = new MessageDispatcher();
      let capturedConstruction = null;
      let capturedRanking = null;
      let capturedContributions = null;
      let capturedPackageFp = null;
      let capturedReward = null;

      greatBuildingsService.register(dispatcher, {
        getConstruction: (msg) => {
          capturedConstruction = msg;
          return { ok: true };
        },
        getConstructionRanking: (msg) => {
          capturedRanking = msg;
          return { ok: true };
        },
        getContributions: (msg) => {
          capturedContributions = msg;
          return { ok: true };
        },
        getAvailablePackageForgePoints: (msg) => {
          capturedPackageFp = msg;
          return { ok: true };
        },
        handleNewReward: (msg) => {
          capturedReward = msg;
          return { ok: true };
        },
      });

      await dispatcher.dispatchSingle({
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getConstruction',
        responseData: { id: 1 },
      });
      assert.notEqual(capturedConstruction, null);

      await dispatcher.dispatchSingle({
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getConstructionRanking',
        responseData: { id: 2 },
      });
      assert.notEqual(capturedRanking, null);

      await dispatcher.dispatchSingle({
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getContributions',
        responseData: [{ id: 3 }],
      });
      assert.notEqual(capturedContributions, null);

      await dispatcher.dispatchSingle({
        requestClass: 'GreatBuildingsService',
        requestMethod: 'getAvailablePackageForgePoints',
        responseData: [150],
      });
      assert.notEqual(capturedPackageFp, null);

      await dispatcher.dispatchSingle({
        requestClass: 'BlueprintService',
        requestMethod: 'newReward',
        responseData: { name: 'Observatory', amount: 1 },
      });
      assert.notEqual(capturedReward, null);
    },
  );

  await t.test(
    'registerAllServices wires GreatBuildingsService and BlueprintService',
    () => {
      const routes = new Set();
      const dispatcher = {
        register(requestClass, method) {
          routes.add(`${requestClass}.${method}`);
          return dispatcher;
        },
      };

      registerAllServices(dispatcher);

      assert.ok(routes.has('GreatBuildingsService.getConstruction'));
      assert.ok(routes.has('GreatBuildingsService.contributeForgePoints'));
      assert.ok(routes.has('GreatBuildingsService.getConstructionRanking'));
      assert.ok(routes.has('GreatBuildingsService.getContributions'));
      assert.ok(
        routes.has('GreatBuildingsService.getAvailablePackageForgePoints'),
      );
      assert.ok(routes.has('BlueprintService.newReward'));
    },
  );

  await t.test(
    'GbDonationService singleton and standalone register method work directly',
    () => {
      assert.ok(gbDonationService);
      assert.equal(typeof GbDonationService.register, 'function');
      assert.equal(typeof gbDonationService.register, 'function');

      const registered = [];
      const mockDispatcher = {
        register(cls, method, handler) {
          registered.push([cls, method, handler]);
          return mockDispatcher;
        },
      };

      gbDonationService.register(mockDispatcher);
      assert.deepEqual(
        registered.map(([cls, method]) => [cls, method]),
        [['BlueprintService', 'newReward']],
      );
    },
  );
});
