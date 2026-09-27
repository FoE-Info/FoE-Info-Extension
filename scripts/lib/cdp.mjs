/**
 * CDP transport for the Flatpak Brave and Chrome instances.
 *
 * The two expose different servers:
 *   Brave  — started by --remote-debugging-port; serves /json/version AND the
 *            WebSocket endpoint.
 *   Chrome — started by the chrome://inspect toggle; serves the WebSocket
 *            endpoint ONLY, and answers 404 on every /json route. Its port is
 *            chosen by the toggle, so it is read from DevToolsActivePort.
 *
 * Discovery is therefore tried first and the active-port file is the
 * fallback; anything relying on the /json HTTP routes breaks on Chrome.
 * Both browsers need --remote-allow-origins in their *-flags.conf, read at
 * browser start.
 *
 * Nothing here navigates, reloads, or writes to a page.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir();

/**
 * Known browser instances and where their endpoint lives.
 * `port` is the expected/debug port; `activePortFile` is authoritative when
 * present, because the toggle may pick a different one.
 */
export const BROWSERS = {
  brave: {
    label: 'Brave',
    port: 9222,
    activePortFile: join(
      HOME,
      '.var/app/com.brave.Browser/config/BraveSoftware/Brave-Browser/DevToolsActivePort',
    ),
  },
  chrome: {
    label: 'Chrome',
    // Chromium 136+ ignores --remote-debugging-port on a default user-data-dir,
    // so this is informational only; the active-port file is the real source.
    port: null,
    activePortFile: join(
      HOME,
      '.var/app/com.google.Chrome/config/google-chrome/DevToolsActivePort',
    ),
  },
};

export class CdpError extends Error {}

function readActivePort(file) {
  const [port, path] = readFileSync(file, 'utf8').trim().split('\n');
  return { port: Number(port), path: path.trim() };
}

/**
 * Resolve the browser-level WebSocket URL.
 *
 * Tries `/json/version` first (Brave), then falls back to the
 * DevToolsActivePort file (required for Chrome, whose HTTP routes 404).
 */
export async function resolveBrowserWs({
  port,
  activePortFile,
  timeoutMs = 4000,
} = {}) {
  const attempts = [];

  if (port) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, {
        headers: { Origin: `http://127.0.0.1:${port}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.webSocketDebuggerUrl)
          return {
            url: body.webSocketDebuggerUrl,
            via: 'discovery',
            product: body.Browser,
          };
        attempts.push(
          `port ${port}: /json/version had no webSocketDebuggerUrl`,
        );
      } else {
        attempts.push(`port ${port}: /json/version -> ${res.status}`);
      }
    } catch (err) {
      attempts.push(`port ${port}: ${err.message}`);
    }
  }

  if (activePortFile) {
    try {
      const { port: p, path } = readActivePort(activePortFile);
      return {
        url: `ws://127.0.0.1:${p}${path}`,
        via: 'activePortFile',
        product: null,
      };
    } catch (err) {
      attempts.push(`activePortFile: ${err.message}`);
    }
  }

  throw new CdpError(
    `no CDP endpoint found (${attempts.join('; ') || 'nothing to try'})`,
  );
}

/** Send one command over a browser-level CDP WebSocket and close it. */
export function send(wsUrl, method, params = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const ws = new globalThis.WebSocket(wsUrl);
    const timer = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* already gone */
      }
      reject(new CdpError(`'${method}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.onopen = () => ws.send(JSON.stringify({ id: 1, method, params }));
    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data.toString());
      } catch {
        return;
      }
      if (data.id !== 1) return;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* already gone */
      }
      if (data.error) reject(new CdpError(data.error.message ?? 'CDP error'));
      else resolve(data.result);
    };
    ws.onerror = () => {
      clearTimeout(timer);
      reject(new CdpError(`websocket error connecting to ${wsUrl}`));
    };
  });
}

/** Attach to one of the known browsers and hand the endpoint to `fn`. */
export async function withBrowser(name, fn) {
  const spec = BROWSERS[name];
  if (!spec)
    throw new CdpError(
      `unknown browser '${name}' (have: ${Object.keys(BROWSERS).join(', ')})`,
    );
  const endpoint = await resolveBrowserWs(spec);
  return fn(endpoint);
}

/** List targets, shaped like a `/json` entry (webSocketDebuggerUrl rebuilt). */
export async function listTargets(name) {
  const spec = BROWSERS[name];
  const { url, via } = await resolveBrowserWs(spec);
  const port = Number(new URL(url).port);
  const { targetInfos } = await send(url, 'Target.getTargets');
  return targetInfos.map((t) => ({
    id: t.targetId,
    targetId: t.targetId,
    type: t.type,
    title: t.title,
    url: t.url,
    webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/page/${t.targetId}`,
    _via: via,
  }));
}

/** Page targets only — the useful subset. */
export async function listPages(name) {
  return (await listTargets(name)).filter((t) => t.type === 'page');
}

// Target.* equivalents of the /json/* endpoints, which Chrome does not serve.

export async function closeTarget(name, targetId) {
  return withBrowser(name, async ({ url }) =>
    send(url, 'Target.closeTarget', { targetId }),
  );
}

export async function activateTarget(name, targetId) {
  return withBrowser(name, async ({ url }) =>
    send(url, 'Target.activateTarget', { targetId }),
  );
}

export async function createTarget(name, targetUrl) {
  return withBrowser(name, async ({ url }) =>
    send(url, 'Target.createTarget', { url: targetUrl }),
  );
}

/**
 * Readiness probe. The DevToolsActivePort file outlives the browser, so
 * resolving an endpoint is not proof it is up; connect and report which.
 */
export async function check(name) {
  const spec = BROWSERS[name];
  const { url, via } = await resolveBrowserWs(spec);

  let version;
  try {
    version = await send(url, 'Browser.getVersion');
  } catch (err) {
    if (via === 'activePortFile') {
      throw new CdpError(
        `stale DevToolsActivePort (${activePortFileOf(spec)}) — browser not running, ` +
          'or its remote-debugging toggle is off',
      );
    }
    throw new CdpError(`port ${spec.port}: ${err.message}`);
  }

  let pages;
  try {
    pages = (await listPages(name)).length;
  } catch {
    pages = -1; // browser-level call worked; enumeration did not
  }
  return { name, label: spec.label, product: version.product, via, pages };
}

function activePortFileOf(spec) {
  return spec.activePortFile.replace(HOME, '~');
}
