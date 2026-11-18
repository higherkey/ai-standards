// Unit tests for the decision-models registry and check.mjs. Hermetic: no network, no key, no real usage log.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tmp = mkdtempSync(join(tmpdir(), 'decision-models-'));
const log = join(tmp, 'decision-log.jsonl');
process.env.DECISION_LOG = log; // sysone reads this at load time
const scripts = fileURLToPath(new URL('../skills/decision-models/scripts/', import.meta.url));
const { MODELS, ALIASES, DEFAULT, entry, modelId, loadRegistry, decide, noul } = await import(new URL('../skills/decision-models/scripts/sysone.mjs', import.meta.url));

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
