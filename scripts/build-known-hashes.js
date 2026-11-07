// Regenerates known-hashes.json: normalized sha256 of every managed file in every released tag (v*).
// Lets the sync CLI recognise untouched files from older installs that have no merge-base snapshot.
// Usage: node scripts/build-known-hashes.js   (run after tagging a release, then commit the result)
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gitSource, hashOf, normalize, baseDirName } from '../bin/targets/shared.js';
import { targets } from '../bin/targets/index.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function listTags() {
  return execFileSync('git', ['tag', '--list', 'v*', '--sort=version:refname'], { cwd: repo, encoding: 'utf8' })
    .split('\n').map((t) => t.trim()).filter(Boolean);
}

// Existing entries are kept: released hashes are history, and composition code (e.g. the Claude
// rules header) may change after a release without invalidating what that release installed.
function loadExisting() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(repo, 'known-hashes.json'), 'utf8'));
    const result = {};
    for (const [name, files] of Object.entries(data)) {
      result[name] = {};
      for (const [rel, hashes] of Object.entries(files)) result[name][rel] = new Set(hashes);
    }
    return result;
  } catch {
    return {};
  }
}

export function buildKnownHashes(tags, result = {}) {
  for (const tag of tags) {
    const src = gitSource(tag, repo);
    for (const [name, target] of Object.entries(targets)) {
      const managed = target.managed(src);
      if (!managed) continue;
      const perTarget = (result[name] ??= {});
      for (const [rel, buf] of managed.files) {
        const set = (perTarget[rel] ??= new Set());
        set.add(hashOf(buf));
      }
    }
  }
  return result;
}

// One path per line keeps diffs reviewable.
function format(result) {
  const targetsOut = Object.keys(result).sort().map((name) => {
    const lines = Object.keys(result[name]).sort().map((rel) => `    ${JSON.stringify(rel)}: ${JSON.stringify([...result[name][rel]].sort())}`);
    return `  ${JSON.stringify(name)}: {\n${lines.join(',\n')}\n  }`;
  });
  return `{\n${targetsOut.join(',\n')}\n}\n`;
}

// known-bases/<target>/<rel with / as __>/<hash>.md holds the full normalized content of each released
// rules file, so edited legacy installs (no snapshot) can be 3-way merged. Content-addressed and never
// deleted; known-bases/index.json records oldest-to-newest order per file for tie-breaking.
const BASES = 'known-bases';

function loadBaseIndex() {
  try { return JSON.parse(fs.readFileSync(path.join(repo, BASES, 'index.json'), 'utf8')); } catch { return {}; }
}

export function buildKnownBases(tags, index = {}) {
  for (const tag of tags) {
    const src = gitSource(tag, repo);
    for (const [name, target] of Object.entries(targets)) {
      const managed = target.managed(src);
      if (!managed?.rules) continue;
      const buf = managed.files.get(managed.rules);
      if (!buf) continue;
      const hash = hashOf(buf);
      const dir = path.join(repo, BASES, name, baseDirName(managed.rules));
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${hash}.md`);
      if (!fs.existsSync(file)) fs.writeFileSync(file, normalize(buf));
      const order = ((index[name] ??= {})[managed.rules] ??= []);
      if (!order.includes(hash)) order.push(hash);
    }
  }
  return index;
}

const tags = listTags();
fs.writeFileSync(path.join(repo, 'known-hashes.json'), format(buildKnownHashes(tags, loadExisting())));
const index = buildKnownBases(tags, loadBaseIndex());
fs.mkdirSync(path.join(repo, BASES), { recursive: true });
fs.writeFileSync(path.join(repo, BASES, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`known-hashes.json and known-bases/ written from ${tags.length} tag(s): ${tags.join(', ')}`);
