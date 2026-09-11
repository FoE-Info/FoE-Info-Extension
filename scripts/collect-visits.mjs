#!/usr/bin/env node

/**
 * Automates visiting 15 players (5 Hood, 5 Guild, 5 Friends) in Forge of Empires:
 * - Intercepts the raw OtherPlayerService.visitPlayer RPC payload via CDP Network domain
 * - Captures FoE-Info's rendered visit card in panel.html
 * - Saves each visit payload as a test fixture in tests/fixtures/visits/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '../tests/fixtures/visits');

const CDP_HOST = process.env.CDP_HOST || '127.0.0.1';
const CDP_PORT = process.env.CDP_PORT || '9222';
const CDP_BASE = `http://${CDP_HOST}:${CDP_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Coordinates exactly calibrated from DevTools recording
const COORDS = {
  tabs: {
    hood: { x: 774, y: 779 },
    guild: { x: 835, y: 787 },
    friends: { x: 903, y: 781 },
  },
  eventHistoryOk: { x: 811, y: 751 },
  jumpToStart: { x: 245, y: 895 }, // |< button at bottom of left stack
  pageLeft: { x: 244, y: 859 }, // << 5 players left
  stepLeft: { x: 248, y: 830 }, // < 1 player left
  stepRight: { x: 960, y: 834 }, // > 1 player right
  pageRight: { x: 955, y: 868 }, // >> 5 players right
  jumpToEnd: { x: 948, y: 904 }, // >| button at bottom of right stack
  slots: [
    { x: 305, y: 870 }, // Slot 1
    { x: 420, y: 866 }, // Slot 2
    { x: 538, y: 865 }, // Slot 3
    { x: 650, y: 866 }, // Slot 4
    { x: 760, y: 868 }, // Slot 5
  ],
  backToCity: { x: 157, y: 863 }, // Back to City orange button when visiting
};

function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const handlers = new Map();
  const listeners = new Set();

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data.toString());
      if (msg.id && handlers.has(msg.id)) {
        const { resolve, reject } = handlers.get(msg.id);
        handlers.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
      for (const listener of listeners) {
        listener(msg);
      }
    } catch {}
  };

  const readyPromise = new Promise((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = (err) => reject(err);
  });

  return {
    async send(method, params = {}, timeoutMs = 15000) {
      await readyPromise;
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          handlers.delete(id);
          reject(new Error(`CDP command '${method}' timed out`));
        }, timeoutMs);

        handlers.set(id, {
          resolve: (res) => {
            clearTimeout(timer);
            resolve(res);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
        });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    on(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close() {
      try {
        ws.close();
      } catch {}
    },
  };
}

async function click(client, x, y, delayMs = 100) {
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x,
    y,
  });
  await sleep(40);
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await sleep(60);
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await sleep(delayMs);
}

async function pressEscape(client) {
  await client.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    windowsVirtualKeyCode: 27,
    key: 'Escape',
    code: 'Escape',
  });
  await sleep(30);
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    windowsVirtualKeyCode: 27,
    key: 'Escape',
    code: 'Escape',
  });
  await sleep(200);
}

async function getPanelVisitStats(panelClient) {
  try {
    const res = await panelClient.send('Runtime.evaluate', {
      expression: `(() => {
        const visit = document.getElementById('visit');
        const card = document.getElementById('visit-panel');
        return {
          visitText: visit?.innerText || card?.innerText || null,
          fpText: document.getElementById('visit-fp')?.innerText || null,
          clanGoodsText: document.getElementById('visit-clan-goods')?.innerText || null
        };
      })()`,
      returnByValue: true,
    });
    return res?.result?.value || null;
  } catch {
    return null;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const targetsRes = await fetch(`${CDP_BASE}/json`);
  const targets = await targetsRes.json();

  const dtTarget = targets.find(
    (t) =>
      t.url &&
      t.url.startsWith('devtools://') &&
      (t.title?.includes('forgeofempires') || t.title?.includes('DevTools')),
  );
  if (dtTarget) {
    console.log(`Focusing FoE-Info panel in DevTools (${dtTarget.id})...`);
    const dt = createCdpClient(dtTarget.webSocketDebuggerUrl);
    try {
      await dt.send('Runtime.evaluate', {
        expression: `(async () => {
          const UI = await import('devtools://devtools/bundled/ui/legacy/legacy.js');
          const vm = UI.ViewManager.ViewManager.instance();
          const key = Array.from(vm.views.keys()).find((k) => k.includes('FoE-Info'));
          if (key) await vm.showView(key);
          return { key };
        })()`,
        awaitPromise: true,
      });
      await sleep(1000);
    } catch (e) {
      console.warn('Could not focus FoE-Info in DevTools:', e.message);
    }
    dt.close();
  }

  const foeTarget = targets.find(
    (t) => t.url && t.url.includes('forgeofempires.com/game'),
  );
  if (!foeTarget) {
    console.error('FAIL: FoE game tab not found');
    process.exit(1);
  }

  const panelTarget = targets.find(
    (t) => t.url && t.url.includes('panel.html'),
  );
  if (!panelTarget) {
    console.error('FAIL: FoE-Info panel.html not found');
    process.exit(1);
  }

  console.log(`Connecting to FoE Game tab (${foeTarget.id})...`);
  const foe = createCdpClient(foeTarget.webSocketDebuggerUrl);

  console.log(`Connecting to FoE-Info Panel (${panelTarget.id})...`);
  const panel = createCdpClient(panelTarget.webSocketDebuggerUrl);

  await foe.send('Network.enable');

  // Queue of captured visits
  const capturedVisits = [];

  foe.on(async (msg) => {
    if (msg.method === 'Network.responseReceived') {
      const url = msg.params.response.url;
      if (url.includes('/game/json')) {
        const reqId = msg.params.requestId;
        try {
          const bodyRes = await foe.send('Network.getResponseBody', {
            requestId: reqId,
          });
          if (bodyRes && bodyRes.body) {
            const data = JSON.parse(bodyRes.body);
            const visit = data.find(
              (d) =>
                d.requestClass === 'OtherPlayerService' &&
                d.requestMethod === 'visitPlayer',
            );
            if (visit) {
              capturedVisits.push(visit.responseData);
            }
          }
        } catch {}
      }
    }
  });

  const categories = ['hood', 'guild', 'friends'];
  const summaryReport = [];

  for (const cat of categories) {
    console.log(`\n========================================`);
    console.log(`  SWITCHING TO CATEGORY: ${cat.toUpperCase()}`);
    console.log(`========================================`);

    // Dismiss any login or event history modals
    await click(foe, COORDS.eventHistoryOk.x, COORDS.eventHistoryOk.y, 200);
    await pressEscape(foe);

    // Switch to tab
    const tabCoord = COORDS.tabs[cat];
    await click(foe, tabCoord.x, tabCoord.y, 800);
    await sleep(400);

    // Jump to start of the list (twice to ensure we are at player #1)
    await click(foe, COORDS.jumpToStart.x, COORDS.jumpToStart.y, 600);
    await sleep(300);
    await click(foe, COORDS.jumpToStart.x, COORDS.jumpToStart.y, 600);
    await sleep(400);

    let visitedCount = 0;
    let page = 0;

    while (visitedCount < 10 && page < 4) {
      console.log(
        `[${cat}] Processing page ${page + 1} (visited ${visitedCount}/10)...`,
      );

      for (let s = 0; s < COORDS.slots.length && visitedCount < 10; s++) {
        const slot = COORDS.slots[s];
        console.log(
          `[${cat}] Attempting visit on slot ${s + 1} at (${slot.x}, ${slot.y})...`,
        );
        const preCount = capturedVisits.length;

        await click(foe, slot.x, slot.y, 300);

        // Wait up to 3.5s for visit response
        let waited = 0;
        while (capturedVisits.length === preCount && waited < 3500) {
          await sleep(250);
          waited += 250;
        }

        if (capturedVisits.length > preCount) {
          const visitPayload = capturedVisits[capturedVisits.length - 1];
          const playerName =
            visitPayload.other_player?.name || `player_${visitedCount + 1}`;

          // Skip user's own city (Overlord Negan)
          if (playerName === 'Overlord Negan') {
            console.log(`Skipping own city ("${playerName}")...`);
            await pressEscape(foe);
            await sleep(300);
            continue;
          }

          const era =
            visitPayload.other_player_era ||
            visitPayload.other_player?.era ||
            'unknown';
          const entitiesCount = visitPayload.city_map?.entities?.length || 0;

          // Dismiss competitor or in-game popups
          await pressEscape(foe);
          await sleep(400);

          // Fetch FoE-Info's rendered text
          const panelData = await getPanelVisitStats(panel);

          console.log(
            `✓ Visited ${visitedCount + 1}/10: "${playerName}" (${era}) - ${entitiesCount} entities`,
          );

          // Save fixture
          const sanitizedName = playerName.replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = `${cat}_${visitedCount + 1}_${sanitizedName}.json`;
          const filePath = path.join(OUTPUT_DIR, filename);

          const record = {
            category: cat,
            index: visitedCount + 1,
            playerName,
            era,
            entitiesCount,
            foeInfoRendered: panelData,
            payload: visitPayload,
          };

          fs.writeFileSync(filePath, JSON.stringify(record, null, 2));

          summaryReport.push({
            category: cat,
            index: visitedCount + 1,
            playerName,
            era,
            entitiesCount,
            filename,
          });

          visitedCount++;
          await sleep(300);
        } else {
          console.log(
            `Slot ${s + 1} at (${slot.x}, ${slot.y}) did not trigger a visit (might be self or invite), advancing...`,
          );
          await pressEscape(foe);
          await sleep(300);
        }
      }

      if (visitedCount < 10) {
        // Page right by 5 players using >> button
        console.log(
          `Paging right using >> button (${COORDS.pageRight.x}, ${COORDS.pageRight.y})...`,
        );
        await click(foe, COORDS.pageRight.x, COORDS.pageRight.y, 800);
        await sleep(500);
        page++;
      }
    }

    // Return to city after completing category
    console.log(`Category ${cat.toUpperCase()} complete! Returning to city...`);
    await click(foe, COORDS.backToCity.x, COORDS.backToCity.y, 1000);
    await pressEscape(foe);
    await sleep(600);
  }

  // Write index summary
  const summaryPath = path.join(OUTPUT_DIR, '_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2));
  console.log(
    `\nAll visits collected successfully! Summary saved to ${summaryPath}`,
  );

  foe.close();
  panel.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
