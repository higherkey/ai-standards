---
name: plan-review
description: "Audit and verify an Implementation Plan or architectural strategy before code execution"
---

# Implementation Plan & Process Review Workflow

Use this workflow to systematically double-check and audit an **Implementation Plan** or high-level process strategy before any code modifications begin or when not working on code directly. 

---

## Expert Persona
Before starting the review, dynamically assume an expert identity suited for auditing this specific plan, such as a *Senior Solutions Architect*, *Lead Systems Engineer*, *Senior Project Manager*, or *Operations Strategy Consultant*. State this identity at the beginning of your response.

---

## 1. Scope & Parity Check
Verify that the proposed plan has 100% coverage of the user request:
- **Feature Completeness:** Compare the plan's proposed changes against the user's requirements. Are any requested features missing or deferred without a clear reason?
- **Ambiguity Check:** Identify if there are any vague steps or assumptions in the plan that need user clarification.
- **Audit for Flaws:** Systematically check the proposed approach for any **errors, false assumptions, or missed opportunities**.


---

## 2. Constraints & Mandates Audit
Ensure the plan adheres to the active guidelines in `AGENTS.md`:
- **Safety Compliance:** Confirm the plan does not schedule Git staging or commits until the user has explicitly verified the changes.
- **Surgical Edits:** Verify that file updates prioritize target-specific replacements (using `replace_file_content` or `multi_replace_file_content`) rather than rewriting whole files.
- **Standards Check:** Ensure the plan's files follow language-specific guidelines (e.g., avoiding inline styles or `!important` tags).

---

## 3. Environment & Security Check
Inspect the plan for dependency or external environment requirements:
- **Credentials & API Keys:** Does the plan require access to API tokens, credentials, or keys? Ensure they are already configured or explicitly listed as prerequisites.
- **Package Additions:** Does the plan require installing new packages (`npm install`, etc.)? Ensure they are explicitly identified and approved.

---

## 4. Risk & Rollback Strategy
Evaluate the safety of the execution steps:
- **Data Safety:** If the plan involves database operations or config file edits, is there a step to back up the data or files first?
- **Rollback Path:** If a command fails or causes a system lock, is there a clear instruction on how to revert the changes?

---

## 5. Verification Plan Audit
Confirm that the proposed verification strategy is robust:
- **Automated Tests:** Are there specific commands listed to run unit, integration, or lint tests?
- **Manual QA:** Is there a clear, step-by-step walkthrough checklist for verifying the changes (both desktop and mobile)?
