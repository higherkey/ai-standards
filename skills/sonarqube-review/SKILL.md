---
name: sonarqube-review
description: "How to complete SonarQube quality gate checks, issue search, and status transitions using the Web API and MCP tools. Use when checking SonarQube/SonarCloud quality gates or triaging static analysis issues."
---

# SonarQube Review Workflow

Use this workflow to query, analyze, and transition code issues inside SonarQube/SonarCloud. Follow the guiding principles to use the right tool for each layer:

---

## Expert Persona
Before starting the review, dynamically assume an expert identity suited for resolving these static analysis issues, such as a *DevSecOps Engineer*, *Quality Assurance Lead*, *Senior Backend Engineer*, or *SonarQube Integration Specialist*. State this identity at the beginning of your response.

---

## Quality Check Mandate
When conducting a SonarQube review, systematically audit the static analysis findings, project configurations, and transitions to identify any **errors, false assumptions, or missed opportunities** in the quality gate metrics or issue classifications.

---


## 1. Tooling Layer Selection
- **SonarScanner CLI (`sonar-scanner`):** Use *only* to trigger a new local code analysis and upload the results to the server. (It cannot read server status or change issue states).
- **SonarQube Web API:** Use for all post-analysis checks (quality gates, issue queries, status updates).
- **MCP Server Tools:** Prefer these when they wrap the Web API for convenience.
- **Web UI:** Best for manual exploration and complex filtering in the browser.

---

## 2. CLI Command Reference (SonarScanner)
To run a new scan, execute from the repository root:
```bash
sonar-scanner -Dsonar.projectKey=[PROJECT_KEY] -Dsonar.sources=.
```

---

## 3. MCP Server Tool Reference
Use the SonarQube MCP server tools to programmatically inspect and manage issues. Tool names vary by host: `mcp_sonarqube_*` on Antigravity, `mcp__<server>__*` on Claude. Pick the tool by capability:

| Capability | Purpose |
|------------|---------|
| Search projects | Search and discover project keys |
| Search issues | Search issues filtered by project, severity, or PR |
| Get quality gate status | Check if project or PR quality gate passes |
| Get component measures | Query metrics like complexity, lines of code, and coverage |
| Change issue status | Transition an issue status (e.g., accept, falsepositive) |
| Show rule | Load detailed descriptions and examples for a rule key |

---

## 4. Standard Review Process
1. **Check Quality Gate:** Query the status using the quality gate status capability:
   ```
   get_project_quality_gate_status(projectKey: "[KEY]")
   ```
2. **Retrieve Blocker Issues:** Fetch outstanding violations:
   ```
   search_sonar_issues_in_projects(projects: ["[KEY]"], severities: ["HIGH", "BLOCKER"])
   ```
3. **Transition Issues (Accept / False Positive):** If a finding is deemed acceptable or a false positive, update its state on the server:
   ```
   change_sonar_issue_status(key: "[ISSUE_KEY]", status: ["accept"])
   ```
4. **Security Hotspots:** Note that `sonar-scanner` cannot resolve hotspots. Review and assign them via the Web UI dashboard or corresponding server Web API endpoints under `/web_api`.
