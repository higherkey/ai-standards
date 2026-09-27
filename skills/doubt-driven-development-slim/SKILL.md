---
name: doubt-driven-development-slim
description: "Adversarial review cycle for non-trivial decisions, state mutations, and boundary crossings before code stands"
---

# Doubt-Driven Development (`/doubt-driven-development-slim`)

Confidence correlates poorly with correctness. Doubt-driven development subjects non-trivial decisions to a fresh-context adversarial check—biased to disprove rather than validate—while course correction is cheap.

---

## Trigger Criteria

Apply when a decision is **non-trivial**:
- Introduces branching, concurrency, or state mutations.
- Crosses a service, module, or network boundary.
- Asserts invariants the compiler cannot verify (idempotence, ordering, thread safety).
- High blast radius (auth, data migrations, public API contracts).

**Skip for:** Mechanical renaming, formatting, one-line bug fixes with obvious proofs, or unambiguous user instructions.

---

## The 5-Step Doubt Cycle

```
CLAIM ──> EXTRACT ──> DOUBT ──> RECONCILE ──> STOP
```

### 1. CLAIM — Surface the Hypothesis
Formulate the assertion in 2–3 lines:
```markdown
CLAIM: "The caching layer is thread-safe under concurrent read/write workloads."
WHY IT MATTERS: A race here silently corrupts user state in production.
```

### 2. EXTRACT — Isolate Artifact + Contract
Extract only what the reviewer needs to evaluate:
- **Artifact:** The diff, function, or concrete proposal (strip previous reasoning).
- **Contract:** The explicit invariants and constraints the artifact must satisfy.
- **Rule:** Never pass the author's justification or the CLAIM block. Handing over conclusions biases the reviewer toward agreement.

### 3. DOUBT — Adversarial Review Prompt
Invoke a fresh-context reviewer or subagent (`invoke_subagent` with `flash` model) with an explicitly adversarial posture:

```markdown
Adversarial Review: Find what is wrong with this artifact.
Assume the author is overconfident. Check for:
1. Unstated assumptions and hidden coupling.
2. Unhandled edge cases and boundary violations.
3. Race conditions, reentrancy, or memory retention.
4. Failure modes under invalid or unexpected input.

Do NOT summarize. Do NOT validate. List concrete flaws only, or explicitly declare none found after exhaustive audit.

ARTIFACT:
<paste isolated artifact>

CONTRACT:
<paste explicit contract>
```

### 4. RECONCILE — Classify Findings
Evaluate reviewer findings strictly against artifact text using this precedence hierarchy:
1. **Contract Misread:** Reviewer flagged an issue because the contract was ambiguous. Refine contract.
2. **Valid & Actionable:** Genuine flaw. Implement fix and re-verify.
3. **Valid Trade-off:** Real issue, but cost of fix exceeds risk. Document decision explicitly.
4. **Noise:** False positive under context reviewer lacked. Dismiss, but check if contract omitted critical context.

### 5. STOP — Bounded Termination
Halt the cycle when:
- Reviewer surfaces only noise or trivial findings.
- **Strict Limit:** 3 cycles completed. If still unresolved after 3 cycles, stop and escalate to the user with the remaining ambiguity.
- User explicitly approves the trade-off.

---

## Anti-Patterns & Red Flags

- **Doubt Theater:** Running 2+ cycles where substantive issues were flagged but zero were classified as actionable.
- **Validation Prompting:** Asking "Does this look good?" instead of "Find the flaws."
- **Over-Doubt:** Doubting simple mechanical edits or syntax adjustments.
- **Leaking the Claim:** Passing the author's rationale to the reviewer.

---

## Verification Checklist

- [ ] Decision was explicitly named as a concise CLAIM.
- [ ] Reviewer received ARTIFACT + CONTRACT only (no reasoning).
- [ ] Adversarial prompt was used.
- [ ] Findings classified by precedence (Misread $\rightarrow$ Actionable $\rightarrow$ Trade-off $\rightarrow$ Noise).
- [ ] Stop condition reached within $\le 3$ cycles.
