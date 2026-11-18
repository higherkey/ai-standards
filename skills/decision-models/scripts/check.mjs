#!/usr/bin/env node
// Finds new decision-model versions on OpenRouter.
//   node check.mjs        probe each model's current id and its likely next versions
// OpenRouter has no list endpoint for decision models, so each candidate is a one-question call (~$0.000002):
// 200 = live, 404 "No endpoints found" = listed but not served yet, 400 "does not exist" = absent.
// Exit code 1 when something needs action (a current id is not live, or a newer version is live).
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

const isMain = process.argv[1] && import.meta.url.toLowerCase() === pathToFileURL(process.argv[1]).href.toLowerCase();
if (isMain) process.exitCode = printReports(await checkModels()) ? 1 : 0;
