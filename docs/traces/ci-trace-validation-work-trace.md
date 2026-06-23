# Feature Work Trace - ci/trace-validation

## 1. Planned Work
- **TODO List**:
  - [x] Create GitHub Action workflow `.github/workflows/validate-trace.yml` to check for trace files on prefixed branches
  - [x] Align global rules in `AGENTS.md` (add local exclusions and token efficiency standards)
  - [x] Update and improve `README.md` (documented workflows and contribution guidelines)
  - [/] Commit changes and verify locally
  - [ ] Push to remote and open a PR linking Issue #1
- **File List**:
  - [NEW] [validate-trace.yml](file:///c:/Programming/ai-standards/.github/workflows/validate-trace.yml) — GitHub Action file for validating the presence of trace documents on conventional PR branches.
  - [MODIFY] [AGENTS.md](file:///c:/Programming/ai-standards/AGENTS.md) — Aligned centralized core guidelines with global rules.
  - [MODIFY] [README.md](file:///c:/Programming/ai-standards/README.md) — Improved setup, CI/CD reusable workflows, and contributing sections.
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
- **Revised Rationale**:
  - Successfully added the GHA trace validator, aligned core standards, and updated the project readme.

## 4. Issues and Out of Scope
- **4a) Potential Blockers**:
  - None
- **4b) Opportunities**:
  - Generalize/abstract other useful tools and workflows from the board game hub project (e.g. PR Title Linter, code health scanners, etc.).
