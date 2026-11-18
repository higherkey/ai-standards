// Shared OpenRouter Decisions API client (Node 18+, no dependencies).
// POST https://openrouter.ai/api/alpha/decisions   Authorization: Bearer $OPENROUTER_API_KEY
// Body: { model, state, questions: { name: { type, instructions, criteria? } } }
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Usage log lives outside the project so it is never committed. Override with DECISION_LOG, or set it to "off".
const LOG_FILE = process.env.DECISION_LOG ?? join(homedir(), ".ai-standards", "decision-log.jsonl");
const ENDPOINT = process.env.OPENROUTER_DECISIONS_URL ?? "https://openrouter.ai/api/alpha/decisions";

// Short names -> OpenRouter ids live in ../models.json (shared by every script, the bench, and other repos).
// price = USD per million input tokens (output is free); ctx = context in tokens; aa = AA Decision Index v2.1;
// family = the id with its version replaced by {v}, used by check.mjs to probe for newer versions.
export function loadRegistry(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { throw new Error(`Cannot load decision model registry ${path instanceof URL ? fileURLToPath(path) : path}: ${e.message}`); }
}
const REGISTRY = loadRegistry(new URL("../models.json", import.meta.url));
export const { models: MODELS, aliases: ALIASES = {}, default: DEFAULT, watch: WATCH = [], verified: VERIFIED } = REGISTRY;

export const noul = (instructions, criteria) => ({ type: "noul", instructions, ...(criteria && { criteria }) });
export const choice = (instructions, criteria) => ({ type: "choice", instructions, criteria });
export const score = (instructions, criteria) => ({ type: "score", instructions, criteria });

// Look up a model by short name, alias, or full OpenRouter id.
export function entry(name) {
  return MODELS[name] ?? MODELS[ALIASES[name]] ?? Object.values(MODELS).find((m) => m.id === name);
}
export function modelId(name) { return entry(name)?.id ?? name; }

export async function decide(model, state, questions, opts = {}) {
  // Some models cap questions per call; split, then merge answers and usage.
  const maxQ = entry(model)?.maxQ, keys = Object.keys(questions);
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
  if (!res.ok) throw Object.assign(new Error(`${id}: HTTP ${res.status} ${text.slice(0, 400)}`), { status: res.status });
  const json = JSON.parse(text);
  json._latencyMs = Math.round(performance.now() - t0);
  if (log) logCall({ tag, model: id, served: json.model, ms: json._latencyMs, tokens: json.usage?.input_tokens, cost: json.usage?.cost, q: Object.keys(questions).length });
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
