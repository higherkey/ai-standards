---
name: security-and-hardening-slim
description: "Application security standards: OWASP Top 10 defense, trust boundaries, injection prevention, and secret hygiene"
---

# Security & Hardening (`/security-and-hardening-slim`)

High-density guidelines for defending against vulnerabilities, managing trust boundaries, and enforcing safe data and authentication patterns.

---

## 1. Trust Boundaries & Threat Modeling

Every boundary where external data enters the system is an attack surface:
- HTTP query parameters, headers, cookies, and JSON request bodies.
- Webhooks, third-party API payloads, and message queue events.
- File uploads, filenames, and environment variables.
- LLM outputs (treat prompt injection and returned text as untrusted).

**Rule:** Trust follows who *wrote* the value, not the delivery channel. Validate all input at the boundary against a strict allowlist schema.

---

## 2. The 3-Tier Security Boundary

### Always Do (Mandatory Invariants)
- **Parameterized Queries:** Use query parameter placeholders for all SQL/NoSQL queries. Never concatenate variables into query strings.
- **Output Encoding:** Use framework auto-escaping. Never use raw `innerHTML`, `v-html`, or `dangerouslySetInnerHTML` with untrusted data without an allowlist sanitizer (DOMPurify).
- **Resource-Level Authorization (IDOR Defense):** Verify that the authenticated caller owns or has explicit permission for the requested entity ID on *every* request, not just at the route level.
- **Secure Cookies:** Store session identifiers in cookies with `HttpOnly`, `Secure`, and `SameSite=Lax` or `Strict`. Never store sensitive JWTs or session keys in `localStorage`.
- **Security Headers:** Enforce `HSTS`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and Content Security Policy (`CSP`).

### Ask First (Human Authorization Required)
- Adding new authentication providers or altering existing session lifecycle logic.
- Granting admin roles or changing authorization boundaries.
- Modifying CORS policies to permit cross-origin access.
- Uploading executable files or altering filesystem permissions.

### Never Do (Strict Prohibitions)
- **Never commit secrets:** Zero hardcoded tokens, passwords, or private keys in git history.
- **Never log sensitive data:** Mask passwords, credit cards, PII, and authorization headers in application logs (mitigate CWE-117 log injection and data leaks).
- **Never leak internal errors:** Stack traces, database exception strings, and server internals must never be exposed to clients.

---

## 3. Supply Chain & Dependency Hygiene

- Run native package audits (`npm audit --audit-level=high`) against the lockfile in CI pipelines.
- Verify pinned lockfile integrity (`npm ci`) rather than loose updates (`npm install`).

---

## 4. Verification Checklist

- [ ] All database queries parameterized; zero string concatenation in queries.
- [ ] No raw `innerHTML`, `eval()`, or unescaped user content rendered to DOM.
- [ ] IDOR check: Resource ownership validated on mutations and detail fetches.
- [ ] Zero secrets in source code; environment variables validated on startup.
- [ ] Session cookies set with `HttpOnly`, `Secure`, and `SameSite`.
- [ ] High-severity vulnerabilities resolved in dependency tree.
