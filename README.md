# Standardized AI Workflows & Rules

This repository contains the centralized source of truth (SSOT) for personal AI rules and skills. It defines development standards, review workflows, and tracking mechanisms for agentic coding assistants. One portable set of skills and rules is synced to each supported tool through pluggable **targets**: currently `antigravity` and `claude` (Claude Code).

---

## Directory Structure

- `AGENTS.md`: Global behavior guidelines, engineering standards, and execution constraints (tool-neutral).
- `targets/`: Per-tool adapters and extras (e.g. the Claude `rails-*` subagents).
- `bin/`: The `ai-standards-sync` CLI.
- `skills/`: 24 production-grade, token-efficient engineering skills:
  - **Workflow & Delivery:**
    - `resolve-issue/`: Goal-driven autonomous issue resolution with upfront PR vs. Merge triage, runtime verification, and manual step disclosure.
    - `plan-review/`: Audits implementation plans for errors/opportunities and domain skill alignment before coding.
    - `peer-review-with-quality/`: Senior pre-commit quality gate (surgical diffs, 100% tests, SonarCloud, branch notes reconciliation) with dynamic skill selection.
    - `feature-tracking/`: Maintains branch-level progress logs in `/docs/branch-notes/`.
    - `consolidate-branch-notes/`: Reconciles branch notes against the diff and produces a PR-ready summary.
    - `subagent-delegate-on-rails/`: Task decomposition and subagent dispatch with strict rails and fast/standard/deep model tiers.
    - `create-github-issue/`: Issue creation guidelines with project board integration and REST API relationships.
    - `git-branch-cleanup/`: Synchronizes local branch list by pruning remote-deleted branches (manual invocation only).
    - `github-commands/`: Non-interactive `gh` CLI and REST API cheatsheet.
    - `decision-models/`: Optional System One decision models (d1, elephant, Jev, pplx-decider) via OpenRouter for cheap yes/no, choice, and score judgments; needs `OPENROUTER_API_KEY` (a ~$5 credit goes a long way).
  - **Reasoning, Testing & Debugging:**
    - `doubt-driven-development-slim/`: 5-step adversarial evaluation cycle for non-trivial decisions.
    - `test-driven-development-slim/`: Red-Green-Refactor loop and boundary-only mocking.
    - `debugging-and-error-recovery-slim/`: Scientific debugging cycle, falsifiable hypotheses, and regression guards.
    - `testing-workflow/`: Unit and integration test execution and verification guidelines.
    - `sonarqube-review/`: SonarCloud quality gate compliance and static analysis triage.
  - **Frontend & Web Quality:**
    - `frontend-ui-engineering-slim/`: Modular architecture, zero `!important`, zero inline styles, spacing and density budgets, layout stability; `scripts/density-check.mjs` measures first-screen whitespace with Playwright.
    - `accessibility-and-a11y-slim/`: WCAG 2.2 AA compliance, semantic HTML, keyboard focus trapping.
    - `longest-contentful-paint-slim/`: Core Web Vitals LCP optimization (TTFB < 800ms, priority hinting, critical CSS).
    - `design-review/`: Comprehensive UI/UX, aesthetics, copy, and layout verification.
  - **Backend, Data & Infrastructure:**
    - `api-and-interface-design-slim/`: RFC 7807 problem details, idempotency keys, boundary validation, and pagination.
    - `database-and-migrations-slim/`: Zero-downtime expand/contract migrations, non-blocking indexing, connection pool safety.
    - `security-and-hardening-slim/`: OWASP Top 10 defense, parameterized queries, IDOR defense, and secret hygiene.
    - `performance-optimization-slim/`: Measurement-first profiling, INP yielding, hot-path optimization, memory leak prevention.
    - `ci-cd-and-automation-slim/`: Pipeline invariants, release-train promotion, verified deploys, secret hygiene, runner budgets; `references/` holds GitHub Actions and deploy-target (Render, Cloudflare Pages, Supabase/Neon, GitHub Pages) specifics.

---

## 1. Setup in Projects You Own/Lead

### Option A: NPM Package via GitHub Packages (Recommended for Node Projects)
1. **Configure npm registry for `@higherkey` scope:**
   Add a `.npmrc` file at the root of your project:
   ```ini
   @higherkey:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```
   *(Note: GitHub Packages requires a token with the `read:packages` scope, even for public packages. Locally, add the scope with `gh auth refresh -h github.com -s read:packages` and set `NODE_AUTH_TOKEN` from `gh auth token`; in GitHub Actions, use `secrets.GITHUB_TOKEN` with `packages: read`. The git-tag install below needs no token.)*

2. **Install the package:**
   ```bash
   npm install --save-dev @higherkey/ai-standards
   ```
   *(Alternative without .npmrc: `npm install --save-dev github:higherkey/ai-standards#v0.5.0`)*
3. **Choose your target(s)** and sync (see [Targets](#targets) below):
   ```bash
   npx ai-standards-sync --agent claude
   ```
4. **Configure scripts** in your `package.json` to automate rules updates on installation:
   ```json
   "scripts": {
     "sync-ai": "ai-standards-sync",
     "postinstall": "ai-standards-sync"
   }
   ```
   *Note: The CLI tool runs as a dependency-free copy helper. If run during postinstall with no target chosen, it warns and exits 0. It also fails safe (warn but exit 0) in CI/CD environments if permission errors occur.*
5. **Initialize & Commit:** Run `npm run sync-ai` once, then commit the generated folders to Git.
6. **Integrate localization:** Add project-specific rules in the right place for your target (see the per-target outputs below). Both rules files are managed like any other file (see [Upgrades and local edits](#upgrades-and-local-edits)), so your edits survive upgrades; for Claude, still prefer keeping local rules in `CLAUDE.md`.

#### Instruction for AI Agents
If you are an AI assistant tasked with setting up or updating these standards in this project, do not write custom download scripts. Instead, run the help menu to view instructions and verify the setup:
```bash
npx ai-standards-sync --help
```

### Option B: Non-Node Projects
Run the CLI straight from GitHub with `npx` (no `package.json` required):
```bash
npx github:higherkey/ai-standards --agent <name>
```
Then check the generated folders into Git. (`degit` is not supported because it cannot compose the per-target rules file.)

---

## Targets

The CLI has no default target. Choose one explicitly:

```bash
npx ai-standards-sync --agent claude
npx ai-standards-sync --agent antigravity
npx ai-standards-sync --agent claude,antigravity
npx ai-standards-sync --agent all --yes
```

- `--agent <name[,name]|all>` (alias `-a`) selects targets. `all` expands to every registered target and requires confirmation: a prompt when interactive, or `--yes`/`-y` when not.
- **Persist your choice** in `.ai-standards.json` at the project root:
  ```json
  { "agents": ["claude"] }
  ```
- Resolution order: `--agent`, then `.ai-standards.json`, then legacy detection, then an interactive prompt (TTY only; saves your answer to `.ai-standards.json`). If none applies the CLI errors and names `--agent`; under a `postinstall` hook it only warns and exits 0.
- **Legacy installs:** a project with an existing `.agents/skills/plan-review/SKILL.md` is auto-detected as `antigravity`.

### Outputs per target

| Target | Skills | Rules | Extras |
|---|---|---|---|
| `antigravity` | `.agents/skills/` | `.agents/AGENTS.md` (core `AGENTS.md` plus an Antigravity adapter). Updated on upgrade like any managed file; local edits are merged or kept. Put local rules in this file. | none |
| `claude` | `.claude/skills/` | `.claude/rules/ai-standards.md` (core plus a Claude adapter). Updated on upgrade like any managed file. Put local rules in `CLAUDE.md`, which loads alongside it. | `.claude/agents/rails-*.md` subagents |

- Each target writes `.ai-standards-manifest.json` in its install root (`.agents/` or `.claude/`) listing what it installed (with content hashes). Only files listed there are ever updated or pruned; your own skills, agents, and settings are never touched.
- Personal `~/.claude/skills` entries shadow same-named project skills in Claude Code.

### Global (user-level) install

```bash
npx ai-standards-sync --global --agent claude,antigravity
```

`--global` (`-g`) installs under your home directory instead of the project (`--target` overrides the base, handy for testing). The choice is read from and saved to `~/.ai-standards.json`.

| Target | Skills | Rules | Extras |
|---|---|---|---|
| `claude` | `~/.claude/skills/` | `~/.claude/rules/ai-standards.md` | `~/.claude/agents/rails-*.md` (`CLAUDE.md` and `settings.json` are never touched) |
| `antigravity` | `~/.gemini/config/skills/` | `~/.gemini/config/rules/AGENTS.md` | `~/.gemini/config/skills.json` gets a `{ "path": "skills" }` entry if missing (other entries kept) |

- Manifest, `.ai-standards-base/` snapshots, backups and `.ai-standards-new` sidecars live under each root, next to the real files.
- A personal skill with the same name as a packaged one is protected: an existing unmanaged file that differs counts as edited, so it is kept (with a sidecar) or prompted for, never silently overwritten.
- **Precedence (Claude Code):** personal skills shadow same-named project skills, and rules in `~/.claude/rules/` load in every project alongside the project's own files.
- **When to use which:** global for your own machine; project installs for team repos and CI, where everyone should get the same committed standards.

### Upgrades and local edits

Every managed file (each file under a skill, Claude subagents, the rules file) is tracked by content hash (line endings and BOM ignored) and a snapshot of what was last installed in `.ai-standards-base/` inside the install root. On sync:

- **Unedited** files are overwritten with the new version. Files from older releases that predate the snapshot are recognised through `known-hashes.json`.
- **Edited, package unchanged:** your file is kept.
- **Edited and the package changed:** a 3-way merge (`git merge-file`) is applied when it is clean; on conflicts, or when there is no snapshot, your file is kept and the package version is written beside it as `<file>.ai-standards-new`. Interactive runs ask instead (merge / keep mine / new version / conflict markers, with `!` to apply the answer to the remaining files of that kind).
- **Deleted locally:** not restored non-interactively (you get a warning); interactive runs ask.
- **Removed from the package:** deleted if unedited; if you edited it, it is kept (and no longer managed).
- Before a user-edited file is replaced (new version, merge, conflict markers, `--force`), a copy goes to `.ai-standards-backup/<path>`.
- `--force` takes the package version for every edited file (with backups) without prompting.

In projects you own, commit `.ai-standards-base/` so teammates share the merge base, and ignore `.ai-standards-backup/` and `*.ai-standards-new`. Maintainers regenerate `known-hashes.json` after tagging a release with `node scripts/build-known-hashes.js`.


---

## 2. Setup in Projects You Contribute To (Local-Only)

If you are contributing to an external codebase and want to use these workflows without polluting the repository:
1. Run the sync as above (or maintain the skills globally on your machine).
2. Exclude the managed paths in that clone's `.git/info/exclude`. This keeps them out of `git status` without touching the repo's `.gitignore`.

Branch notes are committed by default. Exclude them only in repos owned by someone else. For a repo where you are a primary contributor, decide per repo with the owner: if they want your branch notes in history, skip the exclude for that clone.

> [!WARNING]
> Don't put these paths in a global excludes file (`core.excludesfile`). A global entry applies to every repo, including your own. There, `git add -A` silently skips branch notes and the branch-notes PR check fails.

#### Per-Clone Exclude Setup
Add these lines to `.git/info/exclude` in each external clone:
```text
/.agents/
/.claude/skills/
/.claude/agents/rails-*.md
/.claude/rules/ai-standards.md
/.claude/.ai-standards-manifest.json
/.claude/.ai-standards-base/
/.claude/.ai-standards-backup/
*.ai-standards-new
/.ai-standards.json
/docs/branch-notes/
/task.md
/walkthrough.md
```
Never exclude all of `.claude/`, since it holds your own settings. To check a path, run `git check-ignore -v docs/branch-notes/x-notes.md`; no output means it will be committed.

---

## 3. CI/CD Pipeline Integration (GitHub Actions)

We provide centralized reusable GitHub Actions workflows to enforce and manage branch notes in your projects. Pin callers to a release tag (not `@main`) and bump the tag when you upgrade.

### A. Branch Notes Validation Workflow (`validate-branch-notes.yml`)
Enforces that every pull request opened from a conventionally prefixed branch (e.g., `feat/`, `fix/`) contains its mandatory branch notes document under `docs/branch-notes/[normalized-branch]-notes.md` before it can be merged.

Create `.github/workflows/validate-branch-notes.yml` in your repository:
```yaml
name: Validate Branch Notes
on:
  pull_request:
    branches: [main, dev]

jobs:
  validate:
    uses: higherkey/ai-standards/.github/workflows/validate-branch-notes.yml@v0.6.0
```

### B. Branch Notes Cleanup Workflow (`clean-branch-notes.yml`)
Automatically deletes branch notes files from the codebase upon a successful pull request merge, keeping repository history clean. It also removes a leftover `docs/traces/` directory as a migration aid.

Create `.github/workflows/clean-branch-notes.yml` in your repository:
```yaml
name: Clean Branch Notes
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    if: github.event.pull_request.merged == true
    permissions:
      contents: write
    uses: higherkey/ai-standards/.github/workflows/clean-branch-notes.yml@v0.6.0
    with:
      base-branch: ${{ github.event.pull_request.base.ref }}
    secrets: inherit
```

> `validate-trace.yml` and `clean-traces.yml` are deprecated wrappers that call the workflows above; migrate callers to the new names.

---

## 4. Contributing & Adding Custom Skills

To define a new specialized AI skill workflow:
1. Create a new directory under `skills/<your-skill-name>/`.
2. Inside that directory, create a `SKILL.md` file.
3. The `SKILL.md` must include YAML frontmatter with `name` and `description` (end the description with a "Use when ..." clause so tools can pick the skill):
   ```yaml
   ---
   name: your-skill-name
   description: "Brief description of what this skill does. Use when <trigger>."
   ---
   ```
4. Keep the body of the `SKILL.md` file under 250 lines. Place verbose checklists, references, or code templates under a sub-folder (e.g. `references/`, `examples/`) to optimize context window usage.
5. Write in capability language ("dispatch a subagent", "ask the user", "make a targeted edit") rather than tool-specific names, and use the fast/standard/deep model tiers.
