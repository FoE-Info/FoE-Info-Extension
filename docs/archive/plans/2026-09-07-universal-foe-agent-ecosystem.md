# Universal FoE Agent Ecosystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple FoE domain intelligence from extension-specific details, creating a 100% portable, host-aware agent ecosystem across FoE repositories.

**Architecture:** Introduce minimal `.agents/project.json` identity profiles, re-anchor `graph-knowledge-explorer` to treat the active workspace as target and secondary graphs as peers, and generalize invariant rules (`bignumber-precision`, `monolith-containment`, `graphify`, `workspace-structure`) for zero-drift multi-repo portability.

**Tech Stack:** Node.js (`node:test`), Markdown (`.agents/agents/*.md`, `.agents/rules/*.md`), JSON configs (`project.json`, `hooks.json`).

**Spec:** [`docs/specs/2026-09-07-universal-foe-agent-ecosystem-design.md`](../specs/2026-09-07-universal-foe-agent-ecosystem-design.md)

## Global Constraints

- Target subagent description lengths $\le 150$ characters to avoid context budget exclusion.
- Target skill description lengths $\le 120$ characters.
- AGENTS.md byte length $\le 18,000$ bytes.
- Zero drift between shared subagents and rules across repositories (`FoE-Info-Extension` and `forge-hammer`).
- Never introduce breaking changes to FoE-Info's passing test suite (144/144 tests must remain green).

---

### Task 1: Add Workspace Identity Anchor (`.agents/project.json`)

**Files:**

- Create: `FoE-Info-Extension/.agents/project.json`
- Create: `Forge-Hammer/.agents/project.json`
- Modify: `FoE-Info-Extension/tests/agents/agent-config.test.mjs`
- Modify: `Forge-Hammer/tests/agents/agent-config.test.mjs`

**Interfaces:**

- Consumes: None
- Produces: `.agents/project.json` with schema `{ name: string, displayName: string, primaryGraph: string, runtime: object }`

- [x] **Step 1: Write the failing test for project.json validation**

Add test in `tests/agents/agent-config.test.mjs`:

```javascript
test('Agent Config - validates project.json workspace profile', () => {
  const projectFile = path.join(AGENTS_DIR, 'project.json');
  assert.ok(fs.existsSync(projectFile), 'project.json must exist in .agents/');

  const config = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
  assert.ok(
    typeof config.name === 'string' && config.name.length > 0,
    'Must define config.name',
  );
  assert.ok(
    typeof config.displayName === 'string' && config.displayName.length > 0,
    'Must define config.displayName',
  );
  assert.ok(
    typeof config.primaryGraph === 'string' &&
      config.primaryGraph.startsWith('graphify-'),
    'Must define valid config.primaryGraph',
  );
  assert.ok(
    typeof config.runtime === 'object' && config.runtime !== null,
    'Must define config.runtime',
  );
  assert.ok(
    typeof config.runtime.moduleSystem === 'string',
    'Must define runtime.moduleSystem',
  );
  assert.ok(
    typeof config.runtime.uiFramework === 'string',
    'Must define runtime.uiFramework',
  );
  assert.ok(
    typeof config.runtime.surface === 'string',
    'Must define runtime.surface',
  );
  assert.ok(
    typeof config.runtime.bigNumber === 'boolean',
    'Must define runtime.bigNumber',
  );
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --test tests/agents/agent-config.test.mjs`
Expected: FAIL with `project.json must exist in .agents/`

- [x] **Step 3: Create `.agents/project.json` in FoE-Info and Forge-Hammer**

In FoE-Info:

```json
{
  "name": "foe-info",
  "displayName": "FoE-Info Extension",
  "primaryGraph": "graphify-foe-info",
  "runtime": {
    "moduleSystem": "esm",
    "bundler": "webpack-5",
    "uiFramework": "bootstrap-5",
    "domTooling": "native-web-api",
    "surface": "devtools-panel",
    "storage": "chrome-storage-local",
    "i18n": "custom-json-t",
    "bigNumber": true
  }
}
```

In Forge-Hammer:

```json
{
  "name": "forge-hammer",
  "displayName": "Forge-Hammer Extension",
  "primaryGraph": "graphify-forge-hammer",
  "runtime": {
    "moduleSystem": "vanilla-global",
    "bundler": null,
    "uiFramework": "bootstrap-4",
    "domTooling": "jquery",
    "surface": "content-injected-hud",
    "storage": "dexie-indexeddb",
    "i18n": "chrome-locales",
    "bigNumber": false
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --test tests/agents/agent-config.test.mjs`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add .agents/project.json tests/agents/agent-config.test.mjs
git commit -m "feat(agents): add project.json workspace identity profile"
```

---

### Task 2: Re-anchor `graph-knowledge-explorer` for Universal Host-Aware Autonomy

**Files:**

- Modify: `FoE-Info-Extension/.agents/agents/graph-knowledge-explorer.md`
- Copy: `Forge-Hammer/.agents/agents/graph-knowledge-explorer.md`
- Test: `tests/agents/agent-config.test.mjs`

**Interfaces:**

- Consumes: `.agents/project.json`
- Produces: Universal `graph-knowledge-explorer` system prompt that dynamically anchors to target codebase and treats secondary graphs as peer benchmarks.

- [x] **Step 1: Update `graph-knowledge-explorer.md` prompt**

Update prompt header and principles:

- Reframe from "FoE-Info ecosystem" to "Forge of Empires browser extension ecosystem".
- Instruct agent to read `.agents/project.json` (or inspect working directory) to identify the **Target Codebase**.
- Treat `primaryGraph` as the active codebase AST.
- Treat secondary extension graphs as **Peer / Reference Extensions** (for discovering features, examining design patterns, and checking compatibility).
- Treat `graphify-metadata-store` as **Game Truth**.
- Direct all findings output to `./graphify-out/findings/<topic>.md`.

- [x] **Step 2: Verify subagent frontmatter description length**

Ensure description remains $\le 150$ characters:
`description: Autonomous deep explorer traversing codebase ASTs, peer extension graphs, and game metadata.`

- [x] **Step 3: Copy to Forge-Hammer**

```bash
cp .agents/agents/graph-knowledge-explorer.md /var/home/kronikpillow/Projects/FoE-Info/forge-hammer/.agents/agents/
```

- [x] **Step 4: Run agent config tests in both repos**

Run in FoE-Info: `npm test`
Run in Forge-Hammer: `npm test`
Expected: 100% PASS

- [x] **Step 5: Commit**

```bash
git add .agents/agents/graph-knowledge-explorer.md
git commit -m "refactor(agents): make graph-knowledge-explorer host-aware"
```

---

### Task 3: Generalize Invariant Rules for Library-Aware & Multi-Repo Portability

**Files:**

- Modify: `FoE-Info-Extension/.agents/rules/bignumber-precision.md`
- Modify: `FoE-Info-Extension/.agents/rules/monolith-containment.md`
- Modify: `FoE-Info-Extension/.agents/rules/graphify.md`
- Modify: `FoE-Info-Extension/.agents/rules/workspace-structure.md`
- Copy to: `Forge-Hammer/.agents/rules/`
- Test: `tests/agents/*.test.mjs`

**Interfaces:**

- Consumes: None
- Produces: 4 generalized rules that work cleanly across both bundled and vanilla environments.

- [x] **Step 1: Update `bignumber-precision.md`**

Incorporate library-awareness:

- Clarify that InnoGames strictly uses ceiling rounding (`ROUND_CEIL`) for 1.9x Arc rewards.
- In modern bundled codebases with `bignumber.js` available (FoE-Info), use `bignumber.js`.
- In vanilla environments without BigNumber (Forge-Hammer), use native `Math.ceil()` with safe integer arithmetic and never inject unsupported `BigNumber` imports.

- [x] **Step 2: Update `monolith-containment.md`**

Incorporate dynamic criteria:

- Express the rule around the architectural threshold ($>250$ lines or high-degree hub nodes in AST) rather than hardcoding a single filename.
- Forbid inline logic additions to oversized files; mandate extracting helpers into modular files.

- [x] **Step 3: Update `graphify.md` & `workspace-structure.md`**

- Anchor to host repository root (`.` / `process.cwd()`) and `primaryGraph`.
- Use relative local paths (`graphify-out/findings/`).

- [x] **Step 4: Copy rules to Forge-Hammer**

```bash
cp .agents/rules/*.md /var/home/kronikpillow/Projects/FoE-Info/forge-hammer/.agents/rules/
```

- [x] **Step 5: Run tests in both repositories**

Run: `npm test` in FoE-Info
Run: `npm test` in Forge-Hammer
Expected: 100% PASS in both

- [x] **Step 6: Commit**

```bash
git add .agents/rules/
git commit -m "refactor(rules): generalize rules for multi-repo portability"
```

---

### Task 4: Final Verification & Ecosystem Parity Audit

**Files:**

- Verify: `FoE-Info-Extension` test suite
- Verify: `Forge-Hammer` test suite

- [x] **Step 1: Run FoE-Info complete verification**

Run: `npm test`
Expected: 145/145 passing tests

- [x] **Step 2: Run Forge-Hammer verification**

Run: `npm test`
Expected: 29/29 passing tests

- [x] **Step 3: Verify zero rule or subagent drift**

Run diff between `.agents/agents/` and `.agents/rules/` across both repositories:

```bash
diff -r .agents/agents/ /var/home/kronikpillow/Projects/FoE-Info/forge-hammer/.agents/agents/
diff -r .agents/rules/ /var/home/kronikpillow/Projects/FoE-Info/forge-hammer/.agents/rules/
```

Expected: Zero differences (complete parity).
