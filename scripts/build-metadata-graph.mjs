#!/usr/bin/env node
/**
 * build-metadata-graph.mjs
 *
 * Raw-faithful knowledge graph builder for Forge of Empires offline metadata.
 *
 * Design: Each entity = one node with full JSON preserved as `data` property.
 * Relationships are detected by scanning string values for matches to known entity IDs.
 * No schema assumptions — the graph reflects the actual game data structure.
 *
 * Emits:
 *   - ../metadata-store/graphify-out/graph.json (NetworkX / graphify-compatible node-link format)
 *   - ../metadata-store/graphify-out/GRAPH_SUMMARY.md (Topology documentation)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STORE_DIR =
  process.env.METADATA_STORE_DIR ||
  [
    path.resolve(ROOT_DIR, '..', 'metadata-store'),
    path.join(ROOT_DIR, 'metadata-store'),
  ].find((p) => fs.existsSync(p)) ||
  path.resolve(ROOT_DIR, '..', 'metadata-store');
const ENTITIES_DIR = path.join(STORE_DIR, 'entities');
const RPC_DIR = path.join(STORE_DIR, 'rpc');
const OUT_DIR =
  process.env.GRAPHIFY_OUT || path.join(STORE_DIR, 'graphify-out');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}
const GRAPH_PATH = path.join(OUT_DIR, 'graph.json');
const SUMMARY_PATH = path.join(OUT_DIR, 'GRAPH_SUMMARY.md');

function readJsonSafe(p) {
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      console.warn(`[graph] Warning: failed to parse ${p}:`, e.message);
    }
  }
  return null;
}

console.log('[graph] Building raw-faithful FoE Metadata Knowledge Graph...');

const nodes = new Map();
const links = [];
const entityIdSet = new Set();

function addNode(id, type, label, data = {}, sourceFile = '') {
  const strId = String(id);
  if (nodes.has(strId)) return;
  const strLabel = String(label ?? id);
  nodes.set(strId, {
    id: strId,
    type: String(type || 'entity'),
    label: strLabel,
    data,
    source_file: sourceFile || 'metadata-store',
  });
  entityIdSet.add(strId);
}

function addLink(source, target, relation, data = {}) {
  if (source && target && source !== target) {
    links.push({
      source: String(source),
      target: String(target),
      relation: String(relation || 'related_to'),
      confidence: 'EXTRACTED',
      confidence_score: 1.0,
      source_file: data.source_file || 'metadata-store',
      weight: 1.0,
      ...data,
    });
  }
}

function extractId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 2) return null;
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('http')
  )
    return null;
  return trimmed;
}

// 1. Eras
const eras = readJsonSafe(path.join(ENTITIES_DIR, 'research_eras.json')) || [];
eras.forEach((e, idx) => {
  addNode(`era:${e.era}`, 'Era', e.name || e.era, { ...e, order: idx });
});
console.log(`[graph] Loaded ${eras.length} Eras`);

// 2. Resources
const resources = readJsonSafe(path.join(STORE_DIR, 'resources.json')) || [];
resources.forEach((r) => {
  addNode(`resource:${r.id}`, 'Resource', r.name || r.id, r);
});
console.log(`[graph] Loaded ${resources.length} Resources`);

// 3. Technologies
const techs = readJsonSafe(path.join(STORE_DIR, 'technologies.json')) || {};
Object.values(techs).forEach((t) => {
  addNode(`tech:${t.id}`, 'Technology', t.name || t.id, t);
});
console.log(`[graph] Loaded ${Object.keys(techs).length} Technologies`);

// 4. Military Units
const units = readJsonSafe(path.join(ENTITIES_DIR, 'unit_types.json')) || [];
units.forEach((u) => {
  addNode(
    `unit:${u.unitTypeId || u.id}`,
    'MilitaryUnit',
    u.name || u.unitTypeId || u.id,
    u,
  );
});
console.log(`[graph] Loaded ${units.length} Military Units`);

// 5. Building Sets
const sets = readJsonSafe(path.join(ENTITIES_DIR, 'building_sets.json')) || [];
sets.forEach((s) => {
  addNode(`set:${s.id}`, 'BuildingSet', s.name || s.id, s);
});
console.log(`[graph] Loaded ${sets.length} Building Sets`);

// 6. Building Chains
const chains =
  readJsonSafe(path.join(ENTITIES_DIR, 'building_chains.json')) || [];
chains.forEach((c) => {
  addNode(`chain:${c.id}`, 'BuildingChain', c.name || c.id, c);
});
console.log(`[graph] Loaded ${chains.length} Building Chains`);

// 7. Building Upgrades
const upgrades =
  readJsonSafe(path.join(ENTITIES_DIR, 'building_upgrades.json')) || [];
upgrades.forEach((u) => {
  const kitId = u.upgradeItem?.id;
  if (kitId) {
    addNode(
      `upgrade:${kitId}`,
      'BuildingUpgradeKit',
      u.upgradeItem?.name || kitId,
      u,
    );
  }
});
console.log(`[graph] Loaded ${upgrades.length} Building Upgrade Kits`);

// 8. Selection Kits
const kits = readJsonSafe(path.join(ENTITIES_DIR, 'selection_kits.json')) || [];
kits.forEach((k) => {
  const kitId = k.selectionKitId || k.id;
  if (kitId) {
    addNode(`selkit:${kitId}`, 'SelectionKit', k.name || kitId, k);
  }
});
console.log(`[graph] Loaded ${kits.length} Selection Kits`);

// 9. Historical Allies
const allies = readJsonSafe(path.join(ENTITIES_DIR, 'allies.json')) || [];
allies.forEach((a) => {
  addNode(`ally:${a.id}`, 'HistoricalAlly', a.name || a.id, a);
});
console.log(`[graph] Loaded ${allies.length} Historical Allies`);

// 10. Building Entities (raw)
const bFiles = fs
  .readdirSync(ENTITIES_DIR)
  .filter((f) => f.startsWith('building_entity_'));
bFiles.forEach((f) => {
  const b = readJsonSafe(path.join(ENTITIES_DIR, f));
  if (!b || !b.id) return;
  const isGB = b.id.startsWith('X_') || b.type === 'landmark';
  addNode(
    `building:${b.id}`,
    isGB ? 'GreatBuilding' : 'BuildingEntity',
    b.name || b.id,
    b,
    `entities/${f}`,
  );
});
console.log(`[graph] Loaded ${bFiles.length} Building Entities`);

// 11. Other entity files (non-building) — skip files already loaded as core dictionaries
const otherEntityFiles = fs
  .readdirSync(ENTITIES_DIR)
  .filter((f) => f.endsWith('.json') && !f.startsWith('building_entity_'));
const skipEntityFiles = new Set([
  'research_eras.json',
  'unit_types.json',
  'building_sets.json',
  'building_chains.json',
  'building_upgrades.json',
  'selection_kits.json',
  'allies.json',
  'building_categories.json',
]);
otherEntityFiles
  .filter((f) => !skipEntityFiles.has(f))
  .forEach((f) => {
    const data = readJsonSafe(path.join(ENTITIES_DIR, f));
    if (!data) return;
    const key = f.replace(/\.json$/, '');

    if (Array.isArray(data)) {
      data.forEach((item, idx) => {
        const id = item?.id || `${key}_${idx}`;
        addNode(`entity:${id}`, key, item?.name || id, item, `entities/${f}`);
      });
    } else if (data.id) {
      addNode(
        `entity:${data.id}`,
        key,
        data.name || data.id,
        data,
        `entities/${f}`,
      );
    } else {
      addNode(`dict:${key}`, 'Dictionary', key, data, `entities/${f}`);
    }
  });
console.log(`[graph] Loaded ${otherEntityFiles.length} other entity files`);

// 12. RPC exports
const rpcFiles =
  fs.existsSync(RPC_DIR) ?
    fs.readdirSync(RPC_DIR).filter((f) => f.endsWith('.json'))
  : [];
rpcFiles.forEach((f) => {
  const data = readJsonSafe(path.join(RPC_DIR, f));
  if (!data) return;
  const key = f.replace(/\.json$/, '');
  addNode(`rpc:${key}`, 'RPCPayload', key, data, `rpc/${f}`);
});
console.log(`[graph] Loaded ${rpcFiles.length} RPC payloads`);

// 13. Generic relationship detection
// Scan all string values in all nodes for matches to known entity IDs
console.log('[graph] Detecting relationships via ID scanning...');

function findMatchingId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const prefixes = [
    'building:',
    'resource:',
    'tech:',
    'unit:',
    'era:',
    'set:',
    'chain:',
    'upgrade:',
    'selkit:',
    'ally:',
    'entity:',
    'rpc:',
    'dict:',
  ];
  for (const prefix of prefixes) {
    if (entityIdSet.has(prefix + trimmed)) return prefix + trimmed;
  }
  return null;
}

function scanForRelationships(obj, sourceId, depth = 0) {
  if (depth > 8) return;
  if (obj === null || obj === undefined) return;

  if (Array.isArray(obj)) {
    obj.forEach((item) => scanForRelationships(item, sourceId, depth + 1));
    return;
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const targetId = findMatchingId(value);
        if (targetId) {
          addLink(sourceId, targetId, key);
        }
      } else if (typeof value === 'object' && value !== null) {
        scanForRelationships(value, sourceId, depth + 1);
      }
    }
  }
}

let scannedNodes = 0;
for (const [id, node] of nodes.entries()) {
  scanForRelationships(node.data, id);
  scannedNodes++;
  if (scannedNodes % 500 === 0) {
    console.log(`[graph]   Scanned ${scannedNodes}/${nodes.size} nodes...`);
  }
}
console.log(`[graph] Scanned ${scannedNodes} nodes for relationships`);

// 14. Integrity audit
let validLinks = 0;
let danglingLinks = 0;
for (const link of links) {
  if (nodes.has(link.source) && nodes.has(link.target)) {
    validLinks++;
  } else {
    danglingLinks++;
  }
}

console.log(
  `[graph] Integrity: ${validLinks} valid, ${danglingLinks} dangling`,
);

// 15. Compute degree metrics
const inDegree = new Map();
const outDegree = new Map();
for (const link of links) {
  if (nodes.has(link.source) && nodes.has(link.target)) {
    outDegree.set(link.source, (outDegree.get(link.source) || 0) + 1);
    inDegree.set(link.target, (inDegree.get(link.target) || 0) + 1);
  }
}

for (const node of nodes.values()) {
  node.inDegree = inDegree.get(node.id) || 0;
  node.outDegree = outDegree.get(node.id) || 0;
  node.degree = node.inDegree + node.outDegree;
}

// 16. Package graph
const graphData = {
  directed: true,
  multigraph: false,
  graph: {
    name: 'Forge of Empires Raw Metadata Knowledge Graph',
    updatedAt: new Date().toISOString(),
    totalNodes: nodes.size,
    totalLinks: validLinks,
    danglingLinks,
  },
  nodes: Array.from(nodes.values()),
  links: links.filter((l) => nodes.has(l.source) && nodes.has(l.target)),
};

fs.writeFileSync(GRAPH_PATH, JSON.stringify(graphData, null, 2), 'utf8');
console.log(`[graph] Compiled -> ${GRAPH_PATH}`);

// 17. Generate summary
const nodeTypes = {};
for (const n of nodes.values()) {
  nodeTypes[n.type] = (nodeTypes[n.type] || 0) + 1;
}

const relTypes = {};
for (const l of graphData.links) {
  relTypes[l.relation] = (relTypes[l.relation] || 0) + 1;
}

const topHubs = Array.from(nodes.values())
  .sort((a, b) => b.degree - a.degree)
  .slice(0, 20);

const summaryMd = `# Forge of Empires Raw Metadata Knowledge Graph

**Generated**: ${graphData.graph.updatedAt}
**Total Nodes**: ${graphData.graph.totalNodes.toLocaleString()}
**Total Links**: ${graphData.graph.totalLinks.toLocaleString()}
**Dangling Edges**: ${graphData.graph.danglingLinks}

---

## Node Types

| Type | Count |
| :--- | --- |
${Object.entries(nodeTypes)
  .sort((a, b) => b[1] - a[1])
  .map(([type, count]) => `| \`${type}\` | ${count.toLocaleString()} |`)
  .join('\n')}

---

## Top Hub Nodes

| ID | Label | Type | Degree |
| :--- | :--- | :--- | --- |
${topHubs
  .map((h) => `| \`${h.id}\` | **${h.label}** | \`${h.type}\` | ${h.degree} |`)
  .join('\n')}

---

## Design

Each entity is one node with full raw JSON preserved in the \`data\` property.
Relationships are detected by scanning string values for matches to known entity IDs.
No schema assumptions — the graph reflects the actual game data structure.
`;

fs.writeFileSync(SUMMARY_PATH, summaryMd, 'utf8');
console.log(`[graph] Summary -> ${SUMMARY_PATH}`);
