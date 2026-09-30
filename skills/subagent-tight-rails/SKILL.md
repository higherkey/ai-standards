---
name: subagent-tight-rails
description: "Universal task decomposition and dispatch engine for executing work through token-efficient, low-reasoning Flash subagents with strict rails"
---

# Universal Tight-Rails Subagents (`/subagent-tight-rails`)

This skill defines the decomposition and dispatch engine for executing work through focused, token-efficient subagents while protecting the primary agent's context memory.

---

## 1. Metacognitive Task Decomposition Heuristic

Before dispatching a subagent, evaluate the task against this decision matrix:

```
Task Assessment
├─ Small (< 30 lines, 1 file, mechanical replace) ──> EXECUTE DIRECTLY IN PARENT
└─ Bounded / High-Footprint / Exploratory ──────────> DELEGATE TO TIGHT-RAILS SUBAGENT
    ├─ Mechanical search / grep / syntax checks ───> Model: flash_lite
    ├─ Code edits / test writing / deep audit ─────> Model: flash (default)
    └─ Complex multi-file architectural planning ──> Model: pro (rare, bounded)
```

- **Heuristic Primacy:** Model tiers and archetypes below are illustrative guidelines. The parent agent has full metacognitive allowance to adjust model tier, adapt archetypes, or execute directly based on task complexity.
- **Stop-the-Fanout Rule:** Never spawn subagents for trivial edits or single command checks where delegation latency and prompt initialization exceed direct execution cost.

---

## 2. The Four Invariant Dispatch Rails

When invoking `invoke_subagent`, the parent agent MUST enforce these four rails:

1. **Context Isolation (Artifact + Contract Only):**
   - Provide only the target file paths, git diffs, or isolated code snippets.
   - NEVER pass prior conversational narrative, debugging history, or author justifications.
2. **Anti-Chatter Rail (Zero Conversational Overhead):**
   - The subagent prompt must explicitly forbid preambles ("Sure, I can help..."), task restatements, apologies, or conversational summaries.
   - Forbid full-file rewrites; demand targeted replacements or structured findings.
3. **Structured Output Schema:**
   - Audits/Reviews: Markdown table or bulleted manifest with exact `File:Line`, `Issue`, and `Fix`.
   - Implementations: Drop-in replacement blocks or exact diff instructions.
   - Tests: Complete test class file or test methods only.
4. **Autonomous Single-Objective Bounding:**
   - Assign exactly one coherent objective per subagent. If work has multiple disjoint parts, dispatch parallel subagents rather than chaining serial instructions in one subagent.

---

## 3. Illustrative Work Archetypes

Agents may instantiate or synthesize variations of these archetypes:

### Archetype A: Adversarial Quality & Security Auditor
```markdown
Role: Adversarial Code & Security Auditor
Objective: Audit the target files against specified invariant contracts.
Postural Rail: Assume the implementation author is overconfident. Find concrete flaws only.
Output Rails:
- No summary, no praise, no preamble.
- If zero defects found, respond ONLY with: "PASS: Zero actionable defects found."
- If defects found, list strictly as:
  * [FILE:LINE] [CATEGORY: Security|Concurrency|DB|API|UI] Description and required fix.

TARGET FILES:
<files>

CONTRACT / INVARIANTS:
<invariants>
```

### Archetype B: Surgical Implementer
```markdown
Role: Surgical Code Implementer
Objective: Apply the exact remediation described below.
Rails:
- Use targeted surgical replacements. Do not rewrite whole files.
- Preserve all existing comments, docstrings, and formatting.
- Verify syntax and imports. Do not introduce extraneous refactors.

TARGET: <file>
INSTRUCTION: <exact change>
```

### Archetype C: Performance & Bottleneck Profiler
```markdown
Role: Systems Performance Profiler
Objective: Investigate hot paths, query performance, memory allocations, or layout stability.
Rails:
- Follow /performance-optimization-slim: Measure first.
- Report specific bottlenecks with line numbers and allocation/query evidence.
- No general advice. Concrete bottlenecks and targeted remediations only.
```

### Archetype D: Deterministic Test Engineer
```markdown
Role: Test Automation Engineer
Objective: Write isolated, deterministic unit or integration tests for the target component.
Rails:
- Follow /test-driven-development-slim: Red-Green-Refactor, boundary mocking only.
- Include happy path, edge cases, and negative authorization/validation tests.
- Output executable test code only.
```

### Archetype E: Codebase Explorer & API Contract Researcher
```markdown
Role: Codebase & Contract Researcher
Objective: Survey unfamiliar APIs, dependencies, or data flows without polluting parent memory.
Rails:
- Read-only exploration.
- Return a compact interface contract or call graph summary (< 30 lines).
```

---

## 4. Parent Synthesis & Reconciliation

Upon receiving subagent output, the parent agent classifies findings according to the `/doubt-driven-development-slim` precedence hierarchy:
1. **Contract Misread:** Subagent flagged an issue due to ambiguous contract. Refine prompt or resolve.
2. **Valid & Actionable:** Concrete bug or gap. Implement remediation immediately.
3. **Valid Trade-off:** Legitimate concern, but intentional trade-off. Document in trace.
4. **Noise:** False positive under context subagent lacked. Dismiss cleanly.
