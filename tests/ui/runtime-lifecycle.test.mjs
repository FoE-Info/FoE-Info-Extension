import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bindRuntimeLifecycle,
  onError,
  onRequested,
} from '../../src/js/ui/runtimeLifecycle.js';

function createMockBrowser(overrides = {}) {
  const state = { reloadCalls: 0 };
  const browser = {
    state,
    runtime: {
      reload() {
        state.reloadCalls += 1;
      },
      ...overrides,
    },
  };
  return browser;
}

describe('runtimeLifecycle Suite', () => {
  it('registers install listener without alerting', () => {
    const registered = {};
    const browser = createMockBrowser({
      onInstalled: {
        addListener(listener) {
          registered.installed = listener;
        },
      },
    });
    const alerts = [];

    bindRuntimeLifecycle({
      browser,
      tool: { name: 'FoE-Info', version: '1.2.3' },
      alertFn: (message) => alerts.push(message),
    });

    assert.equal(typeof registered.installed, 'function');
    registered.installed({ reason: 'install' });
    assert.equal(alerts.length, 0);
  });

  it('alerts on update with previous and current versions', () => {
    const registered = {};
    const browser = createMockBrowser({
      onInstalled: {
        addListener(listener) {
          registered.installed = listener;
        },
      },
    });
    const alerts = [];

    bindRuntimeLifecycle({
      browser,
      tool: { name: 'FoE-Info', version: '1.2.3' },
      alertFn: (message) => alerts.push(message),
    });

    registered.installed({ reason: 'update', previousVersion: '1.0.0' });
    assert.match(alerts.at(-1), /updated from 1\.0\.0 to 1\.2\.3/);
  });

  it('alerts and reloads on update-available', () => {
    const registered = {};
    const browser = createMockBrowser({
      onUpdateAvailable: {
        addListener(listener) {
          registered.updateAvailable = listener;
        },
      },
    });
    const alerts = [];

    bindRuntimeLifecycle({
      browser,
      tool: { name: 'FoE-Info', version: '1.2.3' },
      alertFn: (message) => alerts.push(message),
    });

    registered.updateAvailable({ version: '2.0.0' });
    assert.equal(browser.state.reloadCalls, 1);
    assert.match(alerts.at(-1), /updating to version 2\.0\.0/);
  });

  it('is a safe no-op without a browser object', () => {
    assert.doesNotThrow(() => bindRuntimeLifecycle({}));
    assert.doesNotThrow(() => bindRuntimeLifecycle());
  });

  it('handles all requestUpdateCheck statuses without throwing', () => {
    for (const status of ['update_available', 'no_update', 'throttled']) {
      assert.doesNotThrow(() => onRequested(status, { version: '9.9.9' }));
    }
    assert.doesNotThrow(() => onRequested('unknown-status'));
  });

  it('logs errors via onError without throwing', () => {
    assert.doesNotThrow(() => onError(new Error('boom')));
    assert.doesNotThrow(() => onError('plain failure'));
  });
});
