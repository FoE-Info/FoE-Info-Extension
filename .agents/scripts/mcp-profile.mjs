#!/usr/bin/env node

import {
  closeSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const profile = argv[0];
  let root = resolve(SCRIPT_DIR, '..', '..');
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] !== '--root') fail(`Unknown argument "${argv[index]}"`);
    const value = argv[index + 1];
    if (!value) fail('--root requires a path');
    root = resolve(value);
    index += 1;
  }
  return { profile, root };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`Cannot read ${path}: ${error.message}`);
  }
}

function removeOwnedFile(path, errorToPreserve) {
  if (!path) return;
  try {
    unlinkSync(path);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      if (errorToPreserve) {
        errorToPreserve.suppressed = errorToPreserve.suppressed ?? [];
        errorToPreserve.suppressed.push(error);
      } else {
        throw error;
      }
    }
  }
}

function inspectTarget(root, path) {
  const canonicalRoot = realpathSync(root);
  const canonicalParent = realpathSync(dirname(path));
  const fromRoot = relative(canonicalRoot, canonicalParent);
  if (fromRoot === '..' || fromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(fromRoot)) {
    throw new Error(`Destination escapes root: ${path}`);
  }

  try {
    const metadata = lstatSync(path);
    if (metadata.isSymbolicLink()) throw new Error(`Refusing symlink destination: ${path}`);
    if (!metadata.isFile()) throw new Error(`Destination is not a regular file: ${path}`);
    return { exists: true, mode: statSync(path).mode & 0o777 };
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, mode: 0o644 };
    throw error;
  }
}

function createOwnedFile(path, content, mode) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const temporary = `${path}.mcp-profile-${randomBytes(12).toString('hex')}.tmp`;
    let descriptor;
    let owned = false;
    try {
      descriptor = openSync(temporary, 'wx', mode);
      owned = true;
      writeFileSync(descriptor, content);
      closeSync(descriptor);
      return temporary;
    } catch (error) {
      if (descriptor !== undefined) {
        try {
          closeSync(descriptor);
        } catch {
          // Preserve the original write/open failure.
        }
      }
      if (owned) {
        try {
          removeOwnedFile(temporary);
        } catch {
          // Preserve the original write/open failure.
        }
      }
      if (error?.code !== 'EEXIST') throw error;
    }
  }
  throw new Error(`Cannot allocate an owned temporary file for ${path}`);
}

async function writeJsonBatch(root, entries) {
  const prettierConfig = (await resolveConfig(root)) ?? {};
  const prepared = [];
  try {
    for (const [path, value] of entries) {
      const target = inspectTarget(root, path);
      let replacement;
      let backup;
      try {
        const content = await format(JSON.stringify(value), {
          ...prettierConfig,
          filepath: path,
        });
        replacement = createOwnedFile(
          path,
          content,
          target.mode,
        );
        backup = target.exists
          ? createOwnedFile(path, readFileSync(path), target.mode)
          : undefined;
        prepared.push({ path, replacement, backup, existed: target.exists });
      } catch (error) {
        removeOwnedFile(replacement, error);
        removeOwnedFile(backup, error);
        throw error;
      }
    }
  } catch (error) {
    for (const item of prepared) {
      removeOwnedFile(item.replacement, error);
      removeOwnedFile(item.backup, error);
    }
    throw error;
  }

  const committed = [];
  try {
    for (const item of prepared) {
      renameSync(item.replacement, item.path);
      item.replacement = undefined;
      committed.push(item);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const item of committed.reverse()) {
      try {
        if (item.existed) {
          renameSync(item.backup, item.path);
          item.backup = undefined;
        } else {
          removeOwnedFile(item.path);
        }
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError.message);
      }
    }
    for (const item of prepared) {
      try {
        removeOwnedFile(item.replacement);
        // Preserve backup if rollback failed - do not delete if restore failed
        if (item.existed && rollbackErrors.length > 0) {
          // Keep backup for manual recovery
        } else {
          removeOwnedFile(item.backup);
        }
      } catch (cleanupError) {
        rollbackErrors.push(cleanupError.message);
      }
    }
    const suffix = rollbackErrors.length > 0 ? `; rollback errors: ${rollbackErrors.join('; ')}` : '';
    throw new Error(`${error.message}${suffix}`, { cause: error });
  }

  for (const item of prepared) removeOwnedFile(item.backup);
}

const { profile, root } = parseArgs(process.argv.slice(2));
if (!profile) fail('Usage: mcp-profile.mjs <profile> [--root <path>]');

const registryPath = join(root, '.agents', 'mcp-registry.json');
const antigravityPath = join(root, '.agents', 'mcp_config.json');
const registry = readJson(registryPath);
const selected = registry.profiles?.[profile];
if (!selected) {
  fail(
    `Unknown MCP profile "${profile}". Available: ${Object.keys(registry.profiles ?? {}).join(', ')}`,
  );
}

const selectedNames = new Set(selected);
for (const name of selectedNames) {
  if (!registry.servers?.[name]) fail(`MCP profile "${profile}" references unknown server "${name}"`);
}
for (const [name, config] of Object.entries(registry.servers ?? {})) {
  if (!config.antigravity) {
    fail(`MCP server "${name}" must define antigravity config`);
  }
}

function expandEnvironment(value) {
  if (typeof value === 'string') {
    const result = value.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (_match, name) => {
      const resolved = process.env[name];
      if (resolved === undefined) fail(`Environment variable "${name}" is required`);
      return resolved;
    });
    return result;
  }
  if (Array.isArray(value)) return value.map(expandEnvironment);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, expandEnvironment(nested)]),
    );
  }
  return value;
}

const antigravityServers = Object.fromEntries(
  selected.map((name) => [
    name,
    expandEnvironment(registry.servers[name].antigravity),
  ]),
);

const batchWrites = [[antigravityPath, { mcpServers: antigravityServers }]];


try {
  await writeJsonBatch(root, batchWrites);
} catch (error) {
  fail(`Cannot update MCP profile: ${error.message}`);
}
process.stdout.write(
  `${JSON.stringify({ profile, enabled: selected, disabled: Object.keys(registry.servers).filter((name) => !selectedNames.has(name)) })}\n`,
);