import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  detectMissingCityEntities,
  scheduleStartupRender,
} from '../../src/js/msg/StartupRenderOrchestrator.js';
import '../../src/js/ui/startupMetadataLoadingBinding.js';

describe('StartupRenderOrchestrator - Deferred Startup Render Suite', () => {
  let knownDefs;
  let mockCitystatsEl;

  beforeEach(() => {
    knownDefs = new Map([
      ['X_SpaceAgeMars_Landmark1', { id: 'X_SpaceAgeMars_Landmark1' }],
      ['R_BronzeAge_Trail', { id: 'R_BronzeAge_Trail' }],
    ]);

    mockCitystatsEl = {
      innerHTML: '',
    };
  });

  it('detects missing city entities from map payloads', () => {
    const msg = {
      responseData: {
        city_map: {
          entities: [
            { cityentity_id: 'X_SpaceAgeMars_Landmark1' }, // Known
            { cityentity_id: 'W_MultiAge_ANNI23A1' }, // Missing
            { cityentity_id: 'V_IndustrialAge_Harbor' }, // Missing
            { cityentity_id: null },
          ],
        },
      },
    };

    const missing = detectMissingCityEntities(msg, (id) => knownDefs.get(id));
    assert.deepEqual(missing, [
      'W_MultiAge_ANNI23A1',
      'V_IndustrialAge_Harbor',
    ]);
  });

  it('renders immediately when 0 entities are missing', () => {
    let rendered = false;
    let resolvedCalled = false;

    const msg = {
      responseData: {
        city_map: {
          entities: [{ cityentity_id: 'X_SpaceAgeMars_Landmark1' }],
        },
      },
    };

    scheduleStartupRender({
      msg,
      citystats: mockCitystatsEl,
      renderLiveCityStats: () => {
        rendered = true;
      },
      resolveMissingCityEntities: () => {
        resolvedCalled = true;
      },
      onResolved: () => {},
      getCityEntityDef: (id) => knownDefs.get(id),
    });

    assert.equal(rendered, true, 'Should render immediately');
    assert.equal(resolvedCalled, false, 'Should not invoke resolution');
    assert.equal(mockCitystatsEl.innerHTML, '');
  });

  it('defers renderLiveCityStats, shows loading indicator, and renders on resolution', () => {
    let rendered = false;
    let onResolvedCalled = false;
    let resolveCallback = null;

    const msg = {
      responseData: {
        city_map: {
          entities: [{ cityentity_id: 'W_MultiAge_ANNI23A1' }],
        },
      },
    };

    scheduleStartupRender({
      msg,
      citystats: mockCitystatsEl,
      renderLiveCityStats: () => {
        rendered = true;
      },
      resolveMissingCityEntities: (missing, cb) => {
        assert.deepEqual(missing, ['W_MultiAge_ANNI23A1']);
        resolveCallback = cb;
      },
      onResolved: () => {
        onResolvedCalled = true;
      },
      getCityEntityDef: (id) => knownDefs.get(id),
      loadingText: 'Loading metadata...',
    });

    // Initial state: deferred!
    assert.equal(rendered, false, 'Initial render must be deferred');
    assert.equal(onResolvedCalled, false);
    assert.ok(mockCitystatsEl.innerHTML.includes('Loading metadata...'));
    assert.ok(mockCitystatsEl.innerHTML.includes('spinner-border'));

    // Trigger resolution callback
    assert.ok(typeof resolveCallback === 'function');
    resolveCallback();

    assert.equal(
      onResolvedCalled,
      true,
      'onResolved should be called after resolution completes',
    );
  });

  it('retains loading state and logs warning if CDN resolution hangs', async () => {
    let rendered = false;
    const warnLogs = [];
    const mockLogger = {
      warn: (...args) => warnLogs.push(args),
    };

    const msg = {
      responseData: {
        city_map: {
          entities: [{ cityentity_id: 'Unreachable_Building' }],
        },
      },
    };

    scheduleStartupRender({
      msg,
      citystats: mockCitystatsEl,
      renderLiveCityStats: () => {
        rendered = true;
      },
      resolveMissingCityEntities: () => {
        // Simulates CDN hanging - never calls callback
      },
      onResolved: () => {},
      getCityEntityDef: (id) => knownDefs.get(id),
      logger: mockLogger,
      fallbackTimeoutMs: 50, // Short timeout for testing
    });

    assert.equal(rendered, false, 'Deferred initially');

    // Wait for fallback timer
    await new Promise((resolve) => setTimeout(resolve, 80));

    assert.equal(rendered, false, 'Pending resolution must not render a card');
    assert.match(mockCitystatsEl.innerHTML, /spinner-border/);
    assert.equal(warnLogs.length, 1);
    assert.equal(warnLogs[0][0], 'Metadata resolution timed out for entities:');
    assert.deepEqual(warnLogs[0][1], ['Unreachable_Building']);
  });
});
