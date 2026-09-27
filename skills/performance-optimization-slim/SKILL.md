---
name: performance-optimization-slim
description: "Performance optimization methodology: measurement-first profiling, main thread yielding, hot-path allocation reduction, and memory leak prevention"
---

# Performance Optimization (`/performance-optimization-slim`)

High-density guidelines for systematic performance tuning across frontend rendering, backend execution, and database queries.

---

## 1. The 5-Stage Discipline: Measure First

Never optimize without quantitative baseline measurements:

```
1. MEASURE ──> 2. IDENTIFY ──> 3. FIX ──> 4. VERIFY ──> 5. GUARD
Establish       Find actual    Target     Measure       Add regression
baseline        bottleneck     root cause delta         test/monitor
```

- **Rule:** If you cannot measure the bottleneck in a profiler trace (Chrome DevTools, dotnet trace, pprof), do not change the code. Premature optimization creates unmaintainable complexity.

---

## 2. Frontend & Main Thread Optimization

### Interaction to Next Paint (INP $\le 200\text{ms}$)
- **Break Up Long Tasks ($> 50\text{ms}$):** Yield the main thread between heavy processing steps using `scheduler.yield()` or `setTimeout(0)`. Offload heavy math or parsing to Web Workers.
- **Prevent Layout Thrashing:** Never interleave DOM style reads (`offsetWidth`, `getBoundingClientRect`) with DOM writes (`style.width = ...`). Read first, write together in `requestAnimationFrame`.
- **List Virtualization:** Any collection or table rendering $> 100$ complex items must use windowing/virtualization to keep DOM nodes minimal.

---

## 3. Backend & Hot-Path Optimization

### Allocation & CPU Hygiene
- **Hot Loops:** Avoid allocating heap objects, closures, or temporary arrays inside high-frequency loops. Use object pooling or value structures where applicable.
- **Compiled Access:** Replace runtime reflection in serialization or mapping with source-generated accessors, compiled expression trees, or static lookup tables.
- **Push Over Pull:** Replace periodic HTTP polling loops with event-driven channels (WebSockets, Server-Sent Events, Redis Pub/Sub).

### Memory Leak Prevention
- **Bounded In-Memory Caches:** Never use an unbounded map or dictionary as a cache. Always enforce an eviction policy (LRU) with hard maximum entries and TTL expiration.
- **Stream & Channel Disposal:** Wrap all I/O streams, database readers, and network sockets in `using` / `try-finally` blocks to guarantee timely release.

---

## 4. Database Query Optimization

- **Eliminate N+1 Queries:** Eager-load child relationships in batch queries rather than querying the database in a loop for each parent record.
- **Index Alignment:** Inspect `EXPLAIN ANALYZE` or SQL Execution Plans. Ensure high-frequency `WHERE`, `JOIN`, and `ORDER BY` columns are covered by composite indexes without triggering full table scans.

---

## 5. Verification Checklist

- [ ] Baseline performance measured and recorded before code changes.
- [ ] Profiler trace confirms the specific bottleneck being targeted.
- [ ] No long tasks ($> 50\text{ms}$) freezing UI interaction.
- [ ] Zero N+1 query patterns introduced in data fetching paths.
- [ ] Caches have bounded size limits and TTL expiration.
- [ ] Verification measurement proves measurable improvement under identical test load.
