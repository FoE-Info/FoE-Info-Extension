import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IncidentState,
  incidentState,
} from '../../src/js/state/IncidentState.js';

test('IncidentState Suite', async (t) => {
  await t.test('singleton instance exists and initializes defaults', () => {
    assert.ok(incidentState instanceof IncidentState);
    assert.deepEqual(incidentState.getIncidents(), []);
    assert.equal(incidentState.getServerTime(), 0);
  });

  await t.test('subscriptions and channel notifications', () => {
    const store = new IncidentState();
    const notifications = [];

    const unsubscribe = store.subscribe((state, channel) => {
      notifications.push({
        channel,
        incidents: state.getIncidents(),
        serverTime: state.getServerTime(),
      });
    });

    // Test incidents channel
    const mockIncidents = [{ id: 1, type: 'incident_fallen_tree_1x1' }];
    store.setIncidents(mockIncidents);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].channel, 'incidents');
    assert.deepEqual(notifications[0].incidents, mockIncidents);

    // Non-array fallback
    store.setIncidents(null);
    assert.equal(notifications.length, 2);
    assert.equal(notifications[1].channel, 'incidents');
    assert.deepEqual(notifications[1].incidents, []);

    // Test serverTime channel
    store.setServerTime(1234567890);
    assert.equal(notifications.length, 3);
    assert.equal(notifications[2].channel, 'serverTime');
    assert.equal(notifications[2].serverTime, 1234567890);

    // Non-numeric fallback
    store.setServerTime('invalid');
    assert.equal(notifications.length, 4);
    assert.equal(notifications[3].channel, 'serverTime');
    assert.equal(notifications[3].serverTime, 0);

    // Test unsubscribe
    unsubscribe();
    store.setIncidents([{ id: 2 }]);
    assert.equal(notifications.length, 4);
  });

  await t.test('handles subscriber exceptions gracefully', () => {
    let loggedError = null;
    const store = new IncidentState({
      logger: {
        error(msg, ctx) {
          loggedError = { msg, ctx };
        },
      },
    });

    store.subscribe(() => {
      throw new Error('Subscriber failure');
    });

    assert.doesNotThrow(() => {
      store.setIncidents([]);
    });
    assert.ok(loggedError);
    assert.equal(loggedError.msg, 'Reactive subscriber failed');
    assert.equal(loggedError.ctx.channel, 'incidents');
  });
});
