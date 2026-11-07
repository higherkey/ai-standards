import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { MANIFEST_NAME, readManifest, hashOf, normalize, fsSource, baseDirName } from './targets/shared.js';

export const BASE_DIR = '.ai-standards-base';
export const BACKUP_DIR = '.ai-standards-backup';
export const SIDECAR = '.ai-standards-new';
const MANIFEST_VERSION = 2;

// Choices per conflict kind: [key, name, label]; the first entry is the default.
const OPTIONS = {
  merge: [['m', 'merge', 'merge'], ['k', 'keep', 'keep mine'], ['n', 'new', 'new package version'], ['s', 'show', 'show merged diff']],
  conflict: [['k', 'keep', 'keep mine'], ['n', 'new', 'new package version'], ['c', 'markers', 'write conflict markers']],
  unknown: [['k', 'keep', 'keep mine'], ['n', 'new', 'new package version']],
  deleted: [['k', 'keep', 'keep deleted'], ['r', 'restore', 'restore']],
  prune: [['k', 'keep', 'keep'], ['d', 'delete', 'delete']]
};

// ---------- file helpers ----------

const readIfExists = (file) => (fs.existsSync(file) ? fs.readFileSync(file) : null);

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function removeWithEmptyParents(file, stopAt) {
  fs.rmSync(file, { force: true });
  for (let dir = path.dirname(file); dir !== stopAt && dir.startsWith(stopAt); dir = path.dirname(dir)) {
    if (!fs.existsSync(dir)) continue;
    if (fs.readdirSync(dir).length) break;
    fs.rmdirSync(dir);
  }
}

function listDiskFiles(dir, rel) {
  const abs = path.join(dir, rel);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [rel];
  return fs.readdirSync(abs).flatMap((name) => listDiskFiles(dir, `${rel}/${name}`));
}

function loadKnownHashes(sourceDir) {
  const buf = fsSource(sourceDir).read('known-hashes.json');
  try { return buf ? JSON.parse(buf.toString('utf8')) : {}; } catch { return {}; }
}

const lineCounts = (buf) => {
  const counts = new Map();
  for (const line of normalize(buf).toString('utf8').split('\n')) counts.set(line, (counts.get(line) || 0) + 1);
  return counts;
};

/** Lines in one file not matched in the other, summed both ways (multiset difference). */
export function lineDistance(a, b) {
  const ca = lineCounts(a);
  const cb = lineCounts(b);
  let d = 0;
  for (const [line, n] of ca) d += Math.max(0, n - (cb.get(line) || 0));
  for (const [line, n] of cb) d += Math.max(0, n - (ca.get(line) || 0));
  return d;
}

/**
 * Legacy installs have no snapshot. Pick the released version of this file (shipped in known-bases/)
 * closest to the user's current file to serve as merge base. Ties go to the newest release.
 * Rejects candidates that differ from the current file by more than half their lines.
 */
function inferBase(sourceDir, target, rel, cur) {
  const src = fsSource(sourceDir);
  const dir = `known-bases/${target}/${baseDirName(rel)}`;
  let order = [];
  try { order = JSON.parse(src.read('known-bases/index.json')?.toString('utf8') || '{}')[target]?.[rel] || []; } catch { /* optional */ }
  let best = null;
  for (const file of src.list(dir)) {
    const hash = path.posix.basename(file, '.md');
    const buf = src.read(file);
    if (!buf) continue;
    const distance = lineDistance(cur, buf);
    const rank = order.indexOf(hash);
    if (!best || distance < best.distance || (distance === best.distance && rank > best.rank)) best = { buf, distance, rank };
  }
  if (!best) return null;
  const lines = normalize(best.buf).toString('utf8').split('\n').length;
  return best.distance <= lines / 2 ? best.buf : null;
}

function packageVersion(sourceDir) {
  try { return JSON.parse(fs.readFileSync(path.join(sourceDir, 'package.json'), 'utf8')).version; } catch { return undefined; }
}

// ---------- git-backed merge and diff ----------

function withTempFiles(contents, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-standards-'));
  try {
    const paths = contents.map((buf, i) => {
      const file = path.join(dir, `f${i}`);
      fs.writeFileSync(file, normalize(buf));
      return file;
    });
    return fn(paths);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** 3-way merge via `git merge-file`. content is null when git is unavailable or the merge errored. */
export function mergeBuffers(current, base, incoming) {
  return withTempFiles([current, base, incoming], ([a, b, c]) => {
    const r = spawnSync('git', ['merge-file', '-p', '-L', 'yours', '-L', 'base', '-L', 'package', a, b, c], { encoding: 'buffer' });
    if (r.error || r.status === null || r.status > 127) return { clean: false, content: null };
    return { clean: r.status === 0, content: r.stdout };
  });
}

function diffText(from, to) {
  return withTempFiles([from, to], ([a, b]) => {
    const r = spawnSync('git', ['diff', '--no-index', '--no-color', '--', a, b], { encoding: 'utf8' });
    if (r.error || !r.stdout) return null;
    return r.stdout.split('\n').slice(4).join('\n').trimEnd();
  });
}

// ---------- interaction ----------

function showDiff(s, title, from, to) {
  const text = diffText(from, to);
  s.log(text ? `   ${title}:\n${text.split('\n').map((l) => `     ${l}`).join('\n')}` : `   (${title}: diff unavailable)`);
}

async function promptChoice(s, kind, rel, info) {
  if (s.sticky[kind]) return s.sticky[kind];
  const options = OPTIONS[kind].filter(([, name]) => name !== 'markers' || info.merged?.content);
  const menu = options.map(([key, , label], i) => (i === 0 ? `[${key.toUpperCase()}]${label}` : `[${key}]${label}`)).join(' / ');
  for (;;) {
    const answer = (await s.ask(`   ${rel}: ${menu} (add ! to apply to all remaining ${kind} files) `)).trim().toLowerCase();
    const all = answer.endsWith('!');
    const word = answer.replace(/!$/, '');
    const picked = word ? options.find(([key, name]) => word === key || word === name) : options[0];
    if (!picked) continue;
    if (picked[1] === 'show') {
      showDiff(s, 'merged result vs your file', info.cur, info.merged.content);
      continue;
    }
    if (all) s.sticky[kind] = picked[1];
    return picked[1];
  }
}

function describeEdit(s, kind, rel, { cur, baseBuf, newBuf, inferred }) {
  const why = { merge: 'edited locally and upstream changed', conflict: 'edited locally and upstream changed (merge conflicts)', unknown: 'edited locally; no merge base available', deleted: 'deleted locally', prune: 'edited locally but no longer shipped' }[kind];
  s.log(`⚠️ [${s.name}] ${rel}: ${why}.`);
  if (kind === 'deleted') return;
  if (baseBuf) showDiff(s, inferred ? 'your edits (inferred release base -> current)' : 'your edits (installed -> current)', baseBuf, cur);
  else if (newBuf) showDiff(s, 'your file -> package version (no base to show only your edits)', cur, newBuf);
}

// ---------- per-file pipeline ----------

// rel is the LOGICAL managed name (manifest keys, known hashes/bases). The layout maps it to a disk path under the root;
// snapshots, backups and sidecars use the disk path so they sit next to the real file.
const abs = (s, rel) => path.join(s.root, s.disk(rel));
const basePath = (s, rel) => path.join(s.root, BASE_DIR, s.disk(rel));

function backup(s, rel) {
  writeFile(path.join(s.root, BACKUP_DIR, s.disk(rel)), fs.readFileSync(abs(s, rel)));
}

function install(s, rel, buf) {
  writeFile(abs(s, rel), buf);
  writeFile(basePath(s, rel), buf);
  fs.rmSync(abs(s, rel) + SIDECAR, { force: true });
}

function note(s, rel, text) {
  s.notes.push(`${rel}: ${text}`);
}

async function decide(s, kind, rel, info) {
  if (s.force) return kind === 'deleted' ? 'restore' : 'new';
  if (s.interactive) {
    describeEdit(s, kind, rel, info);
    return promptChoice(s, kind, rel, info);
  }
  return kind === 'merge' ? 'merge' : 'keep';
}

async function resolveEdited(s, rel, info, prevHash, newHash) {
  const { cur, baseBuf, newBuf, inferred } = info;
  const via = inferred ? ' (base inferred from release history)' : '';
  info.merged = baseBuf ? mergeBuffers(cur, baseBuf, newBuf) : null;
  const kind = !baseBuf ? 'unknown' : info.merged.clean ? 'merge' : 'conflict';
  const choice = await decide(s, kind, rel, info);

  if (choice === 'keep') {
    if (!s.interactive && kind !== 'merge') {
      writeFile(abs(s, rel) + SIDECAR, newBuf);
      s.counts.conflicts++;
      note(s, rel, `kept your version (${kind === 'unknown' ? 'no merge base' : 'merge conflicts'}${via}); package version written to ${s.disk(rel)}${SIDECAR}`);
    } else {
      s.counts.kept++;
      note(s, rel, 'kept your version');
    }
    return prevHash;
  }

  backup(s, rel);
  if (choice === 'new') {
    install(s, rel, newBuf);
    s.counts.updated++;
    note(s, rel, 'replaced with the package version (your file is in the backup folder)');
  } else if (choice === 'markers') {
    install(s, rel, info.merged.content);
    writeFile(basePath(s, rel), newBuf);
    s.counts.conflicts++;
    note(s, rel, 'wrote conflict markers (<<<<<<< yours ... >>>>>>> package); resolve them by hand');
  } else {
    install(s, rel, info.merged.content);
    writeFile(basePath(s, rel), newBuf);
    s.counts.merged++;
    note(s, rel, `merged your edits with the package changes${inferred ? ' (base inferred from release history)' : ''} (original in the backup folder)`);
  }
  return newHash;
}

async function syncFile(s, rel, newBuf, prevHash, knownList) {
  const newHash = hashOf(newBuf);
  const cur = readIfExists(abs(s, rel));

  if (cur === null) {
    if (prevHash !== undefined) {
      const choice = await decide(s, 'deleted', rel, {});
      if (choice !== 'restore') {
        note(s, rel, 'deleted locally; not restored');
        return prevHash;
      }
    }
    install(s, rel, newBuf);
    s.counts[prevHash === undefined ? 'added' : 'updated']++;
    return newHash;
  }

  const curHash = hashOf(cur);
  if (curHash === newHash) {
    writeFile(basePath(s, rel), newBuf);
    fs.rmSync(abs(s, rel) + SIDECAR, { force: true });
    return newHash;
  }

  let baseBuf = readIfExists(basePath(s, rel));
  let installed = baseBuf ? hashOf(baseBuf) : prevHash;
  if (curHash === installed || knownList.includes(curHash)) {
    install(s, rel, newBuf);
    s.counts.updated++;
    return newHash;
  }
  let inferred = false;
  if (!baseBuf) {
    baseBuf = inferBase(s.sourceDir, s.name, rel, cur);
    if (baseBuf) { inferred = true; installed = hashOf(baseBuf); }
  }
  if (installed === newHash && !s.force) {
    if (!baseBuf || inferred) writeFile(basePath(s, rel), newBuf);
    s.counts.kept++;
    note(s, rel, 'kept your edits (no upstream change)');
    return newHash;
  }
  return resolveEdited(s, rel, { cur, baseBuf, newBuf, inferred }, prevHash, newHash);
}

// ---------- pruning ----------

function previousPaths(root, prev) {
  if (prev.files) return Object.keys(prev.files);
  const safe = (n) => n === path.basename(n);
  const skills = (prev.skills || []).filter(safe).flatMap((n) => listDiskFiles(root, `skills/${n}`));
  const agents = (prev.agents || []).filter(safe).map((n) => `agents/${n}`);
  return [...skills, ...agents];
}

async function pruneFile(s, rel, prevHash, knownList) {
  const file = abs(s, rel);
  const cur = readIfExists(file);
  if (cur === null) {
    removeWithEmptyParents(basePath(s, rel), path.join(s.root, BASE_DIR));
    return;
  }
  const baseBuf = readIfExists(basePath(s, rel));
  const installed = baseBuf ? hashOf(baseBuf) : prevHash;
  const curHash = hashOf(cur);
  let remove = curHash === installed || knownList.includes(curHash);
  if (!remove) {
    const choice = s.force ? 'keep' : await decide(s, 'prune', rel, { cur, baseBuf });
    remove = choice === 'delete';
    if (remove) backup(s, rel);
    else note(s, rel, 'no longer shipped; kept your edited copy (now yours, no longer managed)');
  }
  if (remove) {
    removeWithEmptyParents(file, s.root);
    s.counts.removed++;
  }
  removeWithEmptyParents(basePath(s, rel), path.join(s.root, BASE_DIR));
}

// ---------- entry point ----------

export async function syncTarget(target, ctx) {
  const { sourceDir, targetDir, force = false, interactive = false, ask = null, log } = ctx;
  const layout = target.layouts[ctx.global ? 'global' : 'project'];
  const root = path.join(targetDir, layout.rootDir);
  const display = ctx.global ? displayPath(root) : `${layout.rootDir}/`;
  const managed = target.managed(fsSource(sourceDir));
  const prev = readManifest(root);
  const prevFiles = prev.files || {};
  const known = loadKnownHashes(sourceDir)[target.name] || {};
  const s = {
    name: target.name, root, disk: layout.diskPath, sourceDir, log, force, interactive: interactive && Boolean(ask), ask, sticky: {}, notes: [],
    counts: { added: 0, updated: 0, merged: 0, kept: 0, conflicts: 0, removed: 0 }
  };

  fs.mkdirSync(root, { recursive: true });
  const nextFiles = {};
  for (const [rel, buf] of managed.files) {
    const hash = await syncFile(s, rel, buf, prevFiles[rel], known[rel] || []);
    if (hash !== undefined) nextFiles[rel] = hash;
  }
  for (const rel of previousPaths(root, prev)) {
    if (!managed.files.has(rel)) await pruneFile(s, rel, prevFiles[rel], known[rel] || []);
  }

  const manifest = {
    manifestVersion: MANIFEST_VERSION,
    packageVersion: packageVersion(sourceDir),
    files: Object.fromEntries(Object.entries(nextFiles).sort(([a], [b]) => a.localeCompare(b))),
    skills: managed.skills,
    agents: managed.agents,
    rules: managed.rules
  };
  writeFile(path.join(root, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + '\n');

  layout.finalize?.({ root, log, display });
  report(s, display, managed);
}

/** Shorten paths under the home directory to ~/..., else return the absolute path (with trailing separator). */
function displayPath(dir) {
  const rel = path.relative(os.homedir(), dir);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? `~/${rel.split(path.sep).join('/')}/` : `${dir}${path.sep}`;
}

function report(s, display, managed) {
  const { counts: c } = s;
  const extras = managed.agents.length ? ` and ${managed.agents.length} subagents` : '';
  s.log(`✅ [${s.name}] ${managed.skills.length} skills${extras} synchronized to ${display}.`);
  for (const line of s.notes) s.log(`ℹ️ [${s.name}] ${line}`);
  const parts = [`${c.updated} updated`, `${c.merged} merged`, `${c.kept} kept (edited)`, `${c.conflicts} conflicts`];
  if (c.added) parts.push(`${c.added} added`);
  if (c.removed) parts.push(`${c.removed} removed`);
  s.log(`✅ [${s.name}] ${parts.join(', ')}.`);
  if (s.notes.length) s.log(`   Backups of replaced files: ${display}${BACKUP_DIR}/. Consider ignoring ${BACKUP_DIR}/ and *${SIDECAR}.`);
}
