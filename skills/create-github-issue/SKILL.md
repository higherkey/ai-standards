---
name: create-github-issue
description: "Procedures and best practices for creating GitHub Issues with project boards and estimates"
---

# Creating GitHub Issues (`/create-github-issue`)

Follow this workflow to ensure every issue is well-defined, properly categorized, and integrated into the project management board.

---

## 1. Research & Requirements Check
Before creating a new issue, verify if there are any repository-specific requirements:
- Check `.github/ISSUE_TEMPLATE/` for specific formats.
- Check `.github/CONTRIBUTING.md` if it exists.
- Search for existing issues to avoid duplicates:
  ```powershell
  gh issue list --search "<keyword>"
  ```

---

## 2. General Best Practices
- **Title**: Use a clear, concise title. For features, use `feat: [Description]`. For bugs, use `fix: [Description]`.
- **Description**:
  - **Problem/Goal**: Clear explanation of what needs to be solved.
  - **Proposed Solution**: Technical or functional approach.
  - **Acceptance Criteria**: A checklist of "done" states.
  - **Tasks**: Granular steps to complete the work.
- **Labels**: Apply relevant labels like `enhancement`, `bug`, `documentation`, or `architecture`.

---

## 3. Project Board Integration & Estimates
Where project boards are enabled, ensure the issue has proper categorization:
- **Priority**: `Priority: High`, `Priority: Medium`, or `Priority: Low` (or `P0`/`P1`/`P2`).
- **Size / Estimate**: `Size: Small`, `Size: Medium`, or `Size: Large`.
- **Status**: `Status: Backlog`, `Status: Ready`, etc.

---

## 4. Advanced Properties (GitHub REST API)
For properties not supported by basic `gh issue create` (like complex relationships or specific repository settings), use the **GitHub REST API**:

Example for adding a comment via REST:
```powershell
gh api -X POST repos/{owner}/{repo}/issues/{issue_number}/comments -f body="Advanced comment via REST"
```

Attach a child sub-issue using the REST API:
```powershell
gh api --method POST "/repos/{owner}/{repo}/issues/{parent_number}/sub_issues" -F sub_issue_id=[CHILD_DATABASE_ID]
```

---

## 5. Draft & Approval Process
1. **Draft**: Present the draft (Title, Body, Labels, Project) to the USER.
2. **Approval**: Wait for explicit user approval before running the creation command.
   - *Exception*: If the user gave explicit "proceed" permission in the initial request, create it immediately.
3. **Create**: Execute `gh issue create` using non-interactive flags:
   ```powershell
   gh issue create --title "feat: <title>" --body "<markdown-body>" --label "<labels>"
   ```
