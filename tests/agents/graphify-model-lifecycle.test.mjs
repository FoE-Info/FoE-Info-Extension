import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs, {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const SCRIPT_DIR = resolve(new URL('.', import.meta.url).pathname);
const PROJECT_ROOT = resolve(SCRIPT_DIR, '../..');
const AGENTS_DIR = join(PROJECT_ROOT, '.agents');
const MODEL_SCRIPT = join(AGENTS_DIR, 'scripts', 'graphify-model.sh');
const ENV_SCRIPT = join(AGENTS_DIR, 'scripts', 'inference-env.sh');
const CONFIG_FILE = join(AGENTS_DIR, 'mcp_config.json');
// `.agents/` is git-ignored, so these tests cannot run on a fresh clone.
const SKIP =
  fs.existsSync(MODEL_SCRIPT) ? false : (
    '.agents/ is git-ignored (see .gitignore)'
  );

function makeCommandFixture(
  t,
  { curlHealthy = true, containerLines = '' } = {},
) {
  const root = mkdtempSync(join(tmpdir(), 'graphify-model-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const log = join(root, 'calls.log');
  const state = join(root, 'curl-count');
  const healthyMarker = join(root, 'healthy');
  const bin = join(root, 'bin');
  mkdirSync(bin);

  writeFileSync(
    join(bin, 'ramalama'),
    `#!/bin/sh
printf 'ramalama %s\\n' "$*" >> '${log}'
case "$1" in
  serve) touch '${healthyMarker}'; exit 0 ;;
  stop) exit 0 ;;
  containers) printf '%s' '${containerLines}'; exit 0 ;;
esac
`,
  );
  writeFileSync(
    join(bin, 'curl'),
    `#!/bin/sh
count=0
[ -f '${state}' ] && count=$(cat '${state}')
count=$((count + 1))
printf '%s' "$count" > '${state}'
if [ '${curlHealthy}' = true ] || [ -f '${healthyMarker}' ]; then
  printf '{"data":[]}'
  exit 0
fi
exit 22
`,
  );
  chmodSync(join(bin, 'ramalama'), 0o755);
  chmodSync(join(bin, 'curl'), 0o755);
  return { root, bin, log };
}

function runScript(fixture, args, env = {}) {
  return spawnSync('bash', [MODEL_SCRIPT, ...args], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fixture.bin}:${process.env.PATH}`,
      ...env,
    },
  });
}

test(
  'shared inference environment defines the on-demand RamaLama contract',
  { skip: SKIP },
  () => {
    const result = spawnSync(
      'bash',
      [
        '-c',
        `source '${ENV_SCRIPT}' && printf '%s\\n' "$OPENAI_BASE_URL" "$OPENAI_API_KEY" "$GRAPHIFY_BACKEND" "$OPENAI_MODEL" "$GRAPHIFY_OPENAI_MODEL" "$GRAPHIFY_NO_TIPS" "$RAMALAMA_MODEL" "$RAMALAMA_PORT" "$RAMALAMA_CONTAINER_NAME" "$RAMALAMA_CTX_SIZE" "$RAMALAMA_START_TIMEOUT" "$NO_PROXY"`,
      ],
      { cwd: PROJECT_ROOT, encoding: 'utf8' },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split('\n'), [
      'http://127.0.0.1:8080/v1',
      'local',
      'openai',
      'qwen2.5vl:7b',
      'qwen2.5vl:7b',
      '1',
      'qwen2.5vl:7b',
      '8080',
      'graphify-model',
      '32768',
      '120',
      '*',
    ]);
  },
);

test(
  'status reports a stopped container and an unresponsive endpoint',
  { skip: SKIP },
  (t) => {
    const fixture = makeCommandFixture(t, { curlHealthy: false });
    const result = runScript(fixture, ['status']);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /stopped/i);
    assert.match(result.stdout, /unresponsive|not responding/i);
  },
);

test(
  'run starts the model and cleans it up after successful execution',
  { skip: SKIP },
  (t) => {
    const fixture = makeCommandFixture(t, { curlHealthy: false });
    const result = runScript(fixture, ['run', 'bash', '-c', 'exit 0']);

    assert.equal(result.status, 0, result.stderr);
    const calls = readFileSync(fixture.log, 'utf8');
    assert.match(
      calls,
      /ramalama serve -d --name graphify-model --port 8080 --ctx-size 16384/,
    );
    assert.match(calls, /ramalama stop --ignore graphify-model/);
  },
);

test(
  'run preserves command failure and still cleans up the model',
  { skip: SKIP },
  (t) => {
    const fixture = makeCommandFixture(t, { curlHealthy: false });
    const result = runScript(fixture, ['run', 'bash', '-c', 'exit 7']);

    assert.equal(result.status, 7);
    assert.match(result.stdout, /On-demand cleanup/);
    assert.match(
      readFileSync(fixture.log, 'utf8'),
      /ramalama stop --ignore graphify-model/,
    );
  },
);

test(
  'MCP config uses the RamaLama model identifier for every Graphify server',
  { skip: SKIP },
  () => {
    const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    for (const [name, server] of Object.entries(config.mcpServers || {})) {
      if (!name.startsWith('graphify-')) continue;
      assert.equal(server.env?.OPENAI_MODEL, 'qwen2.5vl:7b', name);
      assert.equal(server.env?.GRAPHIFY_OPENAI_MODEL, 'qwen2.5vl:7b', name);
    }
  },
);
