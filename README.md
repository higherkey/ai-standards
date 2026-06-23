# Standardized AI Workflows & Rules

This repository contains the centralized source of truth (SSOT) for personal AI rules and skills. It defines development standards, review workflows, and tracking mechanisms optimized for agentic coding assistants (like Antigravity).

## Directory Structure

- `AGENTS.md`: Global behavior guidelines, engineering standards, and execution constraints.
- `skills/`: Specialized task workflows:
  - `plan-review/`: Audits implementation plans for errors/opportunities before coding.
  - `peer-review/`: Guides the final code, QA, and testing checks.
  - `design-review/`: Focuses on layout, UX, accessibility, and copywriting standards.
  - `feature-tracking/`: Automatically maintains branch-level progress logs.
  - `sonarqube-review/` & `testing-workflow/`: Quality and testing guidelines.

---

## 1. Setup in Projects You Own/Lead

To share these workflows with all contributors of a project, you can use one of the following methods:

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
   Or if your project uses Node, add the legacy sync script from this repo (see `scripts/sync-ai.js` in any bootstrapped project) and run:
   ```bash
   npm run sync-ai
   ```
2. Check `.agents/` directly into Git.
3. Integrate localization: Create or update `.agents/AGENTS.md` to append project-specific rules.

---

## 2. Setup in Projects You Contribute To (Local-Only)

If you are contributing to an external codebase and want to use these workflows without polluting the repository:
1. Maintain these skills/rules globally on your local machine (`~/.gemini/config/`).
2. To prevent local trace files (e.g., `docs/traces/`, `.agents/`, `task.md`, `walkthrough.md`) from showing up in `git status` without editing the repo's `.gitignore`, choose one of the following methods:

#### Method A: Global Gitignore (Recommended)
Set up a global gitignore file on your machine that Git applies to all repositories you work on:
1. Create a global ignore file, e.g., `~/.gitignore_global`.
2. Add your local paths:
   ```text
   /docs/traces/
   /.agents/
   /task.md
   /walkthrough.md
   ```
3. Register the file with Git:
   ```bash
   git config --global core.excludesfile ~/.gitignore_global
   ```

#### Method B: Local Clone Exclusion
If you only want this on a specific repository clone:
1. Open `.git/info/exclude` in the project root.
2. Append the same patterns:
   ```text
   /docs/traces/
   /.agents/
   /task.md
   /walkthrough.md
   ```
   *(Note: This file behaves like `.gitignore` but is strictly local to your clone and is never pushed.)*

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

> [!IMPORTANT]
> **Workflow Permissions:** The trace cleanup workflow requires `contents: write` permission to commit and push trace deletions back to the base branch. In public or enterprise repositories, you may need to navigate to **Settings → Actions → General → Workflow permissions** and check **Read and write permissions**.

---

### C. NPM Registry Publishing (Secrets Configuration)

To publish package updates automatically to the NPM registry via release pipelines, you must configure authentication credentials:
1. **Generate an NPM Token:** Log in to your account on [npmjs.com](https://www.npmjs.com/), go to **Access Tokens**, and generate a new token with **Publish** permissions. For more details, see [npm Access Tokens](https://docs.npmjs.com/about-access-tokens).
2. **Add GitHub Secret:** In your GitHub repository settings, go to **Settings → Secrets and variables → Actions** and create a repository secret named `NPM_TOKEN` with the value of the npm token. For more details, see [GitHub Actions Encrypted Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions).

---

## 4. Contributing & Adding Custom Skills

To define a new specialized AI skill workflow:
1. Create a new directory under `skills/<your-skill-name>/`.
2. Inside that directory, create a `SKILL.md` file.
3. The `SKILL.md` must include YAML frontmatter with `name` and `description` (e.g.):
   ```yaml
   ---
   name: your-skill-name
   description: "Brief description of what this skill does"
   ---
   ```
4. Keep the body of the `SKILL.md` file under 500 lines. Place verbose checklists, references, or code templates under a sub-folder (e.g. `references/`, `examples/`) to optimize context window usage.
