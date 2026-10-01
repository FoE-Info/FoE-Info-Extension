import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import pkg from '../../src/js/protocol/networkListener.js';
import policy from '../../src/js/utils/intakePolicy.js';

// Pure intake policy lives in the LEAF module; networkListener re-exports it
// (both import surfaces are exercised below so the re-export path stays
// honest too).
const {
  evaluateRequestOrigin: evaluateRequestOriginLeaf,
  isFoeNetworkUrl: isFoeNetworkUrlLeaf,
  evaluateDispatchToken,
  stampNextDispatchToken,
  nextDispatchSequence,
  advanceDispatchGeneration,
  syncDispatchGeneration,
  resetDispatchOrdering,
} = policy;

// Dispatcher-side intake pipeline (NOT imported by devtools.js — guarded by
// the import-boundary test at the bottom of this file).
const { handleRawNetworkEntry, processContentDirect } = pkg;

const evaluateRequestOrigin = evaluateRequestOriginLeaf;
const isFoeNetworkUrl = isFoeNetworkUrlLeaf;

test('network intake accepts genuine game RPC URLs', () => {
  const verdict = evaluateRequestOrigin(
    'https://en1.forgeofempires.com/game/json?h=abc',
  );
  assert.equal(verdict.accepted, true);
  assert.equal(verdict.kind, 'game');
  assert.equal(isFoeNetworkUrl('https://forgeofempires.com/game/json'), true);
  // Metadata payloads are also served by game hosts under subpaths.
  assert.equal(
    isFoeNetworkUrl('https://en1.forgeofempires.com/game/metadata?id=123'),
    true,
  );
});

test('network intake accepts explicit InnoGames CDN metadata URLs', () => {
  const verdict = evaluateRequestOrigin(
    'https://foeen.innogamescdn.com/start/metadata?id=allies-56a8e4fedf1ca1bf686304ed2fcb6f25d6d44d6b',
  );
  assert.equal(verdict.accepted, true);
  assert.equal(verdict.kind, 'cdn');
});

test('network intake rejects responses from unrelated inspected sites', () => {
  // Attacker-controlled host spoofing the API path.
  assert.deepEqual(evaluateRequestOrigin('https://evil.example/game/json'), {
    accepted: false,
    reason: 'untrusted_host',
  });
  assert.equal(isFoeNetworkUrl('https://evil.example/game/json'), false);
});

test('network intake rejects insecure http:// scheme', () => {
  assert.equal(isFoeNetworkUrl('http://forgeofempires.com/game/json'), false);
  assert.equal(
    evaluateRequestOrigin('http://forgeofempires.com/game/json').reason,
    'insecure_scheme',
  );
});

test('network intake rejects suffix-confused hosts', () => {
  // Trusted host as a subdomain suffix of an attacker host.
  assert.equal(
    isFoeNetworkUrl('https://forgeofempires.com.evil.example/game/json'),
    false,
  );
  // Trusted host embedded in a bigger attacker hostname.
  assert.equal(
    isFoeNetworkUrl('https://evilforgeofempires.com/game/json'),
    false,
  );
  assert.equal(
    evaluateRequestOrigin('https://forgeofempires.com.evil.example/game/json')
      .reason,
    'untrusted_host',
  );
});

test('network intake rejects recognised API paths on untrusted hosts', () => {
  assert.equal(
    isFoeNetworkUrl('https://cdn.evil.example/metadata?id=x'),
    false,
  );
  assert.equal(
    isFoeNetworkUrl('https://fakefoeen.innogamescdn.com/metadata?id=x'),
    false,
  );
});

test('network intake rejects unrecognised paths even on the trusted host', () => {
  assert.equal(isFoeNetworkUrl('https://en1.forgeofempires.com/other'), false);
  assert.equal(
    isFoeNetworkUrl('https://en1.forgeofempires.com/game/jsonish'),
    false,
  );
});

test('network intake handles devtools:// and extension origins without throwing', () => {
  assert.doesNotThrow(() => isFoeNetworkUrl('devtools://devtools/bundled'));
  assert.equal(isFoeNetworkUrl('devtools://devtools/bundled'), false);
  assert.equal(isFoeNetworkUrl('chrome-extension://abc123/panel.html'), false);
  assert.equal(isFoeNetworkUrl('chrome-extension://abc123/game/json'), false);
  assert.equal(isFoeNetworkUrl(''), false);
  assert.equal(isFoeNetworkUrl(null), false);
  assert.equal(isFoeNetworkUrl('not a url %%%'), false);

  assert.doesNotThrow(() =>
    handleRawNetworkEntry('devtools://devtools/bundled', [], '{}', ''),
  );
});

test('network intake is dependency-injectable', () => {
  const verdict = evaluateRequestOrigin('https://test.host/game/json', {
    URL,
    gameHost: 'test.host',
    cdnHosts: [],
    gameApiPathPrefixes: ['/game/json'],
  });
  assert.equal(verdict.accepted, true);
  assert.equal(verdict.kind, 'game');
  assert.equal(
    evaluateRequestOrigin('https://test.host/other', {
      gameHost: 'test.host',
    }).accepted,
    false,
  );
});

// --- §4: dispatch ordering token ---

test('dispatch ordering token admits current generation and drops stale ones', () => {
  resetDispatchOrdering();
  const token = stampNextDispatchToken(1);
  assert.equal(token.generation, 1);
  assert.deepEqual(evaluateDispatchToken(token, 1), {
    committed: true,
    dropped: false,
    sequence: token.sequence,
  });
  assert.deepEqual(evaluateDispatchToken(token, 2), {
    committed: false,
    dropped: true,
    reason: 'stale_generation',
    sequence: token.sequence,
  });
  // Missing token (legacy callsites) defaults to commit.
  assert.equal(evaluateDispatchToken(null, 9).dropped, false);
});

test('dispatch sequence numbers increase monotonically', () => {
  resetDispatchOrdering();
  const first = nextDispatchSequence();
  const second = nextDispatchSequence();
  const third = nextDispatchSequence();
  assert.equal(second, first + 1);
  assert.equal(third, second + 1);
  assert.ok(stampNextDispatchToken(3).sequence > third);
});

test('world switch superseded generation invalidates stamped entry', async () => {
  resetDispatchOrdering();
  const token = stampNextDispatchToken(0);
  syncDispatchGeneration('en2');
  assert.notEqual(token.generation, 0 + 1);
  assert.equal(evaluateDispatchToken(token, 1).reason, 'stale_generation');
});

test('processContentDirect commits current token and drops stale token', async () => {
  resetDispatchOrdering();
  let dispatched = 0;
  const deps = {
    messageDispatcher: {
      dispatchRaw: async () => {
        dispatched += 1;
        return { batchResult: { results: [] } };
      },
    },
  };
  const url = 'https://en1.forgeofempires.com/game/json';

  const current = stampNextDispatchToken(0);
  const currentRes = await processContentDirect(
    url,
    '[{"requestClass":"ResourceService"}]',
    '',
    [],
    null,
    deps,
    current,
  );
  assert.equal(currentRes?.dropped, undefined);
  assert.equal(dispatched, 1);

  const stale = stampNextDispatchToken(0);
  advanceDispatchGeneration('en2');
  const staleRes = await processContentDirect(
    url,
    '[{"requestClass":"ResourceService"}]',
    '',
    [],
    null,
    deps,
    stale,
  );
  assert.equal(staleRes?.dropped, true);
  assert.equal(staleRes?.stale, true);
  assert.equal(staleRes?.reason, 'stale_generation');
  assert.equal(dispatched, 1, 'state mutation must not commit for stale token');
});

test('securing intake: genuine packet still dispatches after origin validation', async () => {
  resetDispatchOrdering();
  const seenUrls = [];
  handleRawNetworkEntry(
    'https://en1.forgeofempires.com/game/json',
    [],
    '[{"requestClass":"ResourceService"}]',
    '',
    null,
    {
      storage: undefined,
      messageDispatcher: {
        dispatchRaw: async (reqUrl) => {
          seenUrls.push(reqUrl);
          return {};
        },
      },
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(seenUrls, ['https://en1.forgeofempires.com/game/json']);
});

test('shared intake drops attacker packet before dispatcher', () => {
  resetDispatchOrdering();
  const seenUrls = [];
  handleRawNetworkEntry(
    'https://evil.example/game/json',
    [],
    '[{"requestClass":"ResourceService"}]',
    '',
    null,
    {
      messageDispatcher: {
        dispatchRaw: async (reqUrl) => {
          seenUrls.push(reqUrl);
          return {};
        },
      },
    },
  );
  return new Promise((resolve) => setTimeout(resolve, 10)).then(() => {
    assert.deepEqual(seenUrls, []);
  });
});

// --- Architecture guard: devtools bundle must stay leaf-only ---

test('networkListener re-exports the leaf policy symbols (same identity)', () => {
  // The re-export must expose the SAME function instances, not copies.
  assert.equal(pkg.evaluateRequestOrigin, policy.evaluateRequestOrigin);
  assert.equal(pkg.isFoeNetworkUrl, policy.isFoeNetworkUrl);
  assert.equal(pkg.evaluateDispatchToken, policy.evaluateDispatchToken);
  assert.equal(pkg.stampNextDispatchToken, policy.stampNextDispatchToken);
  assert.equal(pkg.nextDispatchSequence, policy.nextDispatchSequence);
  assert.equal(pkg.advanceDispatchGeneration, policy.advanceDispatchGeneration);
  assert.equal(pkg.syncDispatchGeneration, policy.syncDispatchGeneration);
  assert.equal(pkg.resetDispatchOrdering, policy.resetDispatchOrdering);
});

test('devtools.js imports intake policy from the leaf module, never from networkListener.js', () => {
  // Regression guard: a static import of protocol/networkListener.js back
  // into src/js/devtools.mjs silently re-inflates the devtools page bundle
  // with the whole message-dispatcher subgraph. Fails on ANY static import
  // or require of networkListener in the devtools entry point.
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  );
  const source = fs.readFileSync(
    path.join(root, 'src/js/devtools.mjs'),
    'utf8',
  );
  assert.equal(
    /from\s+['"].*protocol\/networkListener(\.js)?['"]/.test(source),
    false,
    'src/js/devtools.mjs must not import from protocol/networkListener.js ' +
      '(devtools bundle bloat: pulls the dispatcher graph)',
  );
  assert.equal(
    /require\(.*protocol\/networkListener/.test(source),
    false,
    'src/js/devtools.mjs must not require protocol/networkListener.js',
  );
  assert.match(
    source,
    /from\s+['"].*utils\/intakePolicy(\.js)?['"]/,
    'src/js/devtools.mjs must import evaluateRequestOrigin from the leaf module',
  );
});

test('intakePolicy is a leaf: no imports from dispatcher subgraph directories', () => {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  );
  const source = fs.readFileSync(
    path.join(root, 'src/js/utils/intakePolicy.js'),
    'utf8',
  );
  // Check actual module references only (comments may name directories).
  const moduleRefs = [
    ...source.matchAll(/(?:require\(|from\s+)['"]([^'"]+)['"]/g),
  ].map((m) => m[1]);
  for (const ref of moduleRefs) {
    assert.equal(
      /^\.?\/?(\.\.|src)?\/?(protocol|msg|state|ui|vars|fn)\//.test(ref) ||
        ref.includes('utils/storage'),
      false,
      `intakePolicy.js must not import "${ref}" — it must stay a leaf module`,
    );
  }
});
