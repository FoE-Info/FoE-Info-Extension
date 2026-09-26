#!/usr/bin/env node
/**
 * Reference-integrity audit.
 *
 * Verifies that every path, command, script, task, and MCP tool mentioned in
 * agent-facing and developer-facing surfaces actually exists. Catches the
 * failure mode where documentation drifts from the code it describes: renamed
 * modules, deleted files, retired CLI subcommands, and env vars that were never
 * defined.
 *
 * Usage: node scripts/audit-references.mjs [--json]
 * Exit:  0 = no unresolved references, 1 = findings present.
 *
 * Scope note: token-based extraction over-reports. Prose that happens to contain
 * a slash, a UPPER_SNAKE identifier that is not an env var, or a slash-command
 * will surface as a finding and needs triage. A finding is a prompt to look,
 * not proof of breakage.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const AS_JSON = process.argv.includes('--json');
// `--strict` also reports advisory findings (the ARCHITECTURE.md line ceiling),
// which are suppressed by default because they are a tracked target rather than
// broken references.
const STRICT = process.argv.includes('--strict');

const findings = [];
const add = (kind, file, line, detail, token) =>
  findings.push({
    kind,
    file: file ? file.replace(ROOT + '/', '') : '-',
    line,
    detail,
    token,
  });

/* ------------------------------------------------------------------ scan */

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'graphify-out',
  'build',
  '.venv',
  'dist',
  'coverage',
]);
const TEXT_EXT = new Set([
  '.md',
  '.json',
  '.mjs',
  '.js',
  '.cjs',
  '.toml',
  '.yml',
  '.yaml',
  '.html',
  '.sh',
  '',
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel =
      dir === ROOT ? entry.name : `${dir.slice(ROOT.length + 1)}/${entry.name}`;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || SKIP_DIRS.has(rel)) continue;
      walk(join(dir, entry.name), out);
    } else if (TEXT_EXT.has(extname(entry.name))) {
      out.push(rel);
    }
  }
  return out;
}

const files = walk(ROOT);

const DOC_SURFACES = files.filter(
  (f) =>
    f.endsWith('.md') ||
    f === 'package.json' ||
    f === 'pyproject.toml' ||
    f === '.mise.toml' ||
    f === '.graphifyignore' ||
    f === '.prettierignore' ||
    f === '.gitignore' ||
    f === 'eslint.config.mjs' ||
    f === 'webpack.config.js',
);

const read = (f) => {
  try {
    return readFileSync(join(ROOT, f), 'utf8');
  } catch {
    return '';
  }
};

/* ------------------------------------------------------------- A. paths */

// Roots a doc may legitimately use as an implicit prefix.
const LAYER_ROOTS = [
  'src/js',
  'src/js/protocol',
  'src/js/msg',
  'src/js/calc',
  'src/js/ui',
  'src/js/state',
  'src/js/utils',
  'src/js/fn',
  'scripts',
  'tests',
  'conductor',
  '.agents',
];

function resolveCandidates(token, file) {
  const t = token.replace(/[.,;:)]+$/, '');
  if (/^(https?:|mailto:|data:|chrome-extension:|node:|about:)/i.test(t))
    return null;
  if (t.startsWith('~')) return null; // home-relative, not repo-verifiable
  if (t.includes('*') || t.includes('<') || t.includes('>')) return null;
  // A slash-command, an upstream CLI invocation, or a URL path.
  if (/^\/[\w-]+$/.test(t) || t.startsWith('/graphify')) return null;
  // A URL path such as `/game/json` or a bare regex literal.
  if (/^\/[\w/.-]+\.(js|json|html)$/.test(t) && !existsSync(join(ROOT, t))) {
    if (/^\/(game|metadata|start|content|js)/.test(t)) return null;
  }
  if (/^\/[\^$]/.test(t) || t.startsWith('/^')) return null;
  // Brace expansion (`a/{b,c}/`) is a directory glob, not a literal path.
  if (t.includes('{') || t.includes('}')) return null;
  // `path:12-24` is a file reference with a line span, not a filename.
  const colon = t.match(/^(.*?):[\d]/);
  if (colon) return resolveCandidates(colon[1], file);
  // A `a.b/c` fragment where `a.b` is not a real directory is a doc convention
  // (e.g. `document/window`, `msg/StartupService.js`), not a broken path.
  const head = t.split('/')[0];
  const isFilePath = head.includes('.') && existsSync(join(ROOT, head));
  if (
    !isFilePath &&
    !existsSync(join(ROOT, head)) &&
    LAYER_ROOTS.every((r) => !existsSync(join(ROOT, r, t)))
  )
    return null;
  const dir = dirname(join(ROOT, file));
  const raw = t.replace(/^\.\//, '');
  return [
    ...new Set([
      join(ROOT, raw),
      join(dir, raw),
      join(ROOT, 'src', raw),
      join(ROOT, '.agents', raw),
      ...LAYER_ROOTS.map((r) => join(ROOT, r, raw)),
    ]),
  ];
}

const PATH_TOKEN = /`([^`\n]{2,200})`/g;
const MD_LINK = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const isPathLike = (t) =>
  /^\.{0,2}\/?[\w.@~-]+(\/[\w.@~*-]+)+/.test(t) ||
  t.startsWith('./') ||
  t.startsWith('../') ||
  t.startsWith('/');

for (const file of DOC_SURFACES) {
  const lines = read(file).split('\n');
  const inFence = new Array(lines.length).fill(false);
  let fence = false;
  lines.forEach((l, i) => {
    if (/^\s*```/.test(l)) fence = !fence;
    inFence[i] = fence;
  });

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    let m;
    PATH_TOKEN.lastIndex = 0;
    while ((m = PATH_TOKEN.exec(line))) {
      const tok = m[1].trim();
      if (!isPathLike(tok)) continue;
      const cands = resolveCandidates(tok, file);
      if (!cands) continue;
      if (cands.some((c) => existsSync(c))) continue;
      add(
        'unresolved-path',
        file,
        lineNo,
        inFence[i] ? 'in code fence' : 'in prose',
        tok,
      );
    }
    MD_LINK.lastIndex = 0;
    while ((m = MD_LINK.exec(line))) {
      const tok = m[1];
      if (/^(https?:|#|mailto:)/i.test(tok)) continue;
      if (!existsSync(resolve(dirname(join(ROOT, file)), tok.split('#')[0])))
        add('broken-md-link', file, lineNo, 'markdown link', tok);
    }
  });
}

/* --------------------------------------------------------- B. commands */

const pkg = JSON.parse(read('package.json'));
const npmScripts = new Set(Object.keys(pkg.scripts || {}));
const miseToml = read('.mise.toml');
const miseTasks = new Set(
  [...miseToml.matchAll(/^\[tasks\.([A-Za-z0-9_-]+)\]/gm)].map((m) => m[1]),
);
for (const m of miseToml.matchAll(/run\s*=\s*"([^"]+)"/g))
  for (const mm of m[1].matchAll(/\bmise run ([A-Za-z0-9_-]+)/g))
    miseTasks.add(mm[1]);

let GRAPHIFY_SUBCOMMANDS = null;
try {
  GRAPHIFY_SUBCOMMANDS = new Set(
    execFileSync('graphify', ['--help'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .map((l) => l.trim().split(/\s+/)[0])
      .filter((w) => /^[a-z][a-z-]*$/.test(w)),
  );
} catch {
  // graphify not installed: skip that sub-check rather than report false failures.
}

for (const file of DOC_SURFACES) {
  read(file)
    .split('\n')
    .forEach((line, i) => {
      const lineNo = i + 1;
      for (const m of line.matchAll(/\bnpm run ([A-Za-z0-9:_-]+)/g))
        if (!npmScripts.has(m[1]))
          add(
            'missing-npm-script',
            file,
            lineNo,
            'npm script',
            `npm run ${m[1]}`,
          );
      for (const m of line.matchAll(/\bmise run ([A-Za-z0-9_-]+)/g))
        if (!miseTasks.has(m[1]))
          add(
            'missing-mise-task',
            file,
            lineNo,
            'mise task',
            `mise run ${m[1]}`,
          );
      for (const m of line.matchAll(
        /\b(?:bash|node|npx|uv|python3?|git)\s+([\w.@/-]+\.(?:sh|mjs|js|py|toml|json))/g,
      )) {
        const script = m[1];
        const cands = [
          join(ROOT, script),
          join(dirname(join(ROOT, file)), script),
          join(ROOT, '.agents', 'scripts', script.replace(/^.*\//, '')),
        ];
        if (!cands.some((c) => existsSync(c)))
          add('missing-script', file, lineNo, 'invoked script', script);
      }
    });
}

/* ------------------------------------------------------ C. env var defs */

const envDefined = new Set();
for (const f of [
  '.env',
  '.env.local',
  '.mise.toml',
  'package.json',
  'pyproject.toml',
  'eslint.config.mjs',
  'webpack.config.js',
])
  for (const m of read(f).matchAll(/\b([A-Z][A-Z0-9_]{3,})\b/g))
    envDefined.add(m[1]);
for (const f of [
  '.agents/scripts/inference-env.sh',
  '.agents/scripts/graphify-model.sh',
  '.agents/scripts/graphify.sh',
  '.agents/scripts/serve-graph.mjs',
])
  for (const m of read(f).matchAll(/\b([A-Z][A-Z0-9_]{3,})\b/g))
    envDefined.add(m[1]);
// Externally supplied values are not repo config and cannot be verified here.
const EXTERNAL = /(API_KEY|TOKEN|SECRET|PASSWORD|URL|PORT|MODEL|KEY)$/;
// Identifiers that are UPPER_SNAKE but are not env vars: BigNumber rounding
// modes, window-message type names, edge-confidence labels, placeholder
// variables in upstream Graphify reference docs, and OS error codes.
// A token is an env var reference only when it is the entire backticked span.
// `` `IGNORED_RPC_CLASSES` `` is a code symbol; `` `set IGNORED_RPC_CLASSES=1` ``
// is an env var. Scanning every UPPER_SNAKE token produces pure noise.
const NOT_ENV =
  /^(ROUND_|FOE_INFO_|EXTRACTED$|INFERRED$|AMBIGUOUS$|ORIGINAL_QUESTION$|ANSWER$|NODE_[AB]$|NODE_NAME$|APPROVED$|CHANGES_REQUESTED$|UPGRADED_BY$|BELONGS_TO_ERA$|ASSIGNED_TO_INSTANCE$|EPERM$|GRAPHIFY_WHISPER_PROMPT$|AUTHOR$|CONTRIBUTOR$|QUESTION$|BUDGET$)/;

// Exported JS constants that read as UPPER_SNAKE but are code symbols, not env
// vars. Each is verified to exist as an export in src/js.
const CODE_SYMBOLS = new Set([
  'IGNORED_RPC_CLASSES',
  'LEGACY_COLLAPSE_KEYS',
  'LEGACY_FLAT_KEYS',
]);

// Build-tool switches a project may disable in CI without defining them locally,
// e.g. `HUSKY=0`. Each is a real tool that reads the variable.
const KNOWN_TOOL_VARS = { HUSKY: 1 };

for (const file of DOC_SURFACES.filter((f) => f.endsWith('.md')))
  read(file)
    .split('\n')
    .forEach((line, i) => {
      for (const m of line.matchAll(/`([A-Z][A-Z0-9_]{4,})`/g)) {
        const v = m[1];
        if (
          envDefined.has(v) ||
          EXTERNAL.test(v) ||
          NOT_ENV.test(v) ||
          CODE_SYMBOLS.has(v)
        )
          continue;
        add('undefined-env-var', file, i + 1, 'no definition found', v);
      }
      // Shell-style assignment: `FOE_INFO_DEBUG=1`, `export GRAPHIFY_X=`.
      // The variable must lead the span; `npx HUSKY=1` names a command.
      for (const m of line.matchAll(
        /`\s*(?:export\s+)?([A-Z][A-Z0-9_]{4,})\s*=[^`]*`/g,
      )) {
        const v = m[1];
        // A known tool name in `TOOL=0` form is a documented CI switch, not
        // an undefined variable (e.g. `HUSKY=0` disables git hooks).
        if (
          envDefined.has(v) ||
          EXTERNAL.test(v) ||
          CODE_SYMBOLS.has(v) ||
          v in KNOWN_TOOL_VARS
        )
          continue;
        add(
          'undefined-env-var',
          file,
          i + 1,
          'assigned in docs but never defined',
          v,
        );
      }
    });

/* ------------------------------------------------- D. MCP tool drift */

const KNOWN_MCP_TOOLS = new Set([
  'query_graph',
  'get_neighbors',
  'shortest_path',
  'get_node',
  'get_community',
  'god_nodes',
  'graph_stats',
  'get_pr_impact',
  'list_prs',
  'triage_prs',
  'project_path',
]);

for (const file of files.filter((f) => f.endsWith('.md')))
  read(file)
    .split('\n')
    .forEach((line, i) => {
      for (const m of line.matchAll(/`([a-z][a-z0-9]*_[a-z0-9_]+)`/g)) {
        const t = m[1];
        if (!/(graph|node|neighbor|path|community|stats|impact)/.test(t))
          continue;
        if (KNOWN_MCP_TOOLS.has(t)) continue;
        add(
          'unknown-mcp-tool',
          file,
          i + 1,
          'not in graphify-foe-info tool list',
          t,
        );
      }
    });

/* Graphify subcommands named in prose but absent from the installed CLI. */
// A token is a command invocation only when the whole backticked span is the
// command, e.g. `graphify query "x"`. Mid-sentence English ("graphify reference
// material", "the graphify runner") is prose and must not be flagged.
if (GRAPHIFY_SUBCOMMANDS)
  for (const file of files.filter((f) => f.endsWith('.md')))
    read(file)
      .split('\n')
      .forEach((line, i) => {
        for (const m of line.matchAll(
          /`graphify ([a-z][a-z-]*)((?:[^`\s][^`]*)?)`/g,
        )) {
          if (GRAPHIFY_SUBCOMMANDS.has(m[1])) continue;
          // Trailing prose inside the same span ("graphify reference
          // material") means the token is not in command position.
          if (m[2].trim().length > 0) continue;
          add(
            'unknown-graphify-subcommand',
            file,
            i + 1,
            'not in installed graphify CLI',
            `graphify ${m[1]}`,
          );
        }
      });

/* ---------------------------------- E. documented ARCHITECTURE invariants */

// ARCHITECTURE.md no longer defines a line ceiling: the rule is cohesion over
// line count. This threshold is therefore a review prompt, not a violation --
// it is reported as advisory and suppressed unless --strict is passed.
const arch = read('ARCHITECTURE.md');
const max = 500;
{
  for (const f of files.filter(
    (f) => f.startsWith('src/js/') && f.endsWith('.js'),
  )) {
    const n = read(f).split('\n').length;
    if (n > max)
      add(
        'cohesion-review-prompt',
        f,
        0,
        `${n} lines: check for a feature boundary, not a split`,
        `${n} lines`,
      );
  }
}
for (const m of arch.matchAll(/`([\w./-]+\.js)`/g)) {
  const cands = [
    join(ROOT, m[1]),
    join(ROOT, 'src/js', m[1].replace(/^src\/js\//, '')),
  ];
  if (!cands.some((c) => existsSync(c)))
    add(
      'architecture-path',
      'ARCHITECTURE.md',
      0,
      'documented pipeline path',
      m[1],
    );
}

/* --------------------------------- F. relative path fragments in prose */

// Docs legitimately name a file relative to a layer root, e.g. `utils/storage.js`
// or `ui/RewardRenderer.js` meaning `src/js/utils/storage.js`. Section A already
// resolves those against LAYER_ROOTS; this pass catches fragments with no
// matching layer at all, which is the case worth a human look.
for (const file of DOC_SURFACES.filter((f) => f.endsWith('.md')))
  read(file)
    .split('\n')
    .forEach((line, i) => {
      for (const m of line.matchAll(/`([\w-]+\/[\w./-]+\.js)`/g)) {
        const frag = m[1];
        if (/^(src|scripts|tests)\//.test(frag)) continue;
        if (existsSync(join(ROOT, frag))) continue;
        if (LAYER_ROOTS.some((r) => existsSync(join(ROOT, r, frag)))) continue;
        // Suffix shorthand: `js/index.js` in prose can mean
        // `src/js/index.js` when the leading segment duplicates a known root.
        const stripped = frag.replace(/^[\w-]+\//, '');
        if (LAYER_ROOTS.some((r) => existsSync(join(ROOT, r, stripped))))
          continue;
        add(
          'unresolved-path-fragment',
          file,
          i + 1,
          'not found under any layer root',
          frag,
        );
      }
    });

/* ---------------------------------------------------------------- report */

const byKind = new Map();
for (const f of findings) {
  if (!byKind.has(f.kind)) byKind.set(f.kind, []);
  byKind.get(f.kind).push(f);
}

// The line ceiling is a documented architectural target, not a broken
// reference: ARCHITECTURE.md records the current overage explicitly, so it is
// advisory and suppressed unless `--strict` is passed.
const ADVISORY = new Set(['cohesion-review-prompt']);
const reportable = findings.filter((f) => STRICT || !ADVISORY.has(f.kind));

if (AS_JSON) {
  console.log(
    JSON.stringify(
      { scanned: DOC_SURFACES.length, findings: reportable },
      null,
      2,
    ),
  );
  process.exit(reportable.length ? 1 : 0);
}

// Paths a tool creates on demand. They are named in docs as destinations, so
// their absence is not drift. Keep this list short and justified.
const GENERATED = [
  'graphify-out/', // graphify writes its own artifacts and caches
  './raw', // graphify add <url> input directory
  'tests/a/b/c.test.mjs', // illustrative example path in review notes
];

// Prose that deliberately names a file that was deleted or renamed, to record
// the change. The surrounding line must say so; otherwise it is drift.
function isHistoricalNote(line, token) {
  const name = token.replace(/^.*\//, '');
  return (
    /(previously|former|absorbed|consolidat|renamed|replaced|moved|deleted|was |were )/i.test(
      line,
    ) && line.includes(name)
  );
}

// Files under `.omp/plans/` are dated proposals, not living documentation. A
// path that no longer exists usually means the proposal was carried out, which
// is the intended outcome rather than drift.
function isProposal(file) {
  return /^\.omp\/plans\//.test(file);
}

// A URL path on an external origin, e.g. the InnoGames `/game/json` endpoint.
function isUrlPath(token) {
  return /^\/(game|metadata|start|content|js|forge-of-empires)\b/.test(token);
}

console.log(
  `\nScanned ${DOC_SURFACES.length} surfaces, ${files.length} text files.`,
);
if (!reportable.length) console.log('No reference-integrity findings.');
const shown = new Set();
for (const [kind, list] of byKind) {
  let suppressedCeiling = false;
  console.log(`\n=== ${kind} (${list.length}) ===`);
  for (const f of list) {
    const key = `${f.file}|${f.token}`;
    if (shown.has(key)) continue;
    if (GENERATED.some((g) => f.token === g || f.token.startsWith(g))) continue;
    if (isProposal(f.file) && !read(f.file).includes('Status: open')) continue;
    if (isUrlPath(f.token)) continue;
    if (isHistoricalNote(read(f.file).split('\n')[f.line - 1] || '', f.token))
      continue;
    // The line ceiling is a documented architectural target, not a broken
    // reference. ARCHITECTURE.md records the current overage explicitly, so
    // reporting it on every run is noise. `--strict` surfaces it.
    if (kind === 'cohesion-review-prompt' && !STRICT) {
      if (!suppressedCeiling) {
        suppressedCeiling = true;
        console.log(
          `  (${list.length} modules over 500 lines: check for a feature boundary, not a split. See --strict)`,
        );
      }
      continue;
    }
    shown.add(key);
    console.log(`  ${f.file}:${f.line}  [${f.detail}]  ${f.token}`);
  }
}
console.log(
  `\n--- ${shown.size} reportable findings across ${byKind.size} classes ---`,
);
process.exit(shown.size ? 1 : 0);
