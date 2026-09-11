# resend actions

Uses Nango provider `resend`. The catalog supports sending, retrieving, listing, and cancelling emails, plus creating, retrieving, listing, and verifying domains. Sending forwards `idempotency_key` as `Idempotency-Key`; reuse the same key when retrying the same email. Without a key, automatic POST retries are disabled. A sending-only key can send emails but cannot access account/domain operations; use a full-access key for those.

Authenticate with an API-key connection configured in Nango. These providers do not use OAuth scopes; the API key's provider-side permissions control which operations are available. Give write access only when using the create/update/delete actions.

## Actions

| Action | Method | Provider path |
| --- | --- | --- |
| `send-email` | POST | `/emails` |
| `get-email` | GET | `/emails/{email_id}` |
| `list-emails` | GET | `/emails` |
| `cancel-email` | POST | `/emails/{email_id}/cancel` |
| `list-domains` | GET | `/domains` |
| `get-domain` | GET | `/domains/{domain_id}` |
| `create-domain` | POST | `/domains` |
| `verify-domain` | POST | `/domains/{domain_id}/verify` |

Inputs use provider parameter names. JSON request payloads are nested under `body` so path, query, and header arguments cannot leak into the payload. Responses retain provider field names and envelopes. Paginated actions return one page and expose `next_cursor` alongside the original pagination metadata; reuse it as `cursor` (Neon) or `after` (Resend and incident.io), preserving other filters/sort options. Stop when it is absent. Unpaginated list endpoints return their complete provider envelope.

GET, PUT and DELETE requests use three retries. POST requests without a provider idempotency contract use zero retries to avoid duplicate side effects. Incident creation uses its required body `idempotency_key`; Resend email sending retries only with an explicit idempotency key.

## Contract provenance and validation

Schemas were extracted from the official OpenAPI source recorded in `schema-source.json`, including required fields, enums, nullable fields, and numeric/array bounds. Reference objects are expanded locally so every action is independently usable. Provider response objects preserve unknown fields for forward compatibility. Review upstream API documentation when changing an action: OpenAPI examples and required flags can lag actual behavior.

`schema-source.json` records the source URL, SHA-256 of the JSON input, retrieval date, selected operations, and omitted query parameters. Resend's input is its YAML specification converted to JSON with Python `json.dumps`; the other inputs are the downloaded JSON bytes. Tests use published examples and synthetic contract fixtures, **not live recordings**. No provider credentials were available for live validation.

Run the focused checks from the repository root:

```sh
npx vitest run integrations/resend/tests
npx eslint integrations/resend
npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck integrations/resend/actions/*.ts
```
