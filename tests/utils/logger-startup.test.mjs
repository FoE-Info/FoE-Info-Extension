import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync('src/js/utils/logger.js', 'utf8');
function createLoggerContext(stored, panel = true) {
  const writes = [];
  const context = vm.createContext({
    module: { exports: {} },
    console,
    DEBUG_BUILD: true,
    chrome: {
      storage: {
        local: {
          get: async () => ({ debugEnabled: stored }),
          set: async (value) => writes.push(value),
        },
        onChanged: { addListener() {} },
      },
    },
  });
  vm.runInContext(source, context);
  if (panel) context.window = { location: { pathname: '/panel.html' } };
  return { logger: context.module.exports, context, writes };
}
test('development panel starts with debug disabled even when previous session stored true', async () => {
  const { logger, writes } = createLoggerContext(true);
  await logger.initDebugState();
  assert.equal(logger.isDebugEnabled(), false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].debugEnabled, false);
  logger.toggleDebug();
  assert.equal(logger.isDebugEnabled(), true);
  assert.equal(writes.at(-1).debugEnabled, true);
});
test('development build with no stored choice stays in standard mode', async () => {
  const { logger } = createLoggerContext(undefined);
  await logger.initDebugState();
  assert.equal(logger.isDebugEnabled(), false);
});
test('content contexts retain the active panel session debug value', async () => {
  const { logger } = createLoggerContext(true, false);
  await logger.initDebugState();
  assert.equal(logger.isDebugEnabled(), true);
});
test('late startup storage read cannot overwrite an explicit icon toggle', async () => {
  const { logger, context, writes } = createLoggerContext(false);
  let complete;
  context.chrome.storage.local.get = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  const initialized = logger.initDebugState();
  logger.toggleDebug();
  complete({ debugEnabled: false });
  await initialized;
  assert.equal(logger.isDebugEnabled(), true);
  assert.equal(writes.length, 1);
});
