#!/usr/bin/env node

/**
 * HAR Capture Ingestion Runner
 *
 * Streams the 39 live `.har` captures in `docs/har/` (Chrome DevTools format)
 * and extracts every InnoGames JSON-RPC payload into an isolated store at
 * `<metadata-store>/extracts/`.
 *
 * Isolation invariant: this script never writes into the baseline downloaded
 * metadata (`<metadata-store>/entities/`, `manifest.json`, `rpc/`, ...). All
 * HAR-derived output lives exclusively under `extracts/`.
 *
 * Usage:
 *   node scripts/ingest-hars-to-metadata.mjs            # full extraction
 *   node scripts/ingest-hars-to-metadata.mjs --list     # enumerate RPCs only
 *   node scripts/ingest-hars-to-metadata.mjs --keep     # do not reset extracts/
 *   node scripts/ingest-hars-to-metadata.mjs --no-fixtures
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const HAR_DIR = process.env.HAR_DIR || path.join(ROOT_DIR, 'docs', 'har');
const STORE_DIR =
  process.env.METADATA_STORE_DIR ||
  [
    path.resolve(ROOT_DIR, '..', 'metadata-store'),
    path.join(ROOT_DIR, 'metadata-store'),
  ].find((p) => fs.existsSync(p)) ||
  path.resolve(ROOT_DIR, '..', 'metadata-store');
const EXTRACTS_DIR = path.join(STORE_DIR, 'extracts');
const ENTITIES_DIR = path.join(STORE_DIR, 'entities');
const FIXTURES_DIR = path.join(ROOT_DIR, 'tests', 'fixtures');

const LIST_ONLY = process.argv.includes('--list');
const KEEP_EXTRACTS = process.argv.includes('--keep');
const NO_FIXTURES = process.argv.includes('--no-fixtures');

// Domain routing: RPC key -> one or more bundle files under extracts/.
const DOMAIN_ROUTES = new Map([
  // Guild Battlegrounds
  [
    'GuildBattlegroundBuildingService.place',
    ['gbg/building_construction.json'],
  ],
  [
    'GuildBattlegroundBuildingService.destroy',
    ['gbg/building_destruction.json'],
  ],
  [
    'GuildBattlegroundBuildingService.instantFinish',
    ['gbg/diamond_rushed_camps.json'],
  ],
  [
    'GuildBattlegroundBuildingService.getBuildings',
    ['gbg/building_construction.json', 'gbg/building_destruction.json'],
  ],
  [
    'GuildBattlegroundSignalsService.setSignal',
    ['gbg/signals_and_markers.json'],
  ],
  [
    'GuildBattlegroundSignalsService.removeSignal',
    ['gbg/signals_and_markers.json'],
  ],
  ['GuildBattlegroundService.getBattleground', ['gbg/state_snapshots.json']],
  ['GuildBattlegroundService.getLeaderboard', ['gbg/state_snapshots.json']],
  [
    'GuildBattlegroundService.getPlayerLeaderboard',
    ['gbg/state_snapshots.json'],
  ],
  ['GuildBattlegroundStateService.getState', ['gbg/state_snapshots.json']],
  // Guild Treasury & donations
  ['ClanService.getTreasuryBag', ['treasury/treasury_bag.json']],
  ['ClanService.getTreasuryLogs', ['treasury/donation_history_pages.json']],
  ['ClanService.getOwnClanData', ['treasury/guild_overview.json']],
  // Quantum Incursions
  ['GuildRaidsService.getState', ['qi/state.json']],
  [
    'GuildRaidsService.getMemberActivityOverview',
    ['qi/member_contributions.json'],
  ],
  ['GuildRaidsMapService.getOverview', ['qi/map_overview.json']],
  ['GuildRaidsMapService.getNodeExtendedInfo', ['qi/map_overview.json']],
  ['GuildRaidsMapService.setNodeTarget', ['qi/node_targets.json']],
  ['GuildRaidsOutpostService.getOutpost', ['qi/settlement_outpost.json']],
  ['CityProductionService.pickupProduction', ['qi/production_pickup.json']],
  ['RankingService.searchRanking', ['qi/rankings.json']],
  // Economy & social
  ['TradeService.getTradeOffers', ['economy/marketplace_trades.json']],
  ['InventoryService.getItems', ['economy/inventory.json']],
  ['InventoryService.getGreatBuildings', ['economy/inventory.json']],
  [
    'ConversationService.getOverviewForCategory',
    ['economy/conversations.json'],
  ],
  ['ConversationService.getConversation', ['economy/conversations.json']],
]);

const DOMAIN_DESCRIPTIONS = {
  'gbg/building_construction.json':
    'GBG building placement actions and resulting sector building snapshots.',
  'gbg/building_destruction.json':
    'GBG building destruction actions and resulting sector snapshots.',
  'gbg/diamond_rushed_camps.json':
    'GBG camp diamond rush (instantFinish) actions and resource state.',
  'gbg/signals_and_markers.json':
    'GBG focus markers and stop sign set/remove signal actions.',
  'gbg/state_snapshots.json':
    'GBG battleground, leaderboard, and province state snapshots.',
  'treasury/treasury_bag.json': 'Guild treasury resource bag responses.',
  'treasury/donation_history_pages.json':
    'Paginated guild treasury donation history (ClanService.getTreasuryLogs).',
  'treasury/guild_overview.json': 'Guild overview and member roster payloads.',
  'qi/state.json': 'Quantum Incursions season state (GuildRaidsService).',
  'qi/member_contributions.json':
    'Quantum Incursions member activity overview and contributions.',
  'qi/map_overview.json':
    'Quantum Incursions map overview and node extended info.',
  'qi/node_targets.json':
    'Quantum Incursions node target focus/stop-sign actions (blue/red).',
  'qi/settlement_outpost.json':
    'Quantum Settlement outpost and quantum city map payloads.',
  'qi/production_pickup.json':
    'Quantum Settlement production pickup responses (coins).',
  'qi/rankings.json': 'Quantum rankings search responses.',
  'economy/marketplace_trades.json': 'Marketplace trade offers.',
  'economy/inventory.json': 'Inventory items and Great Building inventory.',
  'economy/conversations.json': 'Guild and social message centre threads.',
};

// Curated read-only RPCs mirrored into tests/fixtures/rpc/ (non-destructive).
const FIXTURE_RPC_KEYS = new Set([
  'GuildBattlegroundBuildingService.getBuildings',
  'GuildBattlegroundService.getBattleground',
  'GuildBattlegroundService.getLeaderboard',
  'GuildBattlegroundService.getPlayerLeaderboard',
  'GuildBattlegroundStateService.getState',
  'ClanService.getTreasuryBag',
  'ClanService.getTreasuryLogs',
  'ClanService.getOwnClanData',
  'GuildRaidsService.getState',
  'GuildRaidsService.getMemberActivityOverview',
  'GuildRaidsMapService.getOverview',
  'GuildRaidsMapService.getNodeExtendedInfo',
  'GuildRaidsOutpostService.getOutpost',
  'TradeService.getTradeOffers',
  'CityMapService.getEntities',
  'CityProductionService.pickupProduction',
  'OtherPlayerService.getOtherPlayerVO',
]);

// Action RPCs whose valuable ground truth lives in the request payload
// (response is usually a bare boolean). Mirrored as `<key>.action.json`.
const FIXTURE_ACTION_KEYS = new Set([
  'GuildBattlegroundBuildingService.place',
  'GuildBattlegroundBuildingService.destroy',
  'GuildBattlegroundBuildingService.instantFinish',
  'GuildBattlegroundSignalsService.setSignal',
  'GuildBattlegroundSignalsService.removeSignal',
  'GuildRaidsMapService.setNodeTarget',
]);

function decodeContent(content) {
  if (!content || typeof content.text !== 'string') return null;
  if (content.encoding === 'base64') {
    return Buffer.from(content.text, 'base64').toString('utf8');
  }
  return content.text;
}

function rpcKey(requestClass, requestMethod) {
  return `${requestClass}.${requestMethod}`;
}

function pairKey(item) {
  return `${item.requestClass}.${item.requestMethod}#${item.requestId}`;
}

function payloadBytes(value) {
  if (value === undefined) return 0;
  try {
    return JSON.stringify(value).length;
  } catch {
    return 0;
  }
}

function parseJsonArray(text) {
  if (typeof text !== 'string') return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitizeName(name) {
  return (
    String(name || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unknown'
  );
}

/**
 * Stream a Chrome DevTools HAR file entry-by-entry without holding the whole
 * document (which may exceed 200 MB) in memory. Each complete entry object is
 * handed to `onEntry` as a JSON string.
 */
function streamHarEntries(filePath, onEntry) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: 4 * 1024 * 1024,
    });

    let buf = '';
    let pos = 0;
    let phase = 'seek';
    let entryText = '';
    let depth = 0;
    let inStr = false;
    let esc = false;
    let entryCount = 0;

    function processBuffer() {
      while (pos < buf.length) {
        if (phase === 'seek') {
          const idx = buf.indexOf('"entries"', pos);
          if (idx === -1) {
            pos = Math.max(0, buf.length - 9);
            return;
          }
          const bracket = buf.indexOf('[', idx + 9);
          if (bracket === -1) {
            pos = idx;
            return;
          }
          phase = 'array';
          pos = bracket + 1;
          continue;
        }

        if (phase === 'done') {
          pos = buf.length;
          return;
        }

        const c = buf[pos];

        if (phase === 'array') {
          if (
            c === ' ' ||
            c === '\n' ||
            c === '\r' ||
            c === '\t' ||
            c === ','
          ) {
            pos++;
            continue;
          }
          if (c === ']') {
            phase = 'done';
            pos++;
            continue;
          }
          if (c === '{') {
            phase = 'entry';
            entryText = '{';
            depth = 1;
            inStr = false;
            esc = false;
            pos++;
            continue;
          }
          pos++;
          continue;
        }

        // phase === 'entry'
        entryText += c;
        if (esc) {
          esc = false;
        } else if (inStr) {
          if (c === '\\') esc = true;
          else if (c === '"') inStr = false;
        } else if (c === '"') {
          inStr = true;
        } else if (c === '{') {
          depth++;
        } else if (c === '}') {
          depth--;
          if (depth === 0) {
            entryCount++;
            onEntry(entryText);
            phase = 'array';
            entryText = '';
          }
        }
        pos++;
      }
    }

    function flush() {
      if (pos > 0) {
        buf = buf.slice(pos);
        pos = 0;
      }
      if (phase === 'seek' && buf.length > 8 * 1024 * 1024) {
        throw new Error('Could not locate "entries" array in HAR document');
      }
    }

    stream.on('data', (chunk) => {
      buf += chunk;
      try {
        processBuffer();
        flush();
      } catch (err) {
        stream.destroy();
        reject(err);
      }
    });
    stream.on('end', () => {
      try {
        processBuffer();
        flush();
        resolve(entryCount);
      } catch (err) {
        reject(err);
      }
    });
    stream.on('error', reject);
  });
}

const state = {
  harCount: 0,
  totalEntries: 0,
  totalGameRequests: 0,
  rpcLedger: new Map(),
  domainBundles: new Map(),
  domainRequestSamples: new Map(),
  visits: new Map(),
  perHar: {},
};

function handleGameEntry(entryText, sourceHar, capturedAt) {
  if (
    !entryText.includes('/game/json') ||
    !entryText.includes('requestClass')
  ) {
    return;
  }
  const perHar = state.perHar[sourceHar];
  if (perHar) perHar.gameEntries++;

  let entry;
  try {
    entry = JSON.parse(entryText);
  } catch {
    return;
  }
  if (!entry.request || !entry.request.url?.includes('/game/json')) return;

  const requests = parseJsonArray(entry.request.postData?.text);
  const responses = parseJsonArray(decodeContent(entry.response?.content));
  if (responses.length === 0) return;

  const requestIndex = new Map();
  for (const req of requests) {
    if (req && req.requestClass) requestIndex.set(pairKey(req), req);
  }

  for (const res of responses) {
    if (!res || !res.requestClass || !res.requestMethod) continue;
    state.totalGameRequests++;

    const key = rpcKey(res.requestClass, res.requestMethod);
    const req = requestIndex.get(pairKey(res));
    const record = {
      sourceHar,
      capturedAt: capturedAt || entry.startedDateTime || null,
      requestClass: res.requestClass,
      requestMethod: res.requestMethod,
      requestId: res.requestId,
      requestData: req?.requestData ?? null,
      responseData: res.responseData ?? null,
    };
    ingestRecord(key, record);
  }
}

function ingestRecord(key, record) {
  // 1. Master RPC ledger (keep richest sample per key).
  let ledger = state.rpcLedger.get(key);
  if (!ledger) {
    ledger = {
      requestClass: record.requestClass,
      requestMethod: record.requestMethod,
      occurrences: 0,
      sourceHars: new Set(),
      maxPayloadBytes: 0,
      sample: undefined,
    };
    state.rpcLedger.set(key, ledger);
  }
  ledger.occurrences++;
  ledger.sourceHars.add(record.sourceHar);
  const perHar = state.perHar[record.sourceHar];
  if (perHar) perHar.rpcs[key] = (perHar.rpcs[key] || 0) + 1;
  const bytes = payloadBytes(record.responseData);
  if (bytes >= ledger.maxPayloadBytes) {
    ledger.maxPayloadBytes = bytes;
    ledger.sample = record.responseData;
  }

  // 2. Domain bundles.
  const routes = DOMAIN_ROUTES.get(key);
  if (routes) {
    for (const file of routes) {
      if (!state.domainBundles.has(file)) state.domainBundles.set(file, []);
      state.domainBundles.get(file).push(record);
    }
    if (!state.domainRequestSamples.has(key)) {
      state.domainRequestSamples.set(key, []);
    }
    const samples = state.domainRequestSamples.get(key);
    if (record.requestData != null && samples.length < 25) {
      samples.push(record.requestData);
    }
  }

  // 3. Visited player cities.
  if (key === 'OtherPlayerService.visitPlayer') {
    ingestVisit(record);
  }
}

function ingestVisit(record) {
  const payload = record.responseData;
  if (!payload || typeof payload !== 'object') return;
  const other = payload.other_player || payload.otherPlayer || {};
  const name = other.name || payload.other_player_name || 'unknown';
  const safe = sanitizeName(name);
  const bytes = payloadBytes(payload);
  const existing = state.visits.get(safe);
  if (existing && existing.sizeBytes >= bytes) return;
  state.visits.set(safe, {
    playerName: name,
    safeName: safe,
    era: other.era || payload.other_player_era || 'unknown',
    entitiesCount: payload.city_map?.entities?.length ?? 0,
    sizeBytes: bytes,
    sourceHar: record.sourceHar,
    capturedAt: record.capturedAt,
    payload,
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(relPath, data) {
  const fullPath = path.join(EXTRACTS_DIR, relPath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
}

function mirrorFixture(relPath, data) {
  const dest = path.join(FIXTURES_DIR, relPath);
  if (fs.existsSync(dest)) return false;
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, JSON.stringify(data, null, 2), 'utf8');
  return true;
}

function writeOutputs() {
  if (!KEEP_EXTRACTS) {
    fs.rmSync(EXTRACTS_DIR, { recursive: true, force: true });
  }
  ensureDir(EXTRACTS_DIR);

  // rpc/<Class>.<Method>.json : richest real response payload per RPC.
  for (const [key, ledger] of state.rpcLedger) {
    writeJson(`rpc/${key}.json`, ledger.sample ?? null);
  }

  // raw_rpc_capture.json : deterministic master ledger.
  const ledger = [...state.rpcLedger.entries()]
    .map(([key, entry]) => ({
      key,
      requestClass: entry.requestClass,
      requestMethod: entry.requestMethod,
      occurrences: entry.occurrences,
      sourceHars: [...entry.sourceHars].sort(),
      maxPayloadBytes: entry.maxPayloadBytes,
      sampleFile: `rpc/${key}.json`,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
  writeJson('raw_rpc_capture.json', ledger);

  // Domain bundles with request + response ground truth.
  for (const [file, records] of state.domainBundles) {
    writeJson(file, {
      generatedAt: new Date().toISOString(),
      description: DOMAIN_DESCRIPTIONS[file] || 'HAR-derived capture bundle.',
      captureCount: records.length,
      captures: records,
    });
  }

  // Request samples for action RPCs (place/destroy/signals/targets).
  const actionSamples = {};
  for (const [key, samples] of state.domainRequestSamples) {
    actionSamples[key] = samples;
  }
  writeJson('rpc/_action_request_samples.json', actionSamples);

  // Visited player city snapshots.
  const visitIndex = [];
  for (const visit of state.visits.values()) {
    writeJson(`visits/visit-${visit.safeName}.json`, visit.payload);
    visitIndex.push({
      playerName: visit.playerName,
      safeName: visit.safeName,
      era: visit.era,
      entitiesCount: visit.entitiesCount,
      sizeBytes: visit.sizeBytes,
      sourceHar: visit.sourceHar,
      capturedAt: visit.capturedAt,
      file: `visits/visit-${visit.safeName}.json`,
    });
  }
  visitIndex.sort((a, b) => a.safeName.localeCompare(b.safeName));
  writeJson('visits/_index.json', visitIndex);

  // Run metadata + isolation guard.
  const meta = {
    generatedAt: new Date().toISOString(),
    harDirectory: path.relative(ROOT_DIR, HAR_DIR),
    storeDirectory: path.relative(ROOT_DIR, STORE_DIR),
    extractsDirectory: path.relative(ROOT_DIR, EXTRACTS_DIR),
    harFiles: state.harCount,
    totalEntriesScanned: state.totalEntries,
    totalGameRequests: state.totalGameRequests,
    uniqueRpcCount: state.rpcLedger.size,
    domainBundleCount: state.domainBundles.size,
    visitedCityCount: state.visits.size,
    isolation: {
      writesOnlyUnderExtracts: true,
      extractsInsideEntities: EXTRACTS_DIR.startsWith(ENTITIES_DIR + path.sep),
      baselineEntitiesTouched: false,
    },
    perHar: state.perHar,
  };
  writeJson('meta.json', meta);

  // Non-destructive fixture mirroring.
  let mirroredRpc = 0;
  let mirroredVisits = 0;
  let mirroredActions = 0;
  let mirroredBundles = 0;
  if (!NO_FIXTURES) {
    for (const [key, entry] of state.rpcLedger) {
      if (!FIXTURE_RPC_KEYS.has(key)) continue;
      if (mirrorFixture(`rpc/${key}.json`, entry.sample ?? null)) mirroredRpc++;
    }
    for (const visit of state.visits.values()) {
      if (mirrorFixture(`visits/visit-${visit.safeName}.json`, visit.payload))
        mirroredVisits++;
    }
    for (const [key, samples] of state.domainRequestSamples) {
      if (!FIXTURE_ACTION_KEYS.has(key)) continue;
      const bundle = state.domainBundles.get(DOMAIN_ROUTES.get(key)?.[0] || '');
      if (!bundle) continue;
      if (
        mirrorFixture(`rpc/${key}.action.json`, {
          requestSamples: samples,
          responseSamples: bundle
            .filter((r) => rpcKey(r.requestClass, r.requestMethod) === key)
            .map((r) => r.responseData),
        })
      )
        mirroredActions++;
    }
    // Mirror every domain bundle into tests/fixtures/rpc/har/ so regression
    // tests can exercise the real capture sequences without touching
    // metadata-store (which is git-ignored and local-only).
    for (const [file, records] of state.domainBundles) {
      if (
        mirrorFixture(`rpc/har/${file}`, {
          description:
            DOMAIN_DESCRIPTIONS[file] || 'HAR-derived capture bundle.',
          captures: records,
        })
      )
        mirroredBundles++;
    }
  }

  return {
    meta,
    mirroredRpc,
    mirroredVisits,
    mirroredActions,
    mirroredBundles,
  };
}

async function main() {
  if (!fs.existsSync(HAR_DIR)) {
    console.error(`[har-ingest] HAR directory not found: ${HAR_DIR}`);
    process.exit(1);
  }
  if (EXTRACTS_DIR.startsWith(ENTITIES_DIR + path.sep)) {
    console.error(
      '[har-ingest] Refusing to run: extracts directory is inside entities/',
    );
    process.exit(1);
  }

  const files = fs
    .readdirSync(HAR_DIR)
    .filter((f) => f.endsWith('.har'))
    .sort();

  console.log(
    `[har-ingest] Found ${files.length} HAR captures in ${path.relative(ROOT_DIR, HAR_DIR)}`,
  );
  console.log(`[har-ingest] Extracts target: ${EXTRACTS_DIR}`);

  const startedAt = Date.now();

  for (const file of files) {
    const harPath = path.join(HAR_DIR, file);
    state.perHar[file] = { gameEntries: 0, scannedEntries: 0, rpcs: {} };

    const entryCount = await streamHarEntries(harPath, (entryText) => {
      handleGameEntry(entryText, file, null);
    });

    state.harCount++;
    state.totalEntries += entryCount;
    state.perHar[file].scannedEntries = entryCount;

    if (LIST_ONLY) {
      const keys = Object.entries(state.perHar[file].rpcs)
        .sort()
        .map(([k, n]) => `${k} x${n}`)
        .join('\n    ');
      console.log(
        `\n===== ${file} (entries=${entryCount}, gameEntries=${state.perHar[file].gameEntries}) =====`,
      );
      console.log(`    ${keys || '(no game RPCs)'}`);
    } else {
      console.log(`[har-ingest] processed ${file} (${entryCount} entries)`);
    }
  }

  if (LIST_ONLY) {
    console.log(
      `[har-ingest] Scanned ${state.harCount} HARs, ${state.totalEntries} entries, ${state.totalGameRequests} game RPC responses.`,
    );
    return;
  }

  const {
    meta,
    mirroredRpc,
    mirroredVisits,
    mirroredActions,
    mirroredBundles,
  } = writeOutputs();
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log('\n[har-ingest] ==============================================');
  console.log(`[har-ingest] HARs processed        : ${meta.harFiles}`);
  console.log(
    `[har-ingest] Entries scanned       : ${meta.totalEntriesScanned}`,
  );
  console.log(`[har-ingest] Game RPC responses    : ${meta.totalGameRequests}`);
  console.log(`[har-ingest] Unique RPC types      : ${meta.uniqueRpcCount}`);
  console.log(`[har-ingest] Domain bundles        : ${meta.domainBundleCount}`);
  console.log(`[har-ingest] Visited cities        : ${meta.visitedCityCount}`);
  console.log(
    `[har-ingest] Fixtures mirrored      : rpc=${mirroredRpc} visits=${mirroredVisits} actions=${mirroredActions} bundles=${mirroredBundles}`,
  );
  console.log(`[har-ingest] Extracts directory    : ${EXTRACTS_DIR}`);
  console.log(`[har-ingest] Elapsed               : ${elapsed}s`);
  console.log('[har-ingest] ==============================================\n');
}

main().catch((err) => {
  console.error('[har-ingest] Fatal error:', err.message);
  process.exit(1);
});
