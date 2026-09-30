#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
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
  if (
    fromRoot === '..' ||
    fromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) ||
    isAbsolute(fromRoot)
  ) {
    throw new Error(`Destination escapes root: ${path}`);
  }

  try {
    const metadata = lstatSync(path);
    if (metadata.isSymbolicLink())
      throw new Error(`Refusing symlink destination: ${path}`);
    if (!metadata.isFile())
      throw new Error(`Destination is not a regular file: ${path}`);
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
        replacement = createOwnedFile(path, content, target.mode);
        backup =
          target.exists ?
            createOwnedFile(path, readFileSync(path), target.mode)
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
    const suffix =
      rollbackErrors.length > 0 ?
        `; rollback errors: ${rollbackErrors.join('; ')}`
      : '';
    throw new Error(`${error.message}${suffix}`, { cause: error });
  }

  for (const item of prepared) removeOwnedFile(item.backup);
}

const { profile, root } = parseArgs(process.argv.slice(2));
if (!profile) fail('Usage: mcp-profile.mjs <profile> [--root <path>]');

const registryPath = join(root, '.agents', 'mcp-registry.json');

// Per-host adapters. Hosts read different MCP config shapes, so each needs its
// own adapter rather than one hardcoded target. Only `omp` is implemented
// today; the other harness names this script once advertised are not wired.
// A host is ACTIVE when at least one registry server defines that slot; its
// directory must exist to be written, and an absent directory is a skip rather
// than a failure — that developer simply is not using the harness. To support
// another host, add an entry here and populate the matching slot in
// mcp-registry.json.
const HOST_ADAPTERS = {
  omp: {
    dir: '.omp',
    file: 'mcp.json',
    server: (config) => ({ type: 'stdio', ...config }),
    envelope: (servers) => ({
      $schema:
        'https://raw.githubusercontent.com/can1357/oh-my-pi/main/packages/coding-agent/src/config/mcp-schema.json',
      mcpServers: servers,
    }),
  },
};
const registry = readJson(registryPath);
const selected = registry.profiles?.[profile];
if (!selected) {
  fail(
    `Unknown MCP profile "${profile}". Available: ${Object.keys(registry.profiles ?? {}).join(', ')}`,
  );
}

const selectedNames = new Set(selected);
for (const name of selectedNames) {
  if (!registry.servers?.[name])
    fail(`MCP profile "${profile}" references unknown server "${name}"`);
}
// A server object contains host slots and nothing else. Any slot without an
// adapter is a typo or an unimplemented harness; fail loudly rather than
// silently writing fewer hosts than the registry implies.
const activeHosts = new Set();
for (const [name, config] of Object.entries(registry.servers ?? {})) {
  for (const slot of Object.keys(config)) {
    if (!HOST_ADAPTERS[slot]) {
      fail(
        `MCP server "${name}" defines unsupported host slot "${slot}". Supported: ${Object.keys(HOST_ADAPTERS).join(', ')}`,
      );
    }
    activeHosts.add(slot);
  }
}
if (!activeHosts.size) {
  fail('No host slots defined in the registry — nothing to write');
}

function expandEnvironment(value) {
  if (typeof value === 'string') {
    const result = value.replace(
      /\$\{([A-Z_][A-Z0-9_]*)\}/g,
      (_match, name) => {
        const resolved = process.env[name];
        if (resolved === undefined)
          fail(`Environment variable "${name}" is required`);
        return resolved;
      },
    );
    return result;
  }
  if (Array.isArray(value)) return value.map(expandEnvironment);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        expandEnvironment(nested),
      ]),
    );
  }
  return value;
}

const batchWrites = [];
const writtenHosts = [];
const skippedHosts = [];
for (const host of activeHosts) {
  const adapter = HOST_ADAPTERS[host];
  const dir = join(root, adapter.dir);
  if (!existsSync(dir)) {
    skippedHosts.push(host);
    continue;
  }
  const servers = Object.fromEntries(
    selected.map((name) => [
      name,
      adapter.server(expandEnvironment(registry.servers[name][host])),
    ]),
  );
  batchWrites.push([join(dir, adapter.file), adapter.envelope(servers)]);
  writtenHosts.push(host);
}
if (!writtenHosts.length) {
  fail(
    `No host config written. Registry declares [${[...activeHosts].join(', ')}] but none of their directories exist under ${root}`,
  );
}
try {
  await writeJsonBatch(root, batchWrites);
} catch (error) {
  fail(`Cannot update MCP profile: ${error.message}`);
}
process.stdout.write(
  `${JSON.stringify({ profile, enabled: selected, disabled: Object.keys(registry.servers).filter((name) => !selectedNames.has(name)), hosts: { written: writtenHosts, skipped: skippedHosts } })}\n`,
);
