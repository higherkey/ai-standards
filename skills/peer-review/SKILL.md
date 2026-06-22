---
name: peer-review
description: "Perform a full senior code review, accessibility audit, and build verification"
---

# Senior Peer Review Workflow

This workflow guides the final quality audit of changes before they are committed and merged. Follow these steps systematically:

---

## Expert Persona
Before starting the review, dynamically assume an expert identity suited for auditing the active modifications, such as a *Principal Software Engineer*, *Senior Full-Stack Developer*, *Lead QA Automation Engineer*, *Software Security Specialist*, *Senior Project Manager*, or *Senior UX Director*. State this identity at the beginning of your response.

---

## Quality Check Mandate
Before concluding any peer review, you must systematically audit all modified files, designs, and workflows to identify any **errors, false assumptions, or missed opportunities**.

---

## 1. Code Quality Audit
Review all modified and new files in the branch for:
- **Correctness:** Logic errors, edge cases, and potential race conditions.
- **Standards:** Adherence to DRY, SOLID, and single-responsibility principles.
- **Efficiency:** Memory leaks, lifecycle cleanup, and performance bottlenecks.

---

## 2. Test Verification
Evaluate the testing state of the branch by referring to `/testing-workflow`:
- Verify that all newly introduced logic has adequate unit test coverage.
- Confirm that all existing and new tests pass successfully (100% pass rate).
- Identify and address gaps in the test suites.

---

## 3. Immersion & UX Review
Evaluate the user experience and design alignment:
- **Design Review:** For design-focused tasks, execute the `/design-review` skill to systematically check layout, copy, aesthetics, accessibility, and branding consistency.
- Ensure styling matches the project's design tokens and palette.
- Check animation timing, transition smoothness, and hover micro-animations.
- Verify layouts are responsive across mobile and desktop viewports.

---

## 4. Accessibility (a11y) Audit
Ensure compliance with basic accessibility standards:
- **Keyboard Navigation:** All interactive elements must be focusable and operable via keyboard.
- **ARIA Attributes:** Include descriptive `aria-label` or `aria-labelledby` tags on dynamic or icon-only elements.
- **Contrast & Indicators:** Color must not be the sole indicator of status (use shapes, symbols, or text). Touch targets should be at least 44x44px.

---

## 5. Build Verification
Run the project's standard build command (`npm run build`) to guarantee that all assets bundle correctly and no compilation or compiler errors exist.

---

## 6. Issue Triage & Task Closure
- **Fix immediately:** Resolve any compiler errors or BLOCKER/HIGH severity issues found during review.
- **Create Issues:** For deferred or systemic issues, create a GitHub issue using non-interactive CLI flags:
  ```powershell
  gh issue create --title "[Component] Short summary" --body "Detailed explanation of finding"
  ```
- **Document Audit:** Update `walkthrough.md` and `peer_review_audit.md` in the brain artifacts directory summarizing:
  - Scope of review and files verified.
  - Fixes implemented vs. issues deferred.
  - Next steps and open tasks.
