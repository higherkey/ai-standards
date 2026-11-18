// Unit tests for the decision-models registry and check.mjs. Hermetic: no network, no key, no real usage log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tmp = mkdtempSync(join(tmpdir(), 'decision-models-'));
const log = join(tmp, 'decision-log.jsonl');
process.env.DECISION_LOG = log; // sysone reads this at load time
const scripts = fileURLToPath(new URL('../skills/decision-models/scripts/', import.meta.url));
const { MODELS, ALIASES, DEFAULT, entry, modelId, loadRegistry, decide, noul } = await import(new URL('../skills/decision-models/scripts/sysone.mjs', import.meta.url));
const { cmpVersion, candidateVersions, versionOf, probe, checkModels, scanText, scanDir } = await import(new URL('../skills/decision-models/scripts/check.mjs', import.meta.url));

const envWithoutKey = () => { const env = { ...process.env, DECISION_LOG: 'off' }; delete env.OPENROUTER_API_KEY; return env; };

test('registry: default and aliases point at real keys', () => {
  assert.ok(MODELS[DEFAULT]);
  for (const target of Object.values(ALIASES)) assert.ok(MODELS[target]);
  assert.equal(MODELS.pplx, undefined); // aliases are not duplicated into MODELS
});

test('registry: every family template matches its own id', () => {
  assert.ok(Object.values(MODELS).some((m) => m.family), 'no model has a family template');
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
  const bad = join(tmp, 'bad-models.json');
  writeFileSync(bad, '{ not json');
  assert.throws(() => loadRegistry(bad), (e) => e.message.startsWith(`Cannot load decision model registry ${bad}:`));
});

test('guard hook fails open when models.json is broken', () => {
  const skill = join(tmp, 'broken-skill');
  cpSync(scripts, join(skill, 'scripts'), { recursive: true });
  writeFileSync(join(skill, 'models.json'), '{ not json');
  const out = spawnSync(process.execPath, [join(skill, 'scripts', 'guard-hook.mjs')], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm -rf src' }, cwd: tmp }),
    env: envWithoutKey(), encoding: 'utf8',
  });
  assert.equal(out.status, 0, out.stderr);
  assert.doesNotMatch(out.stdout, /permissionDecision/);
});

test('decide attaches HTTP status and logs the served snapshot', async (t) => {
  const realFetch = globalThis.fetch, realKey = process.env.OPENROUTER_API_KEY;
  t.after(() => { globalThis.fetch = realFetch; if (realKey === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = realKey; });
  process.env.OPENROUTER_API_KEY = 'test';
  const replies = [
    new Response('No endpoints found', { status: 404 }),
    new Response(JSON.stringify({ model: 'liquid/d1.2-20261116', answers: {}, usage: {} }), { status: 200 }),
  ];
  globalThis.fetch = async () => replies.shift();
  const q = { q: noul('Is this a test?') };
  await assert.rejects(decide('d1', 's', q), (e) => e.status === 404);
  await decide('d1', 's', q);
  assert.match(readFileSync(log, 'utf8'), /"served":"liquid\/d1\.2-20261116"/);
});

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
  assert.equal(versionOf('liquid/d1.2-ultra', 'liquid/d{v}'), null); // no backtracking to "1"
});

test('scanText does not backtrack to a shorter version', () => {
  assert.deepEqual(scanText('perplexity/pplx-decider-v1.2-preview\ntypesafe/jev-1.14b'), []);
});

test('probe uses a short timeout so an outage cannot hang the check', async () => {
  let opts;
  await probe('x', async (id, state, questions, o) => { opts = o; return { model: 'x-1' }; });
  assert.ok(opts.timeoutMs <= 15000, `timeoutMs ${opts.timeoutMs}`);
});

test('CLI groups many repeat hits quickly', () => {
  const [pre, post] = MODELS.d1.family.split('{v}');
  const root = mkdtempSync(join(tmp, 'scan-'));
  writeFileSync(join(root, 'results.json'), `"${pre}0.9${post}",\n`.repeat(65000)); // ~1 MB, under the size cap
  const t0 = Date.now();
  const out = spawnSync(process.execPath, [join(scripts, 'check.mjs'), '--scan', root], { env: envWithoutKey(), encoding: 'utf8' });
  assert.match(out.stdout, /results\.json:1 \(\+64999 more\)/);
  assert.ok(Date.now() - t0 < 5000, `took ${Date.now() - t0} ms`); // was ~17 s when grouping copied arrays
});

test('CLI runs when started through a linked folder', () => {
  const link = join(tmp, 'linked-scripts');
  symlinkSync(scripts, link, 'junction'); // junction needs no admin rights on Windows; a dir symlink elsewhere
  const out = spawnSync(process.execPath, [join(link, 'check.mjs'), '--scan', tmp], { env: envWithoutKey(), encoding: 'utf8' });
  assert.match(out.stdout, /no OPENROUTER_API_KEY: skipping probes/);
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

test('scanText finds versioned ids and ignores lookalikes', () => {
  const text = 'a "liquid/d1.1" b\nliquid/d1-ultra\nuse perplexity/pplx-decider-v1.2.\ntypesafe/jev-router\nbaseten/mammoth-1-20261001';
  assert.deepEqual(scanText(text).map((h) => [h.line, h.key, h.version]),
    [[1, 'd1', '1.1'], [3, 'decider', '1.2'], [5, 'mammoth', '1']]);
});

// A tree where every file mentions an id, but only src/a.ts may be read.
function scanTree(id) {
  const root = mkdtempSync(join(tmp, 'scan-'));
  const put = (rel, body = `model: "${id}"\n`) => { mkdirSync(join(root, rel, '..'), { recursive: true }); writeFileSync(join(root, rel), body); };
  put('src/a.ts');
  for (const rel of ['node_modules/x/index.js', '.git/config', 'package-lock.json', '.env', 'dist/out.js', 'data.db',
    'target/debug/build.rs', '__pycache__/a.pyc', '.venv/lib/site.py']) put(rel);
  put('big.json', `${'x'.repeat(1_100_000)}\n"${id}"\n`);
  return root;
}

test('scanDir skips node_modules, .git, lockfiles, .env, build output, binaries, and files over 1 MB', () => {
  const root = scanTree('liquid/d1.1');
  assert.deepEqual(scanDir(root).map((h) => h.file.replaceAll('\\', '/')), ['src/a.ts']);
});

test('CLI without a key still scans', () => {
  const root = scanTree(MODELS.d1.id); // read from the registry so a version bump keeps this green
  const checkPath = join(scripts, 'check.mjs');
  const out = spawnSync(process.execPath, [checkPath, '--scan', root], { env: envWithoutKey(), encoding: 'utf8' });
  assert.match(out.stdout, /no OPENROUTER_API_KEY: skipping probes/);
  assert.equal(out.status, 0, out.stdout + out.stderr);
});

test('CLI reports an outdated id and exits 1', () => {
  const [pre, post] = MODELS.d1.family.split('{v}');
  const root = scanTree(`${pre}0.9${post}`);
  const out = spawnSync(process.execPath, [join(scripts, 'check.mjs'), '--scan', root], { env: envWithoutKey(), encoding: 'utf8' });
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  assert.match(out.stdout, new RegExp(`src[\\\\/]a\\.ts:1 +${reEsc(`${pre}0.9${post}`)} +-> ${reEsc(MODELS.d1.id)}`));
  assert.equal(out.status, 1);
});

test('CLI collapses repeated hits of one id in one file', () => {
  const [pre, post] = MODELS.d1.family.split('{v}');
  const old = `${pre}0.9${post}`;
  const root = mkdtempSync(join(tmp, 'scan-'));
  writeFileSync(join(root, 'results.json'), `"${old}"\n"${old}"\n"${old}"\n`);
  const out = spawnSync(process.execPath, [join(scripts, 'check.mjs'), '--scan', root], { env: envWithoutKey(), encoding: 'utf8' });
  assert.match(out.stdout, /results\.json:1 \(\+2 more\)/);
  assert.equal(out.stdout.split('\n').filter((l) => l.includes(old)).length, 1);
});
