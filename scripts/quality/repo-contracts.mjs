import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { simple } from 'acorn-walk';

export function collect(source, file) {
  const findings = new Map();
  const layer = file.split('/')[2];
  const add = (rule, detail, reason, direction) => {
    const key = `${rule}:${detail}`;
    const item = findings.get(key) ?? {
      path: file,
      rule,
      detail,
      current: 0,
      reason,
      direction,
    };
    item.current++;
    findings.set(key, item);
  };
  const dependency = (specifier) => {
    if (typeof specifier !== 'string' || !specifier.startsWith('.')) return;
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(file), specifier),
    );
    const targetLayer = target.split('/')[2];
    if (
      (['calc', 'parsers'].includes(layer) &&
        ['ui', 'fn', 'msg', 'protocol'].includes(targetLayer)) ||
      (layer === 'msg' && targetLayer === 'ui')
    ) {
      add(
        'dependency-direction',
        target,
        'Domain code depends on presentation or orchestration.',
        'Inject a callback or move presentation into ui; keep arithmetic and parsing in the domain layer.',
      );
    }
  };
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  simple(ast, {
    ImportDeclaration(node) {
      dependency(node.source.value);
    },
    ExportNamedDeclaration(node) {
      if (node.source) dependency(node.source.value);
    },
    ExportAllDeclaration(node) {
      dependency(node.source.value);
    },
    ImportExpression(node) {
      dependency(node.source.value);
    },
    CallExpression(node) {
      if (node.callee.type === 'Identifier' && node.callee.name === 'require')
        dependency(node.arguments[0]?.value);
    },
    MemberExpression(node) {
      if (
        ['calc', 'parsers', 'msg'].includes(layer) &&
        node.object.type === 'Identifier' &&
        ['document', 'window', '$', 'jQuery'].includes(node.object.name)
      ) {
        add(
          'browser-access',
          node.object.name,
          'Domain layers must not access browser presentation globals.',
          'Pass domain data to a UI callback instead.',
        );
      }
    },
  });
  return [...findings.values()].sort(
    (a, b) => a.rule.localeCompare(b.rule) || a.detail.localeCompare(b.detail),
  );
}

export function validateBaseline(baseline) {
  if (!baseline || baseline.version !== 1 || !Array.isArray(baseline.entries))
    throw new Error('Baseline requires version 1 and entries array.');
  const seen = new Set();
  for (const entry of baseline.entries) {
    if (!entry || typeof entry !== 'object')
      throw new Error('Baseline entries must be objects.');
    for (const field of [
      'path',
      'rule',
      'detail',
      'owner',
      'reason',
      'repayment',
    ]) {
      if (typeof entry[field] !== 'string' || !entry[field].trim())
        throw new Error(`Baseline entry requires ${field}.`);
    }
    if (
      !['dependency-direction', 'browser-access'].includes(entry.rule) ||
      !Number.isInteger(entry.maximum) ||
      entry.maximum < 1
    )
      throw new Error('Invalid baseline rule or maximum.');
    const key = `${entry.path}:${entry.rule}:${entry.detail}`;
    if (seen.has(key)) throw new Error(`Duplicate baseline entry: ${key}`);
    seen.add(key);
  }
}

export function assess(findings, entries) {
  return findings.map((finding) => {
    const allowance = entries.find(
      (entry) =>
        entry.path === finding.path &&
        entry.rule === finding.rule &&
        entry.detail === finding.detail,
    );
    const threshold = allowance?.maximum ?? 0;
    return {
      ...finding,
      threshold,
      status: finding.current > threshold ? 'regression' : 'debt',
    };
  });
}

function filesUnder(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((item) => {
      const file = `${directory}/${item.name}`;
      return (
        item.isDirectory() ? filesUnder(file)
        : /\.(?:js|mjs|cjs)$/.test(file) ? [file]
        : []
      );
    })
    .sort();
}

export function main(args = process.argv.slice(2)) {
  let mode = 'audit';
  let base = 'HEAD';
  let json = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode') mode = args[++i];
    else if (args[i] === '--base') base = args[++i];
    else if (args[i] === '--json') json = true;
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  if (!['diff', 'audit'].includes(mode) || !base)
    throw new Error('Use --mode diff|audit and an optional --base ref.');
  const baseline = JSON.parse(
    fs.readFileSync('scripts/quality/repo-contracts-baseline.json', 'utf8'),
  );
  validateBaseline(baseline);
  const files = filesUnder('src/js');
  const changed =
    mode === 'diff' ?
      new Set([
        ...execFileSync(
          'git',
          [
            'diff',
            '--name-only',
            '-z',
            base,
            '--',
            'src/js',
            'scripts/quality/repo-contracts-baseline.json',
            'scripts/quality/repo-contracts.mjs',
          ],
          { encoding: 'utf8' },
        ).split('\0'),
        ...execFileSync(
          'git',
          [
            'ls-files',
            '--others',
            '--exclude-standard',
            '-z',
            '--',
            'src/js',
            'scripts/quality/repo-contracts-baseline.json',
            'scripts/quality/repo-contracts.mjs',
          ],
          { encoding: 'utf8' },
        ).split('\0'),
      ])
    : new Set(files);
  const fullScan =
    mode === 'audit' ||
    changed.has('scripts/quality/repo-contracts-baseline.json') ||
    changed.has('scripts/quality/repo-contracts.mjs');
  const selected = files.filter((file) => fullScan || changed.has(file));
  const findings = assess(
    selected.flatMap((file) => {
      try {
        return collect(fs.readFileSync(file, 'utf8'), file);
      } catch (error) {
        throw new Error(`${file}: contract scan failed: ${error.message}`, {
          cause: error,
        });
      }
    }),
    baseline.entries,
  );
  const stale = baseline.entries.filter(
    (entry) =>
      (fullScan || changed.has(entry.path)) &&
      !findings.some(
        (finding) =>
          finding.path === entry.path &&
          finding.rule === entry.rule &&
          finding.detail === entry.detail &&
          finding.current >= entry.maximum,
      ),
  );
  const largeModules = selected
    .map((file) => ({
      path: file,
      lines: fs.readFileSync(file, 'utf8').split('\n').length,
    }))
    .filter((item) => item.lines > 500);
  const report = {
    sourceCommand: `node scripts/quality/repo-contracts.mjs ${args.map((arg) => JSON.stringify(arg)).join(' ')}`,
    base: mode === 'diff' ? base : null,
    fullScan,
    mode,
    files: selected.length,
    findings,
    stale,
    largeModules,
  };
  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    for (const finding of findings)
      console.log(
        `${finding.path}: ${finding.rule} (${finding.detail}) current=${finding.current} threshold=${finding.threshold} [${finding.status}] ${finding.reason} ${finding.direction}`,
      );
    for (const entry of stale)
      console.log(
        `${entry.path}: stale-baseline (${entry.detail}) threshold=${entry.maximum}. Remove or lower the allowance to match repaid debt.`,
      );
    console.log(
      `${mode}: ${selected.length} files; ${findings.filter((item) => item.status === 'regression').length} regressions; ${findings.filter((item) => item.status === 'debt').length} debt entries; ${stale.length} stale allowances; ${largeModules.length} modules over 500 lines (informational cohesion review).`,
    );
  }
  return findings.some((item) => item.status === 'regression') || stale.length ?
      1
    : 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
