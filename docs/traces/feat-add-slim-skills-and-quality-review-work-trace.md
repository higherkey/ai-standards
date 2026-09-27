# Feature Work Trace - feat/add-slim-skills-and-quality-review

## 1. Planned Work
- **TODO List**:
  - [x] Initialize feature branch and trace document
  - [x] Create and configure `run-issue-to-pr` orchestration skill (Architect pattern, dynamic skill selection, low-reasoning subagent delegation)
  - [x] Upgrade `peer-review-with-quality` skill with full quality gates, surgical diff audits, SonarCloud, and trace reconciliation
  - [x] Upgrade `plan-review` skill with dynamic skill selection and domain invariants
  - [x] Build and deploy Batch 1 reasoning & review skills (`doubt-driven-development-slim`, `frontend-ui-engineering-slim`, `ci-cd-and-automation-slim`)
  - [x] Build and deploy Batch 2 backend & performance skills (`api-and-interface-design-slim`, `database-and-migrations-slim`, `security-and-hardening-slim`, `longest-contentful-paint-slim` + `references/LCP.md`, `performance-optimization-slim`)
  - [x] Build and deploy Batch 3 recovery & quality skills (`debugging-and-error-recovery-slim`, `test-driven-development-slim`, `accessibility-and-a11y-slim`)
  - [x] Sync recovered legacy workflows (`create-github-issue`, `git-branch-cleanup`) into `ai-standards`
  - [x] Synchronize all skills into global config `C:\Users\isaac\.gemini\config\skills/` (21 skills total, 100% parity)
  - [x] Update `ai-standards/AGENTS.md` to align with global rules and skill paths
  - [x] Update `ai-standards/README.md` cataloging all 21 skills
  - [x] Bump `ai-standards/package.json` to `0.2.0`
  - [x] Consolidate trace document via `/trace-consolidate`
  - [ ] Stage changes (`git add .`) and prepare commit for user review
- **File List**:
  - [NEW] `skills/run-issue-to-pr/SKILL.md` — Architect-led issue-to-PR orchestrator with skill selection and subagent dispatch.
  - [MODIFY] `skills/peer-review-with-quality/SKILL.md` — Overridden with comprehensive quality gates, SonarCloud, and trace verification.
  - [NEW] `skills/peer-review-with-quality/SKILL.md` — Canonical quality review skill with full quality gates and dynamic skill selection.
  - [MODIFY] `skills/plan-review/SKILL.md` — Enhanced with dynamic skill selection matrix and domain invariants.
  - [NEW] `skills/doubt-driven-development-slim/SKILL.md` — 5-step adversarial verification cycle.
  - [NEW] `skills/frontend-ui-engineering-slim/SKILL.md` — Modular UI design, layout stability, token adherence.
  - [NEW] `skills/ci-cd-and-automation-slim/SKILL.md` — Non-interactive CI invariants, reusable actions, SemVer gates.
  - [NEW] `skills/api-and-interface-design-slim/SKILL.md` — Idempotency, RFC 7807 problem details, pagination.
  - [NEW] `skills/database-and-migrations-slim/SKILL.md` — Zero-downtime expand/contract, safe indexing, pool protection.
  - [NEW] `skills/security-and-hardening-slim/SKILL.md` — OWASP Top 10 defenses, parameterized queries, secret hygiene.
  - [NEW] `skills/longest-contentful-paint-slim/SKILL.md` — Core Web Vitals LCP < 2.5s, TTFB < 800ms, fetchpriority.
  - [NEW] `skills/longest-contentful-paint-slim/references/LCP.md` — Deep reference for LCP optimization.
  - [NEW] `skills/performance-optimization-slim/SKILL.md` — Profiling-first methodology, hot-path and memory leak fixes.
  - [NEW] `skills/debugging-and-error-recovery-slim/SKILL.md` — Scientific debugging cycle, falsifiable hypotheses, regression tests.
  - [NEW] `skills/test-driven-development-slim/SKILL.md` — Red-Green-Refactor, boundary mocking, AAA patterns.
  - [NEW] `skills/accessibility-and-a11y-slim/SKILL.md` — Semantic HTML, keyboard trapping, WCAG contrast standards.
  - [NEW] `skills/create-github-issue/SKILL.md` — Sub-issue REST linking, project boards, estimates.
  - [NEW] `skills/git-branch-cleanup/SKILL.md` — Pruning remote-deleted branches.
  - [MODIFY] `AGENTS.md` — Centralized global rules alignment.
  - [MODIFY] `README.md` — Catalog and usage documentation for all skills.
  - [MODIFY] `package.json` — Version bump to 0.2.0.
  - [NEW] `docs/traces/feat-add-slim-skills-and-quality-review-work-trace.md` — Feature tracking trace.
- **Rationale**:
  - Restores the complete suite of lost engineering skills in token-efficient "slim" format (<250 lines).
  - Establishes full parity between local Antigravity runtime (`~/.gemini/config/skills/`) and repo distribution (`ai-standards`).
  - Restores the autonomous end-to-end `run-issue-to-pr` skill with Architect/Subagent separation and intelligent skill selection.

## 2. In Progress Work
- **Active Files**:
  - None (all implementation tasks completed)

## 3. Completed Work
- **Summary**:
  - Implemented `run-issue-to-pr` orchestrator featuring an Architect (High Reasoning) / Subagent (Low Reasoning) dispatch pattern with dynamic domain skill selection.
  - Overrode `peer-review-with-quality` with the comprehensive quality-review specification (surgical diffs, 100% test pass, SonarCloud gates, trace reconciliation).
  - Upgraded `plan-review` to incorporate dynamic domain skill selection and invariants auditing.
  - Distilled and deployed all 11 slim engineering skills: `doubt-driven-development-slim`, `frontend-ui-engineering-slim`, `ci-cd-and-automation-slim`, `api-and-interface-design-slim`, `database-and-migrations-slim`, `security-and-hardening-slim`, `longest-contentful-paint-slim` (including `references/LCP.md`), `performance-optimization-slim`, `debugging-and-error-recovery-slim`, `test-driven-development-slim`, and `accessibility-and-a11y-slim`.
  - Synced legacy workflows `create-github-issue` and `git-branch-cleanup` into `ai-standards`.
  - Verified 100% parity across `~/.gemini/config/skills/` and `ai-standards/skills/` (21 skills total, each $\le 250$ lines with valid YAML frontmatter).
  - Aligned `ai-standards/AGENTS.md` with global principles and updated `README.md` with full catalog documentation.
  - Bumped `@higherkey/ai-standards` to `0.2.0`.
- **Revised Rationale**:
  - Complete recovery of lost engineering capabilities, upgraded to modern Antigravity skills architecture.

## 4. Issues and Out of Scope
- **4a) Potential Blockers**:
  - None
- **4b) Opportunities**:
  - Downstream repositories can run `npx ai-standards-sync` to immediately inherit the full suite of 21 skills and the autonomous orchestrator.
- **4c) Technical Debt / Deferred Items**:
  - None. Node.js v24.21.0 (LTS) installed portably on host; `node scripts/test-cli.js` executed and passed 100%.
