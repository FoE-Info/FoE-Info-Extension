/** Fail-fast execution and stable stage evidence, shared by both entrypoints. */
import { spawn } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { constants } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { validationStages } from './validation-stages.mjs';

export function atomicWrite(path, contents) {
  writeFileSync(`${path}.tmp`, contents);
  renameSync(`${path}.tmp`, path);
}

const xml = (value) =>
  String(value)
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return (
        code === 9 ||
        code === 10 ||
        code === 13 ||
        (code >= 32 && code !== 0xfffe && code !== 0xffff)
      );
    })
    .join('')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export function gatesJUnit(report) {
  const integrity =
    report.reason === 'source-changed' ?
      [
        {
          id: 'source-identity',
          layer: 'provenance',
          command: [],
          status: 'failed',
          reason: report.reason,
          artifacts: ['manifest.json'],
        },
      ]
    : [];
  const allCases = [...report.cases, ...integrity];
  const failed = allCases.filter(
    (c) => c.status === 'failed' || c.status === 'cancelled',
  ).length;
  const skipped = allCases.filter(
    (c) => !['passed', 'failed', 'cancelled'].includes(c.status),
  ).length;
  const cases = allCases
    .map((c) => {
      const detail = `${c.command.join(' ')}; exit=${c.exitCode}; signal=${c.signal}; reason=${c.reason}; logs=${c.artifacts.join(', ')}`;
      const outcome =
        ['failed', 'cancelled'].includes(c.status) ?
          `<failure message="${xml(c.reason || c.status)}">${xml(detail)}</failure>`
        : c.status !== 'passed' ?
          `<skipped message="${xml(c.reason || c.status)}"/>`
        : '';
      return `<testcase classname="validation.${xml(c.layer)}" name="${xml(c.id)}" time="${(c.durationMs || 0) / 1000}">${outcome}<system-out>${xml(detail)}</system-out></testcase>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites><testsuite name="validation.${xml(report.profile)}" tests="${allCases.length}" failures="${failed}" skipped="${skipped}">\n${cases}\n</testsuite></testsuites>\n`;
}

export async function runValidation({
  root,
  profile = 'full',
  stages = validationStages(profile),
  evidenceDir = null,
  runId = null,
  env = process.env,
  output = (chunk, stream) => process[stream].write(chunk),
}) {
  const report = {
    schemaVersion: 1,
    runId,
    profile,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    cases: stages.map((stage) => ({
      id: stage.id,
      layer: stage.layer,
      command: stage.command,
      cwd: '.',
      status: stage.selected === false ? 'skipped' : 'pending',
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      exitCode: null,
      signal: null,
      reason: stage.selected === false ? 'not-selected' : null,
      paths: [],
      artifacts: [],
    })),
  };
  if (
    stages.some((s) => !/^[a-z][a-z0-9-]*$/.test(s.id)) ||
    new Set(stages.map((s) => s.id)).size !== stages.length
  )
    throw new Error('Stage IDs must be unique safe path components.');
  const save = () => {
    if (!evidenceDir) return;
    atomicWrite(
      join(evidenceDir, 'stages.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    atomicWrite(join(evidenceDir, 'gates.junit.xml'), gatesJUnit(report));
  };
  if (evidenceDir) mkdirSync(join(evidenceDir, 'stages'), { recursive: true });
  save();
  let active;
  let interrupted = null;
  let killTimer;
  const kill = (signal) => {
    if (!active?.pid) return;
    try {
      if (process.platform === 'win32') active.kill(signal);
      else process.kill(-active.pid, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  };
  const interrupt = (signal) => {
    interrupted ||= signal;
    kill(signal);
    if (!killTimer) {
      killTimer = setTimeout(() => kill('SIGKILL'), 3000);
      killTimer.unref();
    }
  };
  const onInt = () => interrupt('SIGINT');
  const onTerm = () => interrupt('SIGTERM');
  process.on('SIGINT', onInt);
  process.on('SIGTERM', onTerm);
  let exitCode = 0;
  let signal = null;
  try {
    for (const c of report.cases) {
      if (c.status === 'skipped') continue;
      if (exitCode || interrupted) {
        c.status = 'blocked';
        c.reason = interrupted ? 'prior-stage-cancelled' : 'prior-stage-failed';
        save();
        continue;
      }
      c.status = 'running';
      c.startedAt = new Date().toISOString();
      const started = performance.now();
      if (evidenceDir) c.artifacts.push(`stages/${c.id}.log`);
      save();
      output(
        Buffer.from(`\n[${profile}] ${c.id}: ${c.command.join(' ')}\n`),
        'stdout',
      );
      let log = '';
      const emit = (chunk, stream) => {
        // Each chunk is appended directly to disk to avoid holding build/test logs in memory.
        if (evidenceDir)
          writeFileSync(join(evidenceDir, c.artifacts[0]), chunk, {
            flag: 'a',
          });
        output(chunk, stream);
      };
      if (evidenceDir) writeFileSync(join(evidenceDir, c.artifacts[0]), '');
      const result = await new Promise((resolve) => {
        const [name, ...args] = c.command;
        active = spawn(
          name === 'node' ? process.execPath
          : name === 'npm' && process.platform === 'win32' ? 'npm.cmd'
          : name,
          args,
          {
            cwd: root,
            env,
            detached: process.platform !== 'win32',
            shell: process.platform === 'win32' && name === 'npm',
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        active.stdout.on('data', (chunk) => emit(chunk, 'stdout'));
        active.stderr.on('data', (chunk) => emit(chunk, 'stderr'));
        active.on('error', (error) => {
          log = error.message;
          emit(
            Buffer.from(`Could not start ${c.id}: ${error.message}\n`),
            'stderr',
          );
        });
        active.on('close', (code, childSignal) =>
          resolve({ code, signal: childSignal }),
        );
      });
      active = null;
      clearTimeout(killTimer);
      killTimer = null;
      c.finishedAt = new Date().toISOString();
      c.durationMs = Math.round(performance.now() - started);
      c.exitCode = log ? null : result.code;
      c.signal = result.signal;
      c.status =
        interrupted || result.signal ? 'cancelled'
        : result.code === 0 ? 'passed'
        : 'failed';
      c.reason =
        log ||
        (interrupted ? `interrupted:${interrupted}`
        : result.signal ? `signal:${result.signal}`
        : result.code === 0 ? null
        : 'nonzero-exit');
      signal = interrupted || result.signal;
      exitCode =
        signal ? 128 + (constants.signals[signal] || 1)
        : log ? 1
        : (result.code ?? 1);
      save();
    }
    if (interrupted && !signal) {
      signal = interrupted;
      exitCode = 128 + (constants.signals[signal] || 1);
    }
    report.status =
      signal || interrupted ? 'cancelled'
      : exitCode ? 'failed'
      : 'passed';
    report.finishedAt = new Date().toISOString();
    save();
    return { report, exitCode, signal };
  } finally {
    process.removeListener('SIGINT', onInt);
    process.removeListener('SIGTERM', onTerm);
    clearTimeout(killTimer);
  }
}
