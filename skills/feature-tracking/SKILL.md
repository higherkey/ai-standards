---
name: feature-tracking
description: "Maintain a running branch notes document and manage the continuous 4a/4b/4c issue pipeline on feature branches. Use when working on a conventionally prefixed branch (feat/, fix/, chore/) that needs branch notes, or when asked where a project stands: what it needs now, what is in progress, or whether it is ready for dev testing."
---

# Branch Notes & Continuous Feature Tracking Workflow

Whenever you are working on a branch created with a **conventional prefix** (e.g., `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, `test/`, `perf/`, `build/`, `ci/`, `style/`), you MUST create and maintain a **Branch Notes** document. Unprefixed branches (e.g. `main`, `dev`) are exempt.

---

## 1. Document Setup & Location

- **File Path**: `/docs/branch-notes/[normalized-branch-name]-notes.md`
  - Normalize the branch name by replacing `/`, `_`, and spaces with `-`.
  - Example: For branch `feat/room-concurrency`, the file is `docs/branch-notes/feat-room-concurrency-notes.md`.
- **Trigger**: Initialize this document **immediately** upon creating or switching to a new prefixed branch.
- **Persistence**: Committed to the branch. A GitHub Actions cleanup deletes them from the PR's base branch right after merge (e.g. `dev` in a `dev` → `main` release train), so they are gone before any promotion and the release branch never gets a cleanup commit of its own. The PR keeps them in its diff.
- **Local Exclusions**: Branch notes are committed by default. Only in repositories owned by someone else (contribution mode), add `docs/branch-notes/` to that clone's `.git/info/exclude`, never to a global excludes file. Where the user is a primary contributor, ask once per repo whether the owner wants branch notes committed.

---

## 2. Document Structure (Ultra-Low Token Standard)

Keep the document concise, high-signal, and bounded to a status line plus 4 core sections:

```markdown
# Branch Notes: [branch-name]

> **Status:** in-progress | in-review (PR #N) | ready-for-dev-test | blocked | merged · **Next:** one line · **Updated:** YYYY-MM-DD

## 1. Discoveries & Deviations
- Concise bullet points summarizing architectural discoveries, schema nuances, or deviations from the original plan.

## 2. Blockers & Risks (4a)
- Active impediments, failing tools, breaking external dependencies, or environment constraints preventing completion.

## 3. Quick Wins (4b)
- Relevant, low-hanging improvements or missed edge cases discovered during work that are folded directly into this branch/PR before closing.

## 4. Deferred Items (4c)
- Out-of-scope discoveries, architectural refactors, or new feature ideas that cannot be completed in this branch. These serve as candidates for new GitHub issues.
```

---

## 3. The Continuous Issue Engine (4a / 4b / 4c)

The core purpose of Section 4 is to power a **continuous cycle of issue resolution and creation**:

- **4a) Blockers & Risks**: Halt-the-line items. Must be surfaced immediately.
- **4b) Quick Wins (Opportunities)**: Small, relevant improvements that are fast and safe to implement within the active branch. Resolve these in the current PR rather than deferring.
- **4c) Deferred Items (Backlog Candidates)**: Discoveries that would cause scope creep. At check-in gates, present these to the user to spawn new GitHub issues via `gh issue create`.

---

## 4. Streamlined Check-in Cadence

The agent MUST present the status of all `4a`, `4b`, and `4c` items and check in with the user at these specific junctures:

1. **Staged Plan Milestones / Work Chunks**:
   - If an implementation plan has distinct phases or chunks, check in after completing a chunk to report progress and present newly discovered 4a/b/c items before starting the next chunk.
2. **Pre-Commit Quality Gate (Primary Triage Checkpoint)**:
   - **Runtime Verification Mandate**: Static-only approvals (such as AST syntax checks or dry parsers) are strictly eliminated. All builds, scripts, and automated test suites (`dotnet test`, `npm test`, real runtime execution) must be actively executed and verified 100% green before presenting the gate. If any test step requires manual execution, it must be explicitly surfaced.
   - **User Check-in**: Present 4a/b/c status to the user:
     - Report which 4b quick wins were included.
     - Review 4c deferred items and offer to create GitHub issues with estimates/labels.
     - Request explicit user approval to commit and open the PR.
3. **Autonomous Follow-Through**:
   - Once the user approves the Pre-Commit Gate, the agent commits, pushes, and creates the PR via `gh pr create`.
   - The agent monitors remote CI checks (`gh run watch` / `gh pr checks`) until all checks pass.
   - If CI is green, proceed autonomously to merge into `dev`. Do NOT introduce an extra, redundant pre-merge pause unless CI failed or manual intervention is strictly required.

- If the user explicitly directs the agent to **"work the issue all the way to completion"** or invokes **`/resolve-issue`**, intermediate milestone check-ins are skipped, and the agent executes autonomously straight through to the verified PR or merge destination.

---

## 5. Metacognitive Dynamic Scaling

Apply the foundation principles from the project rules file (`AGENTS.md`):
- **Heuristics Over Rigid Examples**: Use architectural judgment to classify items into 4b (quick win) vs 4c (defer). Do not follow mechanical checklists when task context dictates otherwise.
- **Safety Hierarchy**: **Data Integrity > System Safety > Contract Correctness > Token/Context Efficiency > Speed**.
- **Minimal Token Waste**: Write short, targeted bullets. Never rewrite the entire document when appending a single discovery or issue.

---

## 6. Answering "Where Are We?"

Branch notes must answer status questions without anyone re-deriving them: what does the project need now, what is in progress, is it ready for dev testing.

- **Status line upkeep**: Update the branch notes `Status` line at every check-in gate (branch start, chunk milestone, PR opened, merged). `ready-for-dev-test` means the work is on the branch testers run (merged, or a PR with green CI and real runtime verification), with no open 4a items and every manual step listed.
- **Workspace index**: When one project spans several repositories (an umbrella repo with siblings, or a monorepo with several active branches), keep `docs/STATUS.md` in the umbrella repo, using the template in `references/status-index.md`. Update its row at the same gates. A single-repo project with one active branch needs no index.
- **Answering procedure**:
  1. Read `docs/STATUS.md` if it exists, then the branch notes `Status` lines.
  2. Verify against live state before answering, because docs drift: run `git status` (uncommitted or untracked work), list commits ahead of the base branch, list open PRs with `gh pr list --json number,title,headRefName`, and check CI.
  3. Lead with the verdict (ready for dev testing / mid-work / blocked), then what is needed next, in order, then owner decisions.
  4. Flag uncommitted specs, designs or code first: work that exists only on one disk is the highest risk.
  5. Fix any drift you found in the index and the branch notes in the same turn.