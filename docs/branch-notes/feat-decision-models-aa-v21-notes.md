# Branch Notes: feat/decision-models-aa-v21

## 1. Discoveries & Deviations
- Rank models by the Artificial Analysis Decision Index v2.1 (scores, cost, and time read from the page's embedded data on 2026-11-11). The cost-quality Pareto front is Celeris-1.1 (62.0, $14 per 1M tasks) → Decider v1.2 (69.8, $69) → Drex Max v1.1 (72.6, $103).
- The OpenRouter rankings page orders models by request volume, not quality. Jev leads on volume but scores 66.2.
- Celeris, GLiDE, and SubQ Snap return "does not exist" on the OpenRouter Decisions API, so they stay out of the table.
- `inception/mercury-decide` returns 404 (no endpoints).
- `nace-ai/drex-max` resolves to `drex-max-20261016`. AA does not list a slug, so treat it as Drex Max v1.1 unverified.
- Drex Max accepts up to 524,288 tokens of state but BM25-selects passages above ~130k, so it does not read the whole input. Drex v2.0 caps at 96 pieces.
- Decider's tokenizer counts roughly 2x the tokens d1 does, so per-call cost is about 2x d1. AA cost per task (68.5 vs 63.4) already reflects this.
- AA v2.1 scores `d1`, not the `liquid/d1.1` the skill calls (it resolves to `d1.1-20261027`), so d1.1 is unscored rather than dominated. `liquid/d1-ultra` and Jev 1.14 match their AA versions. SKILL.md now frames the index as a starting point and asks for spot-checks on the user's own examples.
- Head-to-head on 42 labeled questions from this repo (guard-hook source, this branch's diff, a drift variant, file relevance, command risk, prompt injection; 23 hard, 5 invariance pairs), run twice with identical results: d1.1, decider, drex, mammoth, and ultra scored 42/42 (Brier 0.010 / 0.008 / 0.004 / 0.003 / 0.007). Elephant scored 38/42, missing the `node_modules src` regex case, `--force-with-lease`, the missing-key fail-open path, and the drift-variant alias removal. Cost per 6-call run: d1 $0.00011, decider $0.00012, ultra $0.00022, elephant $0.00024, drex $0.00047, mammoth $0.00070. This set was too easy to separate the top models.
- Add `bench/decision-models/run.mjs`, a 63-question hard benchmark against frozen fixtures. It covers 28 guard-regex commands with labels computed by running the regexes, 19 doc-vs-code claims across SKILL.md and 4 scripts, 11 test-name lookups, 5 SKILL.md diff questions, and 5 invariance pairs. Results, identical across 2 runs except where noted: decider 62, ultra 62, mammoth 61 (the only model with all 28 regex answers right), drex 60, elephant 59, jev 55-57, d1.1 54-55. Brier: decider 0.018, ultra 0.019, mammoth 0.021, elephant 0.040, drex 0.042, d1.1 0.070, jev 0.074. Cost per run: decider $0.00025, ultra $0.0005, elephant $0.0005, jev $0.0005, drex $0.0013, mammoth $0.0014. d1.1 and jev changed answers between runs.
- Recast d1.1 and jev as comparison-only. Change escalation to decider → ultra, or mammoth for exact pattern or wording-sensitive calls.
- Drex Max accepts at most 16 questions per call (HTTP 422). Add `maxQ` to `MODELS` and make `decide()` split and merge automatically. It looks up the entry by alias or by full id. Verified with a 20-question call (2 calls, all correct).
- Almost every model got `slice(0, 1500)` wrong (it keeps the first 1500 characters); only decider and ultra answered correctly. SKILL.md now warns to read subtle code details directly.
- Make `decider` the default in `decide.mjs`, `audit.mjs` (scoped and wide), and `guard-hook.mjs`. Keep `pplx` as an alias of `decider`, and keep `d1` and `jev` as legacy aliases.
- `npm test`: 36/36 passed. Ran live calls through `decide.mjs` (noul and choice), `guard-hook.mjs` (returned `ask`), and `audit.mjs --help`.

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- Done: the guard's git pattern carried the `/i` flag, so `branch\s+-D` also matched the safe `git branch -d`. `branch -D` and `--delete --force` now sit in their own case-sensitive pattern; verified `-d` is skipped and `-D` is sent. The benchmark's frozen `guard.txt` fixture keeps the old regex on purpose, so its labels stay valid.

## 4. Deferred Items (4c)
- Retune guard thresholds (0.7 / 0.85) for decider from the usage log. Off-task scored 0.53 on a probe with no user request. `GUARD_MODEL=d1` restores the old behavior. Tracked in #28.
- Add Celeris when OpenRouter lists it, since it is the cheapest Pareto point. Tracked in #29.
- Regenerate `known-hashes.json` after the next release tag.
