# Workspace Status Index Template (`docs/STATUS.md`)

Keep this to one screen. Each row points to the detail in branch notes and PRs instead of restating it.

```markdown
# [Project] Status

> **Verdict:** mid-work | ready-for-dev-test | blocked · **Current milestone:** [name] · **Updated:** YYYY-MM-DD

## Active Work
| Repo | Branch | Status | PR | Next |
|---|---|---|---|---|
| core | feat/example | in-review | #12 | merge, then start S4 |

## Next Up (in order)
1. [Smallest next step that unblocks the most]

## Owner Decisions Pending
- [Decision only the owner can make, with the doc that frames it]

## Manual Steps Outstanding
- [Step an agent cannot do: secrets, account caps, hardware]
```

Rules:
- Status values match the branch notes `Status` line: `in-progress`, `in-review`, `ready-for-dev-test`, `blocked`, `merged`.
- Remove a row once its branch is merged and the next milestone no longer depends on it.
- The verdict is `ready-for-dev-test` only when every row the testers need is merged, or is in review with green CI and runtime verification.
