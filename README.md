# Standardized AI Workflows & Rules

This repository contains the centralized source of truth (SSOT) for personal AI rules and skills. It defines development standards, review workflows, and tracking mechanisms optimized for agentic coding assistants (like Antigravity).

---

## Directory Structure

- `AGENTS.md`: Global behavior guidelines, engineering standards, and execution constraints.
- `skills/`: Production-grade, token-efficient engineering skills:
  - **Orchestration & Workflow:**
    - `run-issue-to-pr/`: Autonomous end-to-end issue resolution using Architect/Subagent separation and dynamic skill selection.
    - `plan-review/`: Audits implementation plans for errors/opportunities and domain skill alignment before coding.
    - `peer-review-with-quality/`: Senior pre-commit quality gate (surgical diffs, 100% tests, SonarCloud, trace reconciliation).
    - `peer-review-with-quality/`: Canonical quality review workflow with full automated test enforcement, SonarCloud compliance, and dynamic skill selection.
    - `feature-tracking/`: Automatically maintains branch-level progress logs in `/docs/traces/`.
    - `create-github-issue/`: Issue creation guidelines with project board integration and REST API relationships.
    - `git-branch-cleanup/`: Synchronizes local branch list by pruning remote-deleted branches.
    - `github-commands/`: Non-interactive `gh` CLI and REST API cheatsheet.
  - **Reasoning, Testing & Debugging:**
    - `doubt-driven-development-slim/`: 5-step adversarial evaluation cycle for non-trivial decisions.
    - `test-driven-development-slim/`: Red-Green-Refactor loop and boundary-only mocking.
    - `debugging-and-error-recovery-slim/`: Scientific debugging cycle, falsifiable hypotheses, and regression guards.
    - `testing-workflow/`: Unit and integration test execution and verification guidelines.
    - `sonarqube-review/`: SonarCloud quality gate compliance and static analysis triage.
  - **Frontend & Web Quality:**
    - `frontend-ui-engineering-slim/`: Modular architecture, zero `!important`, zero inline styles, layout stability.
    - `accessibility-and-a11y-slim/`: WCAG 2.2 AA compliance, semantic HTML, keyboard focus trapping.
    - `longest-contentful-paint-slim/`: Core Web Vitals LCP optimization (TTFB < 800ms, priority hinting, critical CSS).
    - `design-review/`: Comprehensive UI/UX, aesthetics, copy, and layout verification.
  - **Backend, Data & Infrastructure:**
    - `api-and-interface-design-slim/`: RFC 7807 problem details, idempotency keys, boundary validation, and pagination.
    - `database-and-migrations-slim/`: Zero-downtime expand/contract migrations, non-blocking indexing, connection pool safety.
    - `security-and-hardening-slim/`: OWASP Top 10 defense, parameterized queries, IDOR defense, and secret hygiene.
    - `performance-optimization-slim/`: Measurement-first profiling, INP yielding, hot-path optimization, memory leak prevention.
    - `ci-cd-and-automation-slim/`: Non-interactive pipeline invariants, reusable actions, SemVer release trains.

---

## 1. Setup in Projects You Own/Lead

### Option A: NPM Package (Recommended for Node Projects)
1. **Install the package:**
   ```bash
   npm install --save-dev @higherkey/ai-standards
   ```
2. **Configure scripts** in your `package.json` to automate rules updates on installation:
   ```json
   "scripts": {
     "sync-ai": "ai-standards-sync",
     "postinstall": "ai-standards-sync"
   }
   ```
   *Note: The CLI tool runs as a dependency-free copy helper. If run during postinstall, it will automatically fail-safe (warn but exit with 0) in CI/CD environments if permission errors occur.*
3. **Initialize & Commit:** Run `npm run sync-ai` once to initialize `.agents/`, then commit the folder to Git.
4. **Integrate localization:** Create or update `.agents/AGENTS.md` to append project-specific rules. Subsequent syncs will not overwrite your local `AGENTS.md` unless you pass the `--force` flag.

#### 🤖 Instruction for AI Agents
If you are an AI assistant tasked with setting up or updating these standards in this project, do not write custom download scripts. Instead, run the help menu to view instructions and verify the setup:
```bash
npx ai-standards-sync --help
```

### Option B: Degit (For Non-Node Projects)
1. **Bootstrap `.agents/`** from the central repo using `degit`:
   ```bash
   npx degit higherkey/ai-standards/skills .agents/skills
   ```
2. Check `.agents/` directly into Git.
3. Integrate localization: Create or update `.agents/AGENTS.md` to append project-specific rules.

---

## 2. Setup in Projects You Contribute To (Local-Only)

If you are contributing to an external codebase and want to use these workflows without polluting the repository:
1. Maintain these skills/rules globally on your local machine (`~/.gemini/config/`).
2. To prevent local trace files (e.g., `docs/traces/`, `.agents/`, `task.md`, `walkthrough.md`) from showing up in `git status` without editing the repo's `.gitignore`:

#### Global Gitignore Setup
```bash
git config --global core.excludesfile ~/.gitignore_global
```
Add the following lines to `~/.gitignore_global`:
```text
/docs/traces/
/.agents/
/task.md
/walkthrough.md
```

---

## 3. CI/CD Pipeline Integration (GitHub Actions)

We provide centralized reusable GitHub Actions workflows to enforce and manage AI traces in your projects.

### A. Trace Validation Workflow (`validate-trace.yml`)
Enforces that every pull request opened from a conventionally prefixed branch (e.g., `feat/`, `fix/`) contains its mandatory trace document under `docs/traces/[branch-name]-work-trace.md` before it can be merged.

Create `.github/workflows/validate-ai-traces.yml` in your repository:
```yaml
name: Validate AI Traces
on:
  pull_request:
    branches: [main, dev]

jobs:
  validate:
    uses: higherkey/ai-standards/.github/workflows/validate-trace.yml@main
```

### B. Trace Cleanup Workflow (`clean-traces.yml`)
Automatically deletes branch trace files from the codebase upon a successful pull request merge, keeping repository history clean.

Create `.github/workflows/clean-ai-traces.yml` in your repository:
```yaml
name: Clean AI Traces
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    if: github.event.pull_request.merged == true
    uses: higherkey/ai-standards/.github/workflows/clean-traces.yml@main
    with:
      base-branch: ${{ github.event.pull_request.base.ref }}
    secrets: inherit
```

---

## 4. Contributing & Adding Custom Skills

To define a new specialized AI skill workflow:
1. Create a new directory under `skills/<your-skill-name>/`.
2. Inside that directory, create a `SKILL.md` file.
3. The `SKILL.md` must include YAML frontmatter with `name` and `description`:
   ```yaml
   ---
   name: your-skill-name
   description: "Brief description of what this skill does"
   ---
   ```
4. Keep the body of the `SKILL.md` file under 250 lines. Place verbose checklists, references, or code templates under a sub-folder (e.g. `references/`, `examples/`) to optimize context window usage.
