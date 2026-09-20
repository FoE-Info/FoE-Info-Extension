#!/usr/bin/env node

/**
 * PreToolUse Graphify Guard Hook
 * Enforces the Query-First protocol by intercepting broad grep/find searches
 * across application source code unless Graphify knowledge graphs have been
 * consulted recently in the active session.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenizeCommand } from './safety-gate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const valueOptions = new Set([
  '-g',
  '--glob',
  '--iglob',
  '-t',
  '--type',
  '-T',
  '--type-not',
  '--encoding',
  '--max-count',
  '-m',
  '-A',
  '-B',
  '-C',
  '--context',
]);

function sourceScope(target, cwd) {
  const full = path.resolve(cwd, target);
  const relative = path.relative(projectRoot, full).replace(/\\/g, '/');
  if (relative.startsWith('..')) return false;
  try {
    if (fs.statSync(full).isFile()) return false;
  } catch {
    /* glob or missing path */
  }
  return relative === '' || relative === 'src' || relative.startsWith('src/');
}

/**
 * Heuristic for broad shell source searches (rg/grep/find/fd) targeting the
 * repository's application source scope. Fully compatible with rtk prefixing.
 */
export function isBroadSourceSearch(command, cwd = projectRoot) {
  if (!command || typeof command !== 'string') return false;

  let currentCwd = cwd;
  const segments = tokenizeCommand(command);

  for (let words of segments) {
    while (
      words.length > 0 &&
      (words[0] === 'rtk' || words[0] === 'proxy')
    ) {
      words = words.slice(1);
    }
    if (!words.length) continue;

    if (words[0] === 'cd' && words[1]) {
      currentCwd = path.resolve(currentCwd, words[1]);
      continue;
    }

    const executable = path.basename(words[0] || '');
    if (!['rg', 'grep', 'find', 'fd', 'fdfind'].includes(executable)) {
      continue;
    }

    if (executable === 'find') {
      const paths = words
        .slice(1)
        .filter(
          (w, i, rest) =>
            !w.startsWith('-') &&
            !rest.slice(0, i).some((a) => a.startsWith('-')),
        );
      if (
        paths.length === 0
          ? sourceScope('.', currentCwd)
          : paths.some((p) => sourceScope(p, currentCwd))
      ) {
        return true;
      }
      continue;
    }

    let hasPattern = executable === 'rg' && words.includes('--files');
    const paths = [];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (
        word === '-e' ||
        word === '--regexp' ||
        word === '-f' ||
        word === '--file'
      ) {
        hasPattern = true;
        i++;
        continue;
      }
      if (valueOptions.has(word)) {
        i++;
        continue;
      }
      if (word.startsWith('-')) continue;
      if (!hasPattern) {
        hasPattern = true;
        continue;
      }
      paths.push(word);
    }

    if (
      paths.length === 0
        ? sourceScope('.', currentCwd)
        : paths.some((p) => sourceScope(p, currentCwd))
    ) {
      return true;
    }
  }

  return false;
}

export const STAMP_FILES = [
  path.join(projectRoot, 'graphify-out/foe-info/cache/last_query_stamp'),
  path.join(projectRoot, 'graphify-out/metadata/cache/last_query_stamp'),
  path.join(projectRoot, '.agents/.last_graph_query_stamp'),
];

export function isCodebaseSourceSearch(toolName, args = {}) {
  if (!toolName || typeof toolName !== 'string') return false;

  if (toolName === 'grep_search') {
    const searchPath = String(args.SearchPath || '').replace(/\\/g, '/');
    if (
      searchPath.includes('/tests') ||
      searchPath.endsWith('/tests') ||
      searchPath.includes('/docs') ||
      searchPath.includes('/.agents')
    ) {
      return false;
    }
    if (/\.[a-zA-Z0-9]+$/i.test(searchPath) && !searchPath.endsWith('/')) {
      return false;
    }
    if (
      searchPath === '' ||
      searchPath === '.' ||
      searchPath === 'src' ||
      searchPath.startsWith('src/') ||
      searchPath === projectRoot.replace(/\\/g, '/') ||
      searchPath.includes('/src') ||
      searchPath.endsWith('/src')
    ) {
      return true;
    }
    return false;
  }

  if (toolName === 'find_by_name') {
    const searchDir = String(args.SearchDirectory || '').replace(/\\/g, '/');
    if (
      searchDir.includes('/tests') ||
      searchDir.includes('/docs') ||
      searchDir.includes('/.agents') ||
      searchDir.includes('/node_modules')
    ) {
      return false;
    }
    if (
      searchDir === '' ||
      searchDir === '.' ||
      searchDir === 'src' ||
      searchDir.startsWith('src/') ||
      searchDir === projectRoot.replace(/\\/g, '/') ||
      searchDir.includes('/src') ||
      searchDir.endsWith('/src')
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export function isQueryStampFresh(ttlSeconds = 3600) {
  const now = Date.now() / 1000;
  for (const stampPath of STAMP_FILES) {
    try {
      if (fs.existsSync(stampPath)) {
        const stats = fs.statSync(stampPath);
        const mtimeSec = stats.mtimeMs / 1000;
        if (now - mtimeSec < ttlSeconds) {
          return true;
        }
      }
    } catch {
      // Continue to next stamp
    }
  }
  return false;
}

export function touchQueryStamp() {
  const sessionStamp = path.join(
    projectRoot,
    '.agents/.last_graph_query_stamp',
  );
  try {
    const now = new Date();
    fs.mkdirSync(path.dirname(sessionStamp), { recursive: true });
    fs.writeFileSync(sessionStamp, now.toISOString(), 'utf8');
    fs.utimesSync(sessionStamp, now, now);
  } catch {
    // Best effort
  }
}

export const DIRECT_GRAPHIFY_TOOL_REGEX =
  /^(?:mcp__)?graphify[-_]|^(?:query_graph|get_node|get_neighbors|shortest_path|god_nodes|get_community|graph_stats|list_prs|get_pr_impact|triage_prs)$/i;

export function isGraphifyToolCall(toolName, args = {}) {
  if (!toolName || typeof toolName !== 'string') return false;
  if (
    toolName === 'call_mcp_tool' &&
    typeof args.ServerName === 'string' &&
    args.ServerName.startsWith('graphify')
  ) {
    return true;
  }
  return DIRECT_GRAPHIFY_TOOL_REGEX.test(toolName);
}

export function evaluateGraphifyGuard(toolCall) {
  if (!toolCall || typeof toolCall !== 'object') {
    return { decision: 'allow' };
  }

  const toolName = toolCall.name || '';
  const args = toolCall.args || {};

  if (isGraphifyToolCall(toolName, args)) {
    touchQueryStamp();
    return { decision: 'allow' };
  }

  const SUGGEST_GRAPHIFY =
    'Graphify knowledge graph exists at graphify-out/foe-info/graph.json. Query Graphify first via MCP (query_graph, get_node, get_neighbors, shortest_path) or CLI (npm run graph:foe-info:ast / bash .agents/scripts/graphify.sh) before broad codebase text searches. For targeted single-file reads or tests/docs, file-scoped searches are permitted.';

  if (toolName === 'run_command') {
    const cmd = String(args.CommandLine || '');
    if (
      cmd.includes('graphify') ||
      cmd.includes('graph:foe-info') ||
      cmd.includes('graph:metadata') ||
      cmd.includes('graph:forge-hammer') ||
      cmd.includes('graph:low-tool') ||
      cmd.includes('graph:foe-info-original')
    ) {
      touchQueryStamp();
      return { decision: 'allow' };
    }

    if (isBroadSourceSearch(cmd, args.Cwd || projectRoot)) {
      if (!isQueryStampFresh(3600)) {
        return {
          decision: 'deny',
          reason: SUGGEST_GRAPHIFY,
        };
      }
    }
    return { decision: 'allow' };
  }

  if (isCodebaseSourceSearch(toolName, args)) {
    if (!isQueryStampFresh(3600)) {
      return {
        decision: 'deny',
        reason: SUGGEST_GRAPHIFY,
      };
    }
  }

  return { decision: 'allow' };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let input = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk) => {
    input += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const payload = JSON.parse(input || '{}');
      const toolCall = payload.toolCall || {};
      const result = evaluateGraphifyGuard(toolCall);
      process.stdout.write(JSON.stringify(result));
    } catch {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
    }
  });
}
