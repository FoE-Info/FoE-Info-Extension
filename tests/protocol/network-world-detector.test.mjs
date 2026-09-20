import assert from 'node:assert/strict';
import test from 'node:test';
import { detectAndSyncWorldOrigin } from '../../src/js/protocol/networkWorldDetector.js';

test('networkWorldDetector - World detection and storage sync', async (t) => {
  await t.test('detects valid world and sets origin and storage', async () => {
    let recordedOrigin = null;
    let registeredWorld = null;
    let setWorldVal = null;
    let appliedVisibility = false;
    let setOptionsVal = null;

    const mockStorage = {
      getCurrentWorld: () => 'us1',
      setWorld: (w) => {
        setWorldVal = w;
      },
      getWorldSettings: async () => ({ showOptions: { cardVisible: true } }),
      registerKnownWorld: (w) => {
        registeredWorld = w;
      },
    };

    const res = detectAndSyncWorldOrigin(
      'https://us12.forgeofempires.com/game/json',
      {
        storage: mockStorage,
        setGameOrigin: (origin) => {
          recordedOrigin = origin;
        },
        setOptions: (key, val) => {
          setOptionsVal = { key, val };
        },
        applyCardVisibility: () => {
          appliedVisibility = true;
        },
      },
    );

    assert.equal(res.accepted, true);
    assert.equal(res.detectedWorld, 'us12');
    assert.equal(res.origin, 'https://us12.forgeofempires.com');
    assert.equal(recordedOrigin, 'https://us12.forgeofempires.com');
    assert.equal(setWorldVal, 'us12');
    assert.equal(registeredWorld, 'us12');

    // Allow promise for getWorldSettings to resolve
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual(setOptionsVal, {
      key: 'showOptions',
      val: { cardVisible: true },
    });
    assert.equal(appliedVisibility, true);
  });

  await t.test('ignores non-game or landing page URLs like en0', () => {
    let recordedOrigin = null;
    let setWorldVal = null;

    const res = detectAndSyncWorldOrigin(
      'https://en0.forgeofempires.com/game/json',
      {
        setGameOrigin: (o) => {
          recordedOrigin = o;
        },
        storage: {
          getCurrentWorld: () => 'en1',
          setWorld: (w) => {
            setWorldVal = w;
          },
        },
      },
    );

    assert.equal(res.accepted, true);
    assert.equal(res.detectedWorld, undefined);
    assert.equal(recordedOrigin, null);
    assert.equal(setWorldVal, null);
  });

  await t.test('rejects entry when inspectedWorldId does not match', () => {
    const res = detectAndSyncWorldOrigin(
      'https://de3.forgeofempires.com/game/json',
      {
        inspectedWorldId: 'de2',
      },
    );

    assert.equal(res.accepted, false);
    assert.equal(res.detectedWorld, 'de3');
  });

  await t.test(
    'updates inspectedWorldId when previous world was portal 0 or www',
    () => {
      let updatedInspectedWorld = null;
      const res = detectAndSyncWorldOrigin(
        'https://de5.forgeofempires.com/game/json',
        {
          inspectedWorldId: 'de0',
          setInspectedWorldId: (w) => {
            updatedInspectedWorld = w;
          },
        },
      );

      assert.equal(res.accepted, true);
      assert.equal(res.detectedWorld, 'de5');
      assert.equal(updatedInspectedWorld, 'de5');
    },
  );
});
