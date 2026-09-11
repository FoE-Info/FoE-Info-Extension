# Plan: Curated Git History Reconstruction (from Baseline `8c681d1` to `HEAD`)

**Date**: 2026-09-12  
**Harness**: OpenCode Execution Task  
**Target Branch**: `curated-history` $\to$ `development`  
**Baseline Anchor**: `8c681d1faa1f87930ecae3ffc3f9008ec49fe164` (Frozen v1 pre-agentic snapshot)  
**Safety Anchor**: `backup/full-history-2026-09-12` (Preserved full unedited history)  
**Backup Tags**: `backup/v0.0.833`, `backup/v0.0.834`

---

## 1. Objective & Invariants

Reconstruct a clean, professional, and chronological sequence of **13 milestone commits** representing the architectural journey from the original pre-agentic baseline (`8c681d1`) up to modern `HEAD`, eliminating 282 noisy micro-commits, test churn, and merge conflicts.

### Critical Invariants:

1. **Zero Code Regression**: At `HEAD`, all 849 tests must pass and `npm run verify` must exit 0.
2. **Documentation Cleanup**:
   - Archive completed 2026-09-07/08 plans and specs into `docs/archive/plans/` and `docs/archive/specs/`, keeping `docs/plans/` clean and focused on living roadmaps.
   - Archive completed audit logs (`docs/agent-ecosystem-audit.md`, `docs/reviews/`) into `docs/archive/`.
   - Ensure all markdown links remain 100% valid with 0 broken links in `node --test tests/agents/agent-config.test.mjs`.
3. **Repository Weight Optimization (`docs/har/`)**:
   - `docs/har/` currently contains 1.02 GB of binary network dumps (e.g. `login.har` 211MB, `visit-JonSunset.har` 171MB).
   - Drop the unused ~800MB HAR files or replace the 3 test-referenced visit HARs with lightweight JSON fixtures in `tests/fixtures/`, shrinking the repository history from >1.1 GB to <30 MB.
4. **Release Tree Parity**: The tree at tag `v0.0.833` and `v0.0.834` must be identical to the respective backup tags (`git diff v0.0.833 backup/v0.0.833` empty; `git diff v0.0.834 backup/v0.0.834` empty).
5. **WebStore Zip Integrity**: Existing `.zip` packages in `build/` remain untouched.
6. **Structured Commit Messages**: Every commit must strictly follow the `/unslop-commit` standard:
   - Subject line: `<type>(<scope>): <summary>` ($\le 72$ chars, aim $\le 50$)
   - Commit body: 2 to 4 concise bullet points detailing changes and technical rationale
   - Every line in the body strictly wrapped at $\le 72$ chars.

---

## 2. The 13 Curated Milestone Commits

| #      | Milestone Target Commit in Backup | Curated Commit Message                                                          | Tag Target    |
| :----- | :-------------------------------- | :------------------------------------------------------------------------------ | :------------ |
| **0**  | `8c681d1`                         | _(Existing root)_ `8c681d1 Initial commit / v1 baseline`                        | —             |
| **1**  | `e1d5a7b` / early passive fix     | `fix(security): restore passive observation in network interceptor`             | —             |
| **2**  | `34e2c8a` / metadata              | `feat(state): implement dynamic MetadataStore and entity definitions cache`     | —             |
| **3**  | `49f8712` / calc math             | `refactor(calc): isolate pure calculation engines and BigNumber math`           | —             |
| **4**  | `804d9a1` / services              | `refactor(services): extract decoupled domain RPC handlers from monoliths`      | —             |
| **5**  | `e0bc129` / v0.0.833              | `chore(release): bump version to 0.0.833`                                       | `v0.0.833`    |
| **6**  | `39e3b10` / devtools & panels     | `feat(ui): implement dynamic context view filtering and fast DevTools teardown` | —             |
| **7**  | `901f4c2` / gbg & panels          | `refactor(ui): extract GBG and Great Building panel renderers`                  | —             |
| **8**  | `ad045c6` / index decomp          | `refactor(index): decompose index.js monolith into UI and runtime bindings`     | —             |
| **9**  | `bf83230` / v0.0.834              | `chore(release): bump version to 0.0.834`                                       | `v0.0.834`    |
| **10** | `7b5ebf1` / safety fixes          | `fix(safety): resolve resource name lookup and duplicate rpc handlers`          | —             |
| **11** | `61d00f1` / core monoliths        | `refactor(core): decompose legacyBridge and CityMapEntityProcessor`             | —             |
| **12** | `ec93ed0` / feature parity        | `feat(calc): add Blue Galaxy economic ranking and date engine Intl tokens`      | —             |
| **13** | `10c638e` / current HEAD          | `docs(rules): mandate structured commit bodies for non-trivial changes`         | `development` |

---

## 3. Step-by-Step Reconstruction Procedure

Execute in workspace root:

```bash
# Step 1: Create fresh branch from baseline
git checkout -b curated-history 8c681d1faa1f87930ecae3ffc3f9008ec49fe164

# Step 2: For each milestone 1..13, checkout the milestone snapshot and commit with structured body:

# Example for Milestone 10 (Safety fixes):
git checkout 7b5ebf1 -- .
git commit -m "fix(safety): resolve resource name lookup and duplicate rpc handlers" \
           -m "- fix D1: add globalThis.ResourceNames fallback for 1-arg calls" \
           -m "- fix D2: remove duplicate RPC registrations in legacyBridge" \
           -m "- remove dead webRequestFilter.js and add typecheck to verify"

# Example for Milestone 11 (Monoliths):
git checkout 61d00f1 -- .
git commit -m "refactor(core): decompose legacyBridge and CityMapEntityProcessor" \
           -m "- extract CityEntityHarvestCalculator (processor 657L -> 254L)" \
           -m "- extract 4 modular route tables under protocol/routes/" \
           -m "- thin legacyBridge from 831L to 60L" \
           -m "- decouple VisitedCityStatsCalculator from CastleSystemService"

# Example for Milestone 12 (Feature parity):
git checkout ec93ed0 -- .
git commit -m "feat(calc): add Blue Galaxy economic ranking and date engine Intl tokens" \
           -m "- add configurable FP and Goods economic weights to BlueGalaxyCalculator" \
           -m "- add native Intl tokens (MMM, MMMM, ddd) and formatRelativeTime" \
           -m "- migrate 30 residual raw toLocaleString call sites"

# Example for Milestone 13 (Current HEAD):
git checkout backup/full-history-2026-09-12 -- .
git commit -m "docs(rules): mandate structured commit bodies for non-trivial changes" \
           -m "- require 2-4 concise bullets detailing changes and technical rationale" \
           -m "- document worktree orchestration pattern in antigravity-interop skill" \
           -m "- enforce strict 72-char line limit per body line in commit-msg hook"

# Step 3: Re-point release tags to exact matching trees
git tag -f v0.0.833 <sha-of-milestone-5>
git tag -f v0.0.834 <sha-of-milestone-9>

# Step 4: Verification
git diff curated-history backup/full-history-2026-09-12  # Must be empty!
git diff v0.0.833 backup/v0.0.833                      # Must be empty!
git diff v0.0.834 backup/v0.0.834                      # Must be empty!
npm test                                               # All 849 tests pass
npm run verify                                         # 5-stage gate exit 0

# Step 5: Fast-forward development to curated-history
git checkout development
git reset --hard curated-history
```
