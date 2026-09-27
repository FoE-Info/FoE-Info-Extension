#!/usr/bin/env node

/**
 * Passive network recorder for the running Forge of Empires tab.
 *
 * Observes only. `Network.enable` is a read-only CDP domain: this script never
 * clicks, types, or navigates, and it only reports what the GAME sends. It
 * writes nothing to disk.
 *
 * ## Why this exists
 *
 * `metadata:download` cannot refresh the RPC sample corpus: entity metadata is
 * read live from `BuildingEntityLookup`, but the RPC exports are re-read from
 * the stored `raw_rpc_capture.json`. Measured 2026-09-27 — six methods seen in
 * live traffic were absent from `metadata-store/rpc/` purely because the
 * corpus derives from a four-day-old capture.
 *
 * HAR export is the usual alternative and it is unreliable: three attempts in
 * Brave produced 0-byte files against a log of 5,803 requests / 273 MB, and
 * filtering the view does not help because the exporter serialises the whole
 * log rather than the visible rows.
 *
 * ## Usage
 *
 *   node scripts/record-live-rpc.mjs [brave|chrome] [seconds] [--urls]
 *
 * Start it, then click around in the game. It prints every distinct
 * `requestClass.requestMethod` it saw, with call counts.
 *
 * Game tabs are observed read-only per `.agents/rules/browser-environment-hygiene.md`.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ACTIVE_PORT_FILES = {
  brave: join(
    homedir(),
    '.var/app/com.brave.Browser/config/BraveSoftware/Brave-Browser/DevToolsActivePort',
  ),
  chrome: join(
    homedir(),
    '.var/app/com.google.Chrome/config/google-chrome/DevToolsActivePort',
  ),
};

export const GAME_URL = /forgeofempires\.com\/game/;

/** Resolve the browser-level WebSocket URL, preferring live discovery. */
export async function resolveEndpoint(browser) {
  const file = ACTIVE_PORT_FILES[browser];
  if (!file)
    throw new Error(
      `unknown browser '${browser}' (have: ${Object.keys(ACTIVE_PORT_FILES).join(', ')})`,
    );
  const [port, path] = readFileSync(file, 'utf8').trim().split('\n');
  const origin = `http://127.0.0.1:${port}`;
  // DevToolsActivePort carries a per-launch UUID and goes stale across restarts.
  // Brave serves /json/version; Chrome's toggle-started server does not, which
  // is why the file is still consulted.
  try {
    const res = await fetch(`${origin}/json/version`, {
      headers: { Origin: origin },
    });
    if (res.ok) return (await res.json()).webSocketDebuggerUrl;
  } catch {
    /* fall through to the file */
  }
  return `ws://127.0.0.1:${port}${path}`;
}

export async function record({
  browser = 'brave',
  seconds = 30,
  printUrls = false,
} = {}) {
  const endpoint = await resolveEndpoint(browser);
  const nextId = { n: 1 };
  const waiters = new Map();
  const handlers = [];
  const seen = new Map();
  const urls = new Set();

  const ws = new WebSocket(endpoint);
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data.toString());
    if (m.id !== undefined && waiters.has(m.id)) {
      waiters.get(m.id)(m);
      waiters.delete(m.id);
      return;
    }
    if (m.method) for (const h of handlers) h(m);
  };
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error(`websocket failed: ${endpoint}`));
  });

  function cdp(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = nextId.n++;
      const msg = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      waiters.set(id, (m) =>
        m.error ? reject(new Error(m.error.message)) : resolve(m.result),
      );
      ws.send(JSON.stringify(msg));
      setTimeout(() => {
        if (waiters.has(id)) {
          waiters.delete(id);
          reject(new Error(`${method} timed out`));
        }
      }, 15000);
    });
  }

  const { targetInfos } = await cdp('Target.getTargets');
  const game = targetInfos.find(
    (t) => t.type === 'page' && GAME_URL.test(t.url || ''),
  );
  if (!game) {
    throw new Error(
      `no game tab found. pages:\n${targetInfos
        .filter((t) => t.type === 'page')
        .map((t) => `  ${t.url}`)
        .join('\n')}`,
    );
  }

  const { sessionId } = await cdp('Target.attachToTarget', {
    targetId: game.targetId,
    flatten: true,
  });

  handlers.push((m) => {
    if (m.method !== 'Network.requestWillBeSent') return;
    const { request } = m.params;
    const u = request.url || '';
    if (/start\/metadata|foeen\.innogamescdn|client_lang/.test(u))
      urls.add(u.slice(0, 96));
    if (!/\/game\/json/.test(u) || !request.postData) return;
    try {
      const d = JSON.parse(request.postData);
      for (const item of Array.isArray(d) ? d
      : d.data ? d.data
      : [d]) {
        if (!item?.requestClass) continue;
        const k = `${item.requestClass}.${item.requestMethod}`;
        seen.set(k, (seen.get(k) || 0) + 1);
      }
    } catch {
      /* body was not JSON */
    }
  });

  await cdp('Network.enable', {}, sessionId);
  await new Promise((r) => setTimeout(r, seconds * 1000));

  const methods = [...seen.entries()]
    .map(([rpc, n]) => ({ rpc, n }))
    .sort((a, b) => b.n - a.n);
  ws.close();
  return { url: game.url, methods, urls: [...urls], printed: printUrls };
}

async function main() {
  const args = process.argv.slice(2);
  const browser =
    args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || 'brave';
  const seconds = Number(args.find((a) => /^\d+$/.test(a)) || 30);
  const printUrls = args.includes('--urls');
  const result = await record({ browser, seconds, printUrls });
  console.log(
    `\n=== ${result.methods.length} distinct RPC methods on ${result.url.slice(0, 60)} ===`,
  );
  for (const { rpc, n } of result.methods)
    console.log(`  ${String(n).padStart(3)}x  ${rpc}`);
  if (printUrls) {
    console.log(`\n=== ${result.urls.length} matching URLs ===`);
    for (const u of result.urls.slice(0, 40)) console.log(`  ${u}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(String(e.message || e));
    process.exit(1);
  });
}
