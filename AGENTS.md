# Agent Execution & Interaction Principles

## Autonomous Action via CLI, MCP, and API
- **Direct Execution Over Menus:** Always prefer using a CLI, MCP, or API directly to accomplish tasks autonomously. Do not present menus of manual steps for the user to execute unless asked.
- **Non-Interactive First:** Run commands with non-interactive flags where applicable (e.g., `--yes`, `-y`, `--accept-package-agreements`, `--web`) to prevent terminal hang-ups.
- **Strict User Escalation Boundary:** Only delegate actions to the user if:
  1. It is verifiably better/faster for the user to do so directly, or
  2. It is impossible for the agent (e.g. interactive browser SSO/MFA, physical hardware manipulation, or entering secrets/passwords).

---

# Global Foundation Mandates (Antigravity)

These instructions provide a baseline for AI agent behavior across all projects and conversations on this machine.

## 1. General Development Workflows

### Git & Source Control (Windows/PowerShell)
- **Commits:** Prefer `git commit -am "message"` for modified tracked files. Use `git add` explicitly for new files.
- **PowerShell Chaining:** NEVER use `&&` to chain commands. Always use `;` (Windows compatible).
- **Standards:** All commits and PR titles **MUST** follow **Conventional Commits** (e.g., `feat:`, `fix:`) and use **Imperative Tense** (e.g., `Update`, not `Updated`) for the **entire message** (header and body).
- **Issue Reference:** Link GitHub Issues with `#123` or `fixes #123` where applicable.
- **Feature Tracking:** Maintain a running trace document in `/docs/traces/` for all **prefixed branches** (e.g. `feat/`, `fix/`, `chore/`). Make simple, targeted writes to the trace, and avoid checking `git status` repeatedly just to refresh the trace document.
- **Local Exclusions (Contribution Mode):** In contribution mode (external repos), configure local exclusions in `.git/info/exclude` for trace and task files (e.g., `/docs/traces/`, `/task.md`, `/walkthrough.md`) to avoid committing local work artifacts.

### GitHub & Issue Management (CLI/REST API)
- **Non-Interactive Mode:** Always run `gh` commands in non-interactive mode (e.g., passing `--title`, `--body`, or `-y`) to prevent terminal hangs on prompt inputs.
- **Sub-Issue Relationships:** Use the REST API endpoint `POST /repos/{owner}/{repo}/issues/{parent_number}/sub_issues` to attach sub-issues, passing the child's database ID via `-F sub_issue_id=[ID]`. Avoid GraphQL mutations for this.
- **PR Verification:** Ensure every Pull Request (`gh pr create`) explicitly references its parent issue number and the branch trace document.

### SonarQube & Code Quality
- **Architecture:** Preference for a **Unified Monorepo Architecture** when using SonarCloud.
- **CRITICAL:** SonarCloud "Automatic Analysis" MUST remain OFF. It overrides CI pipelines and causes 0% coverage bugs.
- **Tooling:** Use the SonarQube Web API or MCP tools for checking Quality Gates or transitioning issue states. Use `gh` for CI context, not for Sonar operations.

---

## 2. Global Engineering Standards

- **Surgical Edits:** Prioritize targeted `replace` calls over full-file rewrites to maintain file integrity and minimize unnecessary diffs.
- **Validation:** Every code change requires verification (build/test) and a systematic check to identify and fix any **errors, false assumptions, or missed opportunities**.
- **Plan Review:** Audit and verify proposed implementation plans using the `/plan-review` checklist before beginning any code modifications (or when not working on code directly) to ensure all constraints, **errors, false assumptions, or missed opportunities** are addressed before execution.
- **Design Review:** For design-focused tasks (layout, copy, aesthetics, accessibility, or styling consistency), execute the `/design-review` skill to systematically check for errors or styling gaps.
- **Peer Review:** Only run the full peer-review-with-quality sequence (using `/peer-review-with-quality` for Code, UX, Accessibility, Sonar, and Build verification) when explicitly prompted by the user, when preparing a Git commit, or when a meaningful chunk of work has been completed.
- **Workflows:** Utilize standardized skills in `~/.gemini/config/skills/` (e.g., `/run-issue-to-pr`, `/plan-review`, `/design-review`, `/feature-tracking`, `/peer-review-with-quality`), when preparing a commit, or after major milestones. Avoid running check workflows on minor intermediate steps.

---

## 3. Language-Specific Standards

### [**/*.{css,scss,less,html,js,jsx,ts,tsx}]
- **Avoid `!important`:** Avoid the use of `!important` at all costs.
- **Avoid Inline CSS:** Inline CSS (the `style="..."` attribute) MUST always be avoided unless critically necessary and used with explicit user permission.
- **External Files Preferred:** External CSS files should always be preferred for styling.
- **Simple Page Exception:** For extremely simple pages, a `<style>` section within the HTML/component file is acceptable ONLY if the USER approves.
- **Specificity:** Prioritize CSS specificity, modularity, and proper cascading over forced overrides.

---

## 4. Token & Context Efficiency Standards

- **Core Skill Brevity:** Keep core workflow instruction files (`SKILL.md`) compact and under 250 lines. Offload long checklists, extensive examples, templates, or references to subdirectories so they are read dynamically when needed rather than loaded by default.
- **Selective Rules:** Keep rules lean and focused on broad principles. Avoid embedding verbose, file-by-file or project-specific checklists in global rules.
- **Surgical Edits:** Always prefer target-specific edits over writing scripts or outputting entire files, minimizing both read and write token costs.
- **Trace Document Optimization:** When tracking progress on branches, make simple, targeted writes to the trace using low-token modification modes (such as Append Mode `/trace-append` or Section Update Mode `/trace-update`). Run these updates only when preparing a commit or after completing a meaningful chunk of work.
