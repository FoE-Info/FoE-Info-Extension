# Project documentation

| Responsibility                         | Owner                                                      | State / update rule                                                    |
| -------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| Application overview and usage         | [Application](application.md)                              | Features, installation, usage and source layout                        |
| Architecture and module decisions      | [Architecture](architecture.md)                            | Current design; update when boundaries change                          |
| Observation and security boundaries    | [Security architecture](security-architecture.md)          | Intake, trust, integrations, retention, permissions and product policy |
| Vulnerability reporting                | [Security policy](../SECURITY.md)                          | Supported versions and private reporting                               |
| Direction, outcomes and sequencing     | [Roadmap](roadmap.md)                                      | Stable priorities and deferrals; update when direction changes         |
| Tracked work, acceptance and execution | [Tasks](tasks.md)                                          | Task IDs, scope, dependencies, status and completion evidence          |
| Enforced repository contracts          | [Repository contracts](repository-contracts.md)            | Implemented checks and debt policy                                     |
| Runtime diagnostics                    | [Debugging](debugging.md)                                  | Debug modes, synchronization, RPC filtering and panel behavior         |
| Browser investigation                  | [Browser debugging](browser-debugging.md)                  | Attachment, bounded passive collection and investigation procedures    |
| Commit coupling and delivery policy    | [Contributing](../CONTRIBUTING.md#completing-tracked-work) | Required gate, exact staging, completion evidence and skip rules       |
| Delivery record                        | PR description and commit body                             | Behavior, task ID, verification, artifact identity and limitations     |
| Release-facing changes                 | [Changelog](../CHANGELOG.md)                               | Release history; update for user-facing delivery                       |
| Store listing and release assets       | [Chrome Web Store](chrome-web-store.md)                    | Listing metadata and asset requirements                                |

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
