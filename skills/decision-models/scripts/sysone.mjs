// Shared OpenRouter Decisions API client (Node 18+, no dependencies).
// POST https://openrouter.ai/api/alpha/decisions   Authorization: Bearer $OPENROUTER_API_KEY
// Body: { model, state, questions: { name: { type, instructions, criteria? } } }
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

// Usage log lives outside the project so it is never committed. Override with DECISION_LOG, or set it to "off".
const LOG_FILE = process.env.DECISION_LOG ?? join(homedir(), ".ai-standards", "decision-log.jsonl");
const ENDPOINT = process.env.OPENROUTER_DECISIONS_URL ?? "https://openrouter.ai/api/alpha/decisions";

// Short names -> OpenRouter ids. price = USD per million input tokens (output is free).
// ctx = context in tokens. aa = Artificial Analysis Decision Index v2.1 score.
// Ids, prices and caps verified against the live Decisions API on 2026-11-11.
const DECIDER = { id: "perplexity/pplx-decider-v1.2", price: 0.020, ctx: 262144, aa: 69.8, note: "default; best on our hard spot-check (62/63) and cheapest" };
export const MODELS = {
  decider:  DECIDER,
  pplx:     DECIDER,
  drex:     { id: "nace-ai/drex-max",            price: 0.060, ctx: 524288, aa: 72.6, maxQ: 16, note: "top of AA v2.1; 16 questions/call (auto-split); >~130k state is BM25-selected" },
  mammoth:  { id: "baseten/mammoth-1",           price: 0.100, ctx: 16384,  aa: 71.4, note: "exact pattern/regex calls; best invariance; short inputs only" },
  ultra:    { id: "liquid/d1-ultra",             price: 0.042, ctx: 32768,  aa: 70.6, note: "second opinion, other family; images; fastest of the strong set" },
  elephant: { id: "baseten/elephant-1",          price: 0.035, ctx: 16384,  aa: 66.4, note: "fastest; weak on code details in our spot-check" },
  jev:      { id: "typesafe/jev-1.14",           price: 0.042, ctx: 262144, aa: 66.2, note: "comparison only; 55-57/63 on our hard spot-check, unstable" },
  d1:       { id: "liquid/d1.1",                 price: 0.020, ctx: 65536,  aa: null, note: "comparison only; not in AA; 54-55/63 on our hard spot-check, unstable" },
};

export const noul = (instructions, criteria) => ({ type: "noul", instructions, ...(criteria && { criteria }) });
export const choice = (instructions, criteria) => ({ type: "choice", instructions, criteria });
export const score = (instructions, criteria) => ({ type: "score", instructions, criteria });

export function modelId(name) { return MODELS[name]?.id ?? name; }

export async function decide(model, state, questions, opts = {}) {
  // Some models cap questions per call; split, then merge answers and usage.
  const entry = MODELS[model] ?? Object.values(MODELS).find((m) => m.id === model);
  const maxQ = entry?.maxQ, keys = Object.keys(questions);
  if (!maxQ || keys.length <= maxQ) return decideOnce(model, state, questions, opts);
  const parts = [];
  for (let i = 0; i < keys.length; i += maxQ)
    parts.push(await decideOnce(model, state, Object.fromEntries(keys.slice(i, i + maxQ).map((k) => [k, questions[k]])), opts));
  const sum = (f) => parts.reduce((n, p) => n + (p.usage?.[f] ?? 0), 0);
  return { ...parts[0], answers: Object.assign({}, ...parts.map((p) => p.answers)),
    usage: { ...parts[0].usage, input_tokens: sum("input_tokens"), cost: sum("cost") },
    _latencyMs: parts.reduce((n, p) => n + p._latencyMs, 0), _calls: parts.length };
}

async function decideOnce(model, state, questions, { timeoutMs = 60000, log = true, tag } = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");
  const id = modelId(model);
  const t0 = performance.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: id, state, questions }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status} ${text.slice(0, 400)}`);
  const json = JSON.parse(text);
  json._latencyMs = Math.round(performance.now() - t0);
  if (log) logCall({ tag, model: id, ms: json._latencyMs, tokens: json.usage?.input_tokens, cost: json.usage?.cost, q: Object.keys(questions).length });
  return json;
}

// Append-only usage log (no state/content, just metadata) so thresholds and spend can be tuned later.
export function logCall(entry) {
  if (LOG_FILE === "off") return;
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    appendFileSync(LOG_FILE, JSON.stringify({ t: new Date().toISOString(), ...entry }) + "\n");
  } catch {}
}
