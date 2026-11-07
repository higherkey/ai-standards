# Branch Notes: feat/subagent-model-effort (#20)

## Discoveries
- Claude Code only applies a per-dispatch `effort` override when instructions explicitly authorize it; the adapter called rails-agent settings "fixed", so effort never varied.

## 4a Blockers
- None.

## 4b Quick Wins
- Suggested tier/effort table added to `subagent-delegate-on-rails`; adapter grants explicit override authority; the decision tier picks the pair when set up.

## 4c Deferred Items
- Verify in a live session that an `effort` override on a `rails-*` dispatch takes effect.
