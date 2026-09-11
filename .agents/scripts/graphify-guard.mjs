#!/usr/bin/env node

/**
 * PreToolUse Graphify Guard Hook
 * Enforces the Query-First protocol by intercepting broad grep/find searches
 * across application source code unless Graphify knowledge graphs have been
 * consulted recently in the active session.
 */

import fs from 'node:fs';
import { statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

// shell-quote is a transitive dependency of the repository toolchain.
const { parse: parseShell } = createRequire(import.meta.url)('shell-quote');
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
  const relative = path.relative(projectRoot, full);
  if (relative.startsWith('..')) return false;
  try {
    if (statSync(full).isFile()) return false;
  } catch {
    /* glob or missing path */
  }
  return relative === '' || relative === 'src' || relative.startsWith('src/');
}

/**
 * Heuristic for broad shell source searches (rg/grep/find/fd) targeting the
 * repository's application source scope. Accepts a command string and parses
 * it shell-style, honoring `;`/`||`/`&&`/`|` command separators and value
 * options that consume the following word.
 */
export function isBroadSourceSearch(command, cwd = projectRoot) {
  let tokens;
  try {
    tokens = parseShell(command);
  } catch {
    return false;
  }
  let segment = [],
    piped = false;
  const inspect = () => {
    const words = segment.map((t) =>
      typeof t === 'string' ? t : t.pattern || '',
    );
    if (words[0] === 'cd' && words[1]) {
      cwd = path.resolve(cwd, words[1]);
      return false;
    }
    const executable = path.basename(words[0] || '');
    if (!['rg', 'grep', 'find', 'fd', 'fdfind'].includes(executable))
      return false;
    if (executable === 'find') {
      const paths = words
        .slice(1)
        .filter(
          (w, i, rest) =>
            !w.startsWith('-') &&
            !rest.slice(0, i).some((a) => a.startsWith('-')),
        );
      return paths.length === 0 ?
          sourceScope('.', cwd)
        : paths.some((p) => sourceScope(p, cwd));
    }
    let pattern = executable === 'rg' && words.includes('--files');
    const paths = [];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      if (
        word === '-e' ||
        word === '--regexp' ||
        word === '-f' ||
        word === '--file'
      ) {
        pattern = true;
        i++;
        continue;
      }
      if (valueOptions.has(word)) {
        i++;
        continue;
      }
      if (word.startsWith('-')) continue;
      if (!pattern) {
        pattern = true;
        continue;
      }
      paths.push(word);
    }
    return paths.length === 0 ?
        !piped && sourceScope('.', cwd)
      : paths.some((p) => sourceScope(p, cwd));
  };
  for (const token of [...tokens, { op: ';' }]) {
    if (
      typeof token === 'object' &&
      ['|', '||', '&&', ';', '&'].includes(token.op)
    ) {
      if (inspect()) return true;
      segment = [];
      piped = token.op === '|';
    } else segment.push(token);
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
    // Searching specifically within tests, docs, or .agents is allowed
    if (
      searchPath.includes('/tests') ||
      searchPath.endsWith('/tests') ||
      searchPath.includes('/docs') ||
      searchPath.includes('/.agents')
    ) {
      return false;
    }
    // Targeting a specific individual file (e.g. state.js) is allowed
    if (/\.[a-zA-Z0-9]+$/i.test(searchPath) && !searchPath.endsWith('/')) {
      return false;
    }
    // Searching src/ or workspace root without test restriction is a codebase search
    if (
      searchPath === '' ||
      searchPath === '.' ||
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

export function isQueryStampFresh(ttlSeconds = 1800) {
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
    // Best-effort
  }
}

export function evaluateGraphifyGuard(toolCall) {
  if (!toolCall || typeof toolCall !== 'object') {
    return { decision: 'allow' };
  }

  const toolName = toolCall.name || '';
  const args = toolCall.args || {};

  // If the agent is querying Graphify via MCP or CLI, touch the stamp and allow
  if (
    toolName === 'call_mcp_tool' &&
    typeof args.ServerName === 'string' &&
    args.ServerName.startsWith('graphify')
  ) {
    touchQueryStamp();
    return { decision: 'allow' };
  }

  if (toolName === 'run_command') {
    const cmd = String(args.CommandLine || '');
    if (
      cmd.includes('graphify ') ||
      cmd.includes('graph:foe-info') ||
      cmd.includes('graph:metadata') ||
      cmd.includes('graph:forge-hammer')
    ) {
      touchQueryStamp();
    }
    return { decision: 'allow' };
  }

  // Check if this is an unoriented search of application code
  if (isCodebaseSourceSearch(toolName, args)) {
    if (!isQueryStampFresh()) {
      return {
        decision: 'deny',
        reason:
          'MANDATORY: Graphify knowledge graph exists at graphify-out/foe-info/graph.json. You must consult Graphify first before performing broad codebase searches. Use call_mcp_tool on "graphify-foe-info" (or "graphify-metadata-store" / "graphify-forge-hammer" / "graphify-low-tool" / "graphify-foe-info-original") with one of the native MCP tools:\n' +
          '  - query_graph ({"question": "..."}) for broad questions and semantic context\n' +
          '  - get_node ({"label": "..."}) for inspecting a specific symbol, class, or function\n' +
          '  - get_neighbors ({"label": "..."}) for immediate callers, callees, or module imports\n' +
          '  - shortest_path ({"source": "...", "target": "..."}) to trace relationships between symbols\n' +
          '  - god_nodes ({"top_n": 10}) to inspect high-centrality hub modules\n' +
          '  - get_community ({"community_id": ...}) to inspect architectural clusters\n' +
          '  - graph_stats to inspect overall graph metrics\n' +
          'Or CLI fallback: `graphify query "..."`, `graphify explain "..."`, `graphify path "..."`. Only use grep_search or find_by_name after Graphify has oriented you or when targeting specific files/tests.',
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
