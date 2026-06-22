---
name: github-commands
description: "A cheatsheet for using the GitHub CLI (gh) and the REST API to manage issues, PRs, and sub-issues"
---

# GitHub CLI & REST API Reference

Use this reference to execute common GitHub repository tasks via the CLI and REST API. 

---

## 1. Non-Interactive Command execution
To prevent CLI commands from hanging on interactive user prompt selections, always provide all input parameters explicitly:

### Create an Issue
```powershell
gh issue create --title "[Component] Short summary" --body "Detailed issue body description"
```

### Create a Pull Request
```powershell
gh pr create --title "feat: Add user login page" --body "Closes #123. Review trace at docs/traces/feat-login-trace.md"
```

---

## 2. Managing Sub-Issues (REST API)
GitHub supports hierarchical relationships using the sub-issues API endpoints. Because this API acts on the database ID of the child, rather than its issue number, use the following two-step process:

> [!IMPORTANT]
> **PowerShell Syntax Caveat:** Always enclose any endpoint paths containing curly braces (`{owner}`, `{repo}`) in double quotes (e.g., `"repos/{owner}/{repo}/..."`) to prevent PowerShell from throwing a syntax error.

### Step A: Get the Database ID of the Child Issue
```powershell
gh api "repos/{owner}/{repo}/issues/[child_issue_number]" --jq .id
```
*(This returns an integer database ID, e.g., `123456789`).*

### Step B: Attach the Sub-Issue to the Parent
Using the database ID retrieved in Step A, post to the parent's sub-issues resource:
```powershell
gh api --method POST "repos/{owner}/{repo}/issues/[parent_issue_number]/sub_issues" -F sub_issue_id=[CHILD_DATABASE_ID]
```

### Step C: List Sub-Issues
To list all child issues attached to a parent:
```powershell
gh api "repos/{owner}/{repo}/issues/[parent_issue_number]/sub_issues" --jq '.[].number'
```

### Step D: Detach a Sub-Issue
To remove a child issue from a parent:
```powershell
gh api --method DELETE "repos/{owner}/{repo}/issues/[parent_issue_number]/sub_issues/[CHILD_DATABASE_ID]"
```
