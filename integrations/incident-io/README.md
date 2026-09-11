# incident-io actions

Uses Nango provider `incident-io`. Incidents use v2; actions and follow-ups use v3; severities and incident statuses use v1. The existing [Mastra incident.io client](https://github.com/mastra-ai/mastra/pull/23327) informed the resource selection. The templates preserve its tolerance for null follow-up assignee, assignee team, priority, category, and external issue reference fields even though the OpenAPI references omit nullable annotations. Advanced object-valued incident filters are not included in this initial catalog; `schema-source.json` lists the omitted parameters. Primitive filters are supported.

Authenticate with an API-key connection configured in Nango. These providers do not use OAuth scopes; the API key's provider-side permissions control which operations are available. Give write access only when using the create/update/delete actions.

## Actions

| Action | Method | Provider path |
| --- | --- | --- |
| `list-incidents` | GET | `/v2/incidents` |
| `get-incident` | GET | `/v2/incidents/{id}` |
| `create-incident` | POST | `/v2/incidents` |
| `list-follow-ups` | GET | `/v3/follow_ups` |
| `get-follow-up` | GET | `/v3/follow_ups/{id}` |
| `create-follow-up` | POST | `/v3/follow_ups` |
| `update-follow-up` | PUT | `/v3/follow_ups/{id}` |
| `list-actions` | GET | `/v3/actions` |
| `get-action` | GET | `/v3/actions/{id}` |
| `list-severities` | GET | `/v1/severities` |
| `list-incident-statuses` | GET | `/v1/incident_statuses` |

Inputs use provider parameter names. JSON request payloads are nested under `body` so path, query, and header arguments cannot leak into the payload. Responses retain provider field names and envelopes. Paginated actions return one page and expose `next_cursor` alongside the original pagination metadata; reuse it as `cursor` (Neon) or `after` (Resend and incident.io), preserving other filters/sort options. Stop when it is absent. Unpaginated list endpoints return their complete provider envelope.

GET, PUT and DELETE requests use three retries. POST requests without a provider idempotency contract use zero retries to avoid duplicate side effects. Incident creation uses its required body `idempotency_key`; Resend email sending retries only with an explicit idempotency key.

## Contract provenance and validation

Schemas were extracted from the official OpenAPI source recorded in `schema-source.json`, including required fields, enums, nullable fields, and numeric/array bounds. Reference objects are expanded locally so every action is independently usable. Provider response objects preserve unknown fields for forward compatibility. Review upstream API documentation when changing an action: OpenAPI examples and required flags can lag actual behavior.

`schema-source.json` records the source URL, SHA-256 of the JSON input, retrieval date, selected operations, and omitted query parameters. Resend's input is its YAML specification converted to JSON with Python `json.dumps`; the other inputs are the downloaded JSON bytes. Tests use published examples and synthetic contract fixtures, **not live recordings**. No provider credentials were available for live validation.

Run the focused checks from the repository root:

```sh
npx vitest run integrations/incident-io/tests
npx eslint integrations/incident-io
npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck integrations/incident-io/actions/*.ts
```
