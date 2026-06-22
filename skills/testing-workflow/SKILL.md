---
name: testing-workflow
description: "Guidelines and requirements for writing, running, and verifying unit/integration tests"
---

# Testing Workflow & Standards

This workflow details the core standards and execution procedures for code testing. Follow these rules to ensure structural stability and reliability:

---

## Quality Check Mandate
When writing and executing tests, systematically audit the test plans and suites to identify any **errors, false assumptions, or missed opportunities** in test coverage, test setup, or mocking boundaries.

---


## 1. Unit Testing Guidelines
- **Isolation:** Always mock or stub external service dependencies to isolate the logic under test.
- **Edge Cases:** Prioritize boundary conditions, null values, and state transitions.
- **Assertions:** Verify both success paths and expected failure/rejection paths.
- **Idempotency:** Ensure tests clean up any mock states, timers, or subscriptions to avoid leaks.

---

## 2. Test Execution & Verification
- **Run Suites:** Run the repository's test suites from the root (e.g., `npm run test` or standard test scripts).
- **Pass Rate:** A **100% pass rate** is mandatory. Any failing test must be resolved before committing.
- **Syntax & Linting:** Code must compile without errors and satisfy all static code analysis (eslint/linter) requirements.

---

## 3. Code Coverage Requirements
For every new feature or refactor, coverage must be verified:
- **Adequacy:** Newly added logic and branches must be exercised by tests.
- **Regression Prevention:** Existing coverage must be maintained and verified to be unbroken.
- **Gap Resolution:** Identify and patch untested paths in modified components.

---

## 4. Peer Review Integration
Verification of test runs and coverage reports serves as a gate in the `/peer-review` process. No code review can be completed without confirming a successful test suite execution.
