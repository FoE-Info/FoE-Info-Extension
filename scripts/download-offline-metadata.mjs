#!/usr/bin/env node

/**
 * Offline Metadata Downloader for Forge of Empires
 *
 * Extracts all unique /start/metadata?id=* URLs from the active game session
 * and downloads them into a local offline store (`metadata-store/`).
 *
 * Features:
 * - Resumable: skips already downloaded files
 * - Concurrency pool (default 16 parallel downloads)
 * - Generates `metadata-store/manifest.json` indexing all entities
 * - Offline exploration without burning LLM web search/fetch tokens
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
// METADATA_STORE_DIR overrides; otherwise store INSIDE the repo. The old
// default silently wrote to `../metadata-store` — outside the repo boundary
// and invisible to version control. An out-of-tree store is now opt-in only.
const STORE_DIR =
  process.env.METADATA_STORE_DIR || path.join(ROOT_DIR, 'metadata-store');
const ENTITIES_DIR = path.join(STORE_DIR, 'entities');
const MANIFEST_PATH = path.join(STORE_DIR, 'manifest.json');

const CDP_PORT = process.env.CDP_PORT || '9222';
const CDP_BASE = `http://127.0.0.1:${CDP_PORT}`;
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '16', 10);

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function decodeMoBuffer(buf) {
  const view = new DataView(buf);
  const magic = view.getUint32(0, true);
  const le = magic === 0x950412de;
  const numStrings = view.getUint32(8, le);
  const origTableOffset = view.getUint32(12, le);
  const transTableOffset = view.getUint32(16, le);
  const dec = new TextDecoder('utf-8');
  const u8 = new Uint8Array(buf);
  const dict = {};
  for (let i = 0; i < numStrings; i++) {
    const origLen = view.getUint32(origTableOffset + i * 8, le);
    const origOffset = view.getUint32(origTableOffset + i * 8 + 4, le);
    const transLen = view.getUint32(transTableOffset + i * 8, le);
    const transOffset = view.getUint32(transTableOffset + i * 8 + 4, le);
    const orig = dec.decode(u8.subarray(origOffset, origOffset + origLen));
    const trans = dec.decode(u8.subarray(transOffset, transOffset + transLen));
    if (orig) dict[orig] = trans;
  }
  return dict;
}

async function getMetadataLookupFromBrowser() {
  console.log(
    `[metadata-download] Connecting to Chromium CDP at ${CDP_BASE}...`,
  );
  const targets = (await fetchJson(`${CDP_BASE}/json`)) || [];
  const panelTarget = targets.find(
    (t) =>
      (t.type === 'iframe' || t.type === 'page') &&
      t.url &&
      t.url.includes('panel.html') &&
      t.webSocketDebuggerUrl,
  );

  if (!panelTarget) {
    throw new Error(
      'FoE-Info panel.html target not found in Chrome! Is the FoE-Info extension panel open?',
    );
  }

  const ws = new WebSocket(panelTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(
        new Error('Timed out querying chrome.storage.local for dictionaries'),
      );
    }, 5000);

    ws.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.id === 1) {
          clearTimeout(timer);
          ws.close();
          resolve(msg.result?.result?.value || {});
        }
      } catch (err) {
        clearTimeout(timer);
        ws.close();
        reject(err);
      }
    });

    ws.send(
      JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (async () => {
              return new Promise(resolve => {
                chrome.storage.local.get([
                  "BuildingEntityLookup",
                  "ResourceDefs",
                  "ResearchDefs",
                  "CityEntityDefs",
                  "MetaIds",
                  "AllyDefs"
                ], (all) => {
                  resolve({
                    lookup: all.BuildingEntityLookup || {},
                    resources: all.ResourceDefs || {},
                    technologies: all.ResearchDefs || {},
                    cityEntities: all.CityEntityDefs || {},
                    metaIds: all.MetaIds || {},
                    allies: all.AllyDefs || {}
                  });
                });
              });
            })()
          `,
          awaitPromise: true,
          returnByValue: true,
        },
      }),
    );
  });
}

async function runWorkerPool(tasks, concurrency, workerFn) {
  let index = 0;
  let completed = 0;
  const total = tasks.length;

  async function worker() {
    while (index < tasks.length) {
      const current = tasks[index++];
      try {
        await workerFn(current, completed + 1, total);
      } catch (err) {
        console.warn(`[worker] Error processing ${current.id}:`, err.message);
      }
      completed++;
      if (completed % 100 === 0 || completed === total) {
        const pct = ((completed / total) * 100).toFixed(1);
        process.stdout.write(
          `\r[metadata-download] Progress: ${completed}/${total} (${pct}%)...`,
        );
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  console.log('');
}

async function main() {
  console.log(
    `\n===============================================================`,
  );
  console.log(`📦 OFFLINE FORGE OF EMPIRES METADATA DOWNLOADER`);
  console.log(
    `===============================================================\n`,
  );

  fs.mkdirSync(ENTITIES_DIR, { recursive: true });

  const browserData = await getMetadataLookupFromBrowser();
  const rawLookup = browserData.lookup || {};
  const keys = Object.keys(rawLookup);
  console.log(
    `[metadata-download] Discovered ${keys.length} total keys in BuildingEntityLookup.`,
  );

  // 1. Export core game dictionaries
  if (browserData.resources && Object.keys(browserData.resources).length > 0) {
    fs.writeFileSync(
      path.join(STORE_DIR, 'resources.json'),
      JSON.stringify(browserData.resources, null, 2),
      'utf8',
    );
    console.log(
      `[metadata-download] Exported ${Object.keys(browserData.resources).length} goods & resource definitions -> metadata-store/resources.json`,
    );
  }

  if (
    browserData.technologies &&
    Object.keys(browserData.technologies).length > 0
  ) {
    fs.writeFileSync(
      path.join(STORE_DIR, 'technologies.json'),
      JSON.stringify(browserData.technologies, null, 2),
      'utf8',
    );
    console.log(
      `[metadata-download] Exported ${Object.keys(browserData.technologies).length} tech tree definitions -> metadata-store/technologies.json`,
    );
  }

  if (browserData.metaIds && Object.keys(browserData.metaIds).length > 0) {
    fs.writeFileSync(
      path.join(STORE_DIR, 'meta_ids.json'),
      JSON.stringify(browserData.metaIds, null, 2),
      'utf8',
    );
    console.log(
      `[metadata-download] Exported ${Object.keys(browserData.metaIds).length} metadata hashes -> metadata-store/meta_ids.json`,
    );
  }

  // 2. Fetch and decode InnoGames official client translations
  try {
    // Hash rotates whenever InnoGames rebuilds the client. 2026-09-27: the
    // 5a1b13f4… pin 404'd; read live from the running session's resource
    // timeline (performance.getEntriesByType) to get bb87cd73….
    const langUrl =
      'https://foeen.innogamescdn.com/lang/en_US/client_lang-bb87cd7367e5ca08411bcd3f18003f80.mo';
    const langRes = await fetch(langUrl);
    if (langRes.ok) {
      const buf = await langRes.arrayBuffer();
      const translations = decodeMoBuffer(buf);
      fs.writeFileSync(
        path.join(STORE_DIR, 'translations_en.json'),
        JSON.stringify(translations, null, 2),
        'utf8',
      );
      console.log(
        `[metadata-download] Downloaded & decoded ${Object.keys(translations).length} English translation keys -> metadata-store/translations_en.json`,
      );
    } else {
      // No else branch before: the pinned-hash CDN URL is not permanent and a
      // silent miss would drop translations from the offline store,
      // violating the dynamic-metadata principle. Fail loudly so the run
      // refreshes or keeping a stale copy can be a conscious choice.
      if (fs.existsSync(path.join(STORE_DIR, 'translations_en.json'))) {
        console.warn(
          '[metadata-download] translations_en.json: CDN fetch failed for the pinned lang URL; reusing the stale existing copy.',
        );
      } else {
        throw new Error(
          `client_lang download failed and no cached translations_en.json exists! Check: ${langUrl}`,
        );
      }
    }
  } catch (err) {
    console.warn(
      '[metadata-download] Note: client_lang.mo download skipped:',
      err.message,
    );
  }

  // 3. Dynamic RPC payloads.
  //
  // Two corpora exist and they have drifted apart. `raw_rpc_capture.json` is
  // the 93 MB session capture; `extracts/rpc/` is the wider HAR-ingested set
  // (104 methods vs 70 as of 2026-09-27). Reading only the former silently
  // dropped 43 collected captures, including the whole GreatBuildingsService
  // and GuildBattlegroundBuildingService sets. Merge both, raw capture first so
  // it keeps precedence where they overlap.
  const rawCapturePath = path.join(STORE_DIR, 'raw_rpc_capture.json');
  const extractsRpcDir = path.join(STORE_DIR, 'extracts', 'rpc');
  const rpcExports = {};
  const rpcDir = path.join(STORE_DIR, 'rpc');
  fs.mkdirSync(rpcDir, { recursive: true });

  const rpcMap = new Map();
  const setRpc = (k, responseData, source) => {
    if (rpcMap.has(k)) return false;
    rpcMap.set(k, { responseData, source });
    return true;
  };

  if (fs.existsSync(rawCapturePath)) {
    try {
      const rawCapture = JSON.parse(fs.readFileSync(rawCapturePath, 'utf8'));
      for (const entry of rawCapture) {
        if (!Array.isArray(entry.data)) continue;
        for (const item of entry.data) {
          if (item && item.requestClass && item.requestMethod) {
            setRpc(
              `${item.requestClass}.${item.requestMethod}`,
              item.responseData,
              'raw_capture',
            );
          }
        }
      }
    } catch (e) {
      console.warn(
        '[metadata-download] Note: raw capture parse failed:',
        e.message,
      );
    }
  }

  // `_action_request_samples` is a corpus bookkeeping entry, not an RPC.
  const NON_RPC_KEYS = new Set(['_action_request_samples']);
  let fromExtracts = 0;
  if (fs.existsSync(extractsRpcDir)) {
    for (const file of fs.readdirSync(extractsRpcDir)) {
      if (!file.endsWith('.json')) continue;
      const k = path.basename(file, '.json');
      if (NON_RPC_KEYS.has(k) || !k.includes('.')) continue;
      try {
        if (
          setRpc(
            k,
            JSON.parse(
              fs.readFileSync(path.join(extractsRpcDir, file), 'utf8'),
            ),
            'extracts',
          )
        ) {
          fromExtracts++;
        }
      } catch {
        /* skip an unreadable sample rather than abort the whole export */
      }
    }
  }

  for (const [k, v] of rpcMap.entries()) {
    fs.writeFileSync(
      path.join(rpcDir, `${k}.json`),
      JSON.stringify(v.responseData, null, 2),
      'utf8',
    );
    const count =
      Array.isArray(v.responseData) ? v.responseData.length
      : v.responseData && typeof v.responseData === 'object' ?
        Object.keys(v.responseData).length
      : null;
    rpcExports[k] = {
      file: `rpc/${k}.json`,
      type: Array.isArray(v.responseData) ? 'Array' : typeof v.responseData,
      itemCount: count,
      source: v.source,
    };
  }
  console.log(
    `[metadata-download] Exported ${rpcMap.size} RPC responses -> metadata-store/rpc/ ` +
      `(${fromExtracts} of them only present in extracts/rpc/)`,
  );

  // Deduplicate by URL
  const urlToEntries = new Map();
  for (const [id, url] of Object.entries(rawLookup)) {
    if (!url || typeof url !== 'string' || !url.includes('metadata?id='))
      continue;
    if (!urlToEntries.has(url)) {
      urlToEntries.set(url, []);
    }
    urlToEntries.get(url).push(id);
  }

  const uniqueTasks = [];
  for (const [url, aliases] of urlToEntries.entries()) {
    let cleanName = aliases[0];
    try {
      const u = new URL(url);
      const idParam = u.searchParams.get('id') || '';
      cleanName = idParam.split('-')[0] || cleanName;
    } catch {}

    if (!cleanName) {
      cleanName = aliases[0];
    }

    const filename = `${cleanName}.json`;
    uniqueTasks.push({
      id: cleanName,
      aliases,
      url,
      filename,
      filePath: path.join(ENTITIES_DIR, filename),
    });
  }

  console.log(
    `[metadata-download] Filtered to ${uniqueTasks.length} unique metadata endpoints.`,
  );
  console.log(`[metadata-download] Saving to: ${ENTITIES_DIR}`);

  let downloadedCount = 0;
  let cachedCount = 0;
  let failedCount = 0;

  const failures = new Set();
  await runWorkerPool(uniqueTasks, CONCURRENCY, async (task) => {
    // A cached entry is only trusted if it parses as valid JSON. The old
    // `size > 20` heuristic permanently cached truncated bodies: a partially
    // written file large enough to pass the threshold never re-downloaded.
    if (fs.existsSync(task.filePath)) {
      try {
        JSON.parse(fs.readFileSync(task.filePath, 'utf8'));
        cachedCount++;
        return;
      } catch {
        console.warn(
          `[metadata-download] Corrupt cached body, re-fetching: ${task.filename}`,
        );
        fs.rmSync(task.filePath, { force: true });
      }
    }

    try {
      const res = await fetch(task.url);
      if (res.ok) {
        const raw = await res.text();
        const data = JSON.parse(raw); // throws on truncated body
        fs.writeFileSync(task.filePath, JSON.stringify(data, null, 2), 'utf8');
        downloadedCount++;
      } else {
        failedCount++;
        failures.add(`${task.filename} -> HTTP ${res.status}`);
      }
    } catch (err) {
      failedCount++;
      failures.add(`${task.filename} -> ${err.message}`);
    }
  });

  // 4. Index all files in entities/ into dictionaries and building entities
  const allEntityFiles = fs.readdirSync(ENTITIES_DIR);
  const staticDictionaries = {};
  const buildingEntities = {};

  for (const f of allEntityFiles) {
    const isBuilding = f.startsWith('building_entity_');
    const key = f.replace(/\.json$/, '');
    const fullPath = path.join(ENTITIES_DIR, f);
    try {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const count =
        Array.isArray(content) ? content.length : Object.keys(content).length;
      if (isBuilding) {
        buildingEntities[key] = {
          filename: `entities/${f}`,
          sizeBytes: fs.statSync(fullPath).size,
        };
      } else {
        staticDictionaries[key] = {
          filename: `entities/${f}`,
          itemCount: count,
          isArray: Array.isArray(content),
        };
      }
    } catch {
      // ignore
    }
  }

  // 5. Build cross-entity relational links (sets, chains, upgrades)
  const relations = {};
  try {
    const setsPath = path.join(ENTITIES_DIR, 'building_sets.json');
    if (fs.existsSync(setsPath)) {
      const sets = JSON.parse(fs.readFileSync(setsPath, 'utf8'));
      for (const s of sets) {
        for (const bId of s.cityEntityIds || []) {
          if (!relations[bId]) relations[bId] = {};
          relations[bId].set = {
            id: s.id,
            name: s.name,
            memberCount: s.cityEntityIds.length,
          };
        }
      }
    }
    const chainsPath = path.join(ENTITIES_DIR, 'building_chains.json');
    if (fs.existsSync(chainsPath)) {
      const chains = JSON.parse(fs.readFileSync(chainsPath, 'utf8'));
      for (const c of chains) {
        for (const bId of c.cityEntityIds || []) {
          if (!relations[bId]) relations[bId] = {};
          relations[bId].chain = {
            id: c.id,
            name: c.name,
            memberCount: c.cityEntityIds.length,
          };
        }
      }
    }
    const upgradesPath = path.join(ENTITIES_DIR, 'building_upgrades.json');
    if (fs.existsSync(upgradesPath)) {
      const upgrades = JSON.parse(fs.readFileSync(upgradesPath, 'utf8'));
      for (const u of upgrades) {
        const kitId = u.upgradeItem?.id;
        const kitName = u.upgradeItem?.name;
        const steps = (u.upgradeSteps || [])
          .map((s) => s.buildingIds || [])
          .flat();
        steps.forEach((bId, idx) => {
          if (!relations[bId]) relations[bId] = {};
          relations[bId].upgrade = {
            kitId,
            kitName,
            level: idx + 1,
            maxLevel: steps.length,
            chain: steps,
          };
        });
      }
    }
    const kitsPath = path.join(ENTITIES_DIR, 'selection_kits.json');
    if (fs.existsSync(kitsPath)) {
      const kits = JSON.parse(fs.readFileSync(kitsPath, 'utf8'));
      for (const kit of kits) {
        const kitId = kit.selectionKitId || kit.id;
        const kitName = kit.name;
        for (const opt of kit.options || []) {
          const bId = opt.item?.cityEntityId;
          if (bId) {
            if (!relations[bId]) relations[bId] = {};
            if (!relations[bId].selectionKits)
              relations[bId].selectionKits = [];
            relations[bId].selectionKits.push({
              kitId,
              kitName,
              optionName: opt.name,
              level: opt.item?.level,
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn(
      '[metadata-download] Note: relational indexing skipped:',
      e.message,
    );
  }

  // Generate Master Manifest
  console.log(
    `[metadata-download] Generating master manifest: ${MANIFEST_PATH}...`,
  );
  const manifest = {
    updatedAt: new Date().toISOString(),
    summary: {
      totalBuildingEntities: Object.keys(buildingEntities).length,
      totalStaticDictionaries: Object.keys(staticDictionaries).length,
      totalDynamicRpcExports: Object.keys(rpcExports).length,
      totalRelationalLinks: Object.keys(relations).length,
      totalDownloadedEndpoints: uniqueTasks.length,
    },
    core: {
      resources: 'resources.json',
      technologies: 'technologies.json',
      translations_en: 'translations_en.json',
      meta_ids: 'meta_ids.json',
    },
    dictionaries: staticDictionaries,
    rpcDefinitions: rpcExports,
    relationalLinks: relations,
    entities: buildingEntities,
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(
    `\n===============================================================`,
  );
  console.log(`✅ COMPLETE RAW DATABASE GENERATED!`);
  console.log(
    `   - Building Entities     : ${manifest.summary.totalBuildingEntities}`,
  );
  console.log(
    `   - Static Dictionaries   : ${manifest.summary.totalStaticDictionaries}`,
  );
  console.log(
    `   - Dynamic RPC Exports   : ${manifest.summary.totalDynamicRpcExports}`,
  );
  console.log(`   - Newly Fetched CDN     : ${downloadedCount}`);
  console.log(`   - Existing Cached CDN   : ${cachedCount}`);
  console.log(`   - Failed Requests       : ${failedCount}`);
  console.log(`   - Master Manifest       : ${MANIFEST_PATH}`);
  console.log(`   - Entities Directory    : ${ENTITIES_DIR}`);
  console.log(
    `===============================================================\n`,
  );

  if (failedCount > 0) {
    console.error(`[metadata-download] FAILED REQUESTS (${failedCount}):`);
    for (const detail of failures) console.error(`  - ${detail}`);
    console.error(
      `[metadata-download] Exiting non-zero because ${failedCount}/${uniqueTasks.length} metadata endpoints failed; the store is incomplete.`,
    );
    process.exit(1);
  }
  if (uniqueTasks.length > 0 && downloadedCount + cachedCount === 0) {
    console.error(
      '[metadata-download] No endpoint was downloaded or cached — refusing to exit 0 with an empty store.',
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[metadata-download] Fatal error:', err.message);
  process.exit(1);
});
