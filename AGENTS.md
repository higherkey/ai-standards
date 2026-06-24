# Global Foundation Mandates (Antigravity)

This file defines the global architectural principles, development workflows, and technical standards that apply across all projects. These instructions provide a baseline for AI agent behavior.

## 1. General Development Workflows

### Git & Source Control (Windows/PowerShell)
- **Commits:** Prefer `git commit -am "message"` for modified tracked files. Use `git add` explicitly for new files.
- **PowerShell Chaining:** NEVER use `&&` to chain commands. Always use `;` (Windows compatible).
- **Standards:** All commits and PR titles **MUST** follow **Conventional Commits** (e.g., `feat:`, `fix:`) and use **Imperative Tense** (e.g., `Update`, not `Updated`) for the **entire message** (header and body).
- **Issue Reference:** Link GitHub Issues with `#123` or `fixes #123` where applicable.
- **Feature Tracking**: Maintain a running trace document in `/docs/traces/` for all **prefixed branches** (e.g. `feat/`, `fix/`, `chore/`). Make simple, targeted writes to the trace, and avoid checking `git status` repeatedly just to refresh the trace document.
- **Local Exclusions (Contribution Mode):** In contribution mode (external repos), configure local exclusions in `.git/info/exclude` for trace and task files (e.g., `/docs/traces/`, `/task.md`, `/walkthrough.md`) to avoid committing local work artifacts.

### GitHub & Issue Management (CLI/REST API)
- **Non-Interactive Mode:** Always run `gh` commands in non-interactive mode (e.g., passing `--title`, `--body`, or `-y`) to prevent terminal hangs on prompt inputs.
- **Sub-Issue Relationships:** Use the REST API endpoint `POST /repos/{owner}/{repo}/issues/{parent_number}/sub_issues` to attach sub-issues, passing the child's database ID via `-F sub_issue_id=[ID]`. Avoid GraphQL mutations for this.
- **PR Verification:** Ensure every Pull Request (`gh pr create`) explicitly references its parent issue number and the branch trace document.

### SonarQube & Code Quality
- **Architecture**: Preference for a **Unified Monorepo Architecture** when using SonarCloud. 
- **CRITICAL**: SonarCloud "Automatic Analysis" MUST remain OFF. It overrides CI pipelines and causes 0% coverage bugs.
- **Tooling**: Use the SonarQube Web API or MCP tools for checking Quality Gates or transitioning issue states. Use `gh` for CI context, not for Sonar operations.

## 2. Global Engineering Standards

- **Surgical Edits:** Prioritize targeted `replace` calls or `multi_replace` over full-file rewrites to maintain file integrity and minimize unnecessary diffs.
- **Validation:** Every code change requires verification (build/test) and a systematic check to identify and fix any **errors, false assumptions, or missed opportunities**.
- **Plan Review:** Audit and verify proposed implementation plans using the `/plan-review` checklist before beginning any code modifications (or when not working on code directly) to ensure all constraints, **errors, false assumptions, or missed opportunities** are addressed before execution.
- **Design Review:** For design-focused tasks (layout, copy, aesthetics, accessibility, or styling consistency), execute the `/design-review` skill to systematically check for errors or styling gaps.
- **Peer Review:** Only run the full peer-review sequence (using `/peer-review` for Code, UX, Accessibility, Sonar, and Build verification) when explicitly prompted by the user, when preparing a Git commit, or when a meaningful chunk of work has been completed.
- **Workflows:** Utilize standardized workflow templates found in the global `~/.gemini/antigravity/global_workflows/` directory when prompted (e.g., `/plan-review`, `/design-review`, `/feature-tracking`, `/peer-review`), when preparing a commit, or after major milestones. Avoid running check workflows on minor intermediate steps.

## 3. Execution Mandates

- **Non-Interactive Mode**: Run commands in non-interactive mode where possible to avoid hanging on user input.
- **Tool Selection**: Always prefer native file-manipulation tools (such as `write_to_file`, `replace_file_content`, and `multi_replace_file_content`) over writing custom scripts (like Python or PowerShell) to create or edit files. If native tools are blocked by sandbox path permissions, do NOT attempt to bypass them automatically using scripts; instead, stop and ask the user for permission or explicit instructions.
- **Safety**: Do not stage or commit files unless explicitly requested or required by a finalized workflow step.

## 4. Language-Specific Standards

### [**/*.{css,scss,less,html,js,jsx,ts,tsx}]
- **Avoid `!important`**: Avoid the use of `!important` at all costs. 
- **Avoid Inline CSS**: Inline CSS (the `style="..."` attribute) MUST always be avoided unless critically necessary and used with explicit user permission.
- **External Files Preferred**: External CSS files should always be preferred for styling.
- **Simple Page Exception**: For extremely simple pages, a `<style>` section within the HTML/component file is acceptable ONLY if the USER approves.
- **Specificity:** Prioritize CSS specificity, modularity, and proper cascading over forced overrides.

## 5. Token & Context Efficiency Standards

To prevent growing AI workflows from bloating context windows and exceeding rate limits, all tools, rules, and agents must prioritize token efficiency:
- **Core Skill Brevity:** Keep core workflow instruction files (`SKILL.md`) compact and under 500 lines. Offload long checklists, extensive examples, templates, or references to subdirectories (e.g., `references/`, `examples/`) so they are read dynamically when needed rather than loaded by default.
- **Selective Rules:** Keep `AGENTS.md` lean and focused on broad principles. Avoid embedding verbose, file-by-file or project-specific checklists in global rules.
- **Surgical Edits:** Always prefer target-specific edits (`replace_file_content` or `multi_replace_file_content`) over writing scripts or outputting entire files, minimizing both read and write token costs.
- **Trace Document Optimization:** When tracking progress on branches, make simple, targeted writes to the trace using low-token modification modes (such as Append Mode `/trace-append` or Section Update Mode `/trace-update`). Run these updates only when preparing a commit or after completing a meaningful chunk of work, rather than rewriting the document or checking git status constantly.
- **Redundancy Audits:** Regularly audit customized rules and skills for overlapping guidelines and prune verbose or outdated instructions.
