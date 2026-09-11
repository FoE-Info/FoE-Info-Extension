#!/usr/bin/env node
/** Fresh server entry: en0 -> CDP panel reload -> en7. Account cookies stay intact. */
import { WebSocket } from 'ws';
import {
  renderObserverExpression,
  saveFrames,
  startFrameCapture,
} from './startup-frame-capture.mjs';

const CDP_BASE = 'http://127.0.0.1:9222';
const standardMode = process.argv.includes('--standard');
const profileMode = process.argv.includes('--profile');
const framesMode = process.argv.includes('--frames');
const IDLE_MS = 5000;
const HARD_CAP_MS = 120000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchTargets() {
  const res = await fetch(`${CDP_BASE}/json`);
  if (!res.ok) throw new Error(`CDP HTTP error: ${res.status}`);
  return res.json();
}

// Subscribe before resetting the panel, and retain subscriptions across reloads.
async function connect(target, source, onEvent) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    if (!message.id) return onEvent(source, message);
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else if (message.result?.exceptionDetails)
      request.reject(new Error('CDP evaluation raised an exception'));
    else request.resolve(message.result);
  });
  const fail = () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error(`${source} CDP connection closed`));
    }
    pending.clear();
  };
  ws.on('close', fail);
  ws.on('error', fail);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`${source} CDP connection timeout`));
    }, 8000);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new Error(`${source} ${method} timeout`));
        }, 8000);
        pending.set(requestId, { resolve, reject, timer });
        ws.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    close: () => ws.close(),
  };
}

const evaluate = async (session, expression) =>
  (
    await session.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
  ).result?.value;

// Never print request bodies, tokens, or URL query strings from diagnostics.
const sanitize = (text) =>
  text.replace(/https?:\/\/[^\s]+/g, (value) => {
    try {
      const url = new URL(value);
      return `${url.origin}${url.pathname}`;
    } catch {
      return '[URL]';
    }
  });

async function main() {
  const targets = await fetchTargets();
  const panel = targets.find((t) =>
    /^chrome-extension:\/\/[^/]+\/panel\.html$/.test(t.url),
  );
  const game = targets.find(
    (t) =>
      t.type === 'page' &&
      /^https:\/\/en(?:0|7)\.forgeofempires\.com\//.test(t.url),
  );
  if (!panel || !game)
    throw new Error(
      'Existing FoE-Info panel and en0/en7 game tab required; launch the established foe-browser flow first.',
    );
  const extensionOrigin = `chrome-extension://${new URL(panel.url).host}`;
  const captures = [
    [game, 'game'],
    [panel, 'panel'],
    ...targets
      .filter(
        (t) =>
          t.url.startsWith(`${extensionOrigin}/`) &&
          t.url.endsWith('/devtools.html'),
      )
      .map((t) => [t, 'extension-devtools']),
  ];
  if (framesMode) {
    const devtools = targets.find(
      (t) => t.type === 'page' && t.url.startsWith('devtools://'),
    );
    if (!devtools)
      throw new Error('Existing DevTools page required for frame capture');
    captures.push([devtools, 'devtools-frame']);
  }
  const sessions = [];
  const logs = [];
  const renders = [];
  const frames = [];
  const loopCounts = [];
  let activeLoop;
  let frameSession;
  let frameCapture = false;
  const network = [];
  const inFlight = new Map();
  let lastActivity = Date.now();
  let settled = false;
  let finalDom;
  const entityCounts = new Map();
  const diagnosticCounts = {
    MetadataStore: 0,
    CityStatsCalc: 0,
    PanelDispatcher: 0,
  };
  let captureStart = Infinity;
  let navStart;
  let originalDebug;
  let debugChanged = false;
  let panelSession;
  let failures = 0;
  const onEvent = (source, message) => {
    const now = Date.now();
    if (message.method === 'Page.screencastFrame') {
      if (navStart)
        frames.push({
          time: message.params.metadata.timestamp * 1000,
          data: message.params.data,
        });
      frameSession
        ?.send('Page.screencastFrameAck', {
          sessionId: message.params.sessionId,
        })
        .catch(() => {});
    }
    if (now >= captureStart && message.method === 'Network.requestWillBeSent') {
      const { requestId, request, type } = message.params;
      const url = new URL(request.url);
      if (
        type !== 'WebSocket' &&
        /(^|\.)(forgeofempires\.com|innogamescdn\.com)$/.test(url.hostname) &&
        /\/game\/json|\/metadata|\/start\/metadata/.test(url.pathname)
      ) {
        const event = { source, time: now, path: url.pathname, kind: 'start' };
        try {
          const batch = JSON.parse(request.postData ?? 'null');
          if (Array.isArray(batch))
            event.services = batch
              .map((item) => `${item.requestClass}.${item.requestMethod}`)
              .filter((name) => /^[A-Za-z]+\.[A-Za-z]+$/.test(name));
        } catch {
          /* Payload contents are never printed. */
        }
        inFlight.set(`${source}:${requestId}`, event);
        network.push(event);
        lastActivity = now;
      }
    }
    if (/^Network\.loading(Finished|Failed)$/.test(message.method)) {
      const key = `${source}:${message.params.requestId}`;
      const request = inFlight.get(key);
      if (request) {
        network.push({
          ...request,
          time: now,
          kind: message.method.endsWith('Failed') ? 'failed' : 'end',
        });
        inFlight.delete(key);
        lastActivity = now;
      }
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const time = message.params.timestamp;
      if (time < captureStart) return;
      const text = message.params.args
        .map((arg) => String(arg.value ?? arg.description ?? ''))
        .join(' ');
      if (source === 'panel') {
        if (text.includes('[TIMING:P4a]'))
          activeLoop = { start: time, counts: {} };
        if (text.includes('[TIMING:P4b]') && activeLoop) {
          loopCounts.push({ ...activeLoop, end: time });
          activeLoop = null;
        }
        const diagnosticModule = text.match(/\[FoE-Info:([^\]]+)\]/)?.[1];
        if (activeLoop && diagnosticModule)
          activeLoop.counts[diagnosticModule] =
            (activeLoop.counts[diagnosticModule] ?? 0) + 1;
        const entity = text.match(/Entity cached:\s*(\S+)/)?.[1];
        if (entity)
          entityCounts.set(entity, (entityCounts.get(entity) ?? 0) + 1);
        for (const key of Object.keys(diagnosticCounts))
          if (text.includes(`[FoE-Info:${key}]`)) diagnosticCounts[key]++;
      }
      // Game-side logs originate from xhrInterceptor in the page context. Keep their original panel copy only.
      if (
        text.includes('[TIMING:') &&
        !(source === 'game' && /\[TIMING:P[13456][a-z]*\]/.test(text))
      ) {
        logs.push({ source, time, text: sanitize(text) });
        lastActivity = now;
      }
    }
    if (
      message.method === 'Runtime.bindingCalled' &&
      message.params.name === '__foeTimingRender'
    ) {
      renders.push(JSON.parse(message.params.payload));
      lastActivity = now;
    }
    if (
      message.method === 'Runtime.exceptionThrown' &&
      message.params.timestamp >= captureStart
    ) {
      failures++;
      console.error(
        `[CDP Verify] Runtime exception in ${source} (details omitted to protect session data)`,
      );
    }
  };
  try {
    for (const [target, source] of captures) {
      const session = await connect(target, source, onEvent);
      sessions.push(session);
      if (source === 'devtools-frame') frameSession = session;
      await session.send('Runtime.enable');
      await session.send('Page.enable');
      if (source === 'game' || source === 'panel')
        await session.send('Network.enable');
    }
    const gameSession = sessions[0];
    panelSession = sessions[1];
    originalDebug = await evaluate(
      panelSession,
      'chrome.storage.local.get("debugEnabled")',
    );
    debugChanged = true;
    await evaluate(
      panelSession,
      `chrome.storage.local.set({debugEnabled: ${!standardMode}})`,
    );

    console.log(
      '[CDP Verify] Navigating directly to en0; account session unchanged.',
    );
    const leave = await gameSession.send('Page.navigate', {
      url: 'https://en0.forgeofempires.com/',
    });
    if (leave.errorText)
      throw new Error(`en0 navigation failed: ${leave.errorText}`);
    await sleep(1500);

    captureStart = Date.now();
    console.log(
      '[CDP Verify] Resetting panel module state through CDP Runtime.evaluate; capture already attached.',
    );
    // Page.reload is unavailable on an iframe target. Reload this panel's
    // document through CDP without dispatching any user-input events.
    await panelSession.send('Runtime.evaluate', {
      expression: 'setTimeout(() => location.reload(), 0); true',
      returnByValue: true,
    });
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      await sleep(100);
      try {
        ready = await evaluate(
          panelSession,
          'document.readyState === "complete" && !!document.getElementById("citystats") && typeof window.handleRawNetworkEntry === "function" && Array.isArray(window.foeRpcLog)',
        );
      } catch {
        /* The old execution context disappears during reload. */
      }
      if (ready) break;
    }
    if (!ready) throw new Error('Fresh panel did not become ready');
    const initial = await evaluate(
      panelSession,
      `({
      fullCard: !!document.getElementById('citystats-copy-btn'),
      textLength: document.getElementById('citystats')?.innerText.trim().length,
      timeOrigin: performance.timeOrigin,
      rpcMessages: window.foeRpcLog?.length ?? null,
    })`,
    );
    console.log('[CDP Verify] Fresh panel baseline:', initial);
    if (initial.fullCard || initial.rpcMessages !== 0)
      throw new Error(
        'Fresh panel baseline requires an empty RPC log and no City Info card',
      );
    await panelSession.send('Runtime.addBinding', {
      name: '__foeTimingRender',
    });
    await evaluate(panelSession, renderObserverExpression(framesMode));
    if (profileMode) {
      await panelSession.send('Profiler.enable');
      await panelSession.send('Profiler.start');
    }
    if (framesMode) frameCapture = await startFrameCapture(frameSession);
    navStart = Date.now();
    console.log(
      `[CDP Verify] Navigating directly to en7; Debug Mode ${!standardMode}; capture until startup completed, valid card, and network/render activity quiet for ${IDLE_MS}ms (hard cap ${HARD_CAP_MS}ms).`,
    );
    const entered = await gameSession.send('Page.navigate', {
      url: 'https://en7.forgeofempires.com/game/index',
    });
    if (entered.errorText)
      throw new Error(`en7 navigation failed: ${entered.errorText}`);
    const inspectDom = () =>
      evaluate(
        panelSession,
        `({
      fullCard: !!document.getElementById('citystats-copy-btn'),
      noSpinner: !document.querySelector('#citystats .spinner-border'),
      textLength: document.getElementById('citystats')?.textContent.length ?? 0,
      rpcCount: window.foeRpcLog?.length ?? null,
      startupProcessed: window.foeRpcLog?.some(entry => entry.requestClass === 'StartupService' && entry.requestMethod === 'getData'),
    })`,
      );
    let progressAt = navStart;
    while (Date.now() - navStart < HARD_CAP_MS) {
      await sleep(500);
      const startupDone =
        standardMode || logs.some((log) => log.text.includes('[TIMING:P4z]'));
      const rendered =
        standardMode ?
          renders.some((render) => render.fullCard && !render.spinner)
        : logs.some((log) =>
            log.text.includes('[TIMING:P6] renderCityStats panel DOM updated'),
          );
      if (
        startupDone &&
        rendered &&
        inFlight.size === 0 &&
        Date.now() - lastActivity >= IDLE_MS
      ) {
        finalDom = await inspectDom();
        if (
          finalDom?.startupProcessed &&
          finalDom.fullCard &&
          finalDom.noSpinner &&
          finalDom.textLength &&
          inFlight.size === 0 &&
          Date.now() - lastActivity >= IDLE_MS
        ) {
          settled = true;
          break;
        }
      }
      if (Date.now() - progressAt >= 15000) {
        console.log(
          `[CDP Verify] ${(Date.now() - navStart) / 1000}s elapsed; relevant requests pending=${inFlight.size}, quiet=${Date.now() - lastActivity}ms.`,
        );
        progressAt = Date.now();
      }
    }
    finalDom ??= await inspectDom();
    if (frameCapture) {
      await frameSession.send('Page.stopScreencast');
      frameCapture = false;
      await saveFrames(frames, navStart, { renders, logs, loopCounts });
    }
    if (profileMode) {
      const { profile } = await panelSession.send('Profiler.stop');
      const counts = new Map();
      for (const sample of profile.samples ?? [])
        counts.set(sample, (counts.get(sample) ?? 0) + 1);
      console.log(
        'Panel CPU profile top self-sample counts (sampling evidence, not wall-clock phase duration):',
        profile.nodes
          .map((node) => ({
            name: node.callFrame.functionName || '(anonymous)',
            file: sanitize(node.callFrame.url).split('?')[0],
            line: node.callFrame.lineNumber + 1,
            samples: counts.get(node.id) ?? 0,
          }))
          .sort((a, b) => b.samples - a.samples)
          .slice(0, 15),
      );
      await panelSession.send('Profiler.disable');
    }
    console.log(
      `[CDP Verify] Capture ${settled ? 'settled' : 'HARD CAP reached without settlement'} at ${Date.now() - navStart}ms; idle criterion=${IDLE_MS}ms. Future server events remain possible.`,
    );
    console.log(
      '[CDP Verify] Final DOM snapshot (not a render timestamp):',
      finalDom,
    );

    console.log(
      '\nP1-P6 timing: milliseconds relative to host en7 Page.navigate dispatch; P1 can precede entry.',
    );
    for (let phase = 1; phase <= 6; phase++) {
      const found = logs.filter((log) =>
        new RegExp(`\\[TIMING:P${phase}[a-z]*\\]`).test(log.text),
      );
      if (!found.length)
        console.log(
          `P${phase}: NOT CAPTURED${standardMode ? ' (Debug Mode off control run)' : ''}`,
        );
      if (phase === 5 && found.length) {
        for (const label of [
          'resolveMissingCityEntities start',
          'CDN fetch START',
          'CDN fetch SUCCESS',
          'CDN fetch FAIL',
          'CDN fetch ERROR',
        ]) {
          const events = found.filter((log) => log.text.includes(label));
          console.log(
            `P5 ${label}: count=${events.length}; first=${events.length ? (events[0].time - navStart).toFixed(2) + 'ms' : 'none'}; last=${events.length ? (events.at(-1).time - navStart).toFixed(2) + 'ms' : 'none'}`,
          );
        }
        for (const log of found.filter(
          (log) => !/CDN fetch (START|SUCCESS|FAIL|ERROR)/.test(log.text),
        ))
          console.log(
            `${(log.time - navStart).toFixed(2)}ms [${log.source}] ${log.text}`,
          );
        continue;
      }
      for (const log of found)
        console.log(
          `${(log.time - navStart).toFixed(2)}ms [${log.source}] ${log.text}`,
        );
    }
    const startup = logs.find(
      (log) => log.source === 'panel' && log.text.includes('[TIMING:P4]'),
    );
    const completions =
      startup ?
        logs.filter(
          (log) =>
            log.source === 'panel' &&
            log.time >= startup.time &&
            log.text.includes('[TIMING:P6] renderCityStats panel DOM updated'),
        )
      : [];
    const fullRenders = renders.filter(
      (render) => render.fullCard && !render.spinner,
    );
    const completion = standardMode ? fullRenders.at(-1) : completions.at(-1);
    const preliminary = fullRenders.find(
      (render) => !startup || render.time < startup.time,
    );
    const offset = (event) =>
      event ? `${(event.time - navStart).toFixed(2)}ms` : 'NOT OBSERVED';
    console.log(
      standardMode ?
        'First observed card (P4 marker disabled):'
      : 'Preliminary card BEFORE StartupService (not the startup result):',
      offset(preliminary),
    );
    console.log(
      standardMode ?
        'Last observed card update before settlement:'
      : 'Last observed post-startup render completion before settlement:',
      offset(completion),
    );
    console.log(
      'City Info DOM transitions:',
      renders.map((render) => ({
        ms: +(render.time - navStart).toFixed(2),
        fullCard: render.fullCard,
        spinner: render.spinner,
      })),
    );
    console.log(
      'Relevant RPC/metadata network timeline (paths only):',
      JSON.stringify(
        network.map((event) => ({
          ...event,
          time: +(event.time - navStart).toFixed(2),
        })),
      ),
    );
    console.log(
      'P6 metadata-ready precedes recomputation; P6 DOM-updated is the completion endpoint, not compositor paint.',
    );
    console.log(
      'Comparison baseline: authenticated warm-panel reload 2826–2962ms; this run resets panel memory, retaining account and HTTP caches.',
    );
    if (completion)
      console.log(
        `Last observed startup completion difference from baseline: ${(completion.time - navStart - 2962).toFixed(2)} to ${(completion.time - navStart - 2826).toFixed(2)}ms`,
      );
    const duplicates = [...entityCounts.values()].filter(
      (count) => count > 1,
    ).length;
    console.log('Panel diagnostic counts:', diagnosticCounts);
    console.log(
      'P4a to P4b loop diagnostic counts:',
      loopCounts.map((loop) => ({
        startMs: loop.start - navStart,
        endMs: loop.end - navStart,
        counts: loop.counts,
      })),
    );
    if (framesMode)
      console.log(
        'Numeric DOM/rAF snapshots:',
        JSON.stringify(
          renders.map((render) => ({
            ...render,
            time: render.time - navStart,
          })),
        ),
      );
    console.log(
      `Entity-cache diagnostics: ${entityCounts.size} unique IDs; ${duplicates} repeated IDs (zero entries does not prove coverage).`,
    );
    if (
      !settled ||
      !completion ||
      !finalDom?.fullCard ||
      !finalDom.noSpinner ||
      !finalDom.textLength ||
      failures
    )
      throw new Error(
        `Measurement incomplete: startup completion=${Boolean(completion)}, final card=${Boolean(finalDom?.fullCard)}, no spinner=${Boolean(finalDom?.noSpinner)}, runtime exceptions=${failures}`,
      );
  } finally {
    if (frameCapture)
      await frameSession.send('Page.stopScreencast').catch(() => {});
    if (panelSession) {
      try {
        await evaluate(
          panelSession,
          'window.__foeTimingObserver?.disconnect(); cancelAnimationFrame(window.__foeTimingRAF); delete window.__foeTimingObserver; delete window.__foeTimingRAF;',
        );
        await panelSession.send('Runtime.removeBinding', {
          name: '__foeTimingRender',
        });
      } finally {
        if (debugChanged) {
          try {
            await evaluate(
              panelSession,
              Object.hasOwn(originalDebug ?? {}, 'debugEnabled') ?
                `chrome.storage.local.set(${JSON.stringify(originalDebug)})`
              : 'chrome.storage.local.remove("debugEnabled")',
            );
            console.log('[CDP Verify] Original Debug Mode setting restored.');
          } finally {
            for (const session of sessions) session.close();
          }
        } else {
          for (const session of sessions) session.close();
        }
      }
    } else {
      for (const session of sessions) session.close();
    }
  }
}

main().catch((error) => {
  console.error('[CDP Verify]', error.message);
  process.exitCode = 1;
});
