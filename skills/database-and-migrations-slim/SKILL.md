---
name: database-and-migrations-slim
description: "Zero-downtime database migration strategies, non-blocking indexing, connection pool safety, and query locking prevention"
---

# Database & Migrations (`/database-and-migrations-slim`)

Engineering guidelines for executing zero-downtime schema migrations, query optimization, and connection pool protection across relational databases.

---

## 1. Zero-Downtime Migration Pattern (Expand / Contract)

Never execute destructive schema changes in a single deployment. Always split changes across multiple releases:

```
Release 1 (Expand)      ──> Release 2 (Dual-Write) ──> Release 3 (Backfill) ──> Release 4 (Contract)
Add nullable new column     App writes both old/new    Migrate historical rows    Drop old column
```

### The 4 Phases:
1. **Expand (Release 1):** Add the new column as nullable, or create the new table. No existing application queries are broken.
2. **Dual-Write (Release 2):** Update the application to write to both the old and new columns simultaneously while still reading from the old.
3. **Backfill (Async Job):** Migrate historical data in small, rate-limited batches ($\le 1,000$ rows per transaction) to prevent table locking and transaction log bloat.
4. **Contract (Release 3/4):** Switch the application to read and write exclusively from the new column. In a subsequent deployment, drop the old column.

---

## 2. Safe Schema Modification Rules

- **Non-Blocking Indexes:**
  - PostgreSQL: Always use `CREATE INDEX CONCURRENTLY`.
  - SQL Server: Use `WITH (ONLINE = ON)` on enterprise editions.
  - Never run plain `CREATE INDEX` on active production tables without lock analysis.
- **Adding Columns with Defaults:**
  - Avoid creating non-nullable columns with runtime-computed defaults on large tables without testing lock duration. Add as nullable, backfill in batches, then alter to non-nullable.
- **Statement Timeouts:** Always set an explicit statement timeout (`SET lock_timeout = '5s'`) during migration runs so stalled locks abort cleanly rather than queuing traffic behind an exclusive lock.

---

## 3. Query Performance & Concurrency

- **Parameterized Queries Only:** Never interpolate strings into SQL statements. Always use parameter placeholders (`@param` or `$1`) to eliminate SQL injection and reuse query execution plans.
- **Optimistic Concurrency:** Protect against lost updates using concurrency tokens (`xmin`, `rowversion`, or integer `version` columns) rather than holding long-lived pessimistic database row locks.
- **N+1 Query Prevention:** Always verify ORM query generation (e.g. Entity Framework `.Include()`, Prisma `include`). Profile query counts before shipping list endpoints.

---

## 4. Connection Pool Hygiene

- **Stay Under Capacity:** Ensure total application instance connections (`instances * max_pool_size`) do not exceed the database server's `max_connections` (leaving at least 20% headroom for admin/monitoring tasks).
- **Fast Transactions:** Keep database transactions as short as possible. Never perform external network calls, file I/O, or email sending inside an open database transaction.

---

## 5. Verification Checklist

- [ ] Schema changes follow the Expand/Contract phased lifecycle.
- [ ] Index creation uses non-blocking/concurrent operations.
- [ ] Explicit lock timeouts configured on migration scripts.
- [ ] All queries parameterized; zero string concatenation in queries.
- [ ] Backfills are executed in bounded batches.
- [ ] External network calls are isolated outside of database transactions.
