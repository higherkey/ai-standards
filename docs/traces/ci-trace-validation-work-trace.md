# Feature Work Trace - ci/trace-validation

## 1. Planned Work
- **TODO List**:
  - [x] Create GitHub Action workflow `.github/workflows/validate-trace.yml` to check for trace files on prefixed branches
  - [x] Align global rules in `AGENTS.md` (add local exclusions and token efficiency standards)
  - [x] Update and improve `README.md` (documented workflows and contribution guidelines)
  - [x] Commit changes and verify locally
  - [x] Push to remote and open a PR linking Issue #1
  - [x] Package AI standards as an npm package with sync CLI
- **File List**:
  - [NEW] [validate-trace.yml](file:///c:/Programming/ai-standards/.github/workflows/validate-trace.yml) — GitHub Action file for validating the presence of trace documents on conventional PR branches.
  - [NEW] [package.json](file:///c:/Programming/ai-standards/package.json) — NPM package metadata definition.
  - [NEW] [cli.js](file:///c:/Programming/ai-standards/bin/cli.js) — Sync CLI command-line executable.
  - [NEW] [test-cli.js](file:///c:/Programming/ai-standards/scripts/test-cli.js) — CLI test verification suite.
  - [MODIFY] [AGENTS.md](file:///c:/Programming/ai-standards/AGENTS.md) — Aligned centralized core guidelines with global rules.
  - [MODIFY] [README.md](file:///c:/Programming/ai-standards/README.md) — Improved setup, CI/CD reusable workflows, and contributing sections.
  - [MODIFY] [sync-ai.js](file:///c:/Programming/ai-standards/scripts/sync-ai.js) — Legacy sync script deprecation warning.
- **Rationale**:
  - `.github/workflows/validate-trace.yml` is required to ensure all contributors/agents verify and submit their trace files before their PRs can be merged.
  - `AGENTS.md` needs to include local exclusions for contribution mode and token/context efficiency standards.
  - `README.md` must be updated to document the new validate-trace workflow and contribution practices.

## 2. In Progress Work
- **Active Files**:
  - None

## 3. Completed Work
- **Summary**:
  - Created `.github/workflows/validate-trace.yml` to run trace validation on PRs targeting `main`.
  - Added Section 5 (Token & Context Efficiency Standards) and local exclusions guidelines to `AGENTS.md` to bring it into parity with global rules.
  - Revamped `README.md` to document the new `validate-trace.yml` action, structured reusable action inputs, and outlined standards for contributing new skills.
  - Packaged the repository as an npm package (`@higherkey/ai-standards`) with a dependency-free sync CLI, verified via a local test suite.
- **Revised Rationale**:
  - Successfully added the GHA trace validator, aligned core standards, and updated the project readme.
  - Standardized distribution to NPM package format and simplified workspace updates for downstream repos.

## 4. Issues and Out of Scope
- **4a) Potential Blockers**:
  - None
- **4b) Opportunities**:
  - Generalize/abstract other useful tools and workflows from the board game hub project (e.g. PR Title Linter, code health scanners, etc.).
