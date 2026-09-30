# Agent Execution & Interaction Principles

## Autonomous Action via CLI, MCP, and API
- **Direct Execution Over Menus:** Always prefer using a CLI, MCP, or API directly to accomplish tasks autonomously. Do not present menus of manual steps for the user to execute unless asked.
- **Non-Interactive First:** Run commands with non-interactive flags where applicable (e.g., `--yes`, `-y`, `--accept-package-agreements`, `--web`) to prevent terminal hang-ups.
- **Strict User Escalation Boundary:** Only delegate actions to the user if:
  1. It is verifiably better/faster for the user to do so directly, or
  2. It is impossible for the agent (e.g. interactive browser SSO/MFA, physical hardware manipulation, or entering secrets/passwords).

## Metacognitive Allowances, Heuristics Over Examples, & Conflict Resolution
- **Heuristics Over Rigid Examples:** Rules, workflows, and skills express principles and heuristic frameworks. Concrete examples (such as specific model names like `flash` or `flash_lite`, named tool sequences, or enumerated work archetypes) are illustrative reference points, never exhaustive or restrictive boundaries. Never treat an illustrative example as an absolute constraint unless explicitly prefixed with MUST or NEVER.
- **Metacognitive Dynamic Scaling:** Agents possess full autonomy to evaluate task complexity, context pressure, and domain stakes dynamically:
  - *Model-Tier & Resource Selection:* Autonomously decide whether a task can be delegated to the cheapest suitable tier (e.g. `flash_lite` for mechanical search/syntax checks, `flash` for focused audits/edits), needs a higher-capability model tier (`pro`), or should be executed directly by the parent agent to eliminate delegation overhead.
  - *Archetype Flexibility:* Adapt, customize, or synthesize new work archetypes beyond standard templates whenever a problem warrants a specialized operational posture.
  - *Skill Invocation Autonomy:* Dynamically identify, chain, or omit domain skills based on actual project context rather than mechanical checklist compliance.
- **Principled Conflict & Gap Resolution:** When rules appear to conflict or when operating in unguided edge cases:
  1. Default to core intent and safety hierarchy: **Data Integrity > System Safety > Contract Correctness > Token/Context Efficiency > Speed**.
  2. Reason through trade-offs explicitly rather than freezing, hallucinating compliance, or silently bypassing constraints.
  3. When an ambiguous trade-off crosses a user-intent boundary, escalate to the user with a concise, actionable question.

---

# Global Foundation Mandates (Antigravity)

These instructions provide a baseline for AI agent behavior across all projects and conversations on this machine.

## 1. General Development Workflows

### Git & Source Control (Windows/PowerShell)
- **Commits:** Prefer `git commit -am "message"` for modified tracked files. Use `git add` explicitly for new files.
- **PowerShell Chaining:** NEVER use `&&` to chain commands. Always use `;` (Windows compatible).
- **Standards:** All commits and PR titles **MUST** follow **Conventional Commits** (e.g., `feat:`, `fix:`) and use **Imperative Tense** (e.g., `Update`, not `Updated`) for the **entire message** (header and body).
- **Issue Reference:** Link GitHub Issues with `#123` or `fixes #123` where applicable.
- **Branch Notes:** Maintain a running branch notes document in `/docs/branch-notes/` for all **prefixed branches** (e.g. `feat/`, `fix/`, `chore/`). Track Discoveries, 4a Blockers, 4b Quick Wins, and 4c Deferred Items.
- **Check-in Cadence:** Run local verification first, then present 4a/4b/4c items at plan chunk milestones and the Pre-Commit Gate before committing.
- **Local Exclusions (Contribution Mode):** In contribution mode (external repos), configure local exclusions in `.git/info/exclude` for branch notes and task files (e.g., `/docs/branch-notes/`, `/task.md`, `/walkthrough.md`) to avoid committing local work artifacts.

### GitHub & Issue Management (CLI/REST API)
- **Non-Interactive Mode:** Always run `gh` commands in non-interactive mode (e.g., passing `--title`, `--body`, or `-y`) to prevent terminal hangs on prompt inputs.
- **Sub-Issue Relationships:** Use the REST API endpoint `POST /repos/{owner}/{repo}/issues/{parent_number}/sub_issues` to attach sub-issues, passing the child's database ID via `-F sub_issue_id=[ID]`. Avoid GraphQL mutations for this.
- **PR Verification:** Ensure every Pull Request (`gh pr create`) explicitly references its parent issue number and the branch notes document.

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
- **Branch Notes Optimization:** Keep branch notes documents short, focused on delta discoveries and 4a/4b/4c items, eliminating redundant checklists and high-token rewrites.
