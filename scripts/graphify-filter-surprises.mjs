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

function endpointId(endpoint) {
  return typeof endpoint === 'object' && endpoint !== null ? endpoint.id : endpoint;
}

function isLocalDocsSource(sourceFile) {
  const normalized = sourceFile.replaceAll('\\', '/');
  return normalized.startsWith('docs/') || normalized.includes('/docs/');
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

function selectSurprisesWithoutDocs(graph, limit = MAX_CONNECTIONS) {
  const nodes = new Map((graph.nodes ?? []).map((node) => [node.id, node]));
  const includedNodeIds = new Set(
    [...nodes.values()]
      .filter((node) => !isLocalDocsSource(node.source_file ?? ''))
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
    if (isLocalDocsSource(source.source_file) || isLocalDocsSource(target.source_file)) continue;
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
    '## Surprising Connections (`docs/` excluded)',
    '',
    '_Repository policy: Graphify’s standard surprise ranking is applied after omitting nodes sourced from the local `docs/` folder. All other source types and Graphify’s built-in candidate rules are unchanged._',
    '',
  ];

  if (connections.length === 0) {
    lines.push('_No qualifying relationships were found after excluding `docs/`._');
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

function replaceSurprisingSection(report, replacement) {
  const heading = /^## Surprising Connections.*$/m;
  const match = heading.exec(report);
  if (!match) throw new Error('GRAPH_REPORT.md has no Surprising Connections section');

  const sectionStart = match.index;
  const afterHeading = sectionStart + match[0].length;
  const nextHeading = /^## /m.exec(report.slice(afterHeading));
  const sectionEnd = nextHeading ? afterHeading + nextHeading.index : report.length;
  const suffix = report.slice(sectionEnd).replace(/^\n+/, '');

  return `${report.slice(0, sectionStart).replace(/\n*$/, '\n\n')}${replacement}\n\n${suffix}`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      graph: { default: DEFAULT_GRAPH, type: 'string' },
      report: { default: DEFAULT_REPORT, type: 'string' },
    },
  });
  const graph = JSON.parse(await readFile(values.graph, 'utf8'));
  const report = await readFile(values.report, 'utf8');
  const connections = selectSurprisesWithoutDocs(graph);
  const updatedReport = replaceSurprisingSection(report, formatSurprisingSection(connections));
  await writeFile(values.report, updatedReport);
  const noun = connections.length === 1 ? 'connection' : 'connections';
  console.log(
    `Updated ${values.report} with ${connections.length} surprising ${noun} after excluding docs/.`,
  );
}

main().catch((error) => {
  console.error(`graphify-filter-surprises: ${error.message}`);
  process.exitCode = 1;
});
