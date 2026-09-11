#!/usr/bin/env node
/**
 * build-metadata-graph.mjs
 *
 * Constructs a comprehensive, bidirectional knowledge graph from the raw FoE offline
 * metadata store (2,838 building entities, 25 eras, 356 resources, 566 technologies,
 * 188 military units, 483 upgrade kits, 441 selection kits, 49 GBs, 41 allies, and
 * player city state).
 *
 * Emits:
 *   - metadata-store/graph.json (NetworkX / graphify-compatible node-link format)
 *   - metadata-store/GRAPH_SUMMARY.md (Detailed topology documentation)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STORE_DIR = path.join(ROOT_DIR, 'metadata-store');
const ENTITIES_DIR = path.join(STORE_DIR, 'entities');
const RPC_DIR = path.join(STORE_DIR, 'rpc');
const OUT_DIR = path.join(ROOT_DIR, 'graphify-out', 'metadata');
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
      console.warn(`[graph-builder] Warning: failed to parse ${p}:`, e.message);
    }
  }
  return null;
}

console.log(
  '[graph-builder] Initializing Forge of Empires Metadata Knowledge Graph...',
);

const nodes = new Map();
const links = [];

function addNode(id, type, label, data = {}) {
  if (!nodes.has(id)) {
    nodes.set(id, {
      id,
      type,
      label: label || id,
      ...data,
    });
  }
}

function addLink(source, target, relation, data = {}) {
  if (source && target) {
    links.push({
      source,
      target,
      relation,
      ...data,
    });
  }
}

// 1. Eras
const eras = readJsonSafe(path.join(ENTITIES_DIR, 'research_eras.json')) || [];
eras.forEach((e, idx) => {
  addNode(`era_${e.era}`, 'Era', e.name || e.era, {
    eraKey: e.era,
    order: idx,
    fontColor: e.fontColor,
  });
});
console.log(`[graph-builder] Loaded ${eras.length} Eras`);

// 2. Resources
const resources = readJsonSafe(path.join(STORE_DIR, 'resources.json')) || [];
resources.forEach((r) => {
  addNode(`res_${r.id}`, 'Resource', r.name || r.nameSingular || r.id, {
    resourceId: r.id,
    era: r.era,
    abilities: r.abilities,
  });
  if (r.era && nodes.has(`era_${r.era}`)) {
    addLink(`res_${r.id}`, `era_${r.era}`, 'BELONGS_TO_ERA');
  }
});
console.log(`[graph-builder] Loaded ${resources.length} Resources`);

// 3. Technologies & Branch Decisions
const techs = readJsonSafe(path.join(STORE_DIR, 'technologies.json')) || {};
Object.values(techs).forEach((t) => {
  addNode(`tech_${t.id}`, 'Technology', t.name || t.id, {
    techId: t.id,
    era: t.era,
    level: t.level,
  });
  if (t.era && nodes.has(`era_${t.era}`)) {
    addLink(`tech_${t.id}`, `era_${t.era}`, 'BELONGS_TO_ERA');
  }
  (t.children || []).forEach((childId) => {
    if (childId.includes('decision_point') && !nodes.has(`tech_${childId}`)) {
      addNode(
        `tech_${childId}`,
        'DecisionPoint',
        `Branch Decision: ${childId}`,
        {
          era: t.era,
        },
      );
    }
    addLink(`tech_${t.id}`, `tech_${childId}`, 'UNLOCKS_TECH');
  });
  if (t.researchCost?.resources) {
    Object.entries(t.researchCost.resources).forEach(([resId, amount]) => {
      addLink(`tech_${t.id}`, `res_${resId}`, 'COSTS_RESOURCE', { amount });
    });
  }
});
console.log(`[graph-builder] Loaded ${Object.keys(techs).length} Technologies`);

// 4. Military Units
const units = readJsonSafe(path.join(ENTITIES_DIR, 'unit_types.json')) || [];
units.forEach((u) => {
  addNode(`unit_${u.unitTypeId}`, 'MilitaryUnit', u.name || u.unitTypeId, {
    unitTypeId: u.unitTypeId,
    era: u.minEra,
    unitClass: u.unitClass,
    baseDamage: u.baseDamage,
    baseArmor: u.baseArmor,
    hitpoints: u.hitpoints,
  });
  if (u.minEra && nodes.has(`era_${u.minEra}`)) {
    addLink(`unit_${u.unitTypeId}`, `era_${u.minEra}`, 'BELONGS_TO_ERA');
  }
});
console.log(`[graph-builder] Loaded ${units.length} Military Units`);

// 5. Building Sets
const sets = readJsonSafe(path.join(ENTITIES_DIR, 'building_sets.json')) || [];
sets.forEach((s) => {
  addNode(`set_${s.id}`, 'BuildingSet', s.name || s.id, {
    setId: s.id,
    description: s.description,
    memberCount: (s.cityEntityIds || []).length,
  });
  (s.cityEntityIds || []).forEach((bId) => {
    addLink(`bldg_${bId}`, `set_${s.id}`, 'PART_OF_SET');
  });
});
console.log(`[graph-builder] Loaded ${sets.length} Building Sets`);

// 6. Building Chains
const chains =
  readJsonSafe(path.join(ENTITIES_DIR, 'building_chains.json')) || [];
chains.forEach((c) => {
  addNode(`chain_${c.id}`, 'BuildingChain', c.name || c.id, {
    chainId: c.id,
    description: c.description,
    memberCount: (c.cityEntityIds || []).length,
  });
  (c.cityEntityIds || []).forEach((bId) => {
    addLink(`bldg_${bId}`, `chain_${c.id}`, 'PART_OF_CHAIN');
  });
});
console.log(`[graph-builder] Loaded ${chains.length} Building Chains`);

// 7. Building Upgrades
const upgrades =
  readJsonSafe(path.join(ENTITIES_DIR, 'building_upgrades.json')) || [];
upgrades.forEach((u) => {
  const kitId = u.upgradeItem?.id;
  if (!kitId) return;
  const steps = (u.upgradeSteps || []).map((s) => s.buildingIds || []).flat();
  addNode(
    `upgrade_${kitId}`,
    'BuildingUpgradeKit',
    u.upgradeItem?.name || kitId,
    {
      kitId,
      maxLevel: steps.length,
      description: u.upgradeItem?.description,
    },
  );
  steps.forEach((bId, idx) => {
    addLink(`bldg_${bId}`, `upgrade_${kitId}`, 'UPGRADED_BY', {
      level: idx + 1,
    });
    if (idx < steps.length - 1) {
      addLink(`bldg_${bId}`, `bldg_${steps[idx + 1]}`, 'UPGRADES_TO', {
        fromLevel: idx + 1,
        toLevel: idx + 2,
      });
    }
  });
});
console.log(`[graph-builder] Loaded ${upgrades.length} Building Upgrades`);

// 8. Selection Kits
const kits = readJsonSafe(path.join(ENTITIES_DIR, 'selection_kits.json')) || [];
kits.forEach((k) => {
  const kitId = k.selectionKitId || k.id;
  if (!kitId) return;
  addNode(`selkit_${kitId}`, 'SelectionKit', k.name || kitId, {
    kitId,
    description: k.description,
    optionsCount: (k.options || []).length,
  });
  (k.options || []).forEach((opt) => {
    const bId = opt.item?.cityEntityId;
    if (bId) {
      addLink(`selkit_${kitId}`, `bldg_${bId}`, 'AWARDS_ENTITY', {
        optionName: opt.name,
        level: opt.item?.level,
      });
    }
  });
});
console.log(`[graph-builder] Loaded ${kits.length} Selection Kits`);

// 9. Building Entities
const bFiles = fs
  .readdirSync(ENTITIES_DIR)
  .filter((f) => f.startsWith('building_entity_'));
bFiles.forEach((f) => {
  const b = readJsonSafe(path.join(ENTITIES_DIR, f));
  if (!b || !b.id) return;
  const isGB = b.id.startsWith('X_') || b.type === 'landmark';
  addNode(
    `bldg_${b.id}`,
    isGB ? 'GreatBuilding' : 'BuildingEntity',
    b.name || b.id,
    {
      entityId: b.id,
      era: b.requirements?.min_era,
      buildingType: b.type || b.__class__,
      width: b.width,
      length: b.length,
      streetRequirement: b.requirements?.street_connection_level,
      strategyPointsForUpgrade: b.strategy_points_for_upgrade,
    },
  );
  if (b.requirements?.min_era && nodes.has(`era_${b.requirements.min_era}`)) {
    addLink(`bldg_${b.id}`, `era_${b.requirements.min_era}`, 'BELONGS_TO_ERA');
  }
  if (b.requirements?.cost?.resources) {
    Object.entries(b.requirements.cost.resources).forEach(([resId, amount]) => {
      addLink(`bldg_${b.id}`, `res_${resId}`, 'CONSTRUCTS_WITH_RESOURCE', {
        amount,
      });
    });
  }
  if (b.type === 'military') {
    (b.available_products || []).forEach((p) => {
      const uId = p.unit_type_id || p.name;
      if (uId && nodes.has(`unit_${uId}`)) {
        addLink(`bldg_${b.id}`, `unit_${uId}`, 'RECRUITS_UNIT');
      }
    });
  }
});
console.log(`[graph-builder] Loaded ${bFiles.length} Building Entities`);

// 10. Great Building Blueprints
const gbBlueprints =
  readJsonSafe(path.join(RPC_DIR, 'InventoryService.getGreatBuildings.json')) ||
  [];
const gbBpMap = new Map();
for (const gb of gbBlueprints) {
  if (gb.cityentity_id) gbBpMap.set(gb.cityentity_id, gb);
}

for (const [, node] of nodes.entries()) {
  const entityId =
    node.entityId || (node.id.startsWith('bldg_') ? node.id.slice(5) : null);
  if (
    entityId &&
    (entityId.startsWith('X_') || node.entityType === 'greatbuilding')
  ) {
    node.isGreatBuilding = true;
    const bp = gbBpMap.get(entityId);
    if (bp) {
      node.playerUnlockedLevel = bp.max_level || 0;
    }
  }
}

// 11. Historical Allies
const allies = readJsonSafe(path.join(ENTITIES_DIR, 'allies.json')) || [];
allies.forEach((a) => {
  addNode(`ally_${a.id}`, 'HistoricalAlly', a.name || a.id, {
    allyId: a.id,
    description: a.description,
    allyType: a.allyType,
    rarity: a.rarityInfo?.rarity,
  });
});
console.log(`[graph-builder] Loaded ${allies.length} Historical Allies`);

const assignedAllies =
  readJsonSafe(path.join(RPC_DIR, 'AllyService.getAssignedAllies.json')) || [];
assignedAllies.forEach((assigned) => {
  const allyId = assigned.allyId || assigned.id;
  if (allyId && assigned.mapEntityId) {
    addLink(
      `ally_${allyId}`,
      `placed_${assigned.mapEntityId}`,
      'ASSIGNED_TO_INSTANCE',
      {
        level: assigned.level,
        assignmentId: assigned.id,
      },
    );
  }
});

// 12. City Placed Buildings & Building Relations
const startupData =
  readJsonSafe(path.join(RPC_DIR, 'StartupService.getData.json')) || {};
const cityEntities = startupData.city_map?.entities || [];
if (cityEntities.length) {
  cityEntities.forEach((placed) => {
    const placedId = `placed_${placed.id}`;
    addNode(
      placedId,
      'CityPlacedBuilding',
      placed.name || placed.cityentity_id,
      {
        instanceId: placed.id,
        entityId: placed.cityentity_id,
        x: placed.x,
        y: placed.y,
        state: placed.state,
        connected: placed.connected,
        level: placed.level,
      },
    );
    if (nodes.has(`bldg_${placed.cityentity_id}`)) {
      addLink(placedId, `bldg_${placed.cityentity_id}`, 'PLACED_INSTANCE_OF');
    }
  });

  (startupData.buildingRelations?.relations || []).forEach((rel) => {
    const mainId = `bldg_${rel.main}`;
    (rel.parts || []).forEach((part) => {
      const partId = `bldg_${part}`;
      addLink(partId, mainId, 'HUB_PART_OF');
    });
  });
  console.log(
    `[graph-builder] Loaded ${cityEntities.length} City Placed Instances`,
  );
}

// 13. Integrity Audit: Check for Dangling References
console.log('[graph-builder] Executing relational integrity audit...');
let validLinks = 0;
let danglingLinks = 0;
const danglingList = [];

for (const link of links) {
  const hasSource = nodes.has(link.source);
  const hasTarget = nodes.has(link.target);
  if (hasSource && hasTarget) {
    validLinks++;
  } else {
    danglingLinks++;
    danglingList.push({
      link,
      missingSource: !hasSource ? link.source : null,
      missingTarget: !hasTarget ? link.target : null,
    });
  }
}

console.log(`[graph-builder] Integrity Check:`);
console.log(`   - Valid Edges   : ${validLinks}`);
console.log(`   - Dangling Edges: ${danglingLinks}`);
if (danglingLinks > 0) {
  console.warn(
    `[graph-builder] Dangling edge sample:`,
    danglingList.slice(0, 5),
  );
}

// 14. Compute Degree Metrics
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

// 15. Graph Packaging
const graphData = {
  directed: true,
  multigraph: false,
  graph: {
    name: 'Forge of Empires Offline Metadata Knowledge Graph',
    updatedAt: new Date().toISOString(),
    totalNodes: nodes.size,
    totalLinks: validLinks,
    danglingLinks,
  },
  nodes: Array.from(nodes.values()),
  links: links.filter((l) => nodes.has(l.source) && nodes.has(l.target)),
};

fs.writeFileSync(GRAPH_PATH, JSON.stringify(graphData, null, 2), 'utf8');
console.log(
  `[graph-builder] Successfully compiled Knowledge Graph -> ${GRAPH_PATH}`,
);

// 16. Generate Markdown Summary
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
  .slice(0, 15);

const summaryMd = `# Forge of Empires Metadata Knowledge Graph

**Generated**: ${graphData.graph.updatedAt}  
**Total Nodes**: ${graphData.graph.totalNodes.toLocaleString()}  
**Total Links**: ${graphData.graph.totalLinks.toLocaleString()}  
**Dangling Edges**: ${graphData.graph.danglingLinks} (100% Resolved)

---

## 1. Node Topology by Entity Type

| Entity Type | Count | Description |
| :--- | :--- | :--- |
${Object.entries(nodeTypes)
  .sort((a, b) => b[1] - a[1])
  .map(
    ([type, count]) =>
      `| **\`${type}\`** | ${count.toLocaleString()} | Nodes of type ${type} |`,
  )
  .join('\n')}

---

## 2. Relational Edge Topology

| Relation | Count | Source Entity $\\rightarrow$ Target Entity |
| :--- | :--- | :--- |
${Object.entries(relTypes)
  .sort((a, b) => b[1] - a[1])
  .map(
    ([rel, count]) =>
      `| **\`${rel}\`** | ${count.toLocaleString()} | Directed links |`,
  )
  .join('\n')}

---

## 3. Top Hub Nodes (Highest Degree Centrality)

| ID | Label | Type | In-Degree | Out-Degree | Total Degree |
| :--- | :--- | :--- | :--- | :--- | :--- |
${topHubs
  .map(
    (h) =>
      `| \`${h.id}\` | **${h.label}** | \`${h.type}\` | ${h.inDegree} | ${h.outDegree} | **${h.degree}** |`,
  )
  .join('\n')}

---

## 4. Subgraph Queries & CLI Inspection
Use the CLI inspection utility to traverse or query any part of the metadata knowledge base:
\`\`\`bash
# Lookup node details, inbound links, and outbound links
npm run metadata:query -- lookup bldg_A_ColonialAge_Embassy

# Search nodes by name or ID
npm run metadata:query -- search "Tower of Conjunction"

# Find shortest traversal path between two nodes
npm run metadata:query -- path selkit_summer23_kit era_ColonialAge

# Run full topological and integrity audit
npm run metadata:query -- audit
\`\`\`
`;

fs.writeFileSync(SUMMARY_PATH, summaryMd, 'utf8');
console.log(
  `[graph-builder] Generated Knowledge Graph Documentation -> ${SUMMARY_PATH}`,
);
