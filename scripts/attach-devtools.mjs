#!/usr/bin/env node

/**
 * Attach FoE-Info to DevTools before opening the requested game world.
 * Uses an existing tab in the user's running Brave profile: en0 first, DevTools
 * and FoE-Info confirmation second, then en7/en16. No tabs are created or closed.
 */
import { execFileSync } from 'node:child_process';
import { activateTarget, BROWSERS, listTargets, send } from './lib/cdp.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const BROWSER = 'brave';

function parseArgs(args) {
  const options = { world: 'en7', tabId: null, reloadExtension: false };
  for (const arg of args) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--reload-extension') options.reloadExtension = true;
    else {
      const world = arg.match(/^--world=(.+)$/);
      const tabId = arg.match(/^--tab-id=(.+)$/);
      if (world) options.world = world[1].trim().toLowerCase();
      else if (tabId) options.tabId = tabId[1].trim();
      else throw new Error(`unknown option: ${arg}`);
    }
  }
  if (!['en7', 'en16'].includes(options.world)) {
    throw new Error(
      `unsupported world '${options.world}' (choose en7 or en16)`,
    );
  }
  return options;
}

function isFoEPageUrl(raw) {
  try {
    const url = new URL(raw);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      (url.hostname === 'forgeofempires.com' ||
        url.hostname.endsWith('.forgeofempires.com'))
    );
  } catch {
    return false;
  }
}

function worldOf(raw) {
  try {
    return new URL(raw).hostname.split('.')[0].toLowerCase();
  } catch {
    return '';
  }
}

async function waitForTarget(targetId, predicate, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const target = (await listTargets(BROWSER)).find(
      (entry) => entry.id === targetId && predicate(entry),
    );
    if (target) return target;
    await sleep(200);
  }
  return null;
}

async function waitForDocument(target, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await send(
        target.webSocketDebuggerUrl,
        'Runtime.evaluate',
        { expression: 'document.readyState', returnByValue: true },
      );
      if (response?.result?.value === 'complete') return true;
    } catch {
      // Navigation can briefly disconnect the target while its document swaps.
    }
    await sleep(300);
  }
  return false;
}

async function navigate(target, url) {
  await send(target.webSocketDebuggerUrl, 'Page.navigate', { url });
  const loadedTarget = await waitForTarget(
    target.id,
    (entry) => entry.type === 'page' && worldOf(entry.url) === worldOf(url),
  );
  if (!loadedTarget || !(await waitForDocument(loadedTarget))) {
    throw new Error(`page did not finish loading: ${url}`);
  }
  return loadedTarget;
}

async function maybeReloadExtension() {
  const targets = await listTargets(BROWSER);
  const panelTargets = targets.filter(
    (target) => target.type === 'iframe' && target.url?.includes('/panel.html'),
  );
  for (const panel of panelTargets) {
    try {
      const response = await send(
        panel.webSocketDebuggerUrl,
        'Runtime.evaluate',
        {
          expression: `(() => {
            if (typeof chrome === 'undefined' || !chrome.runtime?.reload) return false;
            setTimeout(() => chrome.runtime.reload(), 0);
            return true;
          })()`,
          returnByValue: true,
        },
      );
      if (response?.result?.value === true) {
        console.log('Extension reload requested on en0.');
        for (let attempt = 0; attempt < 75; attempt++) {
          const current = await listTargets(BROWSER);
          if (
            current.some(
              (target) =>
                target.type === 'iframe' && target.url?.includes('/panel.html'),
            )
          ) {
            return;
          }
          await sleep(200);
        }
        throw new Error('FoE-Info panel did not return after extension reload');
      }
    } catch (error) {
      if (error.message?.includes('did not return')) throw error;
    }
  }
  throw new Error('could not request extension reload from the en0 panel');
}

function findDevToolsTarget(targets, pageUrl) {
  const host = new URL(pageUrl).host.toLowerCase();
  return targets.find(
    (target) =>
      target.url?.startsWith('devtools://') &&
      (target.title?.toLowerCase().includes(host) ||
        target.url.toLowerCase().includes(host)),
  );
}

function pressF12() {
  const env = {
    ...process.env,
    // The installed system service uses ydotoold's default socket path.
    YDOTOOL_SOCKET: process.env.YDOTOOL_SOCKET || '/tmp/.ydotool_socket',
  };
  execFileSync('ydotool', ['key', '88:1', '88:0'], {
    stdio: 'ignore',
    timeout: 1500,
    env,
  });
}

async function showFoEInfoPanel(devtoolsTarget) {
  const response = await send(
    devtoolsTarget.webSocketDebuggerUrl,
    'Runtime.evaluate',
    {
      expression: `(async () => {
        try {
          const UI = await import('devtools://devtools/bundled/ui/legacy/legacy.js');
          const manager = UI.ViewManager.ViewManager.instance();
          const key = Array.from(manager?.views?.keys?.() || [])
            .find((viewId) => viewId.toLowerCase().includes('foe-info'));
          if (!key) return null;
          await manager.showView(key);
          return key;
        } catch {
          return null;
        }
      })()`,
      awaitPromise: true,
      returnByValue: true,
    },
  );
  return response?.result?.value ?? null;
}

function printHelp() {
  console.log(`Usage: npm run browser:attach -- [--world=en7|en16] [--tab-id=ID] [--reload-extension]

Uses Brave's existing default profile and an existing FoE tab. The selected
tab is routed through en0, DevTools opens, FoE-Info must be confirmed in
DevTools, and only then is that same tab routed to en7 or en16. No new tabs or
browser profiles are created; no tabs are closed. --reload-extension is optional.`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();

  console.log(`Browser: ${BROWSERS[BROWSER].label} (existing default profile)`);
  const initialTargets = await listTargets(BROWSER);
  const gameTabs = initialTargets.filter(
    (target) => target.type === 'page' && isFoEPageUrl(target.url),
  );
  const gameTab =
    options.tabId ? gameTabs.find((target) => target.id === options.tabId)
    : gameTabs.length === 1 ? gameTabs[0]
    : null;

  if (!gameTab) {
    const available = gameTabs
      .map((target) => `${target.id} ${target.url}`)
      .join('\n  ');
    throw new Error(
      gameTabs.length > 1 ?
        `multiple FoE tabs found; choose one with --tab-id=ID:\n  ${available}`
      : options.tabId ? `FoE tab '${options.tabId}' was not found`
      : 'no existing FoE tab found; this workflow never creates a tab',
    );
  }

  console.log(`Reusing FoE tab ${gameTab.id}.`);
  const en0Url = 'https://en0.forgeofempires.com/';
  const en0Tab =
    worldOf(gameTab.url) === 'en0' ? gameTab : await navigate(gameTab, en0Url);
  if (!(await waitForDocument(en0Tab))) {
    throw new Error('en0 did not finish loading; game tab left on en0');
  }
  console.log('Existing tab is on en0.');

  if (options.reloadExtension) await maybeReloadExtension();

  let targets = await listTargets(BROWSER);
  let devtoolsTarget = findDevToolsTarget(targets, en0Tab.url);
  if (!devtoolsTarget) {
    await activateTarget(BROWSER, en0Tab.id);
    await sleep(250);
    try {
      pressF12();
    } catch (error) {
      throw new Error(
        `could not open DevTools on en0 (${error.message}); game tab left on en0`,
        { cause: error },
      );
    }
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      targets = await listTargets(BROWSER);
      devtoolsTarget = findDevToolsTarget(targets, en0Tab.url);
      if (devtoolsTarget) break;
      await sleep(200);
    }
  }
  if (!devtoolsTarget) {
    throw new Error('DevTools did not attach to en0; game tab left on en0');
  }
  console.log('DevTools attached to en0.');

  let viewId = await showFoEInfoPanel(devtoolsTarget);
  if (!viewId) {
    throw new Error(
      'FoE-Info DevTools panel was not available; game tab left on en0',
    );
  }
  console.log(`FoE-Info DevTools panel opened: ${viewId}`);

  let panelReady = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    targets = await listTargets(BROWSER);
    if (targets.some((target) => target.url?.includes('/panel.html'))) {
      panelReady = true;
      break;
    }
    await sleep(200);
  }
  if (!panelReady) {
    throw new Error(
      'FoE-Info panel did not finish attaching; game tab left on en0',
    );
  }
  console.log('FoE-Info panel attachment confirmed.');

  const destination = `https://${options.world}.forgeofempires.com/game/index?ref=master-page-login`;
  console.log(
    `Opening ${options.world} in the same tab after panel confirmation.`,
  );
  await send(en0Tab.webSocketDebuggerUrl, 'Page.navigate', {
    url: destination,
  });
  console.log(`Navigation requested: ${destination}`);
}

main().catch((error) => {
  console.error(`[browser:attach] ${error.message}`);
  process.exitCode = 1;
});
