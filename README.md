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

To share these workflows with all contributors of a project:
1. Copy the `.agents/` folder into your repository root:
   ```bash
   # Create .agents/ directory and copy AGENTS.md + skills
   mkdir .agents
   cp -r /path/to/ai-standards/skills .agents/
   cp /path/to/ai-standards/AGENTS.md .agents/
   ```
2. Check `.agents/` directly into Git.
3. Integrate localization: Create or update `.agents/AGENTS.md` to append project-specific rules (e.g. brand fonts, CTA endpoints, or architectural patterns) while keeping global rules clean.

---

## 2. Setup in Projects You Contribute To (Local-Only)

If you are contributing to an external codebase and want to use these workflows without polluting the repository:
1. Maintain these skills/rules globally on your local machine (`~/.gemini/config/`).
2. Prevent local trace files (e.g. `/docs/traces/` or `/task.md`) from showing up in `git status`:
   - Open `.git/info/exclude` in the project root.
   - Append the following patterns:
     ```text
     /docs/traces/
     /.agents/
     /task.md
     /walkthrough.md
     ```
   - *Note:* This file behaves exactly like `.gitignore` but is strictly local to your clone and is never committed or pushed.

---

## 3. Generalizing Trace File Cleanup

### CI/CD Reusable Workflow (GitHub Actions)
The reusable workflow `.github/workflows/clean-traces.yml` in this repository automatically cleans up branch traces when a pull request is merged to `main`.

To use it in your project, create `.github/workflows/clean-ai-traces.yml`:
```yaml
name: Clean AI Traces
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    if: github.event.pull_request.merged == true
    uses: iceice/ai-standards/.github/workflows/clean-traces.yml@main
    secrets: inherit
```
