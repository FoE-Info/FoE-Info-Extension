#!/usr/bin/env node

/**
 * Passive traffic recorder for the running Forge of Empires tab.
 *
 * Observes only. CDP Network, Runtime and Log enablement is read-only: this
 * script never clicks, types, navigates, reloads, or writes into a page. It
 * streams observed events to stdout and writes nothing to disk.
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
 * Start it before the operator's already-planned activity. It streams game
 * page request/response metadata, XHR/fetch bodies, WebSocket lifecycle and
 * frame payloads, console output and runtime errors as JSON Lines. It also
 * observes FoE-Info extension contexts (including the panel and service worker)
 * when those targets are exposed by the browser.
 * It never initiates a game action and keeps no action history or cross-run
 * deduplication. Each invocation captures events from when it is armed. CDP
 * cannot recover traffic from before that time.
 *
 * Game tabs are observed read-only; see docs/browser-debugging.md.
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
  onEvent = () => {},
} = {}) {
  const endpoint = await resolveEndpoint(browser);
  const nextId = { n: 1 };
  const waiters = new Map();
  const handlers = [];
  const seen = new Map();
  const urls = new Set();
  const eventCounts = new Map();
  const sessions = new Map();
  const requests = new Map();

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
      let timeout;
      waiters.set(id, (m) => {
        clearTimeout(timeout);
        if (m.error) reject(new Error(m.error.message));
        else resolve(m.result);
      });
      ws.send(JSON.stringify(msg));
      timeout = setTimeout(() => {
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

  const panelTargets = targetInfos.filter(
    (t) =>
      t.targetId !== game.targetId &&
      /chrome-extension:\/\/[^/]+\/.*panel\.html/.test(t.url || ''),
  );
  const extensionId = panelTargets[0]?.url.match(
    /^chrome-extension:\/\/([^/]+)\//,
  )?.[1];
  const extensionTargets =
    extensionId ?
      targetInfos.filter(
        (t) =>
          t.targetId !== game.targetId &&
          (t.url || '').startsWith(`chrome-extension://${extensionId}/`),
      )
    : panelTargets;
  const targets = [
    { target: game, kind: 'game' },
    ...extensionTargets.map((target) => ({
      target,
      kind:
        /\/panel\.html(?:[?#]|$)/.test(target.url) ? 'foe-info-panel' : (
          'foe-info-context'
        ),
    })),
  ];

  const emit = (targetId, method, params, extra = {}) => {
    const target = targets.find((item) => item.target.targetId === targetId);
    eventCounts.set(method, (eventCounts.get(method) || 0) + 1);
    onEvent({
      observedAt: new Date().toISOString(),
      target: target?.kind || 'unknown',
      targetUrl: target?.target.url,
      method,
      params,
      ...extra,
    });
  };

  handlers.push((message) => {
    const sessionId = message.sessionId;
    const targetId = sessions.get(sessionId);
    if (!targetId) return;
    const { method, params } = message;
    if (
      ![
        'Network.requestWillBeSent',
        'Network.responseReceived',
        'Network.loadingFinished',
        'Network.loadingFailed',
        'Network.webSocketCreated',
        'Network.webSocketWillSendHandshakeRequest',
        'Network.webSocketHandshakeResponseReceived',
        'Network.webSocketFrameSent',
        'Network.webSocketFrameReceived',
        'Network.webSocketClosed',
        'Runtime.consoleAPICalled',
        'Runtime.exceptionThrown',
        'Log.entryAdded',
      ].includes(method)
    )
      return;

    if (method === 'Network.requestWillBeSent') {
      const { request, requestId, type } = params;
      requests.set(`${sessionId}:${requestId}`, {
        url: request.url,
        type,
        request,
      });
      if (
        /start\/metadata|foeen\.innogamescdn|client_lang/.test(
          request.url || '',
        )
      )
        urls.add(request.url.slice(0, 160));
      if (/\/game\/json/.test(request.url || '') && request.postData) {
        try {
          const data = JSON.parse(request.postData);
          for (const item of Array.isArray(data) ? data
          : data.data ? data.data
          : [data]) {
            if (!item?.requestClass) continue;
            const key = `${item.requestClass}.${item.requestMethod}`;
            seen.set(key, (seen.get(key) || 0) + 1);
          }
        } catch {
          /* Preserve the original body in the emitted event. */
        }
      }
      if (request.hasPostData && request.postData === undefined) {
        cdp('Network.getRequestPostData', { requestId }, sessionId)
          .then((body) =>
            emit(targetId, 'Network.requestBody', {
              requestId,
              url: request.url,
              ...body,
            }),
          )
          .catch((error) =>
            emit(targetId, 'Network.requestBodyUnavailable', {
              requestId,
              url: request.url,
              reason: error.message,
            }),
          );
      }
    }

    if (method === 'Network.responseReceived') {
      const request = requests.get(`${sessionId}:${params.requestId}`);
      if (request) request.type = params.type;
    }

    emit(targetId, method, params);

    if (method === 'Network.loadingFinished') {
      const key = `${sessionId}:${params.requestId}`;
      const request = requests.get(key);
      requests.delete(key);
      if (
        request &&
        ['XHR', 'Fetch', 'Document'].includes(request.type) &&
        !request.url.startsWith('chrome-extension://')
      ) {
        cdp(
          'Network.getResponseBody',
          { requestId: params.requestId },
          sessionId,
        )
          .then((body) =>
            emit(targetId, 'Network.responseBody', {
              requestId: params.requestId,
              url: request.url,
              ...body,
            }),
          )
          .catch((error) =>
            emit(targetId, 'Network.responseBodyUnavailable', {
              requestId: params.requestId,
              url: request.url,
              reason: error.message,
            }),
          );
      }
    }

    if (method === 'Network.loadingFailed')
      requests.delete(`${sessionId}:${params.requestId}`);
    if (method === 'Network.webSocketClosed')
      requests.delete(`${sessionId}:${params.requestId}`);
  });

  const armedTargets = [];
  for (const { target, kind } of targets) {
    let sessionId;
    try {
      ({ sessionId } = await cdp('Target.attachToTarget', {
        targetId: target.targetId,
        flatten: true,
      }));
    } catch (error) {
      if (kind === 'game') throw error;
      onEvent({
        observedAt: new Date().toISOString(),
        method: 'Recorder.targetUnavailable',
        target: kind,
        targetUrl: target.url,
        reason: error.message,
      });
      continue;
    }
    sessions.set(sessionId, target.targetId);
    const enabled = [];
    const domains = [
      [
        'Network',
        {
          maxTotalBufferSize: 100_000_000,
          maxResourceBufferSize: 20_000_000,
          maxPostDataSize: 20_000_000,
        },
      ],
      ['Runtime', {}],
      ['Log', {}],
    ];
    for (const [domain, params] of domains) {
      try {
        await cdp(`${domain}.enable`, params, sessionId);
        enabled.push(domain);
      } catch (error) {
        if (kind === 'game') throw error;
        onEvent({
          observedAt: new Date().toISOString(),
          method: 'Recorder.domainUnavailable',
          target: kind,
          targetUrl: target.url,
          domain,
          reason: error.message,
        });
      }
    }
    armedTargets.push({ kind, url: target.url, domains: enabled });
  }

  onEvent({
    observedAt: new Date().toISOString(),
    method: 'Recorder.ready',
    targets: armedTargets,
    seconds,
  });

  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

  const methods = [...seen.entries()]
    .map(([rpc, n]) => ({ rpc, n }))
    .sort((a, b) => b.n - a.n);
  ws.close();
  return {
    url: game.url,
    methods,
    urls: printUrls ? [...urls] : [],
    printed: printUrls,
    targets: targets.map(({ target, kind }) => ({ kind, url: target.url })),
    eventCounts: Object.fromEntries(eventCounts),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const browser =
    args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || 'brave';
  const seconds = Number(args.find((a) => /^\d+$/.test(a)) || 30);
  const printUrls = args.includes('--urls');
  const result = await record({
    browser,
    seconds,
    printUrls,
    onEvent: (event) => console.log(JSON.stringify(event)),
  });
  console.log(JSON.stringify({ summary: result }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(String(e.message || e));
    process.exit(1);
  });
}
