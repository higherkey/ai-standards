#!/usr/bin/env node
// Spec-vs-code audit with decision models.
//   node audit.mjs --checks checks/e1f.json [--mode scoped|wide|both]
//                  [--model-scoped d1] [--model-wide jev] [--out report.md] [--limit N]
// scoped: one small request per claim (only that claim's evidence files). Cheap, accurate, parallel.
// wide:   ONE request holding the whole plan + all code, with every claim as a question (large-context test).
// Never reads .env, *.db, lockfiles or dist/. Code leaves your machine only to OpenRouter.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { MODELS, choice, decide, modelId } from "./sysone.mjs";

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
if (argv.includes("--help") || !flag("--checks")) {
  console.log("usage: node audit.mjs --checks checks/e1f.json [--mode scoped|wide|both] [--model-scoped d1] [--model-wide jev] [--out report.md] [--limit N]");
  process.exit(argv.includes("--help") ? 0 : 2);
}
const cfg = JSON.parse(readFileSync(resolve(flag("--checks")), "utf8"));
const mode = flag("--mode", "both");
const mScoped = flag("--model-scoped", "d1");
const mWide = flag("--model-wide", "jev");
const root = cfg.root;
const claims = cfg.claims.slice(0, Number(flag("--limit", 1e9)));

const BLOCK = /(^|[\\/])(\.env[^\\/]*|node_modules|dist|dist-portals|\.git)([\\/]|$)|\.(db|db-wal|db-shm|lock)$|pnpm-lock|package-lock/i;
const TEXT = /\.(ts|tsx|js|mjs|json|md|html|css|yaml|yml)$/i;

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (BLOCK.test(p)) continue;
    const s = statSync(p);
    s.isDirectory() ? walk(p, out) : TEXT.test(p) && out.push(p);
  }
  return out;
}
function expand(patterns) {
  const set = new Set();
  for (const pat of patterns) {
    const abs = join(root, pat.replace(/\/\*\*$/, ""));
    if (pat.endsWith("/**")) walk(abs).forEach((f) => set.add(f));
    else if (!BLOCK.test(abs)) { try { statSync(abs); set.add(abs); } catch { /* missing file = evidence of absence */ } }
  }
  return [...set];
}
const rel = (f) => relative(root, f).replaceAll("\\", "/");
const readFiles = (files) => Object.fromEntries(files.map((f) => [rel(f), readFileSync(f, "utf8")]));

const CRITERIA = {
  implemented: "The code fully and concretely does what the claim states, with all named specifics present.",
  partial: "Some of the claim is implemented but named specifics, values or behaviors are missing, stubbed, or different.",
  missing: "The code does not implement this; the file is absent, empty, or only a placeholder.",
  contradicted: "The code does the opposite of, or violates, what the claim states.",
};
const question = (claim) => choice(
  `Given the code in the state, evaluate this specification claim. CLAIM: ${claim}`, CRITERIA);

const results = {}; // id -> {scoped, wide}
let totalCost = 0, totalTokens = 0, calls = 0;
const note = (r) => { totalCost += r.usage?.cost ?? 0; totalTokens += r.usage?.input_tokens ?? 0; calls++; };

async function pool(items, n, fn) {
  const out = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}

if (mode === "scoped" || mode === "both") {
  console.log(`scoped: ${claims.length} requests with ${modelId(mScoped)} ...`);
  await pool(claims, 6, async (c) => {
    const files = expand(c.files);
    const state = { evidence_files: readFiles(files), missing_files: c.files.filter((p) => !p.endsWith("/**") && !files.some((f) => rel(f) === p)) };
    const kb = Math.round(JSON.stringify(state).length / 1024);
    try {
      const r = await decide(mScoped, state, { verdict: question(c.claim) }, { tag: "audit-scoped" });
      note(r);
      const a = r.answers.verdict;
      (results[c.id] ??= {}).scoped = { verdict: a.choice, conf: a.confidence, p: a.probabilities, kb, ms: r._latencyMs };
    } catch (e) { (results[c.id] ??= {}).scoped = { error: e.message.slice(0, 200), kb }; }
  });
}

if (mode === "wide" || mode === "both") {
  const files = expand(cfg.wide_globs);
  const state = { build_plan: readFileSync(join(root, cfg.plan), "utf8"), code: readFiles(files) };
  const kb = Math.round(JSON.stringify(state).length / 1024);
  const qs = Object.fromEntries(claims.map((c) => [c.id, question(c.claim)]));
  console.log(`wide: 1 request, ${files.length} files, ~${kb} KB (~${Math.round(kb * 1024 / 3.6 / 1000)}k tokens), ${claims.length} questions, ${modelId(mWide)} ...`);
  try {
    const r = await decide(mWide, state, qs, { timeoutMs: 180000, tag: "audit-wide" });
    note(r);
    for (const c of claims) {
      const a = r.answers[c.id];
      (results[c.id] ??= {}).wide = a ? { verdict: a.choice, conf: a.confidence, p: a.probabilities, kb, ms: r._latencyMs } : { error: "no answer" };
    }
    console.log(`wide done: ${r._latencyMs} ms, ${r.usage?.input_tokens} input tokens, cost $${r.usage?.cost}`);
  } catch (e) {
    console.log("wide FAILED:", e.message);
    for (const c of claims) (results[c.id] ??= {}).wide = { error: e.message.slice(0, 200), kb };
  }
}

// ---- report ----
const f = (x) => (x?.error ? `ERR` : x ? `${x.verdict} (${x.conf?.toFixed(2)})` : "-");
const rows = claims.map((c) => {
  const r = results[c.id] ?? {};
  const agree = r.scoped?.verdict && r.wide?.verdict ? (r.scoped.verdict === r.wide.verdict ? "yes" : "NO") : "-";
  return `| ${c.id} | ${f(r.scoped)} | ${f(r.wide)} | ${agree} |`;
});
const tally = (k) => {
  const t = {};
  claims.forEach((c) => { const v = results[c.id]?.[k]?.verdict; if (v) t[v] = (t[v] ?? 0) + 1; });
  return Object.entries(t).map(([a, b]) => `${a}: ${b}`).join(", ") || "-";
};
const md = [
  `# Decision-model audit`, ``,
  `Root: ${root}  ·  Plan: ${cfg.plan}  ·  Claims: ${claims.length}`,
  `Scoped model: ${modelId(mScoped)}  ·  Wide model: ${modelId(mWide)}`,
  `Calls: ${calls}  ·  Input tokens: ${totalTokens}  ·  Total cost: $${totalCost.toFixed(5)}`, ``,
  `Scoped tally: ${tally("scoped")}`, `Wide tally: ${tally("wide")}`, ``,
  `| claim | scoped | wide | agree |`, `|---|---|---|---|`, ...rows, ``,
  `Claims text:`, ...claims.map((c) => `- **${c.id}**: ${c.claim}`),
].join("\n");
const out = flag("--out", "audit-report.md");
mkdirSync(dirname(resolve(out)), { recursive: true });
writeFileSync(out, md);
console.log("\n" + md.split("\n").slice(0, 8 + claims.length + 4).join("\n"));
console.log(`\nreport written: ${resolve(out)}`);
writeFileSync(out.replace(/\.md$/, ".json"), JSON.stringify(results, null, 1));
