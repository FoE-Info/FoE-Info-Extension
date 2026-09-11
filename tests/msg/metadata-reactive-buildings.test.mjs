import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { metadataStore } from '../../src/js/state/MetadataStore.js';

test('Reactive Metadata Updates & Building Collection Times Suite', async (t) => {
  await t.test(
    '1. metadataStore subscribers are notified when metadataUpdated occurs',
    () => {
      let notified = false;
      let eventPayload = null;

      const unsubscribe = metadataStore.subscribe((event) => {
        if (event?.type === 'metadataUpdated') {
          notified = true;
          eventPayload = event;
        }
      });

      metadataStore.notifySubscribers({ type: 'metadataUpdated' });
      assert.equal(notified, true);
      assert.equal(eventPayload?.type, 'metadataUpdated');

      // Verify unsubscribe
      notified = false;
      unsubscribe();
      metadataStore.notifySubscribers({ type: 'metadataUpdated' });
      assert.equal(notified, false);
    },
  );

  await t.test(
    '2. StartupService defines renderBuildingCollectionTimes and delegates metadata subscription',
    () => {
      const startupPath = path.resolve('src/js/msg/StartupService.js');
      const content = fs.readFileSync(startupPath, 'utf8');

      assert.ok(
        content.includes('export function renderBuildingCollectionTimes'),
        'StartupService must export renderBuildingCollectionTimes',
      );
      assert.ok(
        content.includes('subscribeMetadataRenders('),
        'StartupService must delegate the metadataStore subscription',
      );
      assert.ok(
        content.includes(
          'onRenderBuildingCollectionTimes: renderBuildingCollectionTimes',
        ),
        'metadata listener must re-render collection times',
      );

      const orchestratorPath = path.resolve(
        'src/js/msg/StartupRenderOrchestrator.js',
      );
      const orchestrator = fs.readFileSync(orchestratorPath, 'utf8');

      assert.ok(
        orchestrator.includes('metadataStore.subscribe'),
        'StartupRenderOrchestrator must subscribe to metadataStore updates',
      );
      assert.ok(
        orchestrator.includes('onRenderBuildingCollectionTimes()'),
        'orchestrator listener must re-render collection times',
      );
    },
  );
});
