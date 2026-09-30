/** Stable source identity for working trees and exports, without Git dependency. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXCLUDED = new Set([
  '.idea',
  'dist',
  'coverage',
  'scratch',
  'metadata-store',
  '.audit-siblings',
  '.worktrees',
  'worktrees',
  '.git',
  'node_modules',
  'build',
  'graphify-out',
  '.venv',
  '.uv',
  '.vscode',
]);

export function sourceSnapshot(root, { excludePaths = [] } = {}) {
  const files = [];
  function excluded(relative) {
    return (
      relative
        .split('/')
        .some(
          (name) =>
            EXCLUDED.has(name) ||
            name === '.envrc' ||
            name === '.env' ||
            name.startsWith('.env.') ||
            /\.(?:zip|crx|pem|key)$/.test(name),
        ) ||
      [
        '.codex/auth.json',
        '.agents/.last_graph_query_stamp',
        '.husky/.graphify-python',
      ].includes(relative) ||
      excludePaths.some(
        (path) => relative === path || relative.startsWith(`${path}/`),
      )
    );
  }
  function visit(directory, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (excluded(relative)) continue;
      if (entry.isDirectory())
        visit(join(directory, entry.name), `${relative}/`);
      else if (entry.isFile()) files.push(relative);
      // Symlinks are not followed: dependency links and external secrets stay outside the snapshot.
    }
  }
  const listed = spawnSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  if (listed.status === 0) {
    for (const file of new Set(listed.stdout.split('\0').filter(Boolean))) {
      if (
        !excluded(file) &&
        existsSync(join(root, file)) &&
        lstatSync(join(root, file)).isFile()
      )
        files.push(file);
    }
  } else visit(root);
  files.sort();
  const hash = createHash('sha256');
  for (const file of files) {
    const contents = readFileSync(join(root, file));
    hash.update(`${Buffer.byteLength(file)}:${file}:${contents.length}:`);
    hash.update(contents);
  }
  return {
    algorithm: 'sha256',
    scope: 'publishable-regular-files-excluding-generated-and-local-state',
    digest: hash.digest('hex'),
    fileCount: files.length,
    files,
  };
}
