---
name: feature-tracking
description: "Maintain a running branch notes document and manage the continuous 4a/4b/4c issue pipeline on feature branches"
---

# Branch Notes & Continuous Feature Tracking Workflow

Whenever you are working on a branch created with a **conventional prefix** (e.g., `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, `test/`, `perf/`, `build/`, `ci/`, `style/`), you MUST create and maintain a **Branch Notes** document. Unprefixed branches (e.g. `main`, `dev`) are exempt.

---

## 1. Document Setup & Location

- **File Path**: `/docs/branch-notes/[normalized-branch-name]-notes.md`
  - Normalize the branch name by replacing `/`, `_`, and spaces with `-`.
  - Example: For branch `feat/room-concurrency`, the file is `docs/branch-notes/feat-room-concurrency-notes.md`.
- **Trigger**: Initialize this document **immediately** upon creating or switching to a new prefixed branch.
- **Persistence**: Committed to the branch. Cleared from `main` automatically via GitHub Actions cleanup.
- **Local Exclusions**: When working in external repositories (contribution mode), configure `.git/info/exclude` for `docs/branch-notes/` to prevent committing local work artifacts.

---

## 2. Document Structure (Ultra-Low Token Standard)

Keep the document concise, high-signal, and bounded to 4 core sections:

```markdown
# Branch Notes: [branch-name]

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
   - **Local Verification First**: Run all local builds and automated test suites (`dotnet test`, `npm test`, etc.) to verify everything is 100% green.
   - **User Check-in**: Present 4a/b/c status to the user:
     - Report which 4b quick wins were included.
     - Review 4c deferred items and offer to create GitHub issues with estimates/labels.
     - Request explicit user approval to commit and open the PR.
3. **Autonomous Follow-Through**:
   - Once the user approves the Pre-Commit Gate, the agent commits, pushes, and creates the PR via `gh pr create`.
   - The agent monitors remote CI checks (`gh run watch` / `gh pr checks`) until all checks pass.
   - If CI is green, proceed autonomously to merge into `dev`. Do NOT introduce an extra, redundant pre-merge pause unless CI failed or manual intervention is strictly required.

### Autonomous Exceptions
- If the user explicitly directs the agent to **"work the issue all the way to completion"** or invokes **`/run-issue-to-pr`**, intermediate milestone check-ins are skipped, and the agent executes autonomously straight through to the verified PR.

---

## 5. Metacognitive Dynamic Scaling

Apply the foundation principles from `GEMINI.md` / `AGENTS.md`:
- **Heuristics Over Rigid Examples**: Use architectural judgment to classify items into 4b (quick win) vs 4c (defer). Do not follow mechanical checklists when task context dictates otherwise.
- **Safety Hierarchy**: **Data Integrity > System Safety > Contract Correctness > Token/Context Efficiency > Speed**.
- **Minimal Token Waste**: Write short, targeted bullets. Never rewrite the entire document when appending a single discovery or issue.