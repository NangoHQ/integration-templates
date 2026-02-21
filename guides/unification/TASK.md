# Task Integration Unification

This document describes the unified task model used across project management integrations (Linear, Asana, Jira, GitHub). All providers map to the same `StandardTask` model, ensuring consistent data regardless of source.

## Standardized Task Model

```typescript
interface StandardTask {
    // Core fields (required across all providers)
    id: string;
    title: string;
    description: string | null;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
    priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    assigneeId: string | null;
    projectId: string | null;
    labels: string[];
    dueDate: string | null;   // ISO date string
    url: string;

    // Provider-specific data
    providerSpecific: Record<string, any>;

    // Audit fields
    createdAt: string;   // ISO datetime
    updatedAt: string;   // ISO datetime
}
```

### Field Notes

- **`status`**: Normalized from each provider's status system. Defaults to `TODO` when mapping is ambiguous.
- **`priority`**: Linear is the only provider with native priority. Asana and GitHub always return `NONE`. Jira maps from its priority name field.
- **`dueDate`**: Not supported by GitHub Issues — always `null`.
- **`projectId`**: For GitHub, this is `owner/repo` (e.g. `"acme/backend"`).
- **`labels`**: GitHub and Jira have native labels; Linear maps label names; Asana maps tag names.
- **`providerSpecific`**: Contains all fields that don't map to the standard model. Use this for provider-specific features rather than expanding the standard model.

---

## Status Mapping

### Linear
Linear uses custom workflow states per team. We map by state name pattern:

| State name pattern | StandardTask status |
|---|---|
| contains "cancel", "duplicate" | `CANCELLED` |
| contains "done", "complete", "finish" | `DONE` |
| contains "progress", "started", "review", "testing" | `IN_PROGRESS` |
| anything else | `TODO` |

### Asana
Asana uses a single `completed` boolean:

| Asana value | StandardTask status |
|---|---|
| `completed: true` | `DONE` |
| `completed: false` | `TODO` |

`IN_PROGRESS` and `CANCELLED` are not available from Asana without custom fields.

### Jira
Jira status categories provide a reliable mapping:

| Jira `statusCategory.key` | StandardTask status |
|---|---|
| `todo` | `TODO` |
| `indeterminate` | `IN_PROGRESS` |
| `done` | `DONE` |

`CANCELLED` is not a standard Jira category — it would appear as `DONE` if the issue is resolved as "Won't Fix".

### GitHub
GitHub issues have two states:

| GitHub `state` | StandardTask status |
|---|---|
| `open` | `TODO` |
| `closed` | `DONE` |

---

## Priority Mapping

### Linear
Linear represents priority as a number (0–4):

| Linear value | StandardTask priority |
|---|---|
| `0` | `NONE` |
| `1` | `URGENT` |
| `2` | `HIGH` |
| `3` | `MEDIUM` |
| `4` | `LOW` |

### Jira
Jira priority is a string name:

| Jira priority name | StandardTask priority |
|---|---|
| Highest, Critical | `URGENT` |
| High | `HIGH` |
| Medium | `MEDIUM` |
| Low, Lowest, Minor | `LOW` |
| anything else / null | `NONE` |

### Asana and GitHub
Neither has a native priority field. Always returns `NONE`.

---

## Unified API Endpoint

All providers expose the same endpoint:

```
GET /tasks/unified
Group: Unified Task API
```

---

## Example Unified Outputs

### Linear Example

```typescript
{
    id: "abc123",
    title: "Fix login bug",
    description: "Users cannot log in when 2FA is enabled",
    status: "IN_PROGRESS",
    priority: "HIGH",
    assigneeId: "user_456",
    projectId: "proj_789",
    labels: ["bug", "auth"],
    dueDate: "2026-03-01T00:00:00.000Z",
    url: "https://linear.app/issue/abc123",
    providerSpecific: {
        teamId: "team_123",
        stateId: "state_456",
        stateName: "In Progress",
        estimate: "3",
        milestoneId: null
    },
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-02-10T14:30:00.000Z"
}
```

### Asana Example

```typescript
{
    id: "1234567890123456",
    title: "Write Q1 report",
    description: "Summarize Q1 metrics for leadership review",
    status: "TODO",
    priority: "NONE",
    assigneeId: "9876543210987654",
    projectId: "1111111111111111",
    labels: ["reporting", "q1"],
    dueDate: "2026-03-31T00:00:00.000Z",
    url: "https://app.asana.com/0/1111111111111111/1234567890123456",
    providerSpecific: {
        resourceType: "task",
        assigneeStatus: "upcoming",
        completedAt: null,
        startOn: null,
        numLikes: 2,
        workspaceId: "9999999999999999"
    },
    createdAt: "2026-01-20T09:00:00.000Z",
    updatedAt: "2026-02-05T11:00:00.000Z"
}
```

### Jira Example

```typescript
{
    id: "10042",
    title: "Upgrade database to PostgreSQL 16",
    description: null,
    status: "TODO",
    priority: "HIGH",
    assigneeId: "5b10ac8d82e05b22cc7d4ef5",
    projectId: "10001",
    labels: ["infrastructure", "database"],
    dueDate: null,
    url: "https://mycompany.atlassian.net/browse/INFRA-42",
    providerSpecific: {
        key: "INFRA-42",
        issueType: "Task",
        projectKey: "INFRA",
        projectName: "Infrastructure",
        reporterAccountId: "5b10ac8d82e05b22cc7d4ef6"
    },
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-02-01T16:00:00.000Z"
}
```

### GitHub Example

```typescript
{
    id: "2123456789",
    title: "Add rate limiting to API",
    description: "We need to add rate limiting to prevent abuse of the public API endpoints.",
    status: "TODO",
    priority: "NONE",
    assigneeId: "1234567",
    projectId: "acme/backend",
    labels: ["enhancement", "security"],
    dueDate: null,
    url: "https://github.com/acme/backend/issues/42",
    providerSpecific: {
        number: 42,
        owner: "acme",
        repo: "backend"
    },
    createdAt: "2026-01-25T12:00:00.000Z",
    updatedAt: "2026-02-15T09:30:00.000Z"
}
```
