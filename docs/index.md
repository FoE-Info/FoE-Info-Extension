# Project documentation

Project guides live in `docs/` and use lowercase kebab-case names. Conventional
repository entrypoints remain at root: README.md, AGENTS.md, CONTRIBUTING.md,
SECURITY.md, CHANGELOG.md and LICENSE.md. Keep one owner for each kind of truth;
link to it instead of copying status or policy into another document.

| Responsibility                         | Owner                                                      | State / update rule                                                |
| -------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Navigation and setup                   | [README](../README.md), [agent entrypoint](../AGENTS.md)   | Entry points; link detailed procedures                             |
| Architecture and module decisions      | [Architecture](architecture.md)                            | Current design; update when boundaries change                      |
| Observation and security boundaries    | [Security](../SECURITY.md)                                 | Current policy; overrides proposed features                        |
| Direction, outcomes and sequencing     | [Roadmap](roadmap.md)                                      | Stable priorities and deferrals; update when direction changes     |
| Tracked work, acceptance and execution | [Tasks](tasks.md)                                          | Task IDs, scope, dependencies, status and completion evidence      |
| Harness inventory                      | [Harness assessment](harness-assessment.md)                | Assessment; future work links to tasks                             |
| Enforced repository contracts          | [Repository contracts](repository-contracts.md)            | Implemented checks and debt policy                                 |
| Validation design and commands         | [Validation harness](validation-harness.md)                | Implemented harness and stated limitations                         |
| Diagnostics and evidence collection    | [Debugging](debugging.md)                                  | Current procedures and verification artifact semantics             |
| Proposed runtime correlation           | [Runtime evidence](runtime-evidence.md)                    | Design proposal; implementation status belongs in tasks            |
| Commit coupling and delivery policy    | [Contributing](../CONTRIBUTING.md#completing-tracked-work) | Required gate, exact staging, completion evidence and skip rules   |
| Delivery record                        | PR description and commit body                             | Behavior, task ID, verification, artifact identity and limitations |
| Release-facing changes                 | [Changelog](../CHANGELOG.md)                               | Release history; update for user-facing delivery                   |
| Store listing and release assets       | [Chrome Web Store](chrome-web-store.md)                    | Listing metadata and asset requirements                            |

## Document lifecycle

Record design decisions in their owning guide first. Update task scope,
acceptance criteria and execution steps next; revise the roadmap when direction
or sequencing changes. After validation, record the result
and remaining limitations alongside the tracked task and in the delivery
record. Do not mark a task complete solely because its code exists.

Temporary execution plans are justified only for coordination that does not fit
under a tracked task. Link them there, give them an explicit status, and
remove them after reconciling decisions and remaining work. Superseded plans and
compatibility task pointers are removed; Git history retains historical content.
New guides use descriptive names such as `feature-design.md`, not dated audit
or generic TODO filenames. A new directory or ledger needs a concrete purpose.

## Artifact ownership

Verification capture writes the latest run to `build/verify-evidence/`: its
manifest identifies the run and source digest; stage logs and JUnit reports
support the result. These local artifacts are replaced on rerun and removed by
cleaning, so a delivery record must retain the run identity and publish or archive
artifacts when durable review needs them. A local path alone is not a durable
artifact link. CI artifacts use the identities documented in [debugging](debugging.md).

Release bundles are identified by version/tag and artifact name. Generated
Graphify snapshots are shared according to [contribution policy](../CONTRIBUTING.md#rebasing-and-the-tracked-graph);
raw memories, reflections, captures, secrets and private transcripts remain local.
Verified Graphify conclusions belong in the relevant guide or task, with
structural evidence distinguished from runtime proof.
