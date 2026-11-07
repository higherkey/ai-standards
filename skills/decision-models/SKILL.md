---
name: decision-models
description: "Optional: use cheap System One decision models (d1, elephant, mammoth, Jev, pplx-decider) via OpenRouter for fast typed yes/no, choice, and score judgments instead of spending main-model tokens. Requires OPENROUTER_API_KEY. Use when the user asks for a decision model (\"ask d1\", \"ask jev\"), or when a narrow triage, routing, relevance-filtering, or spec-drift question can be answered from a small excerpt (is this task trivial, which files matter, does this code satisfy this requirement, did these edits drift from the plan)."
---

# Decision Models (System One)

Decision models read a state plus questions and return **probabilities**, not prose or tool calls. One call costs roughly $0.00001 to $0.0002 and takes about 0.3 to 0.5 s; output tokens are free. They handle narrow judgments, never code writing or explanations.

This skill is **optional**. If `OPENROUTER_API_KEY` is not set, skip it silently and fall back to the normal tiers in `subagent-delegate-on-rails`.

## Setup (one time)
1. Create an OpenRouter account and add a small credit (about $5 lasts a very long time at these prices).
2. Create an API key and expose it as `OPENROUTER_API_KEY` in your user environment (never in a committed file):
   - PowerShell: `[Environment]::SetEnvironmentVariable('OPENROUTER_API_KEY', '<key>', 'User')`, then restart the terminal and the agent.
   - Bash/zsh: add `export OPENROUTER_API_KEY=<key>` to your shell profile.
3. Check it: `node <skill-dir>/scripts/decide.mjs --models`, then one cheap call (see below).

The scripts need Node 18+ and have no dependencies. `<skill-dir>` is this skill's installed folder (e.g. `.claude/skills/decision-models` or `.agents/skills/decision-models`).

## When to use one
Use a decision model when the question is **narrow, answerable from the text you give it, and cheaper to ask than to read**:
- Triage or routing: "is this task trivial?", "which of these 40 files matter for X?"
- Spec drift: "does this code satisfy this requirement?", "does this doc still match that file?"
- Filtering: "is this log or tool output relevant to the task?"
- Sanity gates before an irreversible step (advisory only).

Do NOT use one for writing or editing code, open-ended reasoning, anything that needs an explanation, or as the sole gate on an irreversible action. Treat results as **advisory evidence**; when a result is low confidence or decisive, verify by reading the relevant lines yourself.

## Which model
| Need | Model | Why / limit |
|---|---|---|
| Default quick yes/no, routing, triage | `d1` (liquid/d1.1) | Cheapest, 65k context |
| Second opinion on a close call | `elephant` | Different model family; 16k context |
| Hard multi-branch or AST-style call | `mammoth` | Most accurate; 16k context |
| Visual or layout judgment (images) | `ultra` (d1-ultra) | Images; 32k context |
| Does text A entail or support claim B | `pplx` | Entailment specialist; 262k context |
| Large state (above ~65k tokens) | `jev` or `pplx` | 262k context; prefer scoping evidence down |

Context caps are hard. Prefer **small, scoped evidence per question**; many questions can share one state in a single call. `node <skill-dir>/scripts/decide.mjs --models` prints the current table; model ids change, so update `scripts/sysone.mjs` when OpenRouter renames them.

## How to call
Ad-hoc yes/no (probability of "yes" per question):
```bash
node <skill-dir>/scripts/decide.mjs --model d1 --state-file notes.md \
  --ask "Does this contradict the plan?" --ask "Is it safe to skip the migration?"
```

Typed questions (`choice` / `score` / `noul`) via JSON on stdin:
```bash
echo '{"state":{"ticket":"..."},"questions":{
  "team":{"type":"choice","instructions":"Which team owns this?","criteria":{"billing":"payments","web":"frontend"}},
  "urgent":{"type":"noul","instructions":"Is this blocking revenue?"}}}' | node <skill-dir>/scripts/decide.mjs --model d1
```

Spec-vs-code audit across many claims: `node <skill-dir>/scripts/audit.mjs --help`. A checks file looks like `{ "root": "<repo>", "plan": "docs/plan.md", "wide_globs": ["src/**"], "claims": [{ "id": "c1", "claim": "...", "files": ["src/x.ts"] }] }`.

## Reading results
- `noul` is P(yes), 0 to 1. `choice` returns the pick plus `confidence` and per-option `probabilities`. `score` returns a value on the ordered criteria.
- **Calibration differs by model.** d1 tends to be confident; elephant is more conservative. Start around 0.7 for "act on it" and treat below 0.5 as "unsure"; tune using the usage log.
- If two models disagree, or confidence is under about 0.6, escalate once (d1 to elephant or mammoth) or read the source yourself. Do not loop.

## Optional: destructive-command guard (Claude Code)
`scripts/guard-hook.mjs` is a PreToolUse hook for Bash. A regex pre-filter sends only risky-looking commands to d1 and asks the user to confirm when the model judges them irreversible, off-task, or outside the project. It fails open (never blocks on errors or a missing key). It is opt-in: register it yourself in `.claude/settings.json` under `hooks.PreToolUse` with matcher `Bash` and command `node <absolute-skill-dir>/scripts/guard-hook.mjs`. Disable with `DECISION_GUARD=off`.

## Cost and usage log
Each call appends metadata only (time, model, latency, tokens, cost; never state content) to `~/.ai-standards/decision-log.jsonl`. Override the path with `DECISION_LOG`, or set `DECISION_LOG=off`.

## Privacy
The state you send goes to OpenRouter and the model's provider. Never include `.env` files, API keys, tokens, credentials, or customer personal data. Send excerpts, not whole repos, unless the user has said that project is fine to send. `audit.mjs` skips `.env*`, databases, lockfiles, `node_modules`, `dist`, and `.git`.

## Reporting
Say which model you used, what state you sent (briefly), the probabilities, your own read, and the cost.
