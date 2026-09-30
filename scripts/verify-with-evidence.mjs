#!/usr/bin/env node
/** Capture the shared verification gate with provenance and stage/test evidence. */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { sourceSnapshot } from './lib/source-snapshot.mjs';
import {
  atomicWrite,
  gatesJUnit,
  runValidation,
} from './lib/validation-runner.mjs';
import { parseProfile } from './verify.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const profile = parseProfile(process.argv.slice(2));
  const evidenceDir = resolve(
    ROOT,
    process.env.CI_TEST_EVIDENCE_DIR || 'build/verify-evidence',
  );
  mkdirSync(evidenceDir, { recursive: true });
  for (const file of [
    'manifest.json',
    'junit.xml',
    'stages.json',
    'gates.junit.xml',
    'stages',
  ])
    rmSync(join(evidenceDir, file), { recursive: true, force: true });
  const logPath = join(evidenceDir, 'verify-console.log');
  writeFileSync(logPath, '');
  const git = (args) => {
    const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
  };
  const revision = git(['rev-parse', 'HEAD']);
  const dirty = git(['status', '--porcelain', '--untracked-files=all']);
  const snapshot = () =>
    sourceSnapshot(ROOT, { excludePaths: [relative(ROOT, evidenceDir)] });
  const manifest = {
    schemaVersion: 1,
    runId: randomUUID(),
    startedAt: new Date().toISOString(),
    finishedAt: null,
    command: [
      'npm',
      'run',
      'verify',
      ...(profile === 'full' ? [] : ['--', '--profile', profile]),
    ],
    runtime: { node: process.version, platform: process.platform },
    git: { revision, dirty: revision === null ? null : Boolean(dirty) },
    source: null,
    exitCode: null,
    signal: null,
    result: 'running',
  };
  const save = () =>
    atomicWrite(
      join(evidenceDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
    );
  save();
  try {
    manifest.source = snapshot();
    save();
    const result = await runValidation({
      root: ROOT,
      profile,
      evidenceDir,
      runId: manifest.runId,
      env: { ...process.env, CI_TEST_EVIDENCE_DIR: evidenceDir },
      output: (chunk, stream) => {
        writeFileSync(logPath, chunk, { flag: 'a' });
        process[stream].write(chunk);
      },
    });
    manifest.exitCode = result.exitCode;
    manifest.signal = result.signal;
    manifest.result = result.report.status;
    manifest.sourceAfter = snapshot();
    manifest.sourceChanged =
      manifest.source.digest !== manifest.sourceAfter.digest;
    if (manifest.sourceChanged) {
      manifest.result = 'failed';
      manifest.reason = 'source-changed';
      result.report.status = 'failed';
      result.report.reason = 'source-changed';
      atomicWrite(
        join(evidenceDir, 'gates.junit.xml'),
        gatesJUnit(result.report),
      );
      atomicWrite(
        join(evidenceDir, 'stages.json'),
        JSON.stringify(result.report, null, 2) + '\n',
      );
    }
    process.exitCode =
      manifest.sourceChanged ? result.exitCode || 1 : result.exitCode;
  } catch (error) {
    manifest.result = 'failed';
    manifest.error = error.message;
    writeFileSync(logPath, `${error.message}\n`, { flag: 'a' });
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  } finally {
    manifest.finishedAt = new Date().toISOString();
    save();
    console.log(`Verification evidence: ${evidenceDir}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
