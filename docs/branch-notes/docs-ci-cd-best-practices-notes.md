# Branch Notes: docs/ci-cd-best-practices

> Base: `main` · Delivery: PR into `main`

## 1. Discoveries & Deviations
- Sources: Board Game Hub (12 workflows, the Render deploy fixes #198–#216, branch-notes prune and guard #220/#221, Neon/Supabase migration fixes), Kipu (build-once artifact promotion, PR previews), Prismatic Defenders (minute budget, timeouts, disk reclaim, release `contents: write` 403, checksummed release assets), Jitsi Dashboard (matrix, promotion check), logos-ast-schemas (Pages chain). Project Logos repos have no CI workflows yet.
- Rewrote `ci-cd-and-automation-slim/SKILL.md` around general principles (131 lines). Moved GitHub Actions specifics to `references/github-actions.md` and per-platform deploy notes to `references/deploy-targets.md`, following the existing `references/` pattern.
- New principles drawn from those projects: deploys must wait for a terminal state and smoke-test; when a deploy breaks, diff against the last known-good baseline before changing anything; no cross-tier or cross-provider secret fallback; `main` stays an ancestor of `dev`; promotion guards; untrusted context passed via `env:`; the required-check vs. path-filter trap; `GITHUB_TOKEN` pushes don't trigger workflows; scheduled workflows are disabled after 60 days without activity.
- Verified: `npm test` 36/36. A real `ai-standards-sync -a all -y` into a scratch repo shipped `SKILL.md` and both `references/*.md` to `.claude/` and `.agents/`.

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- Updated the `plan-review` routing row and the README skill entry to match the new scope.

## 4. Deferred Items (4c)
- This repo's own workflows now fall short of the standard: `clean-branch-notes.yml` (no `concurrency`, no `git pull --rebase` before push, `default: 'main'`), no `timeout-minutes` anywhere, and README callers pin `@main` instead of a release tag.
- Board Game Hub gaps the new standard flags: `--branch=${{ github.head_ref }}` inline in `deploy-frontend-cloudflare.yml`; Render trigger `curl -s` with no live-state wait (the `monitor-deploy.js` script exists but isn't wired in); `sonar.yml` uses `npm install`; CI on Node 22 vs. a Node 24 Docker image; `supabase/setup-cli` with `version: latest`; no job timeouts.
- Kipu: no `permissions:` block; Node 20 in CI.
- Regenerate `known-hashes.json` after the next release tag.
