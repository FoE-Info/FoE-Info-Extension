#!/usr/bin/env node

/**
 * Report whether a browser is attachable over CDP.
 *
 * Read-only: opens a WebSocket, sends Browser.getVersion and
 * Target.getTargets, then disconnects. Never navigates, never creates or
 * closes a tab, never takes focus.
 *
 *   npm run browser:check            # brave only (the default)
 *   npm run browser:check -- all     # every known browser
 *   npm run browser:check -- chrome
 *
 * Brave is the default because that is what development runs through. Probing
 * a browser that is not running just produces a spurious failure and, with a
 * live session open, an unnecessary access prompt.
 */
import { BROWSERS, CdpError, check } from './lib/cdp.mjs';

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const targets =
  requested[0] === 'all' ? Object.keys(BROWSERS)
  : requested[0] ? [requested[0]]
  : ['brave'];

let failed = false;

for (const name of targets) {
  if (!BROWSERS[name]) {
    console.error(
      `  unknown browser '${name}' (have: ${Object.keys(BROWSERS).join(', ')})`,
    );
    process.exit(1);
  }
  const label = BROWSERS[name].label.padEnd(7);
  try {
    const result = await check(name);
    const via =
      result.via === 'discovery' ? 'http discovery' : 'DevToolsActivePort';
    const pages = result.pages < 0 ? '?' : result.pages;
    console.log(
      `  PASS  ${label} ${result.product}  port via ${via}, ${pages} page(s)`,
    );
  } catch (err) {
    failed = true;
    const reason =
      err instanceof CdpError ? err.message : String(err?.message || err);
    console.log(`  FAIL  ${label} ${reason}`);
  }
}

if (failed) {
  console.error(
    '\n  A browser may not be running, or its remote-debugging toggle is off.\n' +
      '  brave : brave://inspect  -> Remote debugging  (port pinned to 9222 by\n' +
      '          ~/.var/app/com.brave.Browser/config/brave-flags.conf)\n' +
      '  chrome: chrome://inspect -> Remote debugging  (port chosen by the toggle;\n' +
      '          Chromium 136+ ignores --remote-debugging-port on a default profile)\n' +
      '  Flags are read at browser start — restart the browser after editing them.',
  );
  process.exit(1);
}
