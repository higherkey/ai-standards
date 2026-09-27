---
name: ci-cd-and-automation-slim
description: "Pipeline automation standards: shift-left quality gates, non-interactive execution invariants, reusable actions, and SemVer release trains"
---

# CI/CD and Automation (`/ci-cd-and-automation-slim`)

Standards for designing predictable, secure, and non-blocking continuous integration and deployment pipelines.

---

## 1. Core Pipeline Invariants

### Non-Interactive Execution
- **Strict Flagging:** All CI steps, package managers, and CLI tools must execute with non-interactive flags (`--yes`, `-y`, `npm ci`, `--accept-package-agreements`, `--no-confirm`) to prevent runner hanging.
- **Fail Fast:** Configure test runners with bail flags (`--bail` or `--fail-fast`) during pull request validation to conserve compute tokens and runner minutes.

### Least-Privilege Permissions
- **Scoped GITHUB_TOKEN:** Declare workflow and job-level permissions explicitly (`contents: read`, `pull-requests: write`, etc.). Never leave permissions at default read/write.
- **Secret Masking:** Environment variables containing API keys, PATs, or database credentials must use repository secrets and never be written to stdout or logs.

---

## 2. Shift-Left Quality Gate Sequence

Every PR must pass through deterministic gates in order of cost and execution speed:

```
PR Open ──> 1. Lint / Format ──> 2. Type Check ──> 3. Unit Tests ──> 4. Build ──> 5. SonarQube / SAST ──> Merge
```

1. **Static Analysis & Formatting:** `eslint`, `prettier --check`, `dotnet format --verify-no-changes`.
2. **Type Compilation:** `tsc --noEmit`, `dotnet build --no-incremental`.
3. **Automated Unit Testing:** Full test execution with coverage enforcement (target $\ge 80\%$, zero ignored failures).
4. **Bundle & Compilation:** Production build artifact creation (`npm run build`).
5. **Quality & Security Scan:** SonarCloud Quality Gate verification and dependency vulnerability auditing (`npm audit --audit-level=high`).

---

## 3. Work Trace Integration

For repositories using `/feature-tracking`:
- **Trace Validation:** Include a PR check (`validate-trace.yml`) ensuring a work trace document exists under `/docs/traces/` for all conventional prefixed branches (`feat/`, `fix/`, etc.).
- **Automatic Pruning:** Include a merge-triggered action (`clean-traces.yml`) to automatically delete `/docs/traces/*.md` and commit the cleanup when merging into `main`.

---

## 4. Release Trains & Versioning

- **SemVer Compliance:** Tag releases automatically using Semantic Versioning (`MAJOR.MINOR.PATCH`) derived from conventional commits (`fix:` $\rightarrow$ patch, `feat:` $\rightarrow$ minor, `BREAKING CHANGE:` $\rightarrow$ major).
- **Artifact Immortality:** Release artifacts (Docker containers, npm packages, static bundles) must be immutable and digest-pinned (`sha256`).

---

## 5. Verification Checklist

- [ ] All runner commands use explicit non-interactive flags.
- [ ] GITHUB_TOKEN permissions are scoped to least privilege.
- [ ] Pipeline sequence: Lint $\rightarrow$ Types $\rightarrow$ Tests $\rightarrow$ Build $\rightarrow$ Security.
- [ ] Secrets are referenced via `${{ secrets.NAME }}` and never echoed in scripts.
- [ ] Trace validation and cleanup workflows are configured.
