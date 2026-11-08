# Branch Notes: docs/branch-notes-prune-target

## 1. Discoveries & Deviations
- `feature-tracking` said notes are "Cleared from `main`", and `ci-cd-and-automation-slim` said the cleanup commits "when merging into `main`". The reusable `clean-branch-notes.yml` actually prunes the PR's base branch (`base-branch: ${{ github.event.pull_request.base.ref }}` in the README example).
- In a `dev` → `main` release train, pruning on `main` leaves a bot commit only on `main`, so `main` stops being an ancestor of `dev` and needs back-merges. Found while fixing higherkey/board-game-hub#220.
- Reworded both lines to say notes are pruned on the PR's base (integration) branch right after merge, before any promotion.
- Verified: `npm test` passes (36/36). Text-only change to two skill lines.

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- None.

## 4. Deferred Items (4c)
- This repo merges straight into `main` but does not call its own `clean-branch-notes.yml`; `docs/branch-notes/` on `main` holds five merged notes files.
- `clean-branch-notes.yml` pushes without `git pull --rebase`, so a push that lands on the base branch while it runs makes the cleanup push fail.
- Regenerate `known-hashes.json` after the next release tag (`node scripts/build-known-hashes.js`).
