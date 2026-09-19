---
name: dynamic-workflow
description: 'Scaffold for dynamic workflow (fan-outs, adversarial waves).'
---
# Dynamic Workflow Skill (Scaffold)

This skill is a scaffold for the dynamic workflow pattern. It is produced by the Curator to be loaded on-demand for a specific task. The Curator fills in task-specific details (unit of work, deterministic layer, judgment layer) when generating a concrete workflow skill from this template.

## Core Pattern

Runs large fan-out work as a workflow: the plan, the loop and every intermediate result live in a script and on disk, so the parent's context holds only verified results. Covers one-shot fan-outs, adversarial convergence (attempts + refuters), and multi-wave campaigns that integrate dozens of worker branches. It does not make `delegate_task` durable across restarts; that is the kanban swarm's job.

## When to Use

Reach for it when the unit of work is clear (a file, an endpoint, a record) and there are more units than one context can hold. Skip it for under ~10 units or for serial chains. For a refactor or fix campaign on hermes-agent itself, load `hermes-agent` (the dev workflow) alongside; this skill owns the fan-out shape.

## Prerequisites

- `delegate_task` available and `delegation.max_concurrent_children` sized for the wave (default 10; the runtime rejects a `tasks=[]` larger than that with a clear error rather than queueing). `delegation.max_spawn_depth >= 2` only if children must fan out themselves.
- A writable run directory resolved from the terminal environment's temp dir (`$TMPDIR`, else the platform temp dir). Never a literal `/tmp`: Termux has no `/tmp`, native Windows breaks on it. Use `<tmp>/wf_<name>_<uuid>/`, unique per run, so an interrupted earlier run cannot leave stale outputs to be misread.
- `execute_code` for the deterministic layer (only `web_search`, `web_extract`, `read_file`, `write_file`, `search_files`, `terminal`, `patch` exist inside it).

## How to Run

Two layers, split by a real capability boundary:

| | Layer A - `execute_code` script | Layer B - `delegate_task` batch |
|

|---|---|
| Use for | DETERMINISTIC work: fetch N URLs, parse N files, run N commands, template N outputs, build manifests, merge outputs | LLM-JUDGMENT work: evaluate outputs, refute attempts, integrate waves, apply qualitative checks |
| Determinism | Pure functions, no external state beyond inputs | Requires LLM judgment, subject to variability |
| Retry | Safe to retry identically | May need different prompts or temperatures per attempt |
| Artifacts | Intermediate files in run directory | Final verified outputs only |

## Unit Decomposition

The Curator must define a manifest file (e.g., `units.json`) listing all work units. Each unit contains:
- `id`: Unique identifier
- `input`: Data needed for processing (file path, API endpoint, record key)
- `metadata`: Optional context for Layer A/B scripts

Example manifest structure:
```json
[
  {"id": "unit_001", "input": {"file": "src/api/v1/users.py"}, "metadata": {}},
  {"id": "unit_002", "input": {"endpoint": "/api/v2/posts"}, "metadata": {"priority": "high"}}
]
```
Layer A script reads the manifest, processes each unit, and writes unit-specific outputs to the run directory. Layer B consumes these outputs for verification or integration.

## Procedures

### One-shot Fan-out
1. Curator defines manifest of N units
2. Layer A script processes all units in parallel via `delegate_task` (each unit -> one subagent)
3. Layer B script verifies all outputs meet criteria (e.g., checksum, schema)
4. Parent collects verified results from run directory

### Adversarial Convergence
1. Curator defines manifest and refuter criteria
2. Layer A script generates attempts (e.g., code fixes, data extractions)
3. Layer B script runs refuters (e.g., tests, validators) on each attempt
4. If any refuter fails, Loop back to Step 2 with feedback until convergence or max attempts
5. Parent collects converged results

### Campaign Shape (Multi-wave)
1. Curator defines wave manifest (each wave has different unit set or processing logic)
2. For each wave:
   a. Run One-shot Fan-out or Adversarial Convergence procedure
   b. Wave output becomes input for next wave
3. Parent integrates final wave output

## Pitfalls

- **Stale outputs**: Never reuse run directory between runs; always use `<tmp>/wf_<name>_<uuid>/` to avoid mixing results from interrupted runs.
- **Manifest drift**: If units change during execution (e.g., files added), regenerate manifest before starting or use idempotent unit processing.
- **Layer A non-determinism**: Avoid external calls (e.g., `time.time()`, random numbers) in Layer A scripts; they break retry assumptions.
- **Layer B inconsistency**: Refuters must be deterministic for adversarial convergence; varying thresholds cause infinite loops.
- **Wave dependency**: Ensure wave N outputs are fully verified before wave N+1 starts; partial verification causes cascading errors.
- **Subagent limits**: Do not exceed `delegation.max_concurrent_children`; batch large manifests into multiple waves.

## Verification Checklist

- [ ] Manifest file exists and is valid JSON/CSV
- [ ] Layer A script only uses allowed deterministic tools (`web_search`, `web_extract`, `read_file`, `write_file`, `search_files`, `terminal`, `patch`)
- [ ] Layer B script handles missing unit outputs gracefully (skip or fail loudly)
- [ ] Run directory pattern uses `$TMPDIR` and includes UUID for uniqueness
- [ ] Adversarial convergence has max attempt guardrail (e.g., 5 attempts)
- [ ] Campaign waves have explicit input/output contracts
- [ ] Parent script cleans up run directory on success (optional) or preserves on failure for debugging
- [ ] All subagent outputs are verified before parent considers work complete
- [ ] Error handling: Layer A/B scripts exit non-zero on failure; parent checks exit codes
- [ ] Manifest unit count matches expected work volume (spot-check sample)
