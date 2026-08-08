#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

const CODE_EXTENSIONS = new Set([
  '.astro',
  '.bash',
  '.c',
  '.cc',
  '.cjs',
  '.cls',
  '.cpp',
  '.cs',
  '.cshtml',
  '.csproj',
  '.cts',
  '.cu',
  '.cuh',
  '.cxx',
  '.dart',
  '.ejs',
  '.ets',
  '.ex',
  '.exs',
  '.f',
  '.f03',
  '.f08',
  '.f90',
  '.f95',
  '.fsproj',
  '.go',
  '.gradle',
  '.groovy',
  '.h',
  '.hcl',
  '.hpp',
  '.inc',
  '.java',
  '.jl',
  '.js',
  '.json',
  '.jsx',
  '.kt',
  '.kts',
  '.lua',
  '.luau',
  '.m',
  '.metal',
  '.mjs',
  '.mm',
  '.mts',
  '.pas',
  '.php',
  '.pp',
  '.ps1',
  '.psd1',
  '.psm1',
  '.py',
  '.r',
  '.rake',
  '.razor',
  '.rb',
  '.rs',
  '.scala',
  '.sh',
  '.sln',
  '.slnx',
  '.sql',
  '.sv',
  '.svelte',
  '.svh',
  '.swift',
  '.tf',
  '.tfvars',
  '.toc',
  '.trigger',
  '.ts',
  '.tsx',
  '.v',
  '.vbproj',
  '.vue',
  '.xaml',
  '.zig',
]);

const IMAGE_EXTENSIONS = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const LANGUAGE_FAMILY = new Map([
  ['.c', 'c'],
  ['.cc', 'c'],
  ['.cjs', 'js'],
  ['.cpp', 'c'],
  ['.cs', 'dotnet'],
  ['.cts', 'js'],
  ['.cxx', 'c'],
  ['.ejs', 'js'],
  ['.go', 'go'],
  ['.h', 'c'],
  ['.hpp', 'c'],
  ['.java', 'jvm'],
  ['.js', 'js'],
  ['.jsx', 'js'],
  ['.kt', 'jvm'],
  ['.kts', 'jvm'],
  ['.mjs', 'js'],
  ['.mts', 'js'],
  ['.php', 'php'],
  ['.py', 'python'],
  ['.pyw', 'python'],
  ['.r', 'r'],
  ['.rake', 'ruby'],
  ['.rb', 'ruby'],
  ['.rs', 'rust'],
  ['.scala', 'jvm'],
  ['.svelte', 'js'],
  ['.swift', 'swift'],
  ['.ts', 'js'],
  ['.tsx', 'js'],
  ['.vue', 'js'],
]);
const ROUTINE_RELATIONS = new Set(['contains', 'imports', 'imports_from', 'method']);
const DEFAULT_GRAPH = 'graphify-out/graph.json';
const DEFAULT_REPORT = 'graphify-out/GRAPH_REPORT.md';
const MAX_CONNECTIONS = 5;
const MAX_GOD_NODES = 10;
const MAX_QUESTIONS = 5;

function endpointId(endpoint) {
  return typeof endpoint === 'object' && endpoint !== null ? endpoint.id : endpoint;
}

function isExtensionSource(sourceFile) {
  const normalized = sourceFile.replaceAll('\\', '/');
  return normalized.startsWith('src/') || normalized.includes('/src/');
}

function isRuntimeCodeNode(node) {
  const sourceFile = node.source_file ?? '';
  return (
    isExtensionSource(sourceFile) &&
    (node.file_type === 'code' || fileCategory(sourceFile) === 'code')
  );
}

function isFileNode(node) {
  const sourceFile = node.source_file;
  const label = node.label;
  if (!sourceFile || !label) return false;

  const basename = path.posix.basename(sourceFile.replaceAll('\\', '/'));
  const stem = basename.slice(0, basename.length - path.posix.extname(basename).length);
  return label === basename || label === stem;
}

function isConceptNode(node) {
  const sourceFile = node.source_file;
  return !sourceFile || path.posix.extname(sourceFile.replaceAll('\\', '/')) === '';
}

function topLevelDirectory(sourceFile) {
  const normalized = sourceFile.replaceAll('\\', '/');
  return normalized.includes('/') ? normalized.split('/')[0] : normalized;
}

function fileCategory(sourceFile) {
  const extension = path.posix.extname(sourceFile.replaceAll('\\', '/')).toLowerCase();
  if (CODE_EXTENSIONS.has(extension)) return 'code';
  if (extension === '.pdf') return 'paper';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  return 'doc';
}

function crossesLanguageFamilies(sourceFile, targetFile) {
  const sourceFamily = LANGUAGE_FAMILY.get(path.posix.extname(sourceFile).toLowerCase());
  const targetFamily = LANGUAGE_FAMILY.get(path.posix.extname(targetFile).toLowerCase());
  return sourceFamily !== undefined && targetFamily !== undefined && sourceFamily !== targetFamily;
}

function connectionScore(source, target, edge, degrees) {
  const confidence = edge.confidence ?? 'EXTRACTED';
  const relation = edge.relation ?? '';
  const sourceCategory = fileCategory(source.source_file);
  const targetCategory = fileCategory(target.source_file);
  const categories = new Set([sourceCategory, targetCategory]);
  const suppressStructuralScores =
    confidence === 'INFERRED' &&
    (relation === 'calls' || relation === 'uses') &&
    (crossesLanguageFamilies(source.source_file, target.source_file) ||
      (categories.size === 2 && categories.has('code') && categories.has('doc')));
  const reasons = [];
  let score =
    suppressStructuralScores ? 0 : ({ AMBIGUOUS: 3, INFERRED: 2, EXTRACTED: 1 }[confidence] ?? 1);

  if (confidence === 'AMBIGUOUS' || confidence === 'INFERRED') {
    reasons.push(`${confidence.toLowerCase()} connection - not explicitly stated in source`);
  }

  if (sourceCategory !== targetCategory && !suppressStructuralScores) {
    score += 2;
    reasons.push(`crosses file types (${sourceCategory} ↔ ${targetCategory})`);
  }

  if (
    topLevelDirectory(source.source_file) !== topLevelDirectory(target.source_file) &&
    !suppressStructuralScores
  ) {
    score += 2;
    reasons.push('connects across different repos/directories');
  }

  if (
    source.community !== undefined &&
    target.community !== undefined &&
    source.community !== target.community &&
    !suppressStructuralScores
  ) {
    score += 1;
    reasons.push('bridges separate communities');
  }

  if (relation === 'semantically_similar_to') {
    score = Math.trunc(score * 1.5);
    reasons.push('semantically similar concepts with no structural link');
  }

  const sourceDegree = degrees.get(source.id) ?? 0;
  const targetDegree = degrees.get(target.id) ?? 0;
  if (Math.min(sourceDegree, targetDegree) <= 2 && Math.max(sourceDegree, targetDegree) >= 5) {
    score += 1;
    const peripheral = sourceDegree <= 2 ? source.label : target.label;
    const hub = sourceDegree <= 2 ? target.label : source.label;
    reasons.push(
      `peripheral node ${markdownCode(peripheral)} unexpectedly reaches hub ${markdownCode(hub)}`,
    );
  }

  return { reasons, score };
}

function selectSourceSurprises(graph, limit = MAX_CONNECTIONS) {
  const nodes = new Map((graph.nodes ?? []).map((node) => [node.id, node]));
  const includedNodeIds = new Set(
    [...nodes.values()]
      .filter((node) => isExtensionSource(node.source_file ?? ''))
      .map((node) => node.id),
  );
  const degrees = new Map();

  for (const edge of graph.links ?? []) {
    const sourceId = endpointId(edge.source);
    const targetId = endpointId(edge.target);
    if (!includedNodeIds.has(sourceId) || !includedNodeIds.has(targetId)) continue;
    degrees.set(sourceId, (degrees.get(sourceId) ?? 0) + 1);
    degrees.set(targetId, (degrees.get(targetId) ?? 0) + 1);
  }

  const candidates = [];
  for (const edge of graph.links ?? []) {
    const source = nodes.get(endpointId(edge.source));
    const target = nodes.get(endpointId(edge.target));
    if (!source || !target) continue;
    if (!source.source_file || !target.source_file) continue;
    if (!isExtensionSource(source.source_file) || !isExtensionSource(target.source_file)) continue;
    if (source.source_file === target.source_file) continue;
    if (ROUTINE_RELATIONS.has(edge.relation)) continue;
    if (isConceptNode(source) || isConceptNode(target)) continue;
    if (isFileNode(source) || isFileNode(target)) continue;

    const { reasons, score } = connectionScore(source, target, edge, degrees);
    candidates.push({ edge, reasons, score, source, target });
  }

  return candidates.sort((left, right) => right.score - left.score).slice(0, limit);
}

function markdownCode(value) {
  return `\`${String(value).replaceAll('`', '\\`')}\``;
}

function formatSurprisingSection(connections) {
  const lines = [
    '## Surprising Connections (`src/` only)',
    '',
    '_Repository policy: Graphify’s standard surprise ranking is applied only to nodes sourced from the extension implementation under `src/`. Documentation, agent configuration, build tooling, and other repository metadata remain queryable in the graph but are excluded here._',
    '',
  ];

  if (connections.length === 0) {
    lines.push('_No qualifying relationships were found within `src/`._');
    return lines.join('\n');
  }

  for (const { edge, reasons, source, target } of connections) {
    lines.push(
      `- ${markdownCode(source.label)} --${edge.relation ?? 'related_to'}--> ${markdownCode(target.label)} [${edge.confidence ?? 'EXTRACTED'}]`,
      `  ${source.source_file} → ${target.source_file}`,
      `  _Why: ${reasons.join('; ')}._`,
    );
  }

  return lines.join('\n');
}

function sourceQuestions(graph, limit = MAX_QUESTIONS) {
  const nodes = new Map(
    (graph.nodes ?? [])
      .filter((node) => isExtensionSource(node.source_file ?? ''))
      .map((node) => [node.id, node]),
  );
  const edges = (graph.links ?? [])
    .map((edge) => ({
      edge,
      source: nodes.get(endpointId(edge.source)),
      target: nodes.get(endpointId(edge.target)),
    }))
    .filter(({ source, target }) => source && target);
  const degrees = new Map();
  for (const { source, target } of edges) {
    degrees.set(source.id, (degrees.get(source.id) ?? 0) + 1);
    degrees.set(target.id, (degrees.get(target.id) ?? 0) + 1);
  }

  const questions = [];
  const seen = new Set();
  const add = (question, rationale) => {
    if (questions.length >= limit || seen.has(question)) return;
    seen.add(question);
    questions.push({ question, rationale });
  };

  for (const { edge, source, target } of edges.filter(
    ({ edge }) => edge.confidence === 'INFERRED' || edge.confidence === 'AMBIGUOUS',
  )) {
    add(
      `Is the ${String(edge.confidence).toLowerCase()} ${markdownCode(source.label)} --${edge.relation ?? 'related_to'}--> ${markdownCode(target.label)} source-code relationship correct?`,
      `${source.source_file} → ${target.source_file}`,
    );
  }

  const hubs = [...nodes.values()].sort(
    (left, right) =>
      (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0) ||
      String(left.label).localeCompare(String(right.label)),
  );
  for (const node of hubs) {
    const degree = degrees.get(node.id) ?? 0;
    if (degree === 0) continue;
    add(
      `What extension behavior depends on ${markdownCode(node.label)}, and what would be affected if it changed?`,
      `${degree} relationship${degree === 1 ? '' : 's'} within ${node.source_file}.`,
    );
  }

  for (const { edge, source, target } of edges) {
    if (source.source_file === target.source_file) continue;
    add(
      `Why does ${markdownCode(source.label)} --${edge.relation ?? 'related_to'}--> ${markdownCode(target.label)} across these source modules?`,
      `${source.source_file} → ${target.source_file}`,
    );
  }

  return questions;
}

function formatSuggestedSection(questions) {
  const lines = [
    '## Suggested Questions (`src/` only)',
    '',
    '_Questions derived only from extension implementation nodes and relationships under `src/`._',
    '',
  ];

  if (questions.length === 0) {
    lines.push('_No source-code questions could be generated from the current graph._');
    return lines.join('\n');
  }

  for (const { question, rationale } of questions) {
    lines.push(`- **${question}**`, `  _${rationale}_`);
  }
  return lines.join('\n');
}

function runtimeGraph(graph) {
  const nodes = (graph.nodes ?? []).filter(isRuntimeCodeNode);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const links = (graph.links ?? []).filter(
    (edge) => nodeIds.has(endpointId(edge.source)) && nodeIds.has(endpointId(edge.target)),
  );
  const hyperedges = (graph.hyperedges ?? []).filter((hyperedge) => {
    const members = hyperedge.nodes ?? [];
    return members.length > 0 && members.every((node) => nodeIds.has(endpointId(node)));
  });

  return { ...graph, nodes, links, hyperedges };
}

function runtimeDegrees(graph) {
  const degrees = new Map(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.links) {
    const sourceId = endpointId(edge.source);
    const targetId = endpointId(edge.target);
    degrees.set(sourceId, (degrees.get(sourceId) ?? 0) + 1);
    degrees.set(targetId, (degrees.get(targetId) ?? 0) + 1);
  }
  return degrees;
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm;
}

function formatSummarySection(graph, communities) {
  const sourceFiles = new Set(graph.nodes.map((node) => node.source_file));
  const confidenceCounts = new Map();
  for (const edge of graph.links) {
    const confidence = edge.confidence ?? 'EXTRACTED';
    confidenceCounts.set(confidence, (confidenceCounts.get(confidence) ?? 0) + 1);
  }

  const confidenceSummary = [...confidenceCounts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([confidence, count]) => `${confidence}: ${count}`)
    .join(' · ');

  return [
    '## Summary (`src/` code only)',
    '',
    `- ${graph.nodes.length} code ${plural(graph.nodes.length, 'node')} · ${graph.links.length} ${plural(graph.links.length, 'relationship')} · ${sourceFiles.size} source ${plural(sourceFiles.size, 'file')}`,
    `- ${communities.length} runtime ${plural(communities.length, 'community', 'communities')}`,
    `- Confidence: ${confidenceSummary || 'no relationships'}`,
  ].join('\n');
}

function communityName(nodes) {
  const sourceCounts = new Map();
  for (const node of nodes) {
    const sourceFile = node.source_file ?? 'unknown';
    sourceCounts.set(sourceFile, (sourceCounts.get(sourceFile) ?? 0) + 1);
  }

  const [dominantSource = 'runtime'] = [...sourceCounts.entries()].sort(
    ([leftFile, leftCount], [rightFile, rightCount]) =>
      rightCount - leftCount || leftFile.localeCompare(rightFile),
  )[0] ?? ['runtime', 0];
  return path.posix.basename(dominantSource.replaceAll('\\', '/'));
}

function runtimeCommunities(graph, degrees) {
  const grouped = new Map();
  for (const node of graph.nodes) {
    const community = node.community ?? 'unclustered';
    if (!grouped.has(community)) grouped.set(community, []);
    grouped.get(community).push(node);
  }

  return [...grouped.entries()]
    .map(([id, nodes]) => {
      const nodeIds = new Set(nodes.map((node) => node.id));
      const internalEdges = graph.links.filter(
        (edge) => nodeIds.has(endpointId(edge.source)) && nodeIds.has(endpointId(edge.target)),
      ).length;
      const possibleEdges = (nodes.length * (nodes.length - 1)) / 2;
      return {
        cohesion: possibleEdges === 0 ? 0 : internalEdges / possibleEdges,
        id,
        internalEdges,
        name: communityName(nodes),
        nodes: [...nodes].sort(
          (left, right) =>
            (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0) ||
            String(left.label).localeCompare(String(right.label)),
        ),
      };
    })
    .sort(
      (left, right) =>
        right.nodes.length - left.nodes.length || String(left.id).localeCompare(String(right.id)),
    );
}

function formatCommunityHubsSection(communities) {
  const lines = ['## Community Hubs (`src/` code only)', ''];
  if (communities.length === 0) {
    lines.push('_No runtime communities were found._');
    return lines.join('\n');
  }

  for (const community of communities) {
    lines.push(
      `- ${markdownCode(community.name)} — ${community.nodes.length} ${plural(community.nodes.length, 'node')}, ${community.internalEdges} internal ${plural(community.internalEdges, 'edge')}`,
    );
  }
  return lines.join('\n');
}

function formatGodNodesSection(graph, degrees) {
  const hubs = [...graph.nodes]
    .filter((node) => (degrees.get(node.id) ?? 0) > 0)
    .sort(
      (left, right) =>
        (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0) ||
        String(left.label).localeCompare(String(right.label)),
    )
    .slice(0, MAX_GOD_NODES);
  const lines = ['## God Nodes (`src/` code only)', ''];
  if (hubs.length === 0) {
    lines.push('_No connected runtime code nodes were found._');
    return lines.join('\n');
  }

  hubs.forEach((node, index) => {
    const degree = degrees.get(node.id) ?? 0;
    lines.push(
      `${index + 1}. ${markdownCode(node.label)} - ${degree} ${plural(degree, 'edge')} (${node.source_file}${node.source_location ? ` ${node.source_location}` : ''})`,
    );
  });
  return lines.join('\n');
}

function runtimeImportCycles(graph) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map();
  const addFile = (sourceFile) => {
    if (!adjacency.has(sourceFile)) adjacency.set(sourceFile, new Set());
  };

  for (const edge of graph.links) {
    if (!String(edge.relation ?? '').startsWith('import')) continue;
    const source = nodes.get(endpointId(edge.source));
    const target = nodes.get(endpointId(edge.target));
    if (!source?.source_file || !target?.source_file) continue;
    if (source.source_file === target.source_file) continue;
    addFile(source.source_file);
    addFile(target.source_file);
    adjacency.get(source.source_file).add(target.source_file);
  }

  let nextIndex = 0;
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  const connect = (sourceFile) => {
    indices.set(sourceFile, nextIndex);
    lowLinks.set(sourceFile, nextIndex);
    nextIndex += 1;
    stack.push(sourceFile);
    onStack.add(sourceFile);

    for (const targetFile of adjacency.get(sourceFile) ?? []) {
      if (!indices.has(targetFile)) {
        connect(targetFile);
        lowLinks.set(sourceFile, Math.min(lowLinks.get(sourceFile), lowLinks.get(targetFile)));
      } else if (onStack.has(targetFile)) {
        lowLinks.set(sourceFile, Math.min(lowLinks.get(sourceFile), indices.get(targetFile)));
      }
    }

    if (lowLinks.get(sourceFile) !== indices.get(sourceFile)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== sourceFile);
    if (component.length > 1) components.push(component.sort());
  };

  for (const sourceFile of [...adjacency.keys()].sort()) {
    if (!indices.has(sourceFile)) connect(sourceFile);
  }
  return components.sort(
    (left, right) => right.length - left.length || left[0].localeCompare(right[0]),
  );
}

function formatImportCyclesSection(cycles) {
  const lines = ['## Import Cycles (`src/` code only)', ''];
  if (cycles.length === 0) {
    lines.push('_No strongly connected runtime import groups were found._');
    return lines.join('\n');
  }

  for (const cycle of cycles) {
    lines.push(
      `- ${cycle.length}-module strongly connected group: ${cycle.map(markdownCode).join(' ↔ ')}`,
    );
  }
  return lines.join('\n');
}

function formatHyperedgesSection(graph) {
  const lines = ['## Hyperedges (`src/` code only)', ''];
  if (graph.hyperedges.length === 0) {
    lines.push('_No runtime-only hyperedges were found._');
    return lines.join('\n');
  }

  for (const hyperedge of graph.hyperedges) {
    const members = (hyperedge.nodes ?? []).map(endpointId).map(markdownCode).join(', ');
    lines.push(
      `- **${hyperedge.label ?? hyperedge.id ?? 'Runtime group'}** — ${members} [${hyperedge.confidence ?? 'EXTRACTED'}]`,
    );
  }
  return lines.join('\n');
}

function formatCommunitiesSection(communities, degrees) {
  const lines = [`## Communities (${communities.length} runtime total)`, ''];
  if (communities.length === 0) {
    lines.push('_No runtime communities were found._');
    return lines.join('\n');
  }

  for (const community of communities) {
    const nodes = community.nodes
      .slice(0, 8)
      .map((node) => markdownCode(node.label))
      .join(', ');
    const omitted = community.nodes.length - Math.min(community.nodes.length, 8);
    const highestDegree = Math.max(...community.nodes.map((node) => degrees.get(node.id) ?? 0));
    lines.push(
      `### Runtime Community ${community.id} — ${markdownCode(community.name)}`,
      `Cohesion: ${community.cohesion.toFixed(2)} · Highest degree: ${highestDegree}`,
      `Nodes (${community.nodes.length}): ${nodes}${omitted > 0 ? ` (+${omitted} more)` : ''}`,
      '',
    );
  }
  return lines.join('\n').trimEnd();
}

function formatKnowledgeGapsSection(graph, degrees) {
  const isolated = graph.nodes
    .filter((node) => (degrees.get(node.id) ?? 0) === 0)
    .sort((left, right) => String(left.label).localeCompare(String(right.label)));
  const lines = ['## Knowledge Gaps (`src/` code only)', ''];
  if (isolated.length === 0) {
    lines.push('_Every indexed runtime code node participates in at least one relationship._');
    return lines.join('\n');
  }

  lines.push(
    `- ${isolated.length} runtime code ${plural(isolated.length, 'node')} currently ${plural(isolated.length, 'has', 'have')} no relationship within the source-only graph.`,
  );
  for (const node of isolated.slice(0, 10)) {
    lines.push(`  - ${markdownCode(node.label)} — ${node.source_file}`);
  }
  if (isolated.length > 10) lines.push(`  - …and ${isolated.length - 10} more.`);
  return lines.join('\n');
}

function formatRuntimeReport(graph) {
  const scopedGraph = runtimeGraph(graph);
  const degrees = runtimeDegrees(scopedGraph);
  const communities = runtimeCommunities(scopedGraph, degrees);
  const connections = selectSourceSurprises(scopedGraph);
  const questions = sourceQuestions(scopedGraph);
  const cycles = runtimeImportCycles(scopedGraph);

  return {
    connections,
    questions,
    report: [
      '# Runtime Architecture Graph Report',
      '',
      '_This report is derived only from code nodes under `src/`. The full graph remains unchanged and keeps documentation, `.agents`, build tooling, and repository metadata available for queries._',
      '',
      '## Scope',
      '',
      '- Included: executable extension code and runtime configuration under `src/`.',
      '- Excluded from reporting: documentation, agent configuration, build tooling, repository metadata, and non-code assets.',
      '- Query behavior: `graphify-out/graph.json` still contains the complete repository graph.',
      '',
      formatSummarySection(scopedGraph, communities),
      '',
      formatCommunityHubsSection(communities),
      '',
      formatGodNodesSection(scopedGraph, degrees),
      '',
      formatSurprisingSection(connections),
      '',
      formatImportCyclesSection(cycles),
      '',
      formatHyperedgesSection(scopedGraph),
      '',
      formatCommunitiesSection(communities, degrees),
      '',
      formatKnowledgeGapsSection(scopedGraph, degrees),
      '',
      formatSuggestedSection(questions),
      '',
    ].join('\n'),
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      graph: { default: DEFAULT_GRAPH, type: 'string' },
      report: { default: DEFAULT_REPORT, type: 'string' },
    },
  });
  const graph = JSON.parse(await readFile(values.graph, 'utf8'));
  const { connections, questions, report } = formatRuntimeReport(graph);
  await writeFile(values.report, report);
  const noun = connections.length === 1 ? 'connection' : 'connections';
  console.log(
    `Updated ${values.report} as a runtime-only architecture report with ${connections.length} surprising ${noun} and ${questions.length} suggested questions.`,
  );
}

main().catch((error) => {
  console.error(`graphify-filter-surprises: ${error.message}`);
  process.exitCode = 1;
});
