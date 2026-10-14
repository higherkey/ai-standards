---
name: peer-review-with-quality
description: "Senior code review, quality gate verification, accessibility audit, SonarCloud compliance, and trace reconciliation before commit or PR"
---

# Senior Peer Review with Quality Gates (`/peer-review-with-quality`)

This workflow serves as the mandatory pre-commit / pre-merge quality gate. It unifies senior code review, dynamic quality skill execution, automated test enforcement, and SonarCloud analysis.

---

## Expert Persona
Dynamically assume a senior auditing persona appropriate for the changes under review (e.g., *Principal Systems Engineer*, *Senior Security Architect*, *Lead QA Automation Engineer*, or *Staff UI Engineer*). State this identity at the beginning of the review.

---

## Quality Gate Checklist

### 1. Dynamic Skill Selection & Domain Audits
Identify the domains touched by the active changes and trigger their specialized checklists:

- **Frontend / UI:** Run `/frontend-ui-engineering-slim` and `/accessibility-and-a11y-slim` audits.
  - Verify zero `!important` tags and zero inline styles (`style="..."`).
  - Verify keyboard focusability, ARIA labels on icon buttons, and color contrast $\ge 4.5:1$.
  - Verify touch targets are $\ge 44 \times 44\text{px}$.
- **Backend / APIs:** Run `/api-and-interface-design-slim` and `/security-and-hardening-slim` audits.
  - Verify query parameterization (prevent SQLi) and safe encoding (prevent XSS).
  - Verify RFC 7807 problem details error shapes and backward compatibility.
  - Ensure zero hardcoded secrets, tokens, or credentials.
- **Database / State:** Run `/database-and-migrations-slim` audit.
  - Verify expand/contract patterns for schema modifications.
- **Performance / Web Vitals:** Run `/longest-contentful-paint-slim` audit if rendering paths were modified.

### 2. Surgical Diff Inspection
Review all staged and unstaged changes (`git diff`):
- **Minimal Surface Area:** Ensure only necessary lines were touched. Discard accidental formatting diffs, unintended deletions, or whitespace churn.
- **Clean Hygiene:** No dead code, debug statements (`console.log`, `debugger`), or orphaned temporary files.
- **Convention Adherence:** Adheres to SOLID, DRY, and project-specific architecture patterns.
- **Adversarial Subagent Audit:** For non-trivial diffs (> 3 files), dispatch an adversarial auditor using `/subagent-delegate-on-rails` to eliminate author confirmation bias and preserve parent context memory.

### 3. Build & Test Pass Gate
- **Runtime Verification Mandate:** Per the global `AGENTS.md` foundation mandate, static AST parsing, linter checks, or dry syntax validation alone are strictly prohibited from being used to claim verification. Every script, build, or feature modification must be executed and validated in the real runtime environment.
- Run the project's build command (`npm run build`, `dotnet build`, etc.) to guarantee zero compilation errors or compiler warnings.
- Run the full test suite (`npm test`, `dotnet test`, etc.). **100% pass rate is mandatory.** Flaky tests must be quarantined or fixed before sign-off.
- Verify that any manual steps that could not be executed autonomously are documented in the PR checklist.

### 4. SonarCloud & Static Analysis Gate
- Verify SonarCloud quality gate compliance (or run local linters if offline).
- Zero new Blocker, Critical, or Major code smells / security vulnerabilities.
- For deferred items, file a follow-up GitHub issue using non-interactive CLI flags:
  ```powershell
  gh issue create --title "[Technical Debt] Short summary" --body "Finding details"
  ```

### 5. Trace Reconciliation & Git Preparation
- If working on a prefixed branch, run `/trace-consolidate` on `/docs/traces/[branch]-work-trace.md`.
- Compare actual modified files against Planned Work (`git diff --name-only <target-branch>`).
- Format proposed commit message using Conventional Commits and Imperative Tense:
  `feat: <concise summary>` or `fix: <concise summary>`.
- Request explicit user approval before staging or committing changes.
