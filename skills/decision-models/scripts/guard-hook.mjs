#!/usr/bin/env node
// Claude Code PreToolUse hook (matcher: Bash).
// Cheap pre-filter first; only commands that look destructive are sent to a decision model
// (d1.1, ~$0.00001 per call, ~400 ms). If the model thinks it is irreversible/off-task, the user
// is asked to confirm. Fails OPEN on any error, missing key, or timeout so it never blocks work.
// Disable with DECISION_GUARD=off. Tune with GUARD_MODEL, GUARD_IRREVERSIBLE, GUARD_OFFTASK.
import { existsSync, readFileSync } from "node:fs";
import { decide, noul } from "./sysone.mjs";

const RISKY = [
  /\brm\s+(-[a-z]*\s+)*-[a-z]*[rf]/i, /\brm\s+.*\s-[a-z]*[rf]/i,
  /\brmdir\b.*\/s/i, /\bdel\b.*\/[sq]/i, /remove-item\b.*-recurse/i, /\bformat\s+[a-z]:/i,
  /\bgit\s+(reset\s+--hard|clean\s+-[a-z]*[fdx]|checkout\s+(--\s|\.)|restore\s+(--source|\.)|branch\s+-D|stash\s+(drop|clear)|push\b.*(--force|-f\b|--delete))/i,
  /\b(drop|truncate)\s+(table|database|schema)\b/i, /\bdelete\s+from\b/i,
  /db:(reset|drop|wipe)|migrate:(reset|fresh)|prisma\s+migrate\s+reset|--accept-data-loss/i,
  /\b(docker\s+(system|volume)\s+prune|kubectl\s+delete|terraform\s+(destroy|apply)|npm\s+unpublish)\b/i,
  /\bchmod\s+-R\b|\bchown\s+-R\b|\bmkfs\b|\bdd\s+if=/i,
  /(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b/i,
];
// Deleting only regenerable build output is routine; don't bother the model or the user.
const REGENERABLE = /^\s*rm\s+(-[a-z]+\s+)+(\.\/)?(node_modules|dist|build|out|coverage|\.next|\.turbo|\.cache|__pycache__)\/?\s*$/i;

const IRREVERSIBLE = Number(process.env.GUARD_IRREVERSIBLE ?? 0.7);
const OFFTASK = Number(process.env.GUARD_OFFTASK ?? 0.85);
const MODEL = process.env.GUARD_MODEL ?? "d1";

function lastUserPrompt(path) {
  try {
    if (!path || !existsSync(path)) return "";
    const lines = readFileSync(path, "utf8").trim().split("\n").slice(-400).reverse();
    for (const l of lines) {
      const e = JSON.parse(l);
      if (e.type !== "user" && e.message?.role !== "user") continue;
      const c = e.message?.content;
      const t = typeof c === "string" ? c : Array.isArray(c) ? c.filter((x) => x.type === "text").map((x) => x.text).join("\n") : "";
      if (t && !t.startsWith("<system-reminder>")) return t.slice(0, 1500);
    }
  } catch {}
  return "";
}

try {
  if (process.env.DECISION_GUARD === "off") process.exit(0);
  const input = JSON.parse(readFileSync(0, "utf8"));
  if (input.tool_name !== "Bash") process.exit(0);
  const command = String(input.tool_input?.command ?? "");
  if (!RISKY.some((r) => r.test(command)) || REGENERABLE.test(command)) process.exit(0);

  const userRequest = lastUserPrompt(input.transcript_path);
  const r = await decide(MODEL, {
    user_request: userRequest || "(unknown)",
    working_directory: input.cwd,
    pending_bash_command: command.slice(0, 2000),
  }, {
    irreversible: noul("Would running this command destroy or overwrite data that cannot easily be recovered (not regenerable build output, not tracked in git)?"),
    off_task: noul("Is this command unrelated to what the user asked for in user_request?"),
    outside_project: noul("Does this command modify or delete anything outside working_directory?"),
  }, { timeoutMs: 4000, tag: "guard" });

  const a = r.answers;
  // Without a known task, "off-task" is meaningless, so ignore it.
  const offTaskHit = userRequest && a.off_task.noul >= OFFTASK;
  const hit = a.irreversible.noul >= IRREVERSIBLE || offTaskHit || a.outside_project.noul >= IRREVERSIBLE;
  if (hit) {
    const reason = `Decision guard (${MODEL}): irreversible ${a.irreversible.noul.toFixed(2)}, off-task ${a.off_task.noul.toFixed(2)}, ` +
      `outside-project ${a.outside_project.noul.toFixed(2)}. Confirm this command.`;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: reason } }));
  }
} catch (e) {
  try { process.stderr.write(`decision guard skipped: ${e.message}\n`); } catch {}
}
process.exit(0);
