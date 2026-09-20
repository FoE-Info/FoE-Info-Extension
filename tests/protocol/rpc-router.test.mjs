import assert from 'node:assert/strict';
import test from 'node:test';
import { RpcRouter } from '../../src/js/protocol/rpcRouter.js';

test('RpcRouter registers and dispatches single methods', async () => {
  const router = new RpcRouter();
  router.register('TestClass', 'testMethod', async (msg) => ({
    echo: msg.requestData,
  }));

  const res = await router.dispatchSingle({
    requestClass: 'TestClass',
    requestMethod: 'testMethod',
    requestData: 123,
  });
  assert.deepEqual(res, { echo: 123 });
});

test('RpcRouter chains multiple handlers onto same method', async () => {
  const router = new RpcRouter();
  const trail = [];
  router.register('TestClass', 'multi', async () => {
    trail.push(1);
    return 'first';
  });
  router.register('TestClass', 'multi', async () => {
    trail.push(2);
    return 'second';
  });

  const res = await router.dispatchSingle({
    requestClass: 'TestClass',
    requestMethod: 'multi',
  });
  assert.equal(res, 'second');
  assert.deepEqual(trail, [1, 2]);
});

test('RpcRouter fallbacks: class fallback and global fallback', async () => {
  const router = new RpcRouter();
  router.registerFallback('MyClass', async (msg) => ({
    classFallback: msg.requestMethod,
  }));
  router.registerGlobalFallback(async (msg) => ({
    globalFallback: msg.requestClass,
  }));

  const res1 = await router.dispatchSingle({
    requestClass: 'MyClass',
    requestMethod: 'unknown',
  });
  assert.deepEqual(res1, { classFallback: 'unknown' });

  const res2 = await router.dispatchSingle({
    requestClass: 'UnknownClass',
    requestMethod: 'unknown',
  });
  assert.deepEqual(res2, { globalFallback: 'UnknownClass' });

  const unhandledRouter = new RpcRouter();
  const resUnhandled = await unhandledRouter.dispatchSingle({
    requestClass: 'StartupService',
    requestMethod: 'unknownMethod',
  });
  assert.deepEqual(resUnhandled, {
    unhandled: true,
    requestClass: 'StartupService',
    requestMethod: 'unknownMethod',
  });
});

test('RpcRouter registerService binds methods correctly', async () => {
  const router = new RpcRouter();
  const service = {
    multiplier: 10,
    compute(msg) {
      return msg.val * this.multiplier;
    },
  };
  router.registerService('ComputeService', service);

  const res = await router.dispatchSingle({
    requestClass: 'ComputeService',
    requestMethod: 'compute',
    val: 5,
  });
  assert.equal(res, 50);
});
