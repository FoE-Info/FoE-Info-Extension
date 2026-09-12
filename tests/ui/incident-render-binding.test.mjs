import assert from 'node:assert/strict';
import test from 'node:test';
import { IncidentState } from '../../src/js/state/IncidentState.js';
import { bindIncidentPanels } from '../../src/js/ui/incidentRenderBinding.js';

test('incidentRenderBinding Suite', async (t) => {
  await t.test(
    'bindIncidentPanels subscribes to incidents, serverTime, and all channels',
    () => {
      const store = new IncidentState();
      const calls = [];
      const mockRenderer = (target, context) => {
        calls.push({ target, context });
      };

      const mockTarget = { id: 'incidents', innerHTML: '' };
      const unsubscribe = bindIncidentPanels(store, {
        renderer: mockRenderer,
        targetEl: mockTarget,
        showOptions: { showIncidents: true },
        collapseIncidents: false,
      });

      // Test incidents channel
      const testRewards = [{ type: 'incident_pothole_1x1' }];
      store.setIncidents(testRewards);

      assert.equal(calls.length, 1);
      assert.strictEqual(calls[0].target, mockTarget);
      assert.deepEqual(calls[0].context.hiddenRewards, testRewards);
      assert.equal(calls[0].context.collapseIncidents, false);

      // Test serverTime channel
      store.setServerTime(1700000000);
      assert.equal(calls.length, 2);
      assert.equal(calls[1].context.serverTime, 1700000000);

      // Test all channel notify
      store.notify('all');
      assert.equal(calls.length, 3);

      // Test unhandled channel does not trigger renderer
      store.notify('other');
      assert.equal(calls.length, 3);

      unsubscribe();
      store.setIncidents([]);
      assert.equal(calls.length, 3);
    },
  );
});
