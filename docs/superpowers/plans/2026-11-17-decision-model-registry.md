# Decision Model Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `skills/decision-models/models.json` the one place decision-model ids live, and add a `check.mjs` command that finds new model versions on OpenRouter and stale ids in any folder.

**Architecture:** A language-neutral JSON registry ships inside the skill (sync copies every file in a skill folder). `sysone.mjs` loads it instead of hardcoding `MODELS`; every script and the bench read defaults from it. `check.mjs` probes OpenRouter with one-question calls for the current id and the likely next versions of each family, and optionally scans folders for older ids. Apps keep pinning their own ids; `--scan` tells you which ones are behind.

**Tech Stack:** Node 18+ ESM, no dependencies, `node:test` for unit tests.

**Spec:** No separate spec file. The design was agreed in conversation on 2026-11-17 and is summarized in "Design facts" below.

## Design facts (verified 2026-11-17)

- OpenRouter has **no list endpoint** for decision models: `/api/v1/models` returns 443 models with none of them (only `typesafe/jev-router`); `/api/alpha/decisions/models` and `/api/alpha/models` return 404.
- A one-question probe to `POST /api/alpha/decisions` costs about $0.000002 and tells three states apart:
  - live: HTTP 200, and the body's `model` is the dated snapshot (`liquid/d1.2` → `liquid/d1.2-20261116`)
  - listed: HTTP 404 `No endpoints found for <id>` (`perplexity/pplx-decider-v1.3` today)
  - absent: HTTP 400 `Model <id> does not exist` (`liquid/d1.9`, `perplexity/pplx-decider`)
- So the registry pins exact ids and `check.mjs` probes for newer ones on demand. Do not resolve "newest" on every call.
- Several sibling repos carry their own decision clients or pinned ids (JS, TS, and Python). They are out of scope here (see Follow-ups).

## Global Constraints

- Node 18+, zero dependencies (read JSON with `readFileSync`, not `import ... with { type: "json" }`).
- The usage log records metadata only, never state content. The new `served` field is a model id, which is fine.
- No API keys in any file. Probes read `OPENROUTER_API_KEY` from the environment only.
- Probes run sequentially, one question each; a full `check.mjs` run costs under $0.0002.
- Commits follow Conventional Commits in imperative tense, header and body.
- Branch `feat/decision-model-registry` from `main`, with branch notes at `docs/branch-notes/feat-decision-model-registry-notes.md`.
- Test files stay outside `skills/` so sync doesn't install them.
- Tests are hermetic (no network, no key, no writes to the real usage log). `release-npm.yml` runs `npm test` on Node 22 / Ubuntu before publishing.
- Commits: the user pre-approved one commit per task (2026-11-17) once `npm test` and that task's runtime check pass. The one **Pre-Commit Gate** comes before push and PR (Task 4 Step 6): show test output and 4a/4b/4c, then wait for a yes.
- `guard-hook.mjs` must stay fail-open: a missing or broken `models.json` must never block a Bash call.
- Delivery gate: a PR to `main` that references the tracking issue and the branch notes, matching #30-#32. No direct merge.

## Review Focus

1. **No `OPENROUTER_API_KEY`:** `check.mjs --scan <dir>` still scans, prints `no OPENROUTER_API_KEY: skipping probes`, and exits normally. Tested in Task 3.
2. **Rate limits or outages during probes:** a 429/5xx/network error is `error`, never `absent`, so a live model is never reported as gone. Tested in Task 2.
3. **Hand-edited `models.json` is broken:** loading fails with a message naming the file path, not a bare `SyntaxError`. Tested in Task 1.
4. **Big or binary files in scanned trees** (benchmark JSON over 1 MB, `.db`, images, unreadable files): skipped without crashing. Tested in Task 3.
5. **Version order is numeric:** `1.10` is newer than `1.9`. Tested in Task 2.

---

### Task 1: Registry file and loader

**Files:**
- Create: `skills/decision-models/models.json`
- Modify: `skills/decision-models/scripts/sysone.mjs` (replace lines 12-31, the `DECIDER`/`MODELS`/`modelId` block; the `entry` lookup in `decide()` at line 35; the error and log lines in `decideOnce()`)
- Modify: `skills/decision-models/scripts/decide.mjs:15-19,32`, `skills/decision-models/scripts/audit.mjs:20-21`, `skills/decision-models/scripts/guard-hook.mjs:26`, `bench/decision-models/run.mjs:5-6`
- Modify: `package.json` (`scripts.test`)
- Create: `scripts/test-decision-models.mjs`
- Create: `docs/branch-notes/feat-decision-model-registry-notes.md`

**Interfaces:**
- Produces, in `sysone.mjs`:
  - `loadRegistry(path: string | URL) -> { verified: string, default: string, aliases: Record<string,string>, watch: string[], models: Record<string, Entry> }`. Throws `Error` whose message starts `Cannot load decision model registry <path>:`.
  - `MODELS: Record<string, Entry>` (canonical keys only, no aliases), `ALIASES`, `DEFAULT: string`, `WATCH: string[]`, `VERIFIED: string`
  - `entry(name: string) -> Entry | undefined`: key, then alias, then exact `id` match
  - `modelId(name)` (unchanged contract: unknown names pass through)
  - Errors thrown by `decide()` for non-OK HTTP carry `err.status: number`
  - `Entry = { id: string, family: string | null, price: number, ctx: number, aa: number | null, maxQ?: number, note: string }`
- `family` is the id with the version replaced by `{v}`, e.g. `"liquid/d{v}"`; `null` for unversioned ids.

- [ ] **Step 1: Branch and notes**

```bash
git switch main
git pull
git switch -c feat/decision-model-registry
```
Create the branch notes file with the four standard sections (Discoveries, 4a, 4b, 4c). Seed Discoveries with the "Design facts" bullets above, and 4b with: SKILL.md "Which model" table has a duplicate header row and a stray paragraph inside it (lines 33-37).

- [ ] **Step 2: Write the failing tests** in `scripts/test-decision-models.mjs` (`node:test` + `node:assert/strict`). At the top of the file, set `process.env.DECISION_LOG` to a temp file, then load `sysone.mjs` (and later `check.mjs`) with `await import()`. sysone reads the log path at load time, and this keeps tests out of the real usage log.

```js
test('registry: default and aliases point at real keys', () => {
  assert.ok(MODELS[DEFAULT]);
  for (const target of Object.values(ALIASES)) assert.ok(MODELS[target]);
  assert.equal(MODELS.pplx, undefined); // aliases are not duplicated into MODELS
});
test('registry: every family template matches its own id', () => {
  for (const [k, m] of Object.entries(MODELS)) if (m.family) {
    const [pre, post] = m.family.split('{v}');
    assert.ok(m.id.startsWith(pre) && m.id.endsWith(post), k);
  }
});
test('entry resolves key, alias, and full id', () => {
  assert.equal(entry('decider'), MODELS.decider);
  assert.equal(entry('pplx'), MODELS.decider);
  assert.equal(entry(MODELS.drex.id), MODELS.drex);
  assert.equal(entry('nope/x'), undefined);
  assert.equal(modelId('nope/x'), 'nope/x');
});
test('loadRegistry names the file when JSON is broken', () => {
  // write "{ not json" to a temp file
  assert.throws(() => loadRegistry(bad), (e) => e.message.startsWith(`Cannot load decision model registry ${bad}:`));
});
test('guard hook fails open when models.json is broken', () => {
  // copy skills/decision-models/scripts/*.mjs into tmp/scripts and write "{ not json" to tmp/models.json
  // spawnSync(process.execPath, [tmp/scripts/guard-hook.mjs], { input: JSON.stringify({ tool_input: { command: 'rm -rf src' } }), encoding: 'utf8' })
  assert.equal(out.status, 0);
  assert.doesNotMatch(out.stdout, /"ask"|"deny"/);
});
test('decide attaches HTTP status and logs the served snapshot', async () => {
  // set process.env.OPENROUTER_API_KEY = 'test' and DECISION_LOG = temp file BEFORE importing sysone.mjs (it reads both at load)
  // stub globalThis.fetch: first call -> 404 text "No endpoints found", second -> 200 {"model":"liquid/d1.2-20261116","answers":{},"usage":{}}
  await assert.rejects(decide('d1', 's', q), (e) => e.status === 404);
  await decide('d1', 's', q);
  assert.match(readFileSync(log, 'utf8'), /"served":"liquid\/d1\.2-20261116"/);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test scripts/test-decision-models.mjs`
Expected: FAIL, `entry`/`loadRegistry`/`ALIASES` not exported.

- [ ] **Step 4: Create `models.json`** with today's values from `sysone.mjs` lines 15-24 moved over unchanged, plus:
  - `"verified": "2026-11-17"`, `"default": "decider"`, `"aliases": { "pplx": "decider" }`, `"watch": []`
  - families: decider `perplexity/pplx-decider-v{v}`, mammoth `baseten/mammoth-{v}`, elephant `baseten/elephant-{v}`, jev `typesafe/jev-{v}`, d1 `liquid/d{v}`; drex and ultra `null`
  - key order: decider, drex, mammoth, ultra, elephant, jev, d1 (the `--models` print order)

- [ ] **Step 5: Implement the loader in `sysone.mjs`**

`loadRegistry` wraps `JSON.parse(readFileSync(path, 'utf8'))` in try/catch and rethrows with the file path. Load from `new URL('../models.json', import.meta.url)`. `decide()` uses `entry(model)` for `maxQ`. In `decideOnce`, set `err.status = res.status` before throwing, and add `served: json.model` to the `logCall` entry. Update the header comment to point at `models.json`.

- [ ] **Step 6: Point callers at the registry**
  - `decide.mjs`: default `flag('--model') ?? DEFAULT`. `--models` prints `verified <date>` first, marks the default row with `*`, then prints `aliases: pplx -> decider`.
  - `audit.mjs`: both flag defaults become `DEFAULT`; the import on line 10 swaps the unused `MODELS` for `DEFAULT`.
  - `guard-hook.mjs`: replace the static import on line 8 with `const { decide, noul, DEFAULT } = await import("./sysone.mjs").catch(() => process.exit(0));` so a broken registry exits 0 (fail-open). Model becomes `process.env.GUARD_MODEL ?? DEFAULT`. In the line-4 comment, change "Perplexity Decider v1.2" to "the registry's default model".
  - `bench/decision-models/run.mjs`: `ALL_MODELS = Object.fromEntries(Object.entries(MODELS).map(([k, m]) => [k, m.id]))`, imported from sysone. Fixtures stay frozen.
  - `package.json`: `"test": "node scripts/test-cli.js && node --test scripts/test-decision-models.mjs"`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: `36/36 passed.` then the node:test summary with `fail 0`.

- [ ] **Step 8: Runtime check**

Run: `node skills/decision-models/scripts/decide.mjs --models`, then `node skills/decision-models/scripts/decide.mjs --model pplx --state "The sky is blue." --ask "Is the sky blue?"`
Expected: a table of 7 models with `*` on decider, then JSON with `model` `perplexity/pplx-decider-v1.2-<date>`; the last line of `~/.ai-standards/decision-log.jsonl` has `served`.

- [ ] **Step 9: Pre-Commit Gate, then commit**

```bash
git add skills/decision-models/models.json scripts/test-decision-models.mjs docs/branch-notes/feat-decision-model-registry-notes.md docs/superpowers/plans/2026-11-17-decision-model-registry.md
git commit -am "feat(decision-models): move model ids into a shared models.json registry"
```

---

### Task 2: `check.mjs`, finding new versions

**Files:**
- Create: `skills/decision-models/scripts/check.mjs`
- Test: `scripts/test-decision-models.mjs` (append)

**Interfaces:**
- Consumes: `MODELS`, `WATCH`, `decide`, `noul` from `sysone.mjs`; `err.status` from Task 1.
- Produces (exported from `check.mjs`, CLI runs only when it is the main module):
  - `cmpVersion(a: string, b: string) -> number` (numeric per dot segment; missing segment = 0)
  - `candidateVersions(v: string) -> string[]`
  - `familyRegex(family: string) -> RegExp` (global; group 1 is the version)
  - `versionOf(id: string, family: string) -> string | null`
  - `probe(id: string, decideFn = decide) -> Promise<{ id, status: 'live'|'listed'|'absent'|'error', served?: string, detail?: string }>`
  - `checkModels(models = MODELS, watch = WATCH, decideFn = decide) -> Promise<Report[]>`, `Report = { key, current: Probe, newer: Probe[] }` (newer holds live and listed candidates only); watch ids are reported with `key: 'watch'`.

- [ ] **Step 1: Write the failing tests**

```js
test('cmpVersion is numeric', () => {
  assert.ok(cmpVersion('1.10', '1.9') > 0);
  assert.equal(cmpVersion('1', '1.0'), 0);
  assert.ok(cmpVersion('1.2', '2') < 0);
});
test('candidateVersions', () => {
  assert.deepEqual(candidateVersions('1.2'), ['1.3', '1.4', '2', '2.0']);
  assert.deepEqual(candidateVersions('1'), ['1.1', '2']);
  assert.deepEqual(candidateVersions('1.14'), ['1.15', '1.16', '2', '2.0']);
});
test('familyRegex and versionOf', () => {
  assert.equal(versionOf('liquid/d1.1', 'liquid/d{v}'), '1.1');
  assert.equal(versionOf('liquid/d1-ultra', 'liquid/d{v}'), null);
  assert.equal(versionOf('perplexity/pplx-decider-v1.2-20261016', 'perplexity/pplx-decider-v{v}'), '1.2');
  assert.equal(versionOf('typesafe/jev-router', 'typesafe/jev-{v}'), null);
});
test('probe classifies responses', async () => {
  const ok = async () => ({ model: 'liquid/d1.2-20261116', answers: {} });
  const fail = (status, msg) => async () => { const e = new Error(msg); e.status = status; throw e; };
  assert.deepEqual(await probe('liquid/d1.2', ok), { id: 'liquid/d1.2', status: 'live', served: 'liquid/d1.2-20261116' });
  assert.equal((await probe('x', fail(404, 'No endpoints found for x'))).status, 'listed');
  assert.equal((await probe('x', fail(400, 'Model x does not exist'))).status, 'absent');
  assert.equal((await probe('x', fail(429, 'rate limited'))).status, 'error');
  assert.equal((await probe('x', fail(400, 'bad questions'))).status, 'error');
  assert.equal((await probe('x', async () => { throw new TypeError('fetch failed'); })).status, 'error');
});
test('checkModels reports only live/listed newer candidates', async () => {
  const live = new Set(['liquid/d1.1', 'liquid/d1.2']);
  const fake = async (id) => { if (live.has(id)) return { model: id + '-x' }; const e = new Error(`Model ${id} does not exist`); e.status = 400; throw e; };
  const [r] = await checkModels({ d1: { id: 'liquid/d1.1', family: 'liquid/d{v}' } }, [], fake);
  assert.deepEqual(r.newer.map((p) => p.id), ['liquid/d1.2']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/test-decision-models.mjs`
Expected: FAIL, cannot find module `check.mjs`.

- [ ] **Step 3: Implement**

`familyRegex` returns a new RegExp on every call (callers use `matchAll`, so no shared `lastIndex`). It escapes regex characters in the template, then replaces `{v}` with `(\d+(?:\.\d+)*)` and appends `(?![\w]|-[a-z])`. That lets snapshot suffixes like `-20261016` and a sentence-ending `.` through, but not `-ultra`. `versionOf` uses a non-global copy anchored with `^`. `candidateVersions`: the last segment +1 and +2, then the next major as `N` and `N.0`; a single-segment version gives `v.1` and `N`; dedupe. `probe` calls `decideFn(id, 'ping', { q: noul('Is this a ping?') }, { tag: 'check' })` and classifies: 200 live (`served` = response `model`); `status === 404` listed; `status === 400` and `/does not exist/` absent; anything else error with `detail` = first 120 chars of the message. `checkModels` runs every probe in sequence (no `Promise.all`).

CLI output, one line per model: `key  current-id  live (served <snapshot>)` plus `NEW <id> live` / `COMING <id> listed` lines. Exit code 1 if any current id is not live or any newer candidate is live; otherwise 0.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Runtime check**

Run: `node skills/decision-models/scripts/check.mjs`
Expected: today `d1` shows `NEW liquid/d1.2 live`, `decider` shows `COMING perplexity/pplx-decider-v1.3 listed`, exit code 1. Record the output in branch notes.

- [ ] **Step 6: Pre-Commit Gate, then commit**

```bash
git add skills/decision-models/scripts/check.mjs
git commit -am "feat(decision-models): add check.mjs to probe OpenRouter for new model versions"
```

---

### Task 3: `check.mjs --scan`, finding stale ids in other repos

**Files:**
- Modify: `skills/decision-models/scripts/check.mjs`
- Test: `scripts/test-decision-models.mjs` (append)

**Interfaces:**
- Consumes: `familyRegex`, `versionOf`, `cmpVersion`, `checkModels` from Task 2.
- Produces:
  - `scanText(text: string, models = MODELS) -> { line: number, id: string, key: string, version: string }[]`
  - `scanDir(dir: string, models = MODELS) -> { file: string, line, id, key, version }[]` (`file` relative to `dir`)
  - CLI: `--scan <dir>`, repeatable. Reports a hit when its version is older than the newest known for that family (the registry's current version, or the newest live candidate when probes ran).

- [ ] **Step 1: Write the failing tests**

```js
test('scanText finds versioned ids and ignores lookalikes', () => {
  const text = 'a "liquid/d1.1" b\nliquid/d1-ultra\nuse perplexity/pplx-decider-v1.2.\ntypesafe/jev-router\nbaseten/mammoth-1-20261001';
  assert.deepEqual(scanText(text).map((h) => [h.line, h.key, h.version]),
    [[1, 'd1', '1.1'], [3, 'decider', '1.2'], [5, 'mammoth', '1']]);
});
test('scanDir skips node_modules, .git, lockfiles, .env, and files over 1 MB', () => {
  // temp tree: src/a.ts has "liquid/d1.1"; node_modules/x.js, .git/c, package-lock.json, .env, big.json (1.1 MB padding + id) all contain it
  assert.deepEqual(scanDir(tmp).map((h) => h.file.replaceAll('\\', '/')), ['src/a.ts']);
});
test('CLI without a key still scans', () => {
  // tmp holds only MODELS.d1.id (read from the registry, never a literal, so Task 4's bump keeps this green)
  // spawnSync(process.execPath, [checkPath, '--scan', tmp], { env without OPENROUTER_API_KEY, encoding: 'utf8' })
  assert.match(out.stdout, /no OPENROUTER_API_KEY: skipping probes/);
  assert.equal(out.status, 0); // tmp ids match the registry, nothing stale
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/test-decision-models.mjs`
Expected: FAIL, `scanText` not exported.

- [ ] **Step 3: Implement**

The skip pattern covers `node_modules`, `.git`, `dist`, `build`, `coverage`, `.next`, `.env*`, `*.lock`, `package-lock.json`, `pnpm-lock.yaml`, and `.db`/`.png`/`.jpg`/`.zip` files. Skip files over 1,048,576 bytes. Wrap each read in try/catch and skip unreadable files silently. Without `OPENROUTER_API_KEY`, print `no OPENROUTER_API_KEY: skipping probes` and compare against registry versions only. Output `file:line  id  -> newest-id`, grouped under each `--scan` root. Stale hits set exit code 1.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Runtime check**

Run: `node skills/decision-models/scripts/check.mjs --scan <repo> [--scan <repo> ...]` over the sibling repos that use decision models
Expected: finishes in under a minute; lists stale `liquid/d1.1` hits if any. Paste the summary into branch notes under Discoveries; it becomes the follow-up list.

- [ ] **Step 6: Pre-Commit Gate, then commit**

```bash
git commit -am "feat(decision-models): scan folders for outdated decision model ids"
```

---

### Task 4: Docs, the d1.2 bump, and wrap-up

**Files:**
- Modify: `skills/decision-models/SKILL.md` (lines 33-46 "Which model"; new section after "How to call")
- Modify: `skills/decision-models/models.json` (`d1` entry, `verified`)
- Modify: `docs/branch-notes/feat-decision-model-registry-notes.md`

**Interfaces:**
- Consumes: `check.mjs` CLI from Tasks 2-3; `bench/decision-models/run.mjs --only=d1`.

- [ ] **Step 1: Fix the "Which model" table.** Delete the first header row and the paragraph stuck inside the table; move the spot-check paragraph above the table. Drop version ids from the Model column (`` `decider` `` rather than `` `decider` (pplx-decider-v1.2) ``). Replace "update `scripts/sysone.mjs` when OpenRouter renames them" with "ids live in `models.json`; `decide.mjs --models` prints them".

- [ ] **Step 2: Add a "Keeping models current" section** (at most 8 lines):
  - `node <skill-dir>/scripts/check.mjs` probes for new versions (about $0.0001 per run); add `--scan <dir>` to list outdated ids in other repos.
  - To adopt a version, edit `models.json`. Run `bench/decision-models/run.mjs --only=<key>` before changing `default` or anything a gate relies on.
  - Apps and evals pin their own ids on purpose; use `--scan` to find them, and bump them in their own repos.
  - Ids to wait for (models announced but not served yet) go in `watch`.

- [ ] **Step 3: Bump d1.** Set `d1.id` to `liquid/d1.2` and `verified` to the run date. Run `node bench/decision-models/run.mjs --only=d1` (about $0.0002) and write the score and Brier into the `d1` note in place of the d1.1 numbers. If it scores below 54, say so in the note; it stays comparison-only either way.

- [ ] **Step 4: Full verification**

Run: `npm test`, then `node skills/decision-models/scripts/check.mjs`
Expected: tests pass; `d1` no longer shows NEW; `decider` shows COMING v1.3 (or NEW if Perplexity has started serving it by then); exit code 0. Any other NEW line is a real new release: record it in 4c, don't adopt it on this branch.

- [ ] **Step 5: Branch notes, Pre-Commit Gate, and commit**

Add to 4c: the follow-ups below; Celeris slug for `watch` (#29); regenerate `known-hashes.json` after the next release tag. Then run `/consolidate-branch-notes`.

```bash
git commit -am "docs(decision-models): document models.json and check.mjs, and move d1 to d1.2"
```

- [ ] **Step 6: Issue and PR**

Run `/peer-review-with-quality`. Then open a tracking issue ("Track decision model versions in a shared registry") with the `/create-github-issue` skill. Push with `git push -u origin feat/decision-model-registry`, and run `gh pr create --base main --title "feat(decision-models): add a shared model registry and version check" --body "<summary; Closes #<issue>; Branch notes: docs/branch-notes/feat-decision-model-registry-notes.md>"`. Manual steps for the PR checklist: re-sync the installed skill after release, and the per-repo follow-ups.

---

## Follow-ups (separate plans, one per repo)

- Bump pinned ids in the repos `--scan` flags. Each is a small pin change plus that repo's tests; an eval tuned to the old id needs a rerun after any bump.
- After merge and release, re-sync the installed skill (`~/.claude/skills/decision-models` is older than the repo copy today).
- Optional: a weekly scheduled `check.mjs` run once it has proved useful by hand.
