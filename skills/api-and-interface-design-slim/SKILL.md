---
name: api-and-interface-design-slim
description: "API design and contract standards: RFC 7807 error models, idempotency, boundary validation, and backward compatibility"
---

# API & Interface Design (`/api-and-interface-design-slim`)

Standards for designing predictable, resilient, and evolvable public APIs, RPC endpoints, and internal module contracts.

---

## 1. Architectural Invariants

### Contract-First & Boundary Validation
- **Validate at the Perimeter:** Parse and validate all external input (schemas, DTOs, parameters) at the boundary (controller/handler). Never pass unvalidated data into domain logic.
- **Fail Fast & Predictably:** Return structured validation errors immediately before initiating database or external service transactions.

### Hyrum's Law Mitigation
- **Never Leak Implementation Details:** Stack traces, internal database column names, and ORM exceptions must never escape to client responses.
- **Explicit Commitments:** Only expose fields that are part of the documented contract. Every returned field is a permanent liability.

---

## 2. Standardized Error Semantics (RFC 7807)

All non-2xx responses must return a standardized problem details JSON object:

```json
{
  "type": "https://api.example.com/errors/invalid-parameters",
  "title": "Validation Failed",
  "status": 422,
  "detail": "Field 'email' must be a valid email address.",
  "instance": "/api/users/123",
  "code": "VALIDATION_FAILED"
}
```

- `400 Bad Request`: Syntactically invalid payload or missing mandatory header.
- `401 Unauthorized`: Missing or expired authentication token.
- `403 Forbidden`: Authenticated caller lacks required role/permission.
- `404 Not Found`: Target entity does not exist or caller lacks visibility.
- `409 Conflict`: Concurrency conflict or duplicate resource key.
- `422 Unprocessable Entity`: Syntactically valid payload failing domain validation.
- `500 Internal Server Error`: Unhandled server exception (opaque to client).

---

## 3. Idempotency & Safe Mutations

- **Deterministic Retries:** Mutating endpoints (`POST`, `PATCH`) must support an `Idempotency-Key` header for network retry resilience.
- **Idempotent Deletes:** `DELETE` operations should return `204 No Content` or `200 OK` if the entity is already deleted, rather than `404 Not Found`, to ensure safe retries.
- **Safe Queries:** `GET` and `HEAD` operations must be completely free of side effects and safe to cache.

---

## 4. Evolution & Backward Compatibility

- **Additive Changes First:** Never rename or delete a field in an active API. Introduce new fields alongside existing ones and deprecate old fields with sunset timelines.
- **Cursor Pagination:** Avoid unbounded list responses. Use cursor-based pagination (`limit`, `starting_after`) over offset-based pagination (`offset`, `page`) for large datasets to prevent missed records during concurrent writes.

---

## 5. Verification Checklist

- [ ] All inputs validated via explicit schemas at the boundary.
- [ ] Error responses follow RFC 7807 problem details structure.
- [ ] No internal stack traces, DB keys, or engine errors leaked in response bodies.
- [ ] Mutating operations support idempotency or safe retry semantics.
- [ ] Pagination implemented on all collection endpoints.
- [ ] Changes are backward-compatible (additive only).
