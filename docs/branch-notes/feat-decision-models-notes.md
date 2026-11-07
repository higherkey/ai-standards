# Branch Notes: feat/decision-models

Issue: #16

## 1. Discoveries & Deviations
- Ported the user's personal `decision-models` skill and its scripts (`sysone`, `decide`, `audit`, `guard-hook`) into `skills/decision-models/scripts/`, so they sync with the skill to every target.
- Usage log moved from the script folder to `~/.ai-standards/decision-log.jsonl` (`DECISION_LOG` overrides or turns it off), so it never lands in a repo.
- Not shipped: the project-specific `checks/e1f.json`, `reports/`, and the personal `log.jsonl`. The guard hook ships but is opt-in.
- A personal `~/.claude/skills/decision-models` shadows the synced project copy in Claude Code.

## 2. Blockers & Risks (4a)
- OpenRouter model ids change; the table in `sysone.mjs` needs occasional updates.

## 3. Quick Wins (4b)

## 4. Deferred Items (4c)
- A CLI flag to register the guard hook in `.claude/settings.json` automatically.
