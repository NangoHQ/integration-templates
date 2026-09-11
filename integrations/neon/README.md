# Neon actions

50 actions for the Neon Management API, using Nango provider `neon`. Its base URL includes `/api`; action paths start with `/v2`. Authenticate with a Neon API-key connection in Nango. API-key permissions and the Neon plan determine which actions are available; no OAuth scopes are required.

## Coverage

The catalog covers projects, branches, asynchronous operations, schema inspection and comparison, compute lifecycle, databases, regions and organizations, snapshots and recovery, logs and consumption, and PostgreSQL roles. SQL row reads/writes, password reveal/reset, connection-URI retrieval, and administrative organization/billing changes are outside this catalog.

| Action | Method | Provider path |
| --- | --- | --- |
| `list-projects` | GET | `/projects` |
| `get-project` | GET | `/projects/{project_id}` |
| `create-project` | POST | `/projects` |
| `list-branches` | GET | `/projects/{project_id}/branches` |
| `get-branch` | GET | `/projects/{project_id}/branches/{branch_id}` |
| `create-branch` | POST | `/projects/{project_id}/branches` |
| `delete-branch` | DELETE | `/projects/{project_id}/branches/{branch_id}` |
| `list-databases` | GET | `/projects/{project_id}/branches/{branch_id}/databases` |
| `list-endpoints` | GET | `/projects/{project_id}/endpoints` |
| `get-endpoint` | GET | `/projects/{project_id}/endpoints/{endpoint_id}` |
| `get-operation` | GET | `/projects/{project_id}/operations/{operation_id}` |
| `list-operations` | GET | `/projects/{project_id}/operations` |
| `get-branch-schema` | GET | `/projects/{project_id}/branches/{branch_id}/schema` |
| `compare-branch-schema` | GET | `/projects/{project_id}/branches/{branch_id}/compare_schema` |
| `update-project` | PATCH | `/projects/{project_id}` |
| `update-branch` | PATCH | `/projects/{project_id}/branches/{branch_id}` |
| `set-default-branch` | POST | `/projects/{project_id}/branches/{branch_id}/set_as_default` |
| `create-endpoint` | POST | `/projects/{project_id}/endpoints` |
| `update-endpoint` | PATCH | `/projects/{project_id}/endpoints/{endpoint_id}` |
| `delete-endpoint` | DELETE | `/projects/{project_id}/endpoints/{endpoint_id}` |
| `start-endpoint` | POST | `/projects/{project_id}/endpoints/{endpoint_id}/start` |
| `suspend-endpoint` | POST | `/projects/{project_id}/endpoints/{endpoint_id}/suspend` |
| `restart-endpoint` | POST | `/projects/{project_id}/endpoints/{endpoint_id}/restart` |
| `list-branch-endpoints` | GET | `/projects/{project_id}/branches/{branch_id}/endpoints` |
| `get-database` | GET | `/projects/{project_id}/branches/{branch_id}/databases/{database_name}` |
| `create-database` | POST | `/projects/{project_id}/branches/{branch_id}/databases` |
| `update-database` | PATCH | `/projects/{project_id}/branches/{branch_id}/databases/{database_name}` |
| `delete-database` | DELETE | `/projects/{project_id}/branches/{branch_id}/databases/{database_name}` |
| `list-regions` | GET | `/regions` |
| `get-auth-details` | GET | `/auth` |
| `list-organizations` | GET | `/users/me/organizations` |
| `list-shared-projects` | GET | `/projects/shared` |
| `create-snapshot` | POST | `/projects/{project_id}/branches/{branch_id}/snapshot` |
| `list-snapshots` | GET | `/projects/{project_id}/snapshots` |
| `update-snapshot` | PATCH | `/projects/{project_id}/snapshots/{snapshot_id}` |
| `delete-snapshot` | DELETE | `/projects/{project_id}/snapshots/{snapshot_id}` |
| `restore-snapshot` | POST | `/projects/{project_id}/snapshots/{snapshot_id}/restore` |
| `get-snapshot-schedule` | GET | `/projects/{project_id}/branches/{branch_id}/backup_schedule` |
| `set-snapshot-schedule` | PUT | `/projects/{project_id}/branches/{branch_id}/backup_schedule` |
| `restore-branch` | POST | `/projects/{project_id}/branches/{branch_id}/restore` |
| `finalize-restore-branch` | POST | `/projects/{project_id}/branches/{branch_id}/finalize_restore` |
| `query-branch-logs` | POST | `/projects/{project_id}/branches/{branch_id}/logs/query` |
| `list-branch-log-fields` | GET | `/projects/{project_id}/branches/{branch_id}/logs/fields` |
| `list-branch-log-field-values` | GET | `/projects/{project_id}/branches/{branch_id}/logs/fields/{field_name}/values` |
| `get-project-consumption` | GET | `/consumption_history/v2/projects` |
| `get-branch-consumption` | GET | `/consumption_history/v2/branches` |
| `list-roles` | GET | `/projects/{project_id}/branches/{branch_id}/roles` |
| `get-role` | GET | `/projects/{project_id}/branches/{branch_id}/roles/{role_name}` |
| `create-role` | POST | `/projects/{project_id}/branches/{branch_id}/roles` |
| `delete-role` | DELETE | `/projects/{project_id}/branches/{branch_id}/roles/{role_name}` |

## Request and response behavior

Inputs use provider parameter names. JSON payloads are nested under `body`; path and query parameters are separate. Responses preserve the provider envelope, asynchronous operation IDs, and unknown response fields. Use `get-operation` or `list-operations` to inspect completion; mutations do not poll automatically.

Paginated list and consumption actions return one page with an additive `next_cursor`. Pass it as `cursor` and preserve the other filters. Log queries already return `next_cursor`; pass it as `body.cursor` with the original time bounds and filters. Stop when the cursor is absent or empty. Log field discovery preserves `is_truncated` when the provider scan limit is reached.

Consumption queries accept arrays for `metrics`, `project_ids`, and `branch_ids`, with one nonempty ID per array item, encoded as comma-separated query values as documented by Neon. Metrics are required. Branch consumption accepts six metrics; project consumption additionally supports extra-branch and snapshot-storage metrics. Plan eligibility and historical retention limits are enforced by Neon.

Schema inspection requires `db_name`. `lsn` and `timestamp` are mutually exclusive; schema comparison applies the same rule independently to the base branch. LogQL cannot be combined with structured log filters, and relative `since` cannot be combined with absolute `start_time`.

Database, compute, and role deletion return the provider envelope on HTTP 200. HTTP 204 means the resource is already absent and returns `{ "deleted": true, "already_absent": true }`. Malformed HTTP 200 responses still fail validation.

POST requests use zero retries to avoid repeating mutations without an idempotency contract. GET, PATCH, PUT, and DELETE use three retries. API errors propagate to the caller.

## Recovery and roles

`restore-branch` restores from a source branch's head or historical point. Restoring from the same branch requires an LSN or timestamp and `preserve_under_name`; Neon also requires preservation when children exist. The latter depends on live branch state and is checked by Neon.

`restore-snapshot` creates a restored branch for preview by default. Setting `body.finalize_restore: true`, or calling `finalize-restore-branch` later, replaces the original branch's function, moves its computes, and restarts them. These are explicit mutations. Schedule entries are required; snapshot expiration can be cleared with `body.snapshot.expires_at: null`.

Role creation supports `no_login` and validates the 63-byte UTF-8 name limit. Role responses preserve a password if Neon returns one; no separate password reveal or reset action is included. Project/branch creation can also return connection credentials. Select actions according to the access the consuming workflow needs.

## Contract provenance and validation

`schema-source.json` records the pinned official OpenAPI URL, input SHA-256, selected operation IDs, and omitted parameters. Schemas expand references locally and preserve required fields, enums, nullable fields, and numeric/array bounds. Additional deterministic constraints expressed in OpenAPI prose are enforced in input schemas, including time-selector exclusions, autoscaling bounds, metric sets, restore requirements, and the role-name byte limit.

Tests use published OpenAPI examples and synthetic contract fixtures, not live recordings. No provider credentials were available for live validation. Contract tests cover each action; behavioral tests cover pagination, query serialization, mutation inputs, asynchronous status, and empty deletion responses.

Run from the repository root:

```sh
npx vitest run integrations/neon/tests
npx eslint integrations/neon
npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck integrations/neon/actions/*.ts
```
