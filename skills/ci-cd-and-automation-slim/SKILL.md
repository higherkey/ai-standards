---
name: ci-cd-and-automation-slim
description: "Pipeline automation standards: shift-left quality gates, release-train promotion, verified deploys, secret and environment hygiene, runner budgets, and GitHub Actions specifics. Use when writing, editing, debugging, or reviewing CI/CD pipelines, GitHub Actions workflows, deploy jobs, or release automation."
---

# CI/CD and Automation (`/ci-cd-and-automation-slim`)

Standards for predictable, secure, affordable pipelines whose green check means the change actually works where it ships. The principles here apply to any CI system. For details, read the reference that applies:

- [references/github-actions.md](references/github-actions.md): GitHub Actions specifics (permissions, triggers, injection, concurrency, required checks, reusable workflows, and pitfalls). Read it before writing or editing any `.github/workflows/*.yml`.
- [references/deploy-targets.md](references/deploy-targets.md): notes on specific platforms (Render, Cloudflare Pages, Supabase/Neon, GitHub Pages, GitHub Releases/Packages). Read it before writing or debugging a deploy job.

---

## 1. Core Pipeline Invariants

- **Non-Interactive:** Every step runs with non-interactive flags (`npm ci`, `-y`, `--yes`, `--no-confirm`, `--accept-package-agreements`). A prompt on a runner is a hang that bills until timeout.
- **Fail Loudly:** HTTP calls fail on error status (`curl -fsS`, not `curl -s`). Scripts start with `set -euo pipefail` or the equivalent. A step that can't do its job must exit non-zero, not `echo` and succeed.
- **Bounded:** Every job declares a timeout well below the platform default (GitHub's is 6 hours). Size it at about 2–3× the normal duration.
- **Reproducible Toolchains:** Pin runtime and tool versions, and read them from one source shared by CI, local dev, and the deploy image (`.nvmrc`, `global.json`, `rust-toolchain.toml`, `engines`, or the Dockerfile `FROM`). Never use `version: latest` for CLIs that touch production. CI building on Node 22 while the Dockerfile ships Node 24 is a drift bug waiting to happen.
- **Lockfile Installs:** Use `npm ci`, `dotnet restore --locked-mode`, `cargo --locked`, or `pip install -r` with hashes, never `npm install`, in every job, including analysis jobs.
- **Least Privilege:** Grant the smallest token scope at the workflow level, and widen it per job only where needed (see the reference file).

---

## 2. Shift-Left Quality Gates

Order gates by cost so the cheap ones fail first:

```
PR ──> 1. Lint/Format ──> 2. Types ──> 3. Unit Tests ──> 4. Build ──> 5. Quality/Security ──> 6. Preview Deploy ──> Merge
```

1. **Static:** `eslint`, `prettier --check`, `dotnet format --verify-no-changes`, `cargo fmt --check`, `cargo clippy -- -D warnings`.
2. **Types:** `tsc --noEmit`, `dotnet build --no-incremental`.
3. **Tests:** The full suite with coverage, and zero ignored failures. Never skip, disable, or quarantine a test to get green.
4. **Build:** Produce the production artifact in the same configuration it ships with.
5. **Quality/Security:** SonarCloud Quality Gate (CI-driven analysis only: Automatic Analysis MUST stay OFF), plus `npm audit --audit-level=high` or the ecosystem equivalent.
6. **Preview:** Deploy each PR to an ephemeral preview where the platform supports it, and post or update a single sticky PR comment with the URL.

**PR Title Lint:** When PRs are squash-merged, the PR title becomes the commit, so lint it against Conventional Commits.

---

## 3. Branching & Release Train

- **One Direction:** Changes flow feature → integration (`dev`) → optional `staging` → `main`. Promotion PRs fast-forward or merge without new content. `main` must stay an ancestor of `dev`.
- **No Promotion-Only Commits:** Bot commits (cleanups, version bumps that edit files) land on the integration branch, never on `main` alone. Otherwise `main` diverges and every promotion needs a back-merge.
- **Guard Promotions:** Add a PR check on `staging` and `main` that fails if the merge result contains artifacts that must not ship (branch notes, debug flags, `.only` tests).
- **Hotfixes:** A hotfix into `main` is merged back into `dev` right away, and the same promotion guards apply to it.
- **SemVer from Commits:** Derive tags from Conventional Commits (`fix:` → patch, `feat:` → minor, `BREAKING CHANGE:` → major), with pre-release suffixes per tier (`-dev`, `-rc`).

---

## 4. Build Once, Promote the Artifact

- Build the artifact once, test that exact artifact, and deploy that exact artifact. Do not rebuild per environment when the build is environment-agnostic.
- Environment-specific build-time config (frontend `VITE_*` or Angular configurations) is the exception. In that case, build per tier from the same commit and lockfile, and keep runtime config out of the bundle where you can.
- Release artifacts are immutable, versioned, and checksummed (`SHA256SUMS.txt`), and container images are digest-pinned. Attach them to the release; CI run artifacts expire.

---

## 5. Deploys Must Be Verified

A deploy step that triggers a deploy and exits 0 proves nothing.

- **Wait for a Terminal State:** After triggering, poll the platform API until `live` or one of `failed`/`canceled`/`timeout`, inside one bounded loop in the job, and give each outcome a distinct exit code.
- **Smoke-Test the Result:** Hit a health endpoint, or one cheap real route, on the deployed URL, and fail the job if it's not healthy.
- **Migrations Before Code, Gated on Tests:** Run schema migrations in the deploy job after tests pass and before the new code goes live. Migrations must be backward compatible with the running version (see `/database-and-migrations-slim`).
- **Same Target as the Service:** Migrations and smoke tests must hit the exact database and URL the deployed service uses. Never fall back across tiers or providers (for example, staging silently using the dev database because a secret was empty).
- **Bind to the Platform's Contract:** Listen on the platform's injected `PORT` and host `0.0.0.0` unless the platform documents otherwise. Read the platform's docs before guessing.

### When a Deploy Breaks: Baseline First
1. Find the **last known-good deploy** (commit plus platform config) from the platform's deploy history.
2. Diff the failing state against it, code **and** config (`Dockerfile`, `render.yaml`, platform env vars, runtime version), before changing anything.
3. Change **one variable per attempt** and record each attempt and its result in branch notes. A series of PRs that flip port, host, and startup settings back and forth means you skipped step 2.
4. Add temporary diagnostics only with a removal plan, and remove them in a follow-up once the deploy is fixed.

---

## 6. Secrets & Environments

- **Environment-Scoped Secrets:** Prefer platform environments (`production`, `staging`, `development`, `preview`) that hold same-named secrets, over `*_PROD`/`*_DEV` suffixes chosen with ternaries. Put approval rules on production.
- **Missing Secret = Explicit Outcome:** If a required secret is empty, fail the job. Skip with a visible warning only for steps that are truly optional. Never substitute another tier's secret.
- **Never Log Secrets:** Mask derived values (`::add-mask::`) before use, never `echo` connection strings, and pass secrets to scripts through `env:`, not by interpolating them into the command text.
- **Untrusted Input Is Data:** Branch names, PR titles, and commit messages reach scripts only through environment variables (see the injection section of the reference).

---

## 7. Runner Budget & Speed

- **Cache Dependencies:** Use built-in setup-action caches or language caches (for example `rust-cache`).
- **Run Only What Changed:** Use path filters per deploy target, but read the required-check caveat in the reference.
- **Cancel Superseded Runs:** Cancel stale runs on PR and branch refs. Never cancel tags, deploys, or jobs that write to the repo.
- **Budget the Matrix:** Spend the matrix on platforms you ship to. On metered plans Windows runners bill 2× and macOS 10×. Put expensive suites (visual, e2e, cross-compile) on `main`, tags, or a manual trigger when a local harness already covers them.
- **Watch the Free-Tier Ceiling:** If a repo is near its monthly minute limit, write down the trade-off in the workflow header comment rather than silently dropping gates.

---

## 8. Branch Notes Integration

For repositories that use `/feature-tracking`:
- **Validate:** A PR check requires `/docs/branch-notes/<normalized-branch>-notes.md` for prefixed branches (`feat/`, `fix/`, …).
- **Prune on the Base Branch:** After a merge, a cleanup job deletes notes (keeping a `.gitkeep` if the directory is tracked) on the PR's base (integration) branch, so notes never ride a promotion to `main`. The job is restricted to that branch, runs with `concurrency` without cancel, rebases before pushing, and tags its commit `[skip ci]`.
- **Guard Promotions:** PRs into `staging` and `main` fail if notes are present in the merge result (§3).

---

## 9. Verifying Pipeline Changes

Workflow edits need runtime verification like any other code:
- **Lint:** Run `actionlint` (or the CI system's linter) on every changed workflow.
- **Run the Scripts:** Run step scripts locally against a throwaway clone or remote, including the no-op path (nothing to clean, no secret set).
- **Prove It in CI:** Use `workflow_dispatch` or a PR, then watch with one blocking call (`gh run watch <id> --exit-status`, `gh pr checks <n> --watch`). Never poll across turns.
- **Watch the First Real Run:** After merge, watch the first triggered run of a new or changed deploy or cleanup job, and record the result.

---

## 10. Verification Checklist

- [ ] Non-interactive flags everywhere. `curl -fsS` and `set -euo pipefail` in scripts.
- [ ] Every job has `timeout-minutes`, and token permissions are least-privilege.
- [ ] Toolchain versions are pinned and match the deploy image. Installs use the lockfile.
- [ ] Gates run Lint → Types → Tests → Build → Quality/Security, with no skipped tests.
- [ ] Deploys wait for a terminal state and smoke-test the live URL.
- [ ] Migrations and smoke tests target the same database and URL as the service, with no cross-tier fallback.
- [ ] Secrets are environment-scoped, passed via `env:`, never echoed. A missing secret fails or warns explicitly.
- [ ] Untrusted context (`head_ref`, titles) is passed via `env:`, never interpolated inline.
- [ ] Concurrency cancels stale PR runs and never cancels deploys, tags, or writers.
- [ ] Promotion guards are in place, bot commits land on the integration branch, and `main` stays an ancestor of `dev`.
- [ ] `actionlint` passes, scripts were run locally, and the first real run was watched.
