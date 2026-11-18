# Branch Notes: feat/decision-model-registry

Plan: `docs/superpowers/plans/2026-11-17-decision-model-registry.md`

## 1. Discoveries & Deviations
- OpenRouter has no list endpoint for decision models: `/api/v1/models` (443 models) has none of them, only `typesafe/jev-router`; `/api/alpha/decisions/models` and `/api/alpha/models` return 404.
- A one-question probe (about $0.000002) tells three states apart. HTTP 200 is live, and the response `model` is the dated snapshot. HTTP 404 `No endpoints found` means listed but not served. HTTP 400 `does not exist` means absent.
- On 2026-11-17, `liquid/d1.2` is live (`liquid/d1.2-20261116`) and `perplexity/pplx-decider-v1.3` is listed with no endpoints.
- First live `check.mjs` run (2026-11-17, 3 s): all 7 current ids live; `NEW liquid/d1.2 live`; `COMING perplexity/pplx-decider-v1.3 listed`; exit 1.
- Several sibling repos pin their own ids or carry their own decision clients (JS, TS, and Python).
- First `--scan` of three sibling workspaces: 255 outdated hits in 42 files. Code hits: one app and its test pin `typesafe/jev-1.13` (registry has 1.14); one Python service, its tests, and its eval thresholds pin `liquid/d1.1`; one loose copy of `sysone.mjs` pins `liquid/d1.1`. The rest are docs, specs, and benchmark results (one results file alone has 201).
- The first scan took 2m34s. One Rust project's `target/` folder (build output, 16,781 files) took 25s of it, and a cold disk cache likely the rest. After skipping `target`, `__pycache__`, `.venv`, `venv`, and `.tox`, and collapsing repeat hits per file and id, the full run (probes plus scan) takes 3.8s and prints 57 lines.
- `liquid/d1.2` on the hard bench: 57/63 and 59/63 across two runs (d1.1 was 54-55), Brier 0.077 (d1.1 0.070), $0.00025 per run. It still misses regex cases and `slice(0, 1500)`, and its answers changed between runs, so `d1` stays comparison-only.
- The final review found two Important bugs, both now fixed with tests. The scan regex backtracked, so `pplx-decider-v1.2-preview` matched as `v1`. And `check.mjs` did nothing when run through a linked folder: Node realpaths the module URL but not `argv[1]`. The junction test reproduced this on Windows. Probes are also capped at 15 s, so a network hang can't stall a check for about 30 minutes.
- `npm test`: 36/36 CLI tests plus 19/19 decision-model unit tests.

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- Done: SKILL.md "Which model" table had a duplicate header row and a stray paragraph inside it.
- Done: the guard hook now loads `sysone.mjs` with a dynamic import, so a missing or broken `models.json` still fails open.

## 4. Deferred Items (4c)
- Add Celeris to `models.json` `watch` once its OpenRouter id is known. Tracked in #29.
- Adopt `perplexity/pplx-decider-v1.3` once `check.mjs` shows it live, after a bench run, since it is the default.
- After the next release tag: regenerate `known-hashes.json` and re-sync the installed skill (`~/.claude/skills/decision-models` is older than the repo copy).
- Hardening deferred from the final review:
  - A `models.json` with the wrong shape gives a TypeError that doesn't name the file.
  - `check.mjs` exits 0 when every candidate probe errors (for example on 429s), so a scheduled run could miss a release.
  - The "absent" match is too loose; it should be `/Model \S+ does not exist/`.
  - A broken registry turns the guard off without writing anything to stderr.
  - `bench --only=pplx` sends `undefined` as the model.
  - Argument parsing is loose, and a few tests are missing (exit logic, `newestKnown`, unreadable files).
- Bump the outdated pins `--scan` found: filed as issues in the affected projects' own repos (one also needs its eval rerun). The loose `sysone.mjs` copy isn't under version control, so it has no issue.
