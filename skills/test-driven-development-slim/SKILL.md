---
name: test-driven-development-slim
description: "Test-Driven Development methodology: Red-Green-Refactor loop, boundary-only mocking, and deterministic test design"
---

# Test-Driven Development (`/test-driven-development-slim`)

High-density guidelines for driving behavior through automated tests. Tests are proof; unverified code is technical debt.

---

## 1. The Red-Green-Refactor Loop

```
       RED                GREEN               REFACTOR
  Write failing    ──> Write minimal    ──> Clean up code &   ──> Repeat
  test first           code to pass         preserve green
```

1. **RED:** Write the test before modifying production code. Execute the test runner and verify that it fails with the expected assertion failure (not a syntax or configuration error).
2. **GREEN:** Write the simplest, most direct code that satisfies the test. Do not build speculative abstractions.
3. **REFACTOR:** Clean up code, remove duplication, and improve naming while keeping tests passing.

---

## 2. Test Structure: Arrange-Act-Assert (AAA)

Every unit test must follow clear visual separation:

```typescript
// Arrange: setup state, mocks, and inputs
const user = createTestUser({ role: 'admin' });
const service = new BillingService(mockPaymentGateway);

// Act: trigger the single behavior under test
const result = await service.processSubscription(user.id);

// Assert: verify state changes and return values
expect(result.status).toBe('active');
expect(mockPaymentGateway.charge).toHaveBeenCalledOnce();
```

---

## 3. Mocking Boundaries: What to Mock

Over-mocking creates tests that pass even when the system is completely broken.

- **Mock Only at I/O Boundaries:**
  - Network calls (HTTP/gRPC/GraphQL).
  - System clock / time (`Date.now()`, fake timers).
  - Filesystem and disk operations.
  - External database drivers (in unit tests).
- **Never Mock Internal Domain Logic:**
  - Never mock value objects, domain entities, calculation helpers, or pure functions.
  - Test real domain objects with real inputs and outputs.

---

## 4. Deterministic Test Design

- **Zero Arbitrary Sleeps:** Never use `sleep(1000)` or `setTimeout` to await async behavior. Use polling assertions (`waitFor`, `awaitCondition`) or mocked virtual timers.
- **Independent Execution:** Tests must not depend on execution order. Each test must seed its own state and clean up after itself (`beforeEach`/`afterEach`).
- **One Logical Concept per Test:** Each test should verify a single behavior or edge case. Multiple assertions are fine if they verify different facets of the same result.

---

## 5. Verification Checklist

- [ ] Test written and verified RED before implementation began.
- [ ] Test verified GREEN with minimal production code.
- [ ] AAA pattern used with explicit section separation.
- [ ] Only external I/O boundaries mocked; zero domain logic mocked.
- [ ] Zero flaky timers or sleeps; tests run deterministically in random order.
- [ ] Full test suite executes cleanly with 100% pass rate.
