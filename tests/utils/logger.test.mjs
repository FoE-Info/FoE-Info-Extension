import assert from 'node:assert/strict';
import test from 'node:test';

// Test the logger utility
const loggerModule = await import('../../src/js/utils/logger.js');
const {
  createLogger,
  isDebugEnabled,
  setDebugEnabled,
  toggleDebug,
  onDebugToggle,
  _resetForTesting,
} = loggerModule.default || loggerModule;

test('Logger Suite', async (t) => {
  t.beforeEach(() => {
    _resetForTesting?.();
  });

  await t.test(
    'standard mode suppresses info and keeps failures local',
    (t) => {
      const info = t.mock.method(console, 'info', () => {});
      const warn = t.mock.method(console, 'warn', () => {});
      const error = t.mock.method(console, 'error', () => {});
      const log = createLogger('ModeTest');
      log.info('timing data');
      log.warn('recoverable failure');
      log.error('failure');
      assert.equal(info.mock.callCount(), 0);
      assert.equal(warn.mock.callCount(), 1);
      assert.equal(error.mock.callCount(), 1);
      setDebugEnabled(true, { persist: false });
      log.info('timing data');
      log.warn('recoverable failure');
      log.error('failure');
      assert.equal(info.mock.callCount(), 1);
      assert.equal(warn.mock.callCount(), 2);
      assert.equal(error.mock.callCount(), 2);
    },
  );

  await t.test('debugEnabled state toggles and notifies subscribers', () => {
    assert.equal(isDebugEnabled(), false, 'debug starts disabled by default');

    let notificationCount = 0;
    let lastState = null;
    const unsub = onDebugToggle((state) => {
      notificationCount++;
      lastState = state;
    });

    const newState = toggleDebug({ persist: false });
    assert.equal(newState, true);
    assert.equal(isDebugEnabled(), true);
    assert.equal(notificationCount, 1);
    assert.equal(lastState, true);

    const turnedOff = toggleDebug({ persist: false });
    assert.equal(turnedOff, false);
    assert.equal(isDebugEnabled(), false);
    assert.equal(notificationCount, 2);
    assert.equal(lastState, false);

    unsub();
    toggleDebug({ persist: false });
    assert.equal(
      notificationCount,
      2,
      'unsubscribed listener should not receive notifications',
    );
  });

  await t.test(
    'createLogger gates debug logs when disabled and outputs when enabled',
    () => {
      setDebugEnabled(false, { persist: false });
      const log = createLogger('TestModule');

      let localDebugCalled = false;
      const origDebug = console.debug;
      console.debug = () => {
        localDebugCalled = true;
      };

      try {
        log.debug('Should not log');
        assert.equal(
          localDebugCalled,
          false,
          'debug logs must be suppressed when debugEnabled is false',
        );

        setDebugEnabled(true, { persist: false });
        log.debug('Should log now');
        assert.equal(
          localDebugCalled,
          true,
          'debug logs must be output when debugEnabled is true',
        );
      } finally {
        console.debug = origDebug;
      }
    },
  );
});
