# Branch Notes: feat/decision-model-registry

Plan: `docs/superpowers/plans/2026-11-17-decision-model-registry.md`

## 1. Discoveries & Deviations
- OpenRouter has no list endpoint for decision models: `/api/v1/models` (443 models) has none of them, only `typesafe/jev-router`; `/api/alpha/decisions/models` and `/api/alpha/models` return 404.
- A one-question probe (about $0.000002) tells three states apart. HTTP 200 is live, and the response `model` is the dated snapshot. HTTP 404 `No endpoints found` means listed but not served. HTTP 400 `does not exist` means absent.
- On 2026-11-17, `liquid/d1.2` is live (`liquid/d1.2-20261116`) and `perplexity/pplx-decider-v1.3` is listed with no endpoints.
- First live `check.mjs` run (2026-11-17, 3 s): all 7 current ids live; `NEW liquid/d1.2 live`; `COMING perplexity/pplx-decider-v1.3 listed`; exit 1.
- Several sibling repos pin their own ids or carry their own decision clients (JS, TS, and Python).

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- SKILL.md "Which model" table has a duplicate header row and a stray paragraph inside it (fixed in Task 4).

## 4. Deferred Items (4c)
- None yet.
