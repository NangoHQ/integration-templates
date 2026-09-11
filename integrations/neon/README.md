# neon actions

Uses Nango provider `neon`, whose base URL already includes `/api`; actions use `/v2/...`. The catalog covers project listing/retrieval/creation, branch listing/retrieval/creation/deletion, database listing, and compute endpoint listing/retrieval. It uses the same Management API operations as [Neon tools](https://github.com/neondatabase/neon-pkgs/tree/af5a839e5900dc98120af6261b5b29d02c74a8e1/packages/tools), through Nango authentication. SQL execution, composed create-and-connect workflows, and credential retrieval are outside this initial catalog.

Authenticate with an API-key connection configured in Nango. These providers do not use OAuth scopes; the API key's provider-side permissions control which operations are available. Give write access only when using the create/update/delete actions.

## Actions

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

Inputs use provider parameter names. JSON request payloads are nested under `body` so path, query, and header arguments cannot leak into the payload. Responses retain provider field names and envelopes. Paginated actions return one page and expose `next_cursor` alongside the original pagination metadata; reuse it as `cursor` (Neon) or `after` (Resend and incident.io), preserving other filters/sort options. Stop when it is absent. Unpaginated list endpoints return their complete provider envelope.

GET, PUT and DELETE requests use three retries. POST requests without a provider idempotency contract use zero retries to avoid duplicate side effects. Incident creation uses its required body `idempotency_key`; Resend email sending retries only with an explicit idempotency key.

## Contract provenance and validation

Schemas were extracted from the official OpenAPI source recorded in `schema-source.json`, including required fields, enums, nullable fields, and numeric/array bounds. Reference objects are expanded locally so every action is independently usable. Provider response objects preserve unknown fields for forward compatibility. Review upstream API documentation when changing an action: OpenAPI examples and required flags can lag actual behavior.

`schema-source.json` records the source URL, SHA-256 of the JSON input, retrieval date, selected operations, and omitted query parameters. Resend's input is its YAML specification converted to JSON with Python `json.dumps`; the other inputs are the downloaded JSON bytes. Tests use published examples and synthetic contract fixtures, **not live recordings**. No provider credentials were available for live validation.

Run the focused checks from the repository root:

```sh
npx vitest run integrations/neon/tests
npx eslint integrations/neon
npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck integrations/neon/actions/*.ts
```

Added operation completion: `get-operation`, `list-operations`.

Added schema inspection: `get-branch-schema`, `compare-branch-schema`.

Added project and branch configuration: `update-project`, `update-branch`, `set-default-branch`.
