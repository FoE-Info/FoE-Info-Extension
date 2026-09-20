#!/usr/bin/env node

/**
 * Orchestrates foe-browser CDP automation:
 * 1. Closes any DevTools attached to non-FoE tabs.
 * 2. Reuses existing FoE game tab (en0 or world); never opens new tabs on reload.
 * 3. Launches/attaches DevTools strictly on the FoE tab and focuses FoE-Info panel.
 * 4. Waits for FoE-Info panel to attach before navigating/logging in to requested world.
 * 5. Reloads existing tab in-place on reload.
 */

const CDP_BASE = process.env.CDP_BASE || 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sendCdp(wsUrl, method, params = {}, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const ws = new globalThis.WebSocket(wsUrl);
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
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        }
      } catch (err) {
        clearTimeout(timer);
        ws.close();
        reject(err);
      }
    };
    ws.onerror = (err) => {
      clearTimeout(timer);
      reject(err);
    };
  });
}

async function fetchTargets() {
  const res = await fetch(`${CDP_BASE}/json`);
  if (!res.ok) throw new Error(`CDP HTTP error: ${res.status}`);
  return res.json();
}

async function closeNonFoeDevTools(targets) {
  const dtTargets = targets.filter(
    (t) => t.url && t.url.startsWith('devtools://'),
  );
  for (const dt of dtTargets) {
    const title = (dt.title || '').toLowerCase();
    if (title && !title.includes('forgeofempires') && !title.includes('foe')) {
      try {
        await fetch(`${CDP_BASE}/json/close/${dt.id}`);
        console.log(
          `[foe-browser-control] Closed non-FoE DevTools: ${dt.title}`,
        );
      } catch {}
    }
  }
}

async function reloadExtension(targets) {
  const extTab = targets.find(
    (t) => t.url && t.url.includes('chrome://extensions'),
  );
  if (extTab) {
    try {
      const res = await sendCdp(
        extTab.webSocketDebuggerUrl,
        'Runtime.evaluate',
        {
          expression: `(() => {
          const manager = document.querySelector('extensions-manager');
          const itemList = manager?.shadowRoot?.querySelector('extensions-item-list');
          const items = itemList?.shadowRoot?.querySelectorAll('extensions-item') || [];
          for (const item of items) {
            const name = item.shadowRoot.querySelector('#name')?.textContent?.trim();
            if (name === 'FoE-Info-DEV' || name?.includes('FoE-Info')) {
              const reloadBtn = item.shadowRoot.querySelector('#dev-reload-button');
              if (reloadBtn) {
                reloadBtn.click();
                return true;
              }
            }
          }
          return false;
        })()`,
          returnByValue: true,
        },
      );
      if (res?.result?.value) {
        console.log(
          '[foe-browser-control] Extension reloaded via chrome://extensions.',
        );
        return true;
      }
    } catch {}
  }

  const panel = targets.find((t) => t.url && t.url.includes('panel.html'));
  if (panel) {
    try {
      await sendCdp(panel.webSocketDebuggerUrl, 'Runtime.evaluate', {
        expression:
          'if (typeof chrome !== "undefined" && chrome.runtime?.reload) chrome.runtime.reload();',
      });
      console.log(
        '[foe-browser-control] Extension reloaded via chrome.runtime.reload().',
      );
      return true;
    } catch {}
  }

  return false;
}

function findFoeDevTools(targets) {
  return targets.find(
    (t) =>
      t.url &&
      t.url.startsWith('devtools://') &&
      (!t.title ||
        t.title.toLowerCase().includes('forgeofempires') ||
        t.title.toLowerCase().includes('foe')),
  );
}

async function ensureDevToolsOnFoeTab(gameTab) {
  const isFoeTab =
    gameTab &&
    /^https?:\/\/(?:[a-z]{2}[0-9]*|zz[0-9]*)\.forgeofempires\.com/i.test(
      gameTab.url || '',
    );
  if (!isFoeTab) {
    console.warn(
      `[foe-browser-control] Target tab is not a FoE website (${gameTab?.url}). DevTools will NOT be opened.`,
    );
    return false;
  }

  // Ensure game tab is focused before triggering F12
  try {
    await fetch(`${CDP_BASE}/json/activate/${gameTab.id}`);
    await sleep(250);
  } catch {}

  let targets = await fetchTargets();
  let dt = findFoeDevTools(targets);

  if (!dt) {
    console.log('[foe-browser-control] Launching DevTools on FoE tab...');
    try {
      const { execSync } = await import('node:child_process');
      execSync('ydotool key 88:1 88:0', { stdio: 'ignore', timeout: 1000 });
    } catch (err) {
      console.warn(
        '[foe-browser-control] ydotool F12 invocation failed:',
        err.message,
      );
    }

    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(200);
      targets = await fetchTargets();
      dt = findFoeDevTools(targets);
      if (dt) break;
    }
  }

  if (dt) {
    try {
      const res = await sendCdp(dt.webSocketDebuggerUrl, 'Runtime.evaluate', {
        expression: `(async () => {
          try {
            const UI = await import('devtools://devtools/bundled/ui/legacy/legacy.js');
            const vm = UI.ViewManager.ViewManager.instance();
            if (!vm || !vm.views) return false;
            const key = Array.from(vm.views.keys()).find((k) => k.includes('FoE-Info'));
            if (key) {
              await vm.showView(key);
              return true;
            }
          } catch {}
          return false;
        })()`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (res?.result?.value) {
        console.log(
          '[foe-browser-control] FoE-Info panel focused in DevTools.',
        );
      }
    } catch {}
    return true;
  }

  console.warn('[foe-browser-control] Could not attach DevTools to FoE tab.');
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  let world = 'en7';
  for (const arg of args) {
    const clean = arg.replace(/^--world=/, '');
    if (/^[a-z]+[0-9]+$/i.test(clean)) {
      world = clean.toLowerCase();
      break;
    }
  }

  const targetUrl = `https://${world}.forgeofempires.com/game/index?ref=master-page-login`;
  console.log(`[foe-browser-control] Target world: ${world} (${targetUrl})`);

  let targets = await fetchTargets();

  // 1. Immediately close any DevTools attached to non-FoE tabs
  await closeNonFoeDevTools(targets);

  // 2. Resolve existing FoE tabs — deduplicate, never create new tabs on reload
  targets = await fetchTargets();
  const foeTabs = targets.filter(
    (t) => t.type === 'page' && t.url && t.url.includes('forgeofempires.com'),
  );

  let primaryGameTab = foeTabs[0];
  if (foeTabs.length > 1) {
    console.log(
      `[foe-browser-control] Found ${foeTabs.length} FoE tabs. Deduplicating to single tab...`,
    );
    for (let i = 1; i < foeTabs.length; i++) {
      try {
        await fetch(`${CDP_BASE}/json/close/${foeTabs[i].id}`);
      } catch {}
    }
  } else if (!primaryGameTab) {
    // Only open en0 if zero FoE tabs exist
    const blankTab = targets.find(
      (t) =>
        t.type === 'page' &&
        (t.url === 'about:blank' || t.url.includes('chrome://newtab')),
    );
    if (blankTab) {
      console.log('[foe-browser-control] Reusing blank tab for en0...');
      primaryGameTab = blankTab;
      await sendCdp(primaryGameTab.webSocketDebuggerUrl, 'Page.navigate', {
        url: 'https://en0.forgeofempires.com/',
      });
      await sleep(1000);
    } else {
      console.log(
        '[foe-browser-control] No existing FoE tab found. Opening initial en0 tab...',
      );
      const newRes = await fetch(
        `${CDP_BASE}/json/new?https://en0.forgeofempires.com/`,
      );
      primaryGameTab = await newRes.json();
      await sleep(1000);
    }
  }

  // 3. Reload the extension
  targets = await fetchTargets();
  await reloadExtension(targets);
  await sleep(300);

  // 4. If DevTools is already open for FoE tab, reload it to pick up fresh extension assets
  targets = await fetchTargets();
  const dtTarget = findFoeDevTools(targets);
  if (dtTarget) {
    try {
      await sendCdp(dtTarget.webSocketDebuggerUrl, 'Page.reload');
      await sleep(300);
    } catch {}
  }

  // 5. Ensure DevTools is open and FoE-Info panel is focused on the FoE tab
  await ensureDevToolsOnFoeTab(primaryGameTab);

  // 6. Wait until FoE-Info panel.html is confirmed mounted and listening
  console.log(
    '[foe-browser-control] Waiting for FoE-Info-Extension panel to attach...',
  );
  let panelMounted = false;
  for (let i = 0; i < 25; i++) {
    const current = await fetchTargets();
    if (current.some((t) => t.url && t.url.includes('panel.html'))) {
      panelMounted = true;
      console.log(
        '[foe-browser-control] FoE-Info-Extension panel confirmed attached.',
      );
      break;
    }
    await sleep(200);
  }
  if (!panelMounted) {
    console.warn(
      '[foe-browser-control] Warning: panel.html not detected after 5s. Proceeding with game navigation.',
    );
  }

  // 7. ONLY AFTER FoE-Info-Extension is attached, navigate or reload on the EXISTING game tab
  console.log(
    `[foe-browser-control] Reusing existing game tab (${primaryGameTab.id})...`,
  );
  if (
    primaryGameTab.url &&
    primaryGameTab.url.includes(`${world}.forgeofempires.com`)
  ) {
    console.log(
      `[foe-browser-control] Already on target world ${world}. Reloading existing tab in-place...`,
    );
    await sendCdp(primaryGameTab.webSocketDebuggerUrl, 'Page.reload');
  } else {
    console.log(
      `[foe-browser-control] Navigating existing game tab to ${targetUrl}...`,
    );
    await sendCdp(primaryGameTab.webSocketDebuggerUrl, 'Page.navigate', {
      url: targetUrl,
    });
  }

  // 8. Re-activate the game tab so it stays the user's active view
  try {
    await fetch(`${CDP_BASE}/json/activate/${primaryGameTab.id}`);
  } catch {}

  // 9. Bind OpenCLI session if opencli daemon is active
  try {
    const { execSync } = await import('node:child_process');
    execSync('opencli browser foe-game bind', {
      stdio: 'ignore',
      timeout: 3000,
    });
    console.log('[foe-browser-control] Bound OpenCLI "foe-game" session.');
  } catch {}

  console.log(
    '[foe-browser-control] Done. FoE-Info attached, DevTools docked, game loading on existing tab.',
  );
}

main().catch((err) => {
  console.error('[foe-browser-control] Error:', err.message);
  process.exit(1);
});
