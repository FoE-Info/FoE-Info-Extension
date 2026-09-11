import assert from 'node:assert/strict';
import test from 'node:test';
import registryPkg from '../../src/js/msg/registerServices.js';
import resourceService from '../../src/js/msg/ResourceService.js';
import { timeService } from '../../src/js/msg/TimeService.js';
import { registerLegacyBridge } from '../../src/js/protocol/legacyBridge.js';
import { MessageDispatcher } from '../../src/js/protocol/MessageDispatcher.js';

const { registerAllServices, messageDispatcher } = registryPkg;
const clockUpdate = {
  requestClass: 'TimeService',
  requestMethod: 'updateTime',
  responseData: { time: 1725516000 },
};

test('actual modern and legacy resource bootstrap processes definitions once', async () => {
  const dispatcher = new MessageDispatcher();
  registerAllServices(dispatcher);
  registerLegacyBridge(dispatcher, {
    getPlayerResources: resourceService.getPlayerResources,
    getResourceDefinitions: resourceService.getResourceDefinitions,
  });
  let nameReads = 0;
  const definition = {
    id: 'wood',
    get name() {
      nameReads++;
      return 'Wood';
    },
  };
  await dispatcher.dispatchSingle({
    requestClass: 'ResourceService',
    requestMethod: 'getResourceDefinitions',
    responseData: [definition],
  });
  assert.equal(nameReads, 1);
});

test('duplicate callback registration preserves distinct callbacks and route scope', async () => {
  const dispatcher = new MessageDispatcher();
  const calls = [];
  const first = () => {
    calls.push('first');
    return 1;
  };
  const second = () => {
    calls.push('second');
    return 2;
  };
  for (const handler of [first, first, second, first, second]) {
    dispatcher.register('ExampleService', 'update', handler);
  }
  dispatcher.register('ExampleService', 'other', first);
  const result = await dispatcher.dispatchSingle({
    requestClass: 'ExampleService',
    requestMethod: 'update',
  });
  assert.equal(result, 2);
  assert.deepEqual(calls, ['first', 'second']);
  await dispatcher.dispatchSingle({
    requestClass: 'ExampleService',
    requestMethod: 'other',
  });
  assert.deepEqual(calls, ['first', 'second', 'first']);
});

test('bootstrap delivers each clock update once despite repeated initialization', async () => {
  const updates = [];
  const listener = (time) => updates.push(time);
  timeService.onUpdateTime(listener);
  try {
    registerAllServices(messageDispatcher);
    registerAllServices(messageDispatcher);
    await messageDispatcher.dispatchSingle(clockUpdate);
    assert.deepEqual(updates, [1725516000]);
  } finally {
    timeService.onUpdateTimeCallbacks.splice(
      timeService.onUpdateTimeCallbacks.indexOf(listener),
      1,
    );
  }
});

test('separate dispatchers deliver one clock update each after repeated registration', async () => {
  const updates = [];
  const listener = (time) => updates.push(time);
  timeService.onUpdateTime(listener);
  try {
    for (const dispatcher of [
      new MessageDispatcher(),
      new MessageDispatcher(),
    ]) {
      registerAllServices(dispatcher);
      registerAllServices(dispatcher);
      await dispatcher.dispatchSingle(clockUpdate);
    }
    assert.deepEqual(updates, [1725516000, 1725516000]);
  } finally {
    timeService.onUpdateTimeCallbacks.splice(
      timeService.onUpdateTimeCallbacks.indexOf(listener),
      1,
    );
  }
});

test('registration preserves a distinct handler sharing a modern RPC route', async () => {
  const dispatcher = new MessageDispatcher();
  const updates = [];
  const listener = (time) => updates.push(['modern', time]);
  timeService.onUpdateTime(listener);
  try {
    dispatcher.register('TimeService', 'updateTime', (msg) => {
      updates.push(['legacy', msg.responseData.time]);
    });
    registerAllServices(dispatcher);
    registerAllServices(dispatcher);
    await dispatcher.dispatchSingle(clockUpdate);
    assert.deepEqual(updates, [
      ['legacy', 1725516000],
      ['modern', 1725516000],
    ]);
  } finally {
    timeService.onUpdateTimeCallbacks.splice(
      timeService.onUpdateTimeCallbacks.indexOf(listener),
      1,
    );
  }
});
