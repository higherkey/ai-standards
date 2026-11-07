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
// ctx = context in tokens. Verified against the live model list on 2026-11-06.
export const MODELS = {
  d1:       { id: "liquid/d1.1",                 price: 0.020, ctx: 65536,  note: "cheapest general workhorse; text+image" },
  elephant: { id: "baseten/elephant-1",          price: 0.035, ctx: 16384,  note: "9B open peer to d1; short inputs only" },
  mammoth:  { id: "baseten/mammoth-1",           price: 0.100, ctx: 16384,  note: "27B arbiter for hard AST/multi-branch calls; short inputs only" },
  ultra:    { id: "liquid/d1-ultra",             price: 0.042, ctx: 32768,  note: "strongest d1; visual/layout judging" },
  jev:      { id: "typesafe/jev-1.14",           price: 0.042, ctx: 262144, note: "large context; >32KB text uses slower long-context mode" },
  pplx:     { id: "perplexity/pplx-decider-v1.2", price: 0.020, ctx: 262144, note: "factual entailment specialist; large context" },
};

export const noul = (instructions, criteria) => ({ type: "noul", instructions, ...(criteria && { criteria }) });
export const choice = (instructions, criteria) => ({ type: "choice", instructions, criteria });
export const score = (instructions, criteria) => ({ type: "score", instructions, criteria });

export function modelId(name) { return MODELS[name]?.id ?? name; }

export async function decide(model, state, questions, { timeoutMs = 60000, log = true, tag } = {}) {
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
