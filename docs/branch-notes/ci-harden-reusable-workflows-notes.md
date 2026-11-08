# Branch Notes: ci/harden-reusable-workflows

## 1. Discoveries & Deviations
- Added workflow-level `permissions: contents: read` to all five workflows; widened per job only (`contents: write` cleanup, `packages: write` publish).
- Added `timeout-minutes` to all non-`uses:` jobs (5 for notes workflows, 10 for release); not added to deprecated wrapper jobs (invalid on `uses:` jobs).
- Cleanup: concurrency per base branch (`cancel-in-progress: false`), `BASE` via `env:`, `git pull --rebase` before push, `set -euo pipefail`.
- Validation now lowercases normalized branch names.
- README callers pinned to `@v0.5.0`; wrappers still reference `@main` (left as instructed).
- Verification: actionlint 1.7.7 reports 0 errors in 5 files; cleanup run blocks tested against a temp bare remote (delete+push, clean-tree no-op rc=0, concurrent remote commit rebased and pushed); `npm test` passes.

## 2. Blockers & Risks (4a)
- None. `v0.5.0` tag must exist for README examples to resolve.

## 3. Quick Wins (4b)
- None.

## 4. Deferred Items (4c)
- Pin deprecated wrappers to a release tag instead of `@main`.
