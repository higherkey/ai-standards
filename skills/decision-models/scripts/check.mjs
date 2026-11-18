#!/usr/bin/env node
// Finds new decision-model versions on OpenRouter.
//   node check.mjs                      probe each model's current id and its likely next versions
//   node check.mjs --scan <dir> [...]   also list ids in <dir> older than the newest known version
// OpenRouter has no list endpoint for decision models, so each candidate is a one-question call (~$0.000002):
// 200 = live, 404 "No endpoints found" = listed but not served yet, 400 "does not exist" = absent.
// Scanning only reads local files; nothing from them is sent anywhere. Without OPENROUTER_API_KEY it
// skips the probes and compares against models.json alone.
// Exit code 1 when something needs action (a current id is not live, a newer version is live, or an id is outdated).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { MODELS, WATCH, decide, noul } from "./sysone.mjs";

export function cmpVersion(a, b) {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

// Next minor, the one after (in case a release was skipped), and the next major.
export function candidateVersions(v) {
  const s = v.split(".").map(Number), major = s[0] + 1;
  const bump = (n) => [...s.slice(0, -1), s.at(-1) + n].join(".");
  return [...new Set(s.length === 1 ? [`${v}.1`, `${major}`] : [bump(1), bump(2), `${major}`, `${major}.0`])];
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Group 1 is the version. A dated snapshot suffix (-20261016) and a trailing "." are allowed;
// a named variant (-ultra) is not, so liquid/d1-ultra never reads as liquid/d1.
export function familyRegex(family, flags = "g") {
  const [pre, post] = family.split("{v}");
  return new RegExp(`${esc(pre)}(\\d+(?:\\.\\d+)*)${esc(post)}(?![\\w]|-[a-z])`, flags);
}

export function versionOf(id, family) {
  return new RegExp(`^${familyRegex(family).source}`).exec(id)?.[1] ?? null;
}

export async function probe(id, decideFn = decide) {
  try {
    const r = await decideFn(id, "ping", { q: noul("Is this a ping?") }, { tag: "check" });
    return { id, status: "live", served: r.model };
  } catch (e) {
    if (e.status === 404 && /no endpoints/i.test(e.message)) return { id, status: "listed" };
    if (e.status === 400 && /does not exist/i.test(e.message)) return { id, status: "absent" };
    return { id, status: "error", detail: String(e.message).slice(0, 120) };
  }
}

// Sequential on purpose: ~30 tiny calls, and parallel bursts invite 429s.
export async function checkModels(models = MODELS, watch = WATCH, decideFn = decide) {
  const reports = [];
  for (const [key, m] of Object.entries(models)) {
    const current = await probe(m.id, decideFn), newer = [], errors = [];
    const v = m.family && versionOf(m.id, m.family);
    if (v) for (const c of candidateVersions(v)) {
      const p = await probe(m.family.replace("{v}", c), decideFn);
      if (p.status === "live" || p.status === "listed") newer.push(p);
      else if (p.status === "error") errors.push(p);
    }
    reports.push({ key, current, newer, errors });
  }
  for (const id of watch) reports.push({ key: "watch", current: await probe(id, decideFn), newer: [], errors: [] });
  return reports;
}

export function printReports(reports) {
  let action = false;
  for (const { key, current: c, newer, errors } of reports) {
    console.log(`${key.padEnd(9)} ${c.id.padEnd(30)} ${c.status}${c.served ? ` (served ${c.served})` : ""}${c.detail ? `: ${c.detail}` : ""}`);
    for (const p of newer) console.log(`${" ".repeat(10)}${p.status === "live" ? "NEW" : "COMING"} ${p.id} ${p.status}`);
    for (const p of errors) console.log(`${" ".repeat(10)}? ${p.id} error: ${p.detail}`);
    if (key === "watch" ? c.status === "live" : c.status !== "live" || newer.some((p) => p.status === "live")) action = true;
  }
  return action;
}

// Build output, dependencies, and secrets. target/ is Rust's build dir (one repo had 16k files there).
const SKIP = /(^|[\\/])(node_modules|\.git|dist|build|target|coverage|\.next|__pycache__|\.venv|venv|\.tox|\.env[^\\/]*|package-lock\.json|pnpm-lock\.yaml)([\\/]|$)|\.(lock|db|db-wal|db-shm|png|jpe?g|gif|webp|ico|zip|gz|pdf|woff2?)$/i;
const MAX_BYTES = 1_048_576;

export function scanText(text, models = MODELS) {
  const hits = [], families = Object.entries(models).filter(([, m]) => m.family).map(([key, m]) => [key, familyRegex(m.family)]);
  text.split("\n").forEach((line, i) => {
    for (const [key, re] of families)
      for (const x of line.matchAll(re)) hits.push({ line: i + 1, id: x[0], key, version: x[1] });
  });
  return hits;
}

// Symlinks are skipped (Dirent reports neither file nor directory), so link loops cannot recurse.
export function scanDir(dir, models = MODELS) {
  const hits = [];
  const walk = (rel) => {
    let entries;
    try { entries = readdirSync(join(dir, rel), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const r = rel ? join(rel, e.name) : e.name;
      if (SKIP.test(r)) continue;
      if (e.isDirectory()) walk(r);
      else if (e.isFile()) try {
        if (statSync(join(dir, r)).size > MAX_BYTES) continue;
        for (const h of scanText(readFileSync(join(dir, r), "utf8"), models)) hits.push({ file: r, ...h });
      } catch {}
    }
  };
  walk("");
  return hits;
}

// Newest version per family: the registry's, or a newer live one the probes found.
export function newestKnown(models = MODELS, reports = []) {
  const out = {};
  for (const [key, m] of Object.entries(models)) {
    const version = m.family && versionOf(m.id, m.family);
    if (!version) continue;
    out[key] = { id: m.id, version };
    for (const p of reports.find((r) => r.key === key)?.newer ?? []) {
      const v = p.status === "live" && versionOf(p.id, m.family);
      if (v && cmpVersion(v, out[key].version) > 0) out[key] = { id: p.id, version: v };
    }
  }
  return out;
}

const isMain = process.argv[1] && import.meta.url.toLowerCase() === pathToFileURL(process.argv[1]).href.toLowerCase();
if (isMain) {
  const argv = process.argv.slice(2);
  const roots = argv.flatMap((a, i) => (a === "--scan" && argv[i + 1] ? [argv[i + 1]] : []));
  let action = false, reports = [];
  if (process.env.OPENROUTER_API_KEY) action = printReports(reports = await checkModels());
  else console.log("no OPENROUTER_API_KEY: skipping probes");
  const newest = newestKnown(MODELS, reports);
  for (const root of roots) {
    if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) { console.log(`\n${root}: not a folder`); action = true; continue; }
    const stale = scanDir(root).filter((h) => newest[h.key] && cmpVersion(h.version, newest[h.key].version) < 0);
    // One line per file and id, so a results file with hundreds of copies stays readable.
    const groups = new Map();
    for (const h of stale) groups.set(`${h.file}\0${h.id}`, [...(groups.get(`${h.file}\0${h.id}`) ?? []), h]);
    console.log(`\n${root}: ${stale.length ? `${stale.length} outdated in ${new Set(stale.map((h) => h.file)).size} files` : "nothing outdated"}`);
    for (const [first, ...rest] of groups.values())
      console.log(`  ${first.file}:${first.line}${rest.length ? ` (+${rest.length} more)` : ""}  ${first.id}  -> ${newest[first.key].id}`);
    if (stale.length) action = true;
  }
  process.exitCode = !process.env.OPENROUTER_API_KEY && !roots.length ? 2 : action ? 1 : 0;
}
