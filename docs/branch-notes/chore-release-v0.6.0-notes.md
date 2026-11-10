# Branch Notes: chore/release-v0.6.0

> Base: `main` · Delivery: PR into `main`, then tag `v0.6.0`

## 1. Discoveries & Deviations
- Bump `package.json` to 0.6.0 and pin README reusable-workflow examples to `@v0.6.0`, so callers get the hardened cleanup from #24 (`v0.5.0` predates it).
- Release contents: CI/CD standard (#23), workflow hardening (#24), and decision-models guidance (#25) if merged first.
- Verified: `npm test` passes; `npm pack --dry-run` lists the new `ci-cd-and-automation-slim/references/` files.

## 2. Blockers & Risks (4a)
- None. The tag must point at this PR's merge commit, so the pinned README examples resolve to workflows that contain the fixes.

## 3. Quick Wins (4b)
- None.

## 4. Deferred Items (4c)
- After tagging: run `node scripts/build-known-hashes.js` and commit `chore: Record v0.6.0 known hashes and bases` on `main`.
- This repo still doesn't prune its own merged branch notes on `main`.
