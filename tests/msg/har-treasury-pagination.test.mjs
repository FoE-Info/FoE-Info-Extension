import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { TreasuryService } = require('../../src/js/msg/TreasuryService.js');

const BUNDLE_PATH = new URL(
  '../fixtures/rpc/har/treasury/donation_history_pages.json',
  import.meta.url,
);

function loadPages() {
  const bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf8'));
  return bundle.captures.filter((c) => c.requestMethod === 'getTreasuryLogs');
}

test('HAR ground truth: treasury donation history pagination', async (t) => {
  await t.test(
    'captures 10 real paginated donation pages (offset 0..90)',
    () => {
      const pages = loadPages();
      assert.equal(pages.length, 10, 'expected 10 captured pages');
      const offsets = pages.map((p) => p.requestData[1]);
      assert.deepEqual(offsets, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
      for (const page of pages) {
        assert.equal(page.responseData.count, 29385);
        assert.ok(Array.isArray(page.responseData.logs));
      }
    },
  );

  await t.test(
    'accumulates every page instead of overwriting with the last page',
    () => {
      const pages = loadPages();
      const service = new TreasuryService();
      for (const page of pages) {
        service.getTreasuryLogs({
          requestData: page.requestData,
          responseData: page.responseData,
        });
      }

      const expected = pages.reduce(
        (sum, p) => sum + p.responseData.logs.length,
        0,
      );
      assert.equal(service.getLogs().length, expected);
      assert.ok(expected > 10, 'must retain more than a single page');
      assert.equal(service.getTotalLogCount(), 29385);
    },
  );

  await t.test('parses player_id and createdAt from real log entries', () => {
    const pages = loadPages();
    const service = new TreasuryService();
    service.getTreasuryLogs({
      requestData: pages[0].requestData,
      responseData: pages[0].responseData,
    });
    const entry = service.getLogs()[0];
    assert.equal(entry.playerName, 'bakiron');
    assert.equal(entry.playerId, 5889510);
    assert.notEqual(entry.date, 0);
    assert.equal(entry.resource, 'stel_glyph_circuits');
  });

  await t.test(
    'recomputes donation totals across all accumulated pages',
    () => {
      const pages = loadPages();
      const service = new TreasuryService();
      for (const page of pages) {
        service.getTreasuryLogs({
          requestData: page.requestData,
          responseData: page.responseData,
        });
      }

      let expectedGoods = 0;
      for (const page of pages) {
        for (const raw of page.responseData.logs) {
          const action = String(raw.action || '').toLowerCase();
          const donation =
            action.includes('donation') ||
            action.includes('building production');
          if (raw.resource !== 'medals' && donation) {
            expectedGoods += Number(raw.amount) || 0;
          }
        }
      }
      assert.equal(service.getTotalGoodsDonated().toNumber(), expectedGoods);
      assert.ok(expectedGoods > 2752, 'totals must span more than one page');
    },
  );

  await t.test(
    'preserves accumulation and totals when existing pages are revisited',
    () => {
      const pages = loadPages();
      const service = new TreasuryService();
      for (const page of pages) {
        service.getTreasuryLogs({
          requestData: page.requestData,
          responseData: page.responseData,
        });
      }
      const before = service.getTotalGoodsDonated().toString();
      for (const page of pages.slice().reverse())
        service.getTreasuryLogs({
          requestData: page.requestData,
          responseData: page.responseData,
        });
      assert.equal(service.getLogs().length, 100);
      assert.equal(service.getTotalGoodsDonated().toString(), before);
      service.getTreasuryLogs({
        requestData: pages[0].requestData,
        responseData: {
          ...pages[0].responseData,
          count: pages[0].responseData.count + 1,
        },
      });
      assert.equal(service.getLogs().length, 10);
    },
  );

  await t.test(
    'handles out-of-order pagination arrival without data loss',
    () => {
      const pages = loadPages();
      const service = new TreasuryService();

      // Simulate offset 10 arriving BEFORE offset 0
      service.getTreasuryLogs({
        requestData: pages[1].requestData, // offset 10
        responseData: pages[1].responseData,
      });
      assert.equal(service.getLogs().length, pages[1].responseData.logs.length);

      // Offset 0 arrives out of order
      service.getTreasuryLogs({
        requestData: pages[0].requestData, // offset 0
        responseData: pages[0].responseData,
      });

      // Both page 0 and page 1 should be preserved (no wipe)
      const expected =
        pages[0].responseData.logs.length + pages[1].responseData.logs.length;
      assert.equal(service.getLogs().length, expected);
    },
  );
});
