#!/usr/bin/env node

/**
 * End-to-end CDP test script to verify FoE-Info DevTools panel mounting,
 * payload buffering, and live city stats rendering.
 *
 * Modes:
 *   node scripts/test-devtools-reload.mjs
 *     -> Reloads extension, reloads DevTools, focuses FoE-Info panel, reloads game,
 *        and verifies live city stats rendered in panel.html.
 *
 *   node scripts/test-devtools-reload.mjs --late-switch
 *     -> Switches DevTools to Elements tab, reloads game in background,
 *        switches to FoE-Info tab after game load, and verifies buffered
 *        payload recovery and immediate city stats rendering.
 */

const CDP_HOST = process.env.CDP_HOST || '127.0.0.1';
const CDP_PORT = process.env.CDP_PORT || '9222';
const CDP_BASE = `http://${CDP_HOST}:${CDP_PORT}`;

const args = process.argv.slice(2);
const isLateSwitch = args.includes('--late-switch');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTargets() {
  const res = await fetch(`${CDP_BASE}/json`);
  if (!res.ok) throw new Error(`CDP HTTP error: ${res.status}`);
  return await res.json();
}

function sendCdp(wsUrl, method, params = {}, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      reject(new Error(`CDP '${method}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.onopen = () => ws.send(JSON.stringify({ id, method, params }));
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data.toString());
        if (data.id === id) {
          clearTimeout(timer);
          ws.close();
          resolve(data.result);
        }
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    };
    ws.onerror = (err) => {
      clearTimeout(timer);
      reject(err);
    };
  });
}

async function main() {
  console.log(
    `[test-devtools-reload] Connecting to Chromium CDP at ${CDP_BASE}...`,
  );
  const targets = await fetchTargets();

  const extTarget = targets.find(
    (t) =>
      t.type === 'page' &&
      t.url &&
      t.url.toLowerCase().startsWith('chrome://extensions'),
  );
  const dtTarget = targets.find(
    (t) =>
      t.url &&
      t.url.startsWith('devtools://') &&
      (t.title?.includes('forgeofempires') || t.title?.includes('DevTools')),
  );
  const gameTarget = targets.find(
    (t) => t.type === 'page' && t.url && t.url.includes('forgeofempires.com'),
  );

  if (!gameTarget) {
    console.error(
      '[test-devtools-reload] FAIL: FoE game tab not found in Chrome!',
    );
    process.exit(1);
  }
  if (!dtTarget) {
    console.error(
      '[test-devtools-reload] FAIL: Docked DevTools window not found!',
    );
    process.exit(1);
  }

  if (isLateSwitch) {
    console.log(
      '[test-devtools-reload] --- MODE: Late-Switch Buffering Test ---',
    );

    console.log('1. Switching DevTools to Elements tab...');
    await sendCdp(dtTarget.webSocketDebuggerUrl, 'Runtime.evaluate', {
      expression: `(async () => {
        const UI = await import('devtools://devtools/bundled/ui/legacy/legacy.js');
        const vm = UI.ViewManager.ViewManager.instance();
        await vm.showView('elements');
        return true;
      })()`,
      awaitPromise: true,
    });

    console.log(
      '2. Reloading game page while Elements tab is active in DevTools...',
    );
    await sendCdp(gameTarget.webSocketDebuggerUrl, 'Page.reload');

    console.log(
      '3. Waiting 12s for game to load with DevTools on Elements tab...',
    );
    await sleep(12000);

    console.log('4. Now switching DevTools to FoE-Info tab...');
    await sendCdp(dtTarget.webSocketDebuggerUrl, 'Runtime.evaluate', {
      expression: `(async () => {
        const UI = await import('devtools://devtools/bundled/ui/legacy/legacy.js');
        const vm = UI.ViewManager.ViewManager.instance();
        const key = Array.from(vm.views.keys()).find((k) => k.includes('FoE-Info'));
        if (key) await vm.showView(key);
        return { key };
      })()`,
      awaitPromise: true,
    });

    console.log('5. Waiting 2s for panel onShown and payload flush...');
    await sleep(2000);
  } else {
    console.log(
      '[test-devtools-reload] --- MODE: Standard Panel-First Reload Test ---',
    );

    if (extTarget) {
      console.log('1. Reloading extension in chrome://extensions...');
      await sendCdp(extTarget.webSocketDebuggerUrl, 'Runtime.evaluate', {
        expression: `(() => {
          const manager = document.querySelector('extensions-manager');
          const itemList = manager?.shadowRoot?.querySelector('extensions-item-list');
          const items = itemList?.shadowRoot?.querySelectorAll('extensions-item') || [];
          for (const item of items) {
            const name = item.shadowRoot.querySelector('#name')?.textContent?.trim();
            if (name === 'FoE-Info-DEV') {
              const reloadBtn = item.shadowRoot.querySelector('#dev-reload-button');
              if (reloadBtn) {
                reloadBtn.click();
                return { success: true };
              }
            }
          }
          return { success: false };
        })()`,
        returnByValue: true,
      });
    }

    console.log('2. Reloading DevTools window...');
    await sendCdp(dtTarget.webSocketDebuggerUrl, 'Page.reload');

    console.log('3. Focusing FoE-Info panel in DevTools...');
    let focused = false;
    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(300);
      const currentTargets = await fetchTargets();
      const currentDt = currentTargets.find(
        (t) =>
          t.url &&
          t.url.startsWith('devtools://') &&
          (t.title?.includes('forgeofempires') ||
            t.title?.includes('DevTools')),
      );
      if (!currentDt) continue;

      try {
        const evalRes = await sendCdp(
          currentDt.webSocketDebuggerUrl,
          'Runtime.evaluate',
          {
            expression: `(async () => {
            try {
              const UI = await import('devtools://devtools/bundled/ui/legacy/legacy.js');
              const vm = UI.ViewManager.ViewManager.instance();
              if (!vm || !vm.views) return { ready: false };
              const key = Array.from(vm.views.keys()).find((k) => k.includes('FoE-Info'));
              if (key) {
                await vm.showView(key);
                return { ready: true, key };
              }
              return { ready: false };
            } catch (e) {
              return { ready: false, err: e.message };
            }
          })()`,
            awaitPromise: true,
            returnByValue: true,
          },
        );

        if (evalRes?.result?.value?.ready) {
          console.log(` -> Focused: ${evalRes.result.value.key}`);
          focused = true;
          break;
        }
      } catch {}
    }

    if (!focused) {
      console.error(
        '[test-devtools-reload] FAIL: Could not focus FoE-Info panel in DevTools',
      );
      process.exit(1);
    }

    console.log('4. Verifying panel.html iframe target mounted...');
    let panelMounted = false;
    for (let pAttempt = 0; pAttempt < 15; pAttempt++) {
      const currentTargets = await fetchTargets();
      if (currentTargets.some((t) => t.url && t.url.includes('panel.html'))) {
        panelMounted = true;
        break;
      }
      await sleep(200);
    }
    if (!panelMounted) {
      console.error(
        '[test-devtools-reload] FAIL: panel.html target not found in CDP list',
      );
      process.exit(1);
    }
    console.log(' -> panel.html confirmed mounted.');

    console.log(
      '5. Reloading FoE game page while panel is actively mounted...',
    );
    await sendCdp(gameTarget.webSocketDebuggerUrl, 'Page.reload');

    console.log('6. Waiting 12s for game to load...');
    await sleep(12000);

    // Ensure FoE-Info panel is actively selected and displayed in DevTools
    try {
      const dt = (await fetchTargets()).find(
        (t) =>
          t.url &&
          t.url.startsWith('devtools://') &&
          (t.title?.includes('forgeofempires') ||
            t.title?.includes('DevTools')),
      );
      if (dt) {
        await sendCdp(dt.webSocketDebuggerUrl, 'Runtime.evaluate', {
          expression: `(async () => {
            const UI = await import('devtools://devtools/bundled/ui/legacy/legacy.js');
            const vm = UI.ViewManager.ViewManager.instance();
            const key = Array.from(vm.views.keys()).find((k) => k.includes('FoE-Info'));
            if (key) await vm.showView(key);
          })()`,
          awaitPromise: true,
        });
        await sleep(1500);
      }
    } catch {}
  }

  // Verification step
  console.log('Checking panel.html DOM state...');
  const finalTargets = await fetchTargets();
  const panel = finalTargets.find((t) => t.url && t.url.includes('panel.html'));
  if (!panel) {
    console.error(
      '[test-devtools-reload] FAIL: panel.html not present after test!',
    );
    process.exit(1);
  }

  const evalRes = await sendCdp(
    panel.webSocketDebuggerUrl,
    'Runtime.evaluate',
    {
      expression: `({
      citystatsText: document.getElementById('citystats')?.innerText?.trim(),
      userName: document.getElementById('user_name')?.innerText?.trim(),
      hasCity: !!window.foeCity,
      goodsText: Array.from(document.querySelectorAll('#citystatsText div')).find((d) => d.innerText.includes('Goods'))?.innerText
    })`,
      returnByValue: true,
    },
  );

  const state = evalRes?.result?.value;
  console.log('Panel State:', JSON.stringify(state, null, 2));

  if (
    !state ||
    !state.hasCity ||
    !state.citystatsText ||
    state.citystatsText.includes('Load the game')
  ) {
    console.error('[test-devtools-reload] FAIL: City Stats not populated!');
    process.exit(1);
  }

  console.log(
    '[test-devtools-reload] SUCCESS: City Stats verified active in FoE-Info panel!',
  );
}

main().catch((err) => {
  console.error('[test-devtools-reload] Error:', err.message);
  process.exit(1);
});
