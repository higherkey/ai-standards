#!/usr/bin/env node
// Ad-hoc decision CLI.
//   node decide.mjs --model decider --state "text" --ask "Is this a breaking change?" [--ask "..."]
//   node decide.mjs --model drex --state-file notes.md --ask "Does this match the plan?"
//   node decide.mjs --model pplx < spec.json          (stdin: {"state": ..., "questions": {...}})
//   node decide.mjs --models                          (show the model table)
// --ask adds a yes/no (noul) question; answers print as probabilities of "yes".
import { readFileSync } from "node:fs";
import { MODELS, decide, noul } from "./sysone.mjs";

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const all = (n) => argv.flatMap((a, i) => (a === n ? [argv[i + 1]] : []));

if (argv.includes("--models")) {
  for (const [k, m] of Object.entries(MODELS))
    console.log(`${k.padEnd(9)} ${m.id.padEnd(30)} $${m.price.toFixed(3)}/M  ctx ${String(m.ctx).padEnd(7)} AA ${m.aa ?? "-"}  ${m.note}`);
  process.exit(0);
}

let state = flag("--state");
if (flag("--state-file")) state = readFileSync(flag("--state-file"), "utf8");
let questions = {};
all("--ask").forEach((q, i) => (questions[`q${i + 1}`] = noul(q)));
if (flag("--questions-file")) questions = JSON.parse(readFileSync(flag("--questions-file"), "utf8"));
if (state === undefined && !Object.keys(questions).length && !process.stdin.isTTY) {
  const spec = JSON.parse(readFileSync(0, "utf8"));
  state = spec.state; questions = spec.questions;
}
if (!Object.keys(questions).length) { console.error("No questions. Use --ask, --questions-file, or pipe JSON {state, questions}."); process.exit(2); }

const model = flag("--model") ?? "decider";
const r = await decide(model, state, questions, { tag: "cli" });
console.log(JSON.stringify({ model: r.model, ms: r._latencyMs, tokens: r.usage?.input_tokens, cost: r.usage?.cost, answers: r.answers }, null, 2));
