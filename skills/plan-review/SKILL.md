---
name: plan-review
description: "Audit and verify an Implementation Plan or architectural strategy with dynamic skill selection before code execution"
---

# Implementation Plan & Process Review Workflow (`/plan-review`)

Use this workflow to systematically double-check and audit an **Implementation Plan** or high-level process strategy before any code modifications begin or when not working on code directly.

---

## Expert Persona
Before starting the review, dynamically assume an expert identity suited for auditing this specific plan, such as a *Senior Solutions Architect*, *Lead Systems Engineer*, *Senior Project Manager*, or *Operations Strategy Consultant*. State this identity at the beginning of your response.

---

## 1. Dynamic Skill Selection & Domain Invariants
Examine the technical domains involved in the proposed implementation and verify that the appropriate specialized skills are selected and their invariants incorporated into the plan:

| Domain | Skill to Activate | Key Invariants to Verify in Plan |
|---|---|---|
| Risky / complex logic | `/doubt-driven-development-slim` | Adversarial checks, failure modes, bounded loops |
| Frontend / UI / CSS | `/frontend-ui-engineering-slim` | Modularity, touch targets $\ge 44\text{px}$, zero `!important`, zero inline styles |
| REST / GraphQL / RPC | `/api-and-interface-design-slim` | RFC 7807 error models, idempotency, backward compatibility |
| DB / Schema / Migrations | `/database-and-migrations-slim` | Expand/contract pattern, non-blocking indexing, connection pool limits |
| Auth / Data / Security | `/security-and-hardening-slim` | Parameterized queries, sanitization, secret hygiene, OWASP Top 10 |
| Page Speed / Web Vitals | `/longest-contentful-paint-slim` | LCP $< 2.5\text{s}$, TTFB $< 800\text{ms}$, fetchpriority, CSS inlining |
| Memory / CPU / Latency | `/performance-optimization-slim` | Profiling-first, hot-path optimization, event cleanup |
| Defect / Regression | `/debugging-and-error-recovery-slim` | Falsifiable hypotheses, regression tests before fix |
| Business Domain Logic | `/test-driven-development-slim` | Red-Green-Refactor, mock only at I/O boundaries |
| Form / Dialog / Nav | `/accessibility-and-a11y-slim` | Semantic HTML, focus trap/restore, contrast $\ge 4.5:1$ |
| Pipeline / Scripts | `/ci-cd-and-automation-slim` | Non-interactive flags (`--yes`), reusable actions, SemVer |

---

## 2. Scope & Parity Check
Verify that the proposed plan has 100% coverage of the user request:
- **Feature Completeness:** Compare the plan's proposed changes against the user's requirements. Are any requested features missing or deferred without a clear reason?
- **Ambiguity Check:** Identify if there are any vague steps or assumptions in the plan that need user clarification.
- **Audit for Flaws:** Systematically check the proposed approach for any **errors, false assumptions, or missed opportunities**.

---

## 3. Constraints & Mandates Audit
Ensure the plan adheres to the active guidelines in `AGENTS.md` / `GEMINI.md`:
- **Safety Compliance:** Confirm the plan does not schedule Git staging or commits until the user has explicitly verified the changes.
- **Surgical Edits:** Verify that file updates prioritize target-specific replacements (using `replace_file_content` or `multi_replace_file_content`) rather than rewriting whole files.
- **Standards Check:** Ensure the plan's files follow language-specific guidelines (e.g., avoiding inline styles or `!important` tags).

---

## 4. Environment & Security Check
Inspect the plan for dependency or external environment requirements:
- **Credentials & API Keys:** Does the plan require access to API tokens, credentials, or keys? Ensure they are already configured or explicitly listed as prerequisites.
- **Package Additions:** Does the plan require installing new packages (`npm install`, etc.)? Ensure they are explicitly identified and approved.

---

## 5. Risk & Rollback Strategy
Evaluate the safety of the execution steps:
- **Data Safety:** If the plan involves database operations or config file edits, is there a step to back up the data or files first?
- **Rollback Path:** If a command fails or causes a system lock, is there a clear instruction on how to revert the changes?

---

## 6. Verification Plan Audit
Confirm that the proposed verification strategy is robust:
- **Automated Tests:** Are there specific commands listed to run unit, integration, or lint tests?
- **Manual QA:** Is there a clear, step-by-step walkthrough checklist for verifying the changes (both desktop and mobile)?
