---
name: github-commands
description: "A cheatsheet for using the GitHub CLI (gh) and the REST API to manage issues, PRs, and sub-issues. Use when running gh CLI or GitHub REST API commands for issues, pull requests, or sub-issues."
---

# GitHub CLI & REST API Reference

Use this reference to execute common GitHub repository tasks via the CLI and REST API. Command examples are shell-agnostic unless a PowerShell or Bash variant is labeled.

---

## 1. Non-Interactive Command execution
To prevent CLI commands from hanging on interactive user prompt selections, always provide all input parameters explicitly:

### Create an Issue
```bash
gh issue create --title "[Component] Short summary" --body "Detailed issue body description"
```

### Create a Pull Request
```bash
gh pr create --title "feat: Add user login page" --body "Closes #123. Branch notes: docs/branch-notes/feat-login-notes.md"
```

---

## 2. Managing Sub-Issues (REST API)
GitHub supports hierarchical relationships using the sub-issues API endpoints. Because this API acts on the database ID of the child, rather than its issue number, use the following two-step process:

> [!IMPORTANT]
> **PowerShell Syntax Caveat:** Always enclose any endpoint paths containing curly braces (`{owner}`, `{repo}`) in double quotes (e.g., `"repos/{owner}/{repo}/..."`) to prevent PowerShell from throwing a syntax error. Double quotes work in Bash as well, so the commands below are valid in both shells.

### Step A: Get the Database ID of the Child Issue
```bash
gh api "repos/{owner}/{repo}/issues/[child_issue_number]" --jq .id
```
*(This returns an integer database ID, e.g., `123456789`).*

### Step B: Attach the Sub-Issue to the Parent
Using the database ID retrieved in Step A, post to the parent's sub-issues resource:
```bash
gh api --method POST "repos/{owner}/{repo}/issues/[parent_issue_number]/sub_issues" -F sub_issue_id=[CHILD_DATABASE_ID]
```

### Step C: List Sub-Issues
To list all child issues attached to a parent:
```bash
gh api "repos/{owner}/{repo}/issues/[parent_issue_number]/sub_issues" --jq '.[].number'
```

### Step D: Detach a Sub-Issue
To remove a child issue from a parent:
```bash
gh api --method DELETE "repos/{owner}/{repo}/issues/[parent_issue_number]/sub_issues/[CHILD_DATABASE_ID]"
```

---

## 3. Multi-Line Bodies
Avoid shell-specific newline escapes in `--body`. Write the body to a file and pass `--body-file`:
```bash
gh pr create --title "fix: <title> (#123)" --body-file pr-body.md
```
