import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const PROJECT_ROOT = path.resolve('.');
const AGENTS_DIR = path.join(PROJECT_ROOT, '.agents');

test('Agent Config - validates project.json workspace profile', () => {
  const projectJsonFile = path.join(AGENTS_DIR, 'project.json');
  assert.ok(
    fs.existsSync(projectJsonFile),
    'project.json must exist in .agents/',
  );

  const config = JSON.parse(fs.readFileSync(projectJsonFile, 'utf8'));
  assert.equal(config.name, 'foe-info', 'Must define config.name as foe-info');
  assert.equal(
    config.displayName,
    'FoE-Info Extension',
    'Must define config.displayName',
  );
  assert.equal(
    config.primaryGraph,
    'graphify-foe-info',
    'Must define valid config.primaryGraph',
  );
});

test('Agent Config - validates subagent definitions', () => {
  const agentsDir = path.join(AGENTS_DIR, 'agents');
  const agentFiles = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));

  assert.ok(agentFiles.length > 0, 'Expected a non-empty subagent roster');

  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(match, `Missing YAML frontmatter in ${file}`);

    const frontmatter = match[1];
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
    const subagentMatch = frontmatter.match(/^subagent:\s*(.+)$/m);

    assert.ok(nameMatch, `Missing "name" in ${file}`);
    assert.ok(descMatch, `Missing "description" in ${file}`);
    assert.ok(subagentMatch, `Missing "subagent: true" in ${file}`);

    const nameVal = nameMatch[1].trim().replace(/^["']|["']$/g, '');
    const expectedName = file.replace(/\.md$/, '');
    assert.equal(nameVal, expectedName, `Name mismatch in ${file}`);
    assert.equal(
      subagentMatch[1].trim(),
      'true',
      `subagent must be true in ${file}`,
    );
  }
});

test('Agent Config - validates skill definitions', () => {
  const skillsDir = path.join(AGENTS_DIR, 'skills');
  const skillDirs = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  assert.equal(
    skillDirs.length,
    23,
    'Expected exactly 23 skills in .agents/skills',
  );

  for (const dir of skillDirs) {
    const skillFile = path.join(skillsDir, dir.name, 'SKILL.md');
    assert.ok(fs.existsSync(skillFile), `Missing SKILL.md in ${dir.name}`);

    const content = fs.readFileSync(skillFile, 'utf8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(match, `Missing YAML frontmatter in ${dir.name}/SKILL.md`);

    const frontmatter = match[1];
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

    assert.ok(nameMatch, `Missing "name" in ${dir.name}/SKILL.md`);
    assert.ok(descMatch, `Missing "description" in ${dir.name}/SKILL.md`);

    const nameVal = nameMatch[1].trim().replace(/^["']|["']$/g, '');
    assert.equal(nameVal, dir.name, `Skill name mismatch in ${dir.name}`);

    const nonStandardKeys = ['category', 'risk', 'source', 'date_added'];
    for (const key of nonStandardKeys) {
      assert.ok(
        !new RegExp(`^${key}:`, 'm').test(frontmatter),
        `Non-standard frontmatter key "${key}" in ${dir.name}/SKILL.md`,
      );
    }
  }
});

test('Agent Config - centralizes skill-memory documentation', () => {
  const centralReference = path.join(
    AGENTS_DIR,
    'references',
    'skill-memory.md',
  );
  assert.ok(
    fs.existsSync(centralReference),
    'Expected one canonical skill-memory reference',
  );

  const copies = [];
  const findCopies = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.name === 'skill-memory.md') copies.push(entryPath);
      if (entry.isDirectory()) findCopies(entryPath);
    }
  };
  findCopies(AGENTS_DIR);
  assert.deepEqual(
    copies,
    [centralReference],
    'Expected .agents/references/skill-memory.md to be the sole copy',
  );

  const duplicatedLogging = /node \.agents\/scripts\/skill-memory\.mjs log/;
  const duplicatedSkillLink = /\]\(\.\.\/\.\.\/references\/skill-memory\.md\)/;
  const skillsDir = path.join(AGENTS_DIR, 'skills');
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const content = fs.readFileSync(
      path.join(skillsDir, entry.name, 'SKILL.md'),
      'utf8',
    );
    assert.doesNotMatch(
      content,
      duplicatedLogging,
      `Skill ${entry.name} duplicates the global skill-memory logging rule`,
    );
    assert.doesNotMatch(
      content,
      duplicatedSkillLink,
      `Skill ${entry.name} duplicates the global skill-memory reference link`,
    );
  }

  const duplicatedAgentLink = /\]\(\.\.\/references\/skill-memory\.md\)/;
  const agentsDir = path.join(AGENTS_DIR, 'agents');
  for (const entry of fs.readdirSync(agentsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(agentsDir, entry.name), 'utf8');
    assert.doesNotMatch(
      content,
      duplicatedLogging,
      `Subagent ${entry.name} duplicates the global skill-memory logging rule`,
    );
    assert.doesNotMatch(
      content,
      duplicatedAgentLink,
      `Subagent ${entry.name} duplicates the global skill-memory reference link`,
    );
  }

  const verificationRule = fs.readFileSync(
    path.join(AGENTS_DIR, 'rules', 'verification-before-completion.md'),
    'utf8',
  );
  assert.match(
    verificationRule,
    duplicatedLogging,
    'Verification rule must own skill-memory logging',
  );
  assert.equal(
    verificationRule.match(/\]\(\.\.\/references\/skill-memory\.md\)/g)
      ?.length ?? 0,
    1,
    'Verification rule must link the canonical skill-memory reference once',
  );
});

test('Agent Config - validates rule definitions', () => {
  const rulesDir = path.join(AGENTS_DIR, 'rules');
  const ruleFiles = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.md'));

  assert.equal(
    ruleFiles.length,
    16,
    'Expected exactly 16 rules in .agents/rules',
  );

  for (const file of ruleFiles) {
    const content = fs.readFileSync(path.join(rulesDir, file), 'utf8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(match, `Missing YAML frontmatter in ${file}`);

    const frontmatter = match[1];
    const triggerMatch = frontmatter.match(/^trigger:\s*(.+)$/m);
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

    assert.ok(triggerMatch, `Missing "trigger" in ${file}`);
    assert.ok(descMatch, `Missing "description" in ${file}`);

    const triggerVal = triggerMatch[1].trim();
    assert.ok(
      triggerVal === 'always_on' || triggerVal === 'model_decision',
      `Invalid trigger "${triggerVal}" in ${file}`,
    );
  }

  const delegationContent = fs.readFileSync(
    path.join(rulesDir, 'subagent-delegation.md'),
    'utf8',
  );
  assert.match(
    delegationContent,
    /\[subagent-routing\.md\]\(\.\.\/references\/subagent-routing\.md\)/,
    'subagent-delegation.md must link the routing reference',
  );
  assert.match(
    delegationContent,
    /delegat(?:e|ing).*invoke_subagent/is,
    'subagent-delegation.md must describe delegation via invoke_subagent',
  );

  // The routing table lives in an on-demand reference. Parse every backticked
  // name from its table rows so alternatives such as `A` or `B` are included.
  const routing = fs.readFileSync(
    path.join(AGENTS_DIR, 'references', 'subagent-routing.md'),
    'utf8',
  );
  const routed = routing
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|'))
    .flatMap((line) => [...line.matchAll(/`([a-z0-9-]+)`/g)])
    .map((match) => match[1]);
  const canonical = fs
    .readdirSync(path.join(AGENTS_DIR, 'agents'))
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace(/\.md$/, ''));
  assert.deepEqual(
    [...new Set(routed)].sort(),
    canonical.sort(),
    'subagent-routing.md must route every canonical subagent with no stale routes',
  );
});

test('Agent Config - validates hooks.json and hook scripts', () => {
  const hooksFile = path.join(AGENTS_DIR, 'hooks.json');
  assert.ok(fs.existsSync(hooksFile), 'hooks.json must exist');

  const config = JSON.parse(fs.readFileSync(hooksFile, 'utf8'));
  for (const [hookName, hookSpec] of Object.entries(config)) {
    if (hookSpec.PreToolUse) {
      assert.ok(
        Array.isArray(hookSpec.PreToolUse),
        `${hookName}.PreToolUse must be array`,
      );
      for (const group of hookSpec.PreToolUse) {
        assert.ok(group.matcher, `${hookName} group missing matcher`);
        assert.ok(
          Array.isArray(group.hooks),
          `${hookName} group missing hooks array`,
        );
      }
    }
    if (hookSpec.PostToolUse) {
      assert.ok(
        Array.isArray(hookSpec.PostToolUse),
        `${hookName}.PostToolUse must be array`,
      );
      for (const group of hookSpec.PostToolUse) {
        assert.ok(group.matcher, `${hookName} group missing matcher`);
        assert.ok(
          Array.isArray(group.hooks),
          `${hookName} group missing hooks array`,
        );
      }
    }
    if (hookSpec.PreInvocation) {
      assert.ok(
        Array.isArray(hookSpec.PreInvocation),
        `${hookName}.PreInvocation must be array`,
      );
    }
    if (hookSpec.Stop) {
      assert.ok(Array.isArray(hookSpec.Stop), `${hookName}.Stop must be array`);
    }

    const allHooks = [
      ...(hookSpec.PreToolUse?.flatMap((g) => g.hooks) || []),
      ...(hookSpec.PostToolUse?.flatMap((g) => g.hooks) || []),
      ...(hookSpec.PreInvocation || []),
      ...(hookSpec.Stop || []),
    ];
    for (const handler of allHooks) {
      assert.ok(handler.command, `${hookName} missing command`);
      const scriptMatch = handler.command.match(/([^\s"']+\.(?:mjs|sh|js))/);
      if (scriptMatch) {
        const scriptRel = scriptMatch[1];
        const fromAgents = path.resolve(AGENTS_DIR, scriptRel);
        const fromRoot = path.resolve(PROJECT_ROOT, scriptRel);
        assert.ok(
          fs.existsSync(fromAgents) || fs.existsSync(fromRoot),
          `Hook script does not exist on disk: ${scriptRel} in ${hookName}`,
        );
      }
    }
  }
});

test('Agent Config - validates skills.json configuration', () => {
  const skillsConfig = path.join(AGENTS_DIR, 'skills.json');
  assert.ok(fs.existsSync(skillsConfig), 'skills.json must exist');

  const config = JSON.parse(fs.readFileSync(skillsConfig, 'utf8'));
  assert.ok(
    Array.isArray(config.entries),
    'skills.json must have entries array',
  );
  for (const entry of config.entries) {
    assert.ok(entry.path, 'Each entry must specify a path');
    const resolvedPath = path.resolve(PROJECT_ROOT, entry.path);
    assert.ok(
      fs.existsSync(resolvedPath),
      `Entry path does not exist: ${entry.path} (resolved: ${resolvedPath})`,
    );
  }
});

test('Agent Config - validates AGENTS.md integrity and internal links', () => {
  const agentsMd = fs.readFileSync(
    path.join(PROJECT_ROOT, 'AGENTS.md'),
    'utf8',
  );

  assert.match(agentsMd, /Config lives in `\.agents\/`/);
  assert.match(agentsMd, /\[docs\/SKILLS\.md\]\(docs\/SKILLS\.md\)/);
  assert.match(
    agentsMd,
    /\[rules\/subagent-delegation\.md\]\(\.agents\/rules\/subagent-delegation\.md\)/,
  );

  // Link validation
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(agentsMd)) !== null) {
    const link = match[2];
    if (
      link.startsWith('http://') ||
      link.startsWith('https://') ||
      link.startsWith('#')
    ) {
      continue;
    }
    const cleanLink = link.split('#')[0];
    if (!cleanLink) continue;

    const resolved = path.resolve(PROJECT_ROOT, cleanLink);
    assert.ok(
      fs.existsSync(resolved),
      `Broken link in AGENTS.md: ${link} (resolved: ${resolved})`,
    );
  }
});

test('Agent Config - validates markdown links across all skills, rules, agents, and docs', () => {
  const checkDirs = [
    path.join(AGENTS_DIR, 'skills'),
    path.join(AGENTS_DIR, 'rules'),
    path.join(AGENTS_DIR, 'agents'),
    path.join(AGENTS_DIR, 'references'),
    path.join(PROJECT_ROOT, 'docs'),
  ];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        const content = fs.readFileSync(full, 'utf8');
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
          const link = match[2];
          if (
            link.startsWith('http://') ||
            link.startsWith('https://') ||
            link.startsWith('#') ||
            link.startsWith('mailto:')
          ) {
            continue;
          }
          const cleanLink = link.split('#')[0];
          if (!cleanLink) continue;

          const resolved = path.resolve(path.dirname(full), cleanLink);
          assert.ok(
            fs.existsSync(resolved),
            `Broken link in ${path.relative(PROJECT_ROOT, full)}: ${link} (resolved: ${resolved})`,
          );
        }
      }
    }
  }

  for (const dir of checkDirs) {
    walk(dir);
  }
});

test('Agent Config - validates standardized shell script naming convention', () => {
  const scriptsDir = path.join(AGENTS_DIR, 'scripts');
  const expectedScripts = [
    'graph-foe-info-reindex.sh',
    'graph-foe-info-update.sh',
    'graph-foe-info-original-reindex.sh',
    'graph-foe-info-original-update.sh',
    'graph-forge-hammer-reindex.sh',
    'graph-forge-hammer-update.sh',
    'graph-low-tool-reindex.sh',
    'graph-low-tool-update.sh',
    'graph-metadata-reindex.sh',
    'graph-metadata-update.sh',
    'llama-swap-lifecycle.sh',
    'run-graphify-local.sh',
  ];

  for (const script of expectedScripts) {
    const fullPath = path.join(scriptsDir, script);
    assert.ok(
      fs.existsSync(fullPath),
      `Expected shell script ${script} to exist in .agents/scripts/`,
    );
    const stat = fs.statSync(fullPath);
    // Verify file is executable (mode contains execute bits)
    assert.ok(
      (stat.mode & 0o111) !== 0,
      `Shell script ${script} must have execute permissions`,
    );
  }
});

test('Agent Config - validates SCRIPT_DIR definition in shell scripts sourcing dependencies', () => {
  const scriptsDir = path.join(AGENTS_DIR, 'scripts');
  const files = fs.readdirSync(scriptsDir).filter((f) => f.endsWith('.sh'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
    if (content.includes('${SCRIPT_DIR}')) {
      const scriptDirIndex = content.indexOf('SCRIPT_DIR=');
      const scriptDirRefIndex = content.indexOf('${SCRIPT_DIR}');
      assert.ok(
        scriptDirIndex !== -1 && scriptDirIndex < scriptDirRefIndex,
        `Script ${file} references \${SCRIPT_DIR} before defining it`,
      );
    }
  }
});

test('Architecture Invariant - src/ has zero static game JSON and zero metadata-store imports', () => {
  const findJson = (dir) => {
    let res = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) res = res.concat(findJson(p));
      else if (entry.name.endsWith('.json'))
        res.push(path.relative(PROJECT_ROOT, p));
    }
    return res;
  };
  const jsonFiles = findJson(path.join(PROJECT_ROOT, 'src'));
  const allowed = [
    /^src\/chrome\/manifest.*\.json$/,
    /^src\/i18n\/[a-z]{2}\.json$/,
  ];
  for (const f of jsonFiles) {
    assert.ok(
      allowed.some((r) => r.test(f)),
      `Prohibited static JSON in src/: ${f}. Runtime must be 100% dynamic network RPC.`,
    );
  }

  const findSrc = (dir) => {
    let res = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) res = res.concat(findSrc(p));
      else if (/\.(js|mjs|cjs|html|scss|css)$/.test(entry.name)) res.push(p);
    }
    return res;
  };
  for (const f of findSrc(path.join(PROJECT_ROOT, 'src'))) {
    const code = fs.readFileSync(f, 'utf8');
    assert.ok(
      !code.includes('metadata-store'),
      `Forbidden metadata-store import in ${path.relative(PROJECT_ROOT, f)}`,
    );
  }
});

test('Agent Config - enforces context budget limits and rule size thresholds', () => {
  const agentsDir = path.join(AGENTS_DIR, 'agents');
  for (const file of fs
    .readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'))) {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(match, `Missing YAML frontmatter in ${file}`);
    const descMatch = match[1].match(/^description:\s*(.+)$/m);
    assert.ok(descMatch, `Missing description in ${file}`);
    const desc = descMatch[1].trim();
    assert.ok(
      desc.length <= 150,
      `Subagent ${file} description is too long (${desc.length} chars, max 150) - risks context budget exclusion`,
    );
  }

  const skillsDir = path.join(AGENTS_DIR, 'skills');
  for (const dir of fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())) {
    const skillFile = path.join(skillsDir, dir.name, 'SKILL.md');
    const content = fs.readFileSync(skillFile, 'utf8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(match, `Missing YAML frontmatter in ${dir.name}/SKILL.md`);
    const descMatch = match[1].match(/^description:\s*(.+)$/m);
    assert.ok(descMatch, `Missing description in ${dir.name}/SKILL.md`);
    const desc = descMatch[1].trim();
    assert.ok(
      desc.length <= 80,
      `Skill ${dir.name} description is too long (${desc.length} chars, max 80) - risks context budget exclusion`,
    );
  }

  const agentsMd = fs.readFileSync(
    path.join(PROJECT_ROOT, 'AGENTS.md'),
    'utf8',
  );
  assert.ok(
    Buffer.byteLength(agentsMd, 'utf8') <= 18000,
    `AGENTS.md size (${Buffer.byteLength(agentsMd, 'utf8')} bytes) exceeds budget threshold (18,000 bytes)`,
  );
});

test('Agent Config - enforces zero references to obsolete protocol paths', () => {
  const checkDirs = [
    path.join(AGENTS_DIR, 'agents'),
    path.join(AGENTS_DIR, 'rules'),
    path.join(AGENTS_DIR, 'skills'),
  ];
  const obsoletePatterns = [
    'src/js/xhr-interceptor.js',
    'src/js/content-bridge.js',
    'xhr-interceptor.js',
    'content-bridge.js',
  ];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        const content = fs.readFileSync(full, 'utf8');
        for (const pattern of obsoletePatterns) {
          assert.ok(
            !content.includes(pattern),
            `Obsolete reference "${pattern}" found in ${path.relative(PROJECT_ROOT, full)}`,
          );
        }
      }
    }
  }

  for (const dir of checkDirs) {
    walk(dir);
  }
});
