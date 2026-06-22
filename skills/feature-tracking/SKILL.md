---
name: feature-tracking
description: "Maintain a running trace document of work on feature branches"
---

# Feature Tracking Workflow

Whenever you are working on a branch created with a **conventional prefix** (e.g., `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, `test/`, `perf/`, `build/`, `ci/`, `style/`), you MUST create and strictly maintain a "work trace" document. Unprefixed branches are exempt.

---

## Quality Check Mandate
When initializing, updating, or consolidating your feature work trace, systematically audit the progress, commits, and plans to identify any **errors, false assumptions, or missed opportunities** in the active development scope.

---


## 1. Document Setup

- **File Path**: `/docs/traces/[branch-name]-work-trace.md`
    - Example: For branch `feat/lobby-ui`, the file is `/docs/traces/feat-lobby-ui-work-trace.md`.
- **Trigger**: Create this document **immediately** when starting work on a new prefixed branch.
- **Persistence**: Committed to the branch. Cleared from `main` automatically via GitHub Action.

---

## 2. Document Structure

Keep all sections as concise as possible without losing critical information.

### 1) Planned Work
- **TODO List**: High-level task list (mirrors your internal `task.md`).
- **File List**: Expected files to change, grouped by feature area.
- **Rationale**: Brief reason and expected change per file or group.

### 3) In Progress Work
- **Active Files**: Lightweight list of files currently being modified.

### 3) Completed Work
- **Summary**: Files changed, grouped by feature.
- **Revised Rationale**: What was actually changed and why.

### 4) Issues and Out of Scope
Any discovery that deviates from the original plan MUST be captured immediately.
- **4a) Potential Blockers**: Risks, discovered bugs, or architectural hurdles that prevent completion of the current task. 
- **4b) Opportunities**: Out-of-scope improvements, refactors, or new feature ideas discovered during development.

---

## 3. Trace Modes & Helpers

To minimize token usage and rate limits, the trace document is updated using three distinct sub-modes. Always prefer the lowest-cost mode for the task:

### A) Append Mode (`/trace-append`)
Use this for a **minimal-reach (write-only)** operation to log new events. Read only what you must to find the insertion point, and write only the new line. Do not re-summarize or format other sections.
* **When:** Adding a new blocker/opportunity, starting work on a file, or completing a file.
* **Format:** Use the `[raw append]` prefix.
  ```markdown
  - [raw append] Brief description of the item.
  ```

### B) Update Mode (`/trace-update`)
Use this for a **section-level** cleanup. Read and modify *only* the targeted section(s) (typically Section 2 or 3).
* **When:** Moving tasks from In Progress (Section 2) to Completed (Section 3), or formatting accumulated `[raw append]` items in a single section.
* **Format:**
  ```markdown
  - **Active Files / Summary**:
      - `path/to/file.ts` — [brief description of work]
  ```

### C) Consolidate Mode (`/trace-consolidate`)
Use this for a **full file read and rewrite** to produce a clean, coherent work trace.
* **When:** Resuming a session, preparing for a PR/Merge finalization, or cleaning up a heavily cluttered document.
* **Action:** Reconcile all sections, integrate all `[raw append]` items, and verify status against recent Git history.

---

## 4. Automatic Checkpoint Triggers

- **Branch Start:** Create the trace document, write the full Section 1 (Planned Work), and trigger `/plan-review` on the proposed implementation plan to catch design constraints early.
- **Session Resume:** If resuming a branch, the agent **must** explicitly ask the user:
  > *"I see we're resuming `[branch-name]`. Should I consolidate the trace document before we continue?"*
- **Finalization (Pre-Commit):** Execute a full `/trace-consolidate` and verify the file list before submitting the PR.

---

## 5. The Finalization Process (PR/Merge)

Follow this sequence exactly when concluding work on a branch:

1. **Verification & Testing:** Run `/testing-workflow` to ensure all tests pass and coverage is adequate.
2. **Issue Triage (4a & 4b):** Present all Section 4 items to the user. Link accepted sub-issues and blockers using the REST API (see Section 6).
3. **Consolidate & Parity Check:** Run `/trace-consolidate` and compare the actual changes to Section 1:
   ```powershell
   git diff --name-only <target-branch>
   ```
4. **Functional Walkthrough:** Present a walkthrough (build output, screenshots, or written summary).
5. **Senior Peer Review:** Run `/peer-review` as the final quality gate.
6. **Confirm with User:** Get **EXPLICIT approval** before committing.
7. **Final Commit & PR:** Seal the code and finalized trace, and run `gh pr create` linking the parent issue.
8. **Trace File Cleanup:**
   - **For Owned Projects (CI-managed):** Set up the reusable GitHub Action (`clean-ai-traces.yml`) to automatically delete `/docs/traces/*.md` and commit the cleanup when the PR is merged to `main`.
   - **For Contribution Mode (CLI-managed):** Delete the trace file(s) under `/docs/traces/` on your branch manually (or using local cleanup scripts) before merging to avoid leaving trace artifacts in the repository history, or rely on local `.git/info/exclude` so they are never tracked in the first place.

---

## 6. Technical Guide: Issue Relationship Management (REST API)

Always use the GitHub REST API rather than GraphQL to link sub-issues. 

### A) Retrieve the Child Issue's Database ID
In PowerShell, the endpoint template must be quoted to prevent syntax errors:
```powershell
gh api "/repos/{owner}/{repo}/issues/[child_issue_number]" --jq .id
```

### B) Link the Sub-Issue to the Parent
Using the database ID retrieved above, attach the sub-issue to its parent:
```powershell
gh api --method POST "/repos/{owner}/{repo}/issues/[parent_issue_number]/sub_issues" -F sub_issue_id=[CHILD_DATABASE_ID]
```