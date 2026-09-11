#!/usr/bin/env node
/**
 * query-metadata-store.mjs
 *
 * Interactive and CLI query tool for traversing and searching the Forge of Empires
 * Offline Metadata Knowledge Graph.
 *
 * Commands:
 *   lookup <id>       Inspect full node details, inbound and outbound relations
 *   search <query>    Search nodes by ID or label
 *   path <from> <to>  Find shortest directed/undirected traversal path between nodes
 *   stats             Print topological metrics and entity distribution
 *   audit             Verify 100% relational integrity across all edges
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const candidatePaths = [
  process.env.METADATA_GRAPH_PATH,
  path.resolve(ROOT_DIR, '..', 'metadata-store', 'graphify-out', 'graph.json'),
  path.join(ROOT_DIR, 'graphify-out', 'metadata', 'graph.json'),
  path.resolve(ROOT_DIR, '..', 'metadata-store', 'graph.json'),
  path.join(ROOT_DIR, 'metadata-store', 'graph.json'),
].filter(Boolean);

const GRAPH_PATH =
  candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];

if (!fs.existsSync(GRAPH_PATH)) {
  console.error(`[query] Error: Knowledge graph not found at ${GRAPH_PATH}`);
  console.error('Run `npm run metadata:graph` first to build the graph.');
  process.exit(1);
}

const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
const nodeMap = new Map();
const inEdges = new Map();
const outEdges = new Map();
const neighbors = new Map();

for (const n of graph.nodes) {
  nodeMap.set(n.id, n);
  inEdges.set(n.id, []);
  outEdges.set(n.id, []);
  neighbors.set(n.id, new Set());
}

for (const l of graph.links) {
  if (outEdges.has(l.source)) outEdges.get(l.source).push(l);
  if (inEdges.has(l.target)) inEdges.get(l.target).push(l);
  if (neighbors.has(l.source)) neighbors.get(l.source).add(l.target);
  if (neighbors.has(l.target)) neighbors.get(l.target).add(l.source);
}

const args = process.argv.slice(2);
const command = args[0] || 'help';

switch (command.toLowerCase()) {
  case 'lookup':
  case 'get':
    handleLookup(args[1]);
    break;
  case 'search':
  case 'find':
    handleSearch(args.slice(1).join(' '));
    break;
  case 'path':
    handlePath(args[1], args[2]);
    break;
  case 'stats':
    handleStats();
    break;
  case 'audit':
    handleAudit();
    break;
  case 'help':
  default:
    printUsage();
    break;
}

function handleLookup(id) {
  if (!id) {
    console.error('Usage: npm run metadata:query -- lookup <nodeId>');
    return;
  }
  // Allow matching without prefix (e.g. 'A_ColonialAge_Embassy' matches 'bldg_A_ColonialAge_Embassy')
  let targetNode = nodeMap.get(id);
  if (!targetNode) {
    for (const [key, n] of nodeMap.entries()) {
      if (
        key === `bldg_${id}` ||
        key === `res_${id}` ||
        key === `tech_${id}` ||
        key === `era_${id}` ||
        key === `selkit_${id}`
      ) {
        targetNode = n;
        break;
      }
    }
  }

  if (!targetNode) {
    console.error(`[query] Node '${id}' not found in graph.`);
    const candidates = [];
    for (const [key, n] of nodeMap.entries()) {
      if (
        key.toLowerCase().includes(id.toLowerCase()) ||
        n.label.toLowerCase().includes(id.toLowerCase())
      ) {
        candidates.push(`${n.id} (${n.label} [${n.type}])`);
        if (candidates.length >= 5) break;
      }
    }
    if (candidates.length > 0) {
      console.log('\nDid you mean one of these?');
      candidates.forEach((c) => console.log(`  - ${c}`));
    }
    return;
  }

  console.log(
    `\n===============================================================`,
  );
  console.log(`📌 NODE: ${targetNode.id}`);
  console.log(`   Label      : ${targetNode.label}`);
  console.log(`   Type       : ${targetNode.type}`);
  if (targetNode.era) console.log(`   Era        : ${targetNode.era}`);
  if (targetNode.buildingType)
    console.log(`   BuildingType: ${targetNode.buildingType}`);
  if (targetNode.width && targetNode.length)
    console.log(`   Dimensions : ${targetNode.width}x${targetNode.length}`);
  if (targetNode.degree !== undefined)
    console.log(
      `   Centrality : Total ${targetNode.degree} (In: ${targetNode.inDegree}, Out: ${targetNode.outDegree})`,
    );
  console.log(
    `===============================================================`,
  );

  const outs = outEdges.get(targetNode.id) || [];
  console.log(`\n➡️  OUTGOING LINKS (${outs.length}):`);
  if (outs.length === 0) {
    console.log('   (none)');
  } else {
    outs.forEach((l) => {
      const tgt = nodeMap.get(l.target);
      const tgtLabel = tgt ? `${tgt.label} [${tgt.type}]` : l.target;
      const meta = Object.entries(l)
        .filter(([k]) => !['source', 'target', 'relation'].includes(k))
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      console.log(
        `   --[${l.relation}${meta ? ` (${meta})` : ''}]--> ${l.target} (${tgtLabel})`,
      );
    });
  }

  const ins = inEdges.get(targetNode.id) || [];
  console.log(`\n⬅️  INCOMING LINKS (${ins.length}):`);
  if (ins.length === 0) {
    console.log('   (none)');
  } else {
    const displayIns = ins.slice(0, 20);
    displayIns.forEach((l) => {
      const src = nodeMap.get(l.source);
      const srcLabel = src ? `${src.label} [${src.type}]` : l.source;
      const meta = Object.entries(l)
        .filter(([k]) => !['source', 'target', 'relation'].includes(k))
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      console.log(
        `   <--[${l.relation}${meta ? ` (${meta})` : ''}]-- ${l.source} (${srcLabel})`,
      );
    });
    if (ins.length > 20) {
      console.log(`   ... and ${ins.length - 20} more incoming links`);
    }
  }
  console.log('');
}

function handleSearch(query) {
  if (!query || query.trim().length === 0) {
    console.error('Usage: npm run metadata:query -- search <queryText>');
    return;
  }
  const q = query.toLowerCase().trim();
  const results = [];
  for (const n of graph.nodes) {
    if (
      n.id.toLowerCase().includes(q) ||
      (n.label && n.label.toLowerCase().includes(q))
    ) {
      results.push(n);
    }
  }

  console.log(`\nSearch results for "${query}" (${results.length} matches):`);
  if (results.length === 0) {
    console.log('   No matching nodes found.');
    return;
  }

  results.slice(0, 25).forEach((n) => {
    console.log(
      `   • [${n.type.padEnd(18)}] ${n.id.padEnd(35)} -> ${n.label} (Era: ${n.era || 'N/A'}, Degree: ${n.degree})`,
    );
  });
  if (results.length > 25) {
    console.log(
      `   ... and ${results.length - 25} more results. Refine your query for narrower results.`,
    );
  }
  console.log('');
}

function handlePath(startId, endId) {
  if (!startId || !endId) {
    console.error('Usage: npm run metadata:query -- path <startId> <endId>');
    return;
  }

  let start = nodeMap.get(startId) ? startId : null;
  let end = nodeMap.get(endId) ? endId : null;

  if (!start) {
    for (const key of nodeMap.keys()) {
      if (key.includes(startId)) {
        start = key;
        break;
      }
    }
  }
  if (!end) {
    for (const key of nodeMap.keys()) {
      if (key.includes(endId)) {
        end = key;
        break;
      }
    }
  }

  if (!start || !end) {
    console.error(
      `Could not resolve nodes: start=${startId} (${start}), end=${endId} (${end})`,
    );
    return;
  }

  console.log(`\nSearching shortest path: ${start} -> ${end}...`);
  // Breadth-First Search (undirected for domain connections)
  const queue = [[start]];
  const visited = new Set([start]);
  let foundPath = null;

  while (queue.length > 0) {
    const currentPath = queue.shift();
    const curr = currentPath[currentPath.length - 1];

    if (curr === end) {
      foundPath = currentPath;
      break;
    }

    for (const next of neighbors.get(curr) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...currentPath, next]);
      }
    }
  }

  if (!foundPath) {
    console.log(`No path found between ${start} and ${end}.`);
    return;
  }

  console.log(`\n🎯 Path found (${foundPath.length - 1} hops):`);
  for (let i = 0; i < foundPath.length; i++) {
    const n = nodeMap.get(foundPath[i]);
    console.log(`   [${i}] ${n.id} (${n.label} [${n.type}])`);
    if (i < foundPath.length - 1) {
      const nextId = foundPath[i + 1];
      // Find edge relation
      const outEdge = (outEdges.get(n.id) || []).find(
        (l) => l.target === nextId,
      );
      const inEdge = (inEdges.get(n.id) || []).find((l) => l.source === nextId);
      if (outEdge) {
        console.log(`        ---[ ${outEdge.relation} ]--->`);
      } else if (inEdge) {
        console.log(`        <---[ ${inEdge.relation} ]---`);
      } else {
        console.log(`        ---[ CONNECTED ]---`);
      }
    }
  }
  console.log('');
}

function handleStats() {
  console.log(
    `\n===============================================================`,
  );
  console.log(`📊 FORGE OF EMPIRES KNOWLEDGE GRAPH TOPOLOGY`);
  const updatedAt = graph.graph?.updatedAt ?? 'N/A';
  const totalNodes = graph.graph?.totalNodes ?? graph.nodes?.length ?? 0;
  const totalLinks = graph.graph?.totalLinks ?? graph.links?.length ?? 0;
  const danglingLinks = graph.graph?.danglingLinks ?? 0;
  console.log(`   Updated  : ${updatedAt}`);
  console.log(`   Nodes    : ${totalNodes.toLocaleString()}`);
  console.log(`   Edges    : ${totalLinks.toLocaleString()}`);
  console.log(`   Dangling : ${danglingLinks}`);
  console.log(
    `===============================================================`,
  );

  const types = {};
  for (const n of graph.nodes) {
    types[n.type] = (types[n.type] || 0) + 1;
  }
  console.log('\nEntity Distribution:');
  Object.entries(types)
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, count]) => {
      console.log(`   • ${t.padEnd(22)}: ${count.toLocaleString()}`);
    });

  const rels = {};
  for (const l of graph.links) {
    rels[l.relation] = (rels[l.relation] || 0) + 1;
  }
  console.log('\nEdge Distribution:');
  Object.entries(rels)
    .sort((a, b) => b[1] - a[1])
    .forEach(([r, count]) => {
      console.log(`   • ${r.padEnd(25)}: ${count.toLocaleString()}`);
    });
  console.log('');
}

function handleAudit() {
  console.log(`\nExecuting full relational integrity audit...`);
  let valid = 0;
  let broken = 0;
  for (const l of graph.links) {
    if (nodeMap.has(l.source) && nodeMap.has(l.target)) {
      valid++;
    } else {
      broken++;
      console.warn(`Broken edge: ${l.source} -[${l.relation}]-> ${l.target}`);
    }
  }
  console.log(`Audit Complete:`);
  console.log(`   - Total Verified Edges: ${valid}`);
  console.log(`   - Broken Edges        : ${broken}`);
  if (broken === 0) {
    console.log(
      `   ✅ 100% PERFECTION: Zero broken references across entire FoE database.\n`,
    );
  }
}

function printUsage() {
  console.log(`
Forge of Empires Offline Metadata Query Tool

Usage:
  npm run metadata:query -- <command> [options]

Commands:
  lookup <nodeId>     View node details, attributes, and connected edges
  search <query>      Search entities by name, era, or identifier
  path <from> <to>    Find shortest relational path between two nodes
  stats               Display summary metrics and node distributions
  audit               Verify graph integrity and report broken edges
`);
}
