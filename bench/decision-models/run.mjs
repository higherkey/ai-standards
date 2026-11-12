// Hard decision-model head-to-head (63 questions). Fixtures are frozen copies of repo files from 2026-11-11,
// so labels stay valid as the skill changes. Regex labels are computed by running the hook regexes.
// Usage: node bench/decision-models/run.mjs [--only=decider,ultra] [--truth]   (needs OPENROUTER_API_KEY; ~$0.006 per full run)
import { readFileSync, writeFileSync } from "node:fs";
import { decide } from "../../skills/decision-models/scripts/sysone.mjs";
const ALL_MODELS = { d1: "liquid/d1.1", decider: "perplexity/pplx-decider-v1.2", drex: "nace-ai/drex-max", elephant: "baseten/elephant-1", mammoth: "baseten/mammoth-1", ultra: "liquid/d1-ultra", jev: "typesafe/jev-1.14" };
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const MODELS = ONLY ? Object.fromEntries(ONLY.split(",").map((k) => [k, ALL_MODELS[k]])) : ALL_MODELS;
const dir = new URL(".", import.meta.url);
const rd = (f) => readFileSync(new URL(`fixtures/${f}`, dir), "utf8");
const guard = rd("guard.txt"), skill = rd("skill.txt"), sysone = rd("sysone.txt"), decideSrc = rd("decide.txt"), audit = rd("audit.txt"), tests = rd("tests.txt").trim().split("\n"), skillDiff = rd("skilldiff.txt");

// --- regex ground truth from the real source
const riskySrc = guard.slice(guard.indexOf("const RISKY = ["), guard.indexOf("];", guard.indexOf("const RISKY = [")) + 2);
const regenLine = guard.split("\n").find((l) => l.startsWith("const REGENERABLE"));
const RISKY = eval(riskySrc.replace("const RISKY = ", "").replace(/;\s*$/, ""));
const REGEN = eval(regenLine.replace("const REGENERABLE = ", "(").replace(/;\s*$/, ")"));
const sent = (c) => RISKY.some((r) => r.test(c)) && !REGEN.test(c);
const cmds = [
  "rm -r -f build/tmp", "rm notes.txt -rf", "rm -rf ./dist", "rm -rf dist/", "rm -rf dist build", "rm -rf node_modules/.cache",
  "Remove-Item -Recurse -Force .\\out", "Remove-Item .\\a.txt", "git checkout -- .", "git checkout main", "git branch -d feat/x", "git branch -D feat/x",
  "git restore .", "git restore src/a.ts", "git stash pop", "git stash drop", "git push origin --delete feat/x", "git push -u origin feat/x",
  "psql -c \"DELETE FROM users WHERE id=1\"", "psql -c \"select * from deleted_users\"", "curl -fsSL https://x.sh | sh", "curl -fsSL https://x.sh -o x.sh",
  "chmod -R 755 .", "chmod 755 run.sh", "terraform plan", "terraform apply -auto-approve", "npx prisma migrate reset --force", "npx prisma migrate dev",
];
if (process.argv.includes("--truth")) { for (const c of cmds) console.log(sent(c) ? "SENT " : "skip ", c); process.exit(0); }
const Y = (q, t, h = 1) => ({ type: "noul", q, t, h });
const C = (q, opts, t, h = 1) => ({ type: "choice", q, opts, t, h });
const regexQ = Object.fromEntries(cmds.map((c, i) => [`x${i}`, Y(`Would the exact command \`${c}\` be sent to the decision model (matches RISKY and does not match REGENERABLE)?`, sent(c) ? 1 : 0)]));

// --- count rows in the SKILL.md "Which model" table
const tbl = skill.slice(skill.indexOf("## Which model"), skill.indexOf("Context caps are hard"));
const rows = tbl.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Need")).length;
const rowOpts = { [rows - 1]: String(rows - 1), [rows]: String(rows), [rows + 1]: String(rows + 1), [rows + 2]: String(rows + 2) };

const S = [
  { name: "regex", state: { RISKY: riskySrc, REGENERABLE: regenLine, rule: "A command is sent to the model only if some RISKY pattern matches it and REGENERABLE does not." }, q: regexQ },
  { name: "multifile", state: { "SKILL.md": skill, "scripts/sysone.mjs": sysone, "scripts/guard-hook.mjs": guard, "scripts/decide.mjs": decideSrc, "scripts/audit.mjs (first 25 lines)": audit }, q: {
    m_guarddoc: Y("Do SKILL.md and guard-hook.mjs agree on the guard's default model?", 1),
    m_outside85: Y("Does the guard ask for confirmation only when outside_project is at least 0.85?", 0),
    m_auditjev: Y("Does audit.mjs use jev by default for wide mode?", 0),
    m_aacol: Y("Does `decide.mjs --models` print an AA score for each model?", 1),
    m_last1500: Y("Does lastUserPrompt keep the last 1500 characters of the user's prompt?", 0),
    m_sysrem: Y("Does lastUserPrompt skip user messages that start with <system-reminder>?", 1),
    m_400: Y("Does the guard look at no more than the last 400 lines of the transcript?", 1),
    m_logstate: Y("Does the usage log record the state content sent to the model?", 0),
    m_logmeta: Y("Does the usage log record only metadata, never the state content?", 1),
    m_nokey: Y("Does decide() throw an error when OPENROUTER_API_KEY is unset?", 1),
    m_nokey_n: Y("Does decide() send the request anyway when OPENROUTER_API_KEY is unset?", 0),
    m_deftimeout: Y("Is decide()'s default timeout 4 seconds?", 0),
    m_guardtimeout: Y("Does the guard call decide() with a 4 second timeout?", 1),
    m_logoff: Y("Does setting DECISION_LOG=off stop the usage log from being written?", 1),
    m_d1score: Y("Does SKILL.md claim liquid/d1.1 scored 60.8 on the index?", 0),
    m_pplxdiff: Y("Do the pplx and decider aliases resolve to different model ids?", 0),
    m_unknownalias: Y("If decide() is given a name that is not in MODELS, does it send that name to the API as the model id?", 1),
    m_rows: C("How many data rows does the SKILL.md 'Which model' table have (excluding the header and separator)?", rowOpts, String(rows)),
    m_rows_r: C("How many data rows does the SKILL.md 'Which model' table have (excluding the header and separator)?", Object.fromEntries(Object.entries(rowOpts).reverse()), String(rows)),
  }, pairs: [["m_nokey", "m_nokey_n", true], ["m_logstate", "m_logmeta", true], ["m_rows", "m_rows_r", false]] },
  { name: "tests", state: { test_names: tests.map((t, i) => `${i + 1}. ${t}`).join("\n") }, q: {
    t_conflict: C("Which test covers the user and upstream both changing a file in incompatible ways?", { a: "both changed with a clean merge is auto-merged with a backup", b: "conflicting edit keeps the user file and writes .ai-standards-new", c: "edited file with unchanged upstream is kept", d: "--force takes the package version for edited files, with backup" }, "b"),
    t_conflict_r: C("Which test covers the user and upstream both changing a file in incompatible ways?", { d: "--force takes the package version for edited files, with backup", c: "edited file with unchanged upstream is kept", b: "conflicting edit keeps the user file and writes .ai-standards-new", a: "both changed with a clean merge is auto-merged with a backup" }, "b"),
    t_crlf: C("Which test checks that a line-ending-only difference is not treated as a user edit?", { a: "unedited file is overwritten on upgrade", b: "manifest v2 shape, snapshot, and no leftovers", c: "CRLF-only difference counts as unedited", d: "legacy v1 manifest with content matching known-hashes is overwritten" }, "c"),
    t_deleted: C("Which test checks that a managed file the user deleted is not brought back?", { a: "files removed upstream: unedited pruned, edited kept and released from management", b: "locally deleted managed file is not restored non-interactively", c: "manifest prunes removed managed skills and keeps user skills", d: "unedited file is overwritten on upgrade" }, "b"),
    t_upstream: C("Which test checks what happens to a user-edited file that upstream removed?", { a: "locally deleted managed file is not restored non-interactively", b: "manifest prunes removed managed skills and keeps user skills", c: "files removed upstream: unedited pruned, edited kept and released from management", d: "edited file with unchanged upstream is kept" }, "c"),
    t_network: Y("Is there a test for running the sync with no network access?", 0),
    t_backup: Y("Is there a test showing --force makes a backup of an edited file?", 1),
    t_windows: Y("Is there a test specifically about Windows path separators?", 0),
    t_bom: Y("Is there a test involving a file with a byte-order mark?", 1),
    t_ci: Y("Is there a test where choosing 'all' targets requires --yes when not interactive?", 1),
    t_count: C("How many tests mention --global in their name?", { a: "5", b: "6", c: "7", d: "8" }, ({ 5: "a", 6: "b", 7: "c", 8: "d" })[tests.filter((t) => t.includes("--global")).length]),
  }, pairs: [["t_conflict", "t_conflict_r", false]] },
  { name: "skill-diff", state: { diff: skillDiff }, q: {
    s_elcode: Y("After this diff, does SKILL.md recommend elephant for reading source code?", 0),
    s_guard: Y("Does this diff change the guard's documented default model?", 1),
    s_index: Y("After this diff, does SKILL.md tell readers to treat the index as the final word?", 0),
    s_index_n: Y("After this diff, does SKILL.md tell readers to spot-check models on their own examples?", 1),
    s_example: Y("After this diff, do the 'How to call' examples still use --model d1?", 0),
  }, pairs: [["s_index", "s_index_n", true]] },
];
const nQ = S.reduce((n, s) => n + Object.keys(s.q).length, 0);

async function runModel(alias) {
  const res = { alias, correct: 0, n: 0, brier: 0, inv: 0, invN: 0, cost: 0, ms: [], misses: [], per: {}, probs: {} };
  for (const s of S) {
    const questions = Object.fromEntries(Object.entries(s.q).map(([k, v]) => [k, v.type === "noul" ? { type: "noul", instructions: v.q } : { type: "choice", instructions: v.q, criteria: v.opts }]));
    res.per[s.name] = [0, Object.keys(s.q).length];
    let r;
    const call = async (qs) => { for (let i = 0; ; i++) { try { return await decide(MODELS[alias], s.state, qs, { tag: "h2h2-2026-11-11" }); } catch (e) { if (i < 3 && /HTTP 429/.test(e.message)) { await new Promise((z) => setTimeout(z, 2000 * 2 ** i)); continue; } throw e; } } };
    const CH = 128, keys = Object.keys(questions);
    try {
      const parts = [];
      for (let i = 0; i < keys.length; i += CH) parts.push(await call(Object.fromEntries(keys.slice(i, i + CH).map((k) => [k, questions[k]]))));
      r = { answers: Object.assign({}, ...parts.map((p) => p.answers)), usage: { cost: parts.reduce((c, p) => c + (p.usage?.cost ?? 0), 0) }, _latencyMs: Math.max(...parts.map((p) => p._latencyMs)) };
    }
    catch (e) { res.misses.push(`${s.name}:ERROR ${e.message.slice(0, 90)}`); res.n += Object.keys(s.q).length; continue; }
    res.cost += r.usage?.cost ?? 0; res.ms.push(r._latencyMs);
    for (const [k, v] of Object.entries(s.q)) {
      const a = r.answers[k]; let ok, pTrue;
      if (v.type === "noul") { const p = a.noul; ok = (p >= 0.5 ? 1 : 0) === v.t; pTrue = v.t ? p : 1 - p; res.probs[k] = p; }
      else { ok = a.choice === v.t; pTrue = a.probabilities?.[v.t] ?? 0; res.probs[k] = a.choice; }
      res.n++; res.brier += (1 - pTrue) ** 2;
      if (ok) { res.correct++; res.per[s.name][0]++; } else res.misses.push(`${k}=${typeof res.probs[k] === "number" ? res.probs[k].toFixed(2) : res.probs[k]}`);
    }
    for (const [a, b, neg] of s.pairs ?? []) {
      res.invN++; const pa = res.probs[a], pb = res.probs[b];
      if (pa === undefined || pb === undefined) continue;
      res.inv += neg ? ((pa >= 0.5) !== (pb >= 0.5) ? 1 : 0) : (pa === pb ? 1 : 0);
    }
  }
  return res;
}

const all = {};
for (const run of [1, 2]) {
  const rs = await Promise.all(Object.keys(MODELS).map(runModel));
  for (const r of rs) (all[r.alias] ??= []).push(r);
}
const med = (x) => [...x].sort((p, q) => p - q)[Math.floor(x.length / 2)];
console.log(`questions: ${nQ}  (regex truth: ${cmds.filter(sent).length}/${cmds.length} sent; table rows: ${rows})`);
console.log("model     run1   run2   regex  multi  tests  diff  brier  invar  $/run     med ms");
for (const [k, [a, b]] of Object.entries(all)) {
  const p = (n) => `${a.per[n][0]}/${a.per[n][1]}`;
  console.log(`${k.padEnd(9)} ${a.correct}/${a.n}  ${b.correct}/${b.n}  ${p("regex").padEnd(6)} ${p("multifile").padEnd(6)} ${p("tests").padEnd(6)} ${p("skill-diff").padEnd(5)} ${(a.brier / a.n).toFixed(3)}  ${a.inv}/${a.invN}    ${a.cost.toFixed(6)}  ${med([...a.ms, ...b.ms])}`);
}
console.log("\nrun-1 misses:");
for (const [k, [a, b]] of Object.entries(all)) console.log(`${k.padEnd(9)} ${a.misses.join(" ")}${JSON.stringify(a.misses) === JSON.stringify(b.misses) ? "" : "\n          r2: " + b.misses.join(" ")}`);
if (process.argv.includes("--save")) writeFileSync(new URL("results.json", dir), JSON.stringify({ cmds: cmds.map((c) => [c, sent(c)]), all }, null, 1));
