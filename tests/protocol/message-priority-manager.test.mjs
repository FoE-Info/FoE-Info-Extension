import assert from 'node:assert/strict';
import test from 'node:test';
import { MessagePriorityManager } from '../../src/js/protocol/MessagePriorityManager.js';

test('MessagePriorityManager defaults and static data priority', () => {
  const manager = new MessagePriorityManager();

  assert.equal(
    manager.getMessagePriority({
      requestClass: 'StaticDataService',
      requestMethod: 'getMetadata',
    }),
    100,
  );
  assert.equal(
    manager.getMessagePriority({
      requestClass: 'StaticDataService',
      requestMethod: 'getData',
    }),
    90,
  );
  assert.equal(
    manager.getMessagePriority({
      requestClass: 'StartupService',
      requestMethod: 'getData',
    }),
    0,
  );
  assert.equal(manager.getMessagePriority(null), 0);
  assert.equal(manager.getMessagePriority('invalid'), 0);
});

test('MessagePriorityManager custom class and method priorities', () => {
  const manager = new MessagePriorityManager();
  manager.setPriority('CityMapService', null, 50);
  manager.setPriority('CityMapService', 'getCityEntities', 75);

  assert.equal(
    manager.getMessagePriority({
      requestClass: 'CityMapService',
      requestMethod: 'getCityEntities',
    }),
    75,
  );
  assert.equal(
    manager.getMessagePriority({
      requestClass: 'CityMapService',
      requestMethod: 'otherMethod',
    }),
    50,
  );
});

test('MessagePriorityManager stable batch sorting', () => {
  const manager = new MessagePriorityManager();
  manager.setPriority('PriorityA', null, 50);
  manager.setPriority('PriorityB', null, 80);

  const m1 = { requestClass: 'OtherService', id: 1 };
  const m2 = { requestClass: 'PriorityA', id: 2 };
  const m3 = { requestClass: 'PriorityB', id: 3 };
  const m4 = { requestClass: 'OtherService', id: 4 };

  const sorted = manager.sortBatch([m1, m2, m3, m4]);
  assert.deepEqual(
    sorted.map((m) => m.id),
    [3, 2, 1, 4],
  );

  assert.deepEqual(manager.sortBatch([]), []);
  assert.deepEqual(manager.sortBatch([m1]), [m1]);
  assert.equal(manager.sortBatch(null), null);
});
