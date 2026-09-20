#!/usr/bin/env node

/**
 * Orchestrates foe-browser CDP automation:
 * 1. Tab deduplication: Reuses existing FoE tab, closes redundant game tabs.
 * 2. Extension reload: Triggers reload in chrome://extensions or via chrome.runtime.
 * 3. DevTools docking & focus: Ensures DevTools is open and FoE-Info panel is focused.
 * 4. World navigation: Navigates to requested world (default en7, or en16) without opening new tabs.
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

async function focusDevToolsPanel(gameTab) {
  const isFoeTab =
    gameTab &&
    /^https?:\/\/(?:[a-z]{2}[0-9]*|zz[0-9]*)\.forgeofempires\.com/i.test(
      gameTab.url || '',
    );

  for (let attempt = 0; attempt < 25; attempt++) {
    const targets = await fetchTargets();
    const dt = targets.find((t) => t.url && t.url.startsWith('devtools://'));
    if (!dt && attempt === 2 && isFoeTab) {
      try {
        await fetch(`${CDP_BASE}/json/activate/${gameTab.id}`);
        const { execSync } = await import('node:child_process');
        execSync('ydotool key 88:1 88:0', { stdio: 'ignore', timeout: 1000 });
      } catch {}
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
          return true;
        }
      } catch {}
    }
    await sleep(250);
  }
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
  const foeTabs = targets.filter(
    (t) => t.type === 'page' && t.url && t.url.includes('forgeofempires.com'),
  );

  // Deduplicate game tabs: keep exactly 1, close extras
  let primaryGameTab = foeTabs[0];
  if (foeTabs.length > 1) {
    console.log(
      `[foe-browser-control] Found ${foeTabs.length} FoE tabs. Deduplicating...`,
    );
    for (let i = 1; i < foeTabs.length; i++) {
      try {
        await fetch(`${CDP_BASE}/json/close/${foeTabs[i].id}`);
      } catch {}
    }
  } else if (!primaryGameTab) {
    const blankTab = targets.find(
      (t) =>
        t.type === 'page' &&
        (t.url === 'about:blank' || t.url.includes('chrome://newtab')),
    );
    if (blankTab) {
      primaryGameTab = blankTab;
    } else {
      console.log(
        '[foe-browser-control] No existing FoE tab found. Opening initial en0 tab...',
      );
      const newRes = await fetch(
        `${CDP_BASE}/json/new?https://en0.forgeofempires.com/`,
      );
      primaryGameTab = await newRes.json();
    }
  }

  // Reload the extension
  await reloadExtension(targets);
  await sleep(400);

  // Reload DevTools window if open to refresh extension bindings
  targets = await fetchTargets();
  const dtTarget = targets.find(
    (t) => t.url && t.url.startsWith('devtools://'),
  );
  if (dtTarget) {
    try {
      await sendCdp(dtTarget.webSocketDebuggerUrl, 'Page.reload');
    } catch {}
  }

  // Focus FoE-Info panel
  await focusDevToolsPanel(primaryGameTab);

  // Wait up to 3s for panel.html to mount
  for (let i = 0; i < 15; i++) {
    const current = await fetchTargets();
    if (current.some((t) => t.url && t.url.includes('panel.html'))) {
      console.log('[foe-browser-control] panel.html confirmed mounted.');
      break;
    }
    await sleep(200);
  }

  // Reuse existing game tab: navigate to world or reload if already there
  console.log(
    `[foe-browser-control] Reusing existing game tab (${primaryGameTab.id})...`,
  );
  if (
    primaryGameTab.url &&
    primaryGameTab.url.includes(`${world}.forgeofempires.com`)
  ) {
    console.log(
      '[foe-browser-control] Already on target world. Reloading game page...',
    );
    await sendCdp(primaryGameTab.webSocketDebuggerUrl, 'Page.reload');
  } else {
    console.log(`[foe-browser-control] Navigating game tab to ${targetUrl}...`);
    await sendCdp(primaryGameTab.webSocketDebuggerUrl, 'Page.navigate', {
      url: targetUrl,
    });
  }

  // Activate game tab so it stays the user's active view
  try {
    await fetch(`${CDP_BASE}/json/activate/${primaryGameTab.id}`);
  } catch {}

  // Bind OpenCLI session if opencli is available
  try {
    const { execSync } = await import('node:child_process');
    execSync('opencli browser foe-game bind', {
      stdio: 'ignore',
      timeout: 3000,
    });
    console.log('[foe-browser-control] Bound OpenCLI "foe-game" session.');
  } catch {}

  console.log(
    '[foe-browser-control] Done. FoE-Info attached, DevTools docked, game loading.',
  );
}

main().catch((err) => {
  console.error('[foe-browser-control] Error:', err.message);
  process.exit(1);
});
