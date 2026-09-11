import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import logger from '../../src/js/utils/logger.js';

const source = readFileSync('src/js/protocol/contentBridge.js', 'utf8').replace(
  /^import .*;\n/gm,
  '',
);

for (const enabled of [false, true]) {
  test(`content bridge initialization obeys persisted debug=${enabled}`, async (t) => {
    logger._resetForTesting();
    t.after(() => logger._resetForTesting());
    const logs = [];
    t.mock.method(console, 'info', (...args) => logs.push(args.join(' ')));
    const window = {
      location: { origin: 'https://example.invalid' },
      postMessage() {},
      addEventListener() {},
    };
    vm.runInNewContext(source, {
      browser: {
        storage: {
          local: { get: async () => ({ debugEnabled: enabled }) },
          onChanged: { addListener() {} },
        },
      },
      window,
      console,
      performance: { now: () => 12 },
      createLogger: logger.createLogger,
      setDebugEnabled: logger.setDebugEnabled,
    });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(logs.length, enabled ? 1 : 0);
    if (enabled) assert.match(logs[0], /TIMING:P2.*12\.00ms/);
  });
}
