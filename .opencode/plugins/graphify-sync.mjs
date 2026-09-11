import { spawn } from 'node:child_process';
import { appendFileSync, closeSync, mkdirSync, openSync } from 'node:fs';
import path from 'node:path';
import { affectsAst } from '../../.agents/scripts/post-tool-graphify-sync.mjs';
import { trackSync, untrackSync } from './sync-state.mjs';

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../..',
);
const log = path.join(root, 'graphify-out/foe-info/opencode-sync.log');

function queueSync(file) {
  mkdirSync(path.dirname(log), { recursive: true });
  appendFileSync(log, `${new Date().toISOString()} queued ${file}\n`);
  const fd = openSync(log, 'a');
  try {
    const child = spawn('npm', ['run', '--silent', 'graph:foe-info:ast'], {
      cwd: root,
      detached: true,
      stdio: ['ignore', fd, fd],
    });
    trackSync(file, child);
    child.on('error', (err) => {
      untrackSync(file);
      appendFileSync(log, `spawn failed: ${err.message}\n`);
    });
    child.on('exit', (code) => {
      untrackSync(file);
      appendFileSync(log, `${new Date().toISOString()} exit ${code}\n`);
    });
    child.unref();
  } finally {
    closeSync(fd);
  }
}

export const GraphifySync = async () => {
  return {
    'tool.execute.after': async (input) => {
      if (!['edit', 'write'].includes(input.tool)) return;
      const file = input.args?.filePath ?? input.args?.path ?? '';
      const rel = path.relative(root, path.resolve(root, file));
      if (!rel.startsWith('..') && affectsAst(rel)) queueSync(rel);
    },
  };
};
