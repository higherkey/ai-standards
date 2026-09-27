---
name: debugging-and-error-recovery-slim
description: "Root-cause debugging methodology: stop-the-line discipline, falsifiable hypothesis testing, git bisect, and regression guards"
---

# Debugging & Error Recovery (`/debugging-and-error-recovery-slim`)

High-density guidelines for systematic, scientific root-cause analysis. Eliminates speculative "guess-and-check" bug fixing.

---

## 1. The Stop-the-Line Rule

When a test fails, a build breaks, or an unexpected runtime error surfaces:

```
1. STOP ──> 2. PRESERVE ──> 3. DIAGNOSE ──> 4. FIX ──> 5. GUARD ──> 6. RESUME
Halt feature  Capture error  Systematic      Root cause  Add regression Continue
development   logs & state   triage          solution    test           work
```

- **Rule:** Never push past a failing test or broken build to work on the next task. Errors compound exponentially; fix the break immediately.

---

## 2. The Scientific Debugging Cycle

### 1. Reproduce (Deterministic Failure)
- Isolate the minimal set of steps, input payload, or test arguments required to reliably trigger the defect.
- If timing-dependent or intermittent: check for race conditions, unawaited promises, shared static state, or leaked database connections.

### 2. Localize (Find the Boundary)
Narrow down which layer is failing:
- **UI:** Console errors, unhandled rejections, DOM element detachments.
- **API / Network:** Status codes, payload serialization mismatch, routing.
- **Domain / State:** Incorrect invariant assumptions, null reference exceptions.
- **Database:** Lock contention, constraint violations, missing migrations.
- **Regression Discovery:** Use `git bisect` to locate the exact commit where behavior changed:
  ```powershell
  git bisect start; git bisect bad HEAD; git bisect good <last-known-good-commit>
  ```

### 3. Formulate Falsifiable Hypotheses
- State explicitly: *"I hypothesize this fails because variable X is null when condition Y occurs."*
- Propose an experiment to prove or disprove the hypothesis before altering code.

### 4. Fix the Root Cause (Never Patch Symptoms)
- Do not wrap failing code in speculative `try/catch` or null-coalescing operators without understanding why the invalid state occurred. Fix the invariant at the producer, not the consumer.

### 5. Guard with a Regression Test
- Write an automated unit or integration test that reproduces the failure **before** committing the fix.
- Verify that the test fails on unpatched code and passes cleanly after the fix.

---

## 3. Anti-Patterns & Red Flags

- **Shotgun Debugging:** Making multiple simultaneous changes hoping one fixes the problem.
- **Silent Suppression:** Catching exceptions and logging without re-throwing or handling gracefully.
- **Closing Without a Test:** Declaring a bug fixed without an accompanying automated test that guards against recurrence.

---

## 4. Verification Checklist

- [ ] Failure reproduced deterministically in a test or local reproduction script.
- [ ] Root cause identified via profiler, stack trace, or `git bisect`.
- [ ] Root cause fixed at the source, not patched cosmetically at the symptom.
- [ ] Automated regression test added and passing.
- [ ] Full test suite passes 100% with no collateral regressions.
