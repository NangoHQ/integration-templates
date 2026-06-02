# Remote Functions API Reference

## Host resolution

Resolve the base host in this order:
1. `NANGO_SERVER_URL` from the process environment
2. `NANGO_SERVER_URL` from a local `.env` file
3. `https://api.nango.dev`

All remote function endpoints are relative to that host:
- `/remote-function/compile`
- `/remote-function/dryrun`
- `/remote-function/deploy`

## Auth

- Header: `Authorization: Bearer <NANGO_SECRET_KEY>`
- Header: `Content-Type: application/json`
- Use the environment tied to the secret key
- Prefer request bodies over query params

## Request sequencing

1. Compile first.
2. Dryrun only after compile passes.
3. Deploy only when the task explicitly includes deployment.

## Request body guidance

Start compile and deploy payloads with:

```json
{
  "integration_id": "string",
  "function_name": "string",
  "function_type": "action | sync",
  "code": "string"
}
```

Start dryrun payloads with:

```json
{
  "integration_id": "string",
  "function_name": "string",
  "function_type": "action | sync",
  "code": "string",
  "connection_id": "string"
}
```

Add only the fields needed by the function:
- Actions: `input`, `metadata`
- Syncs: `metadata`, `checkpoint`

Remote dryrun supports the request-body equivalents of CLI `--input`, `--metadata`, `--checkpoint`, and legacy `--lastSyncDate` as `input`, `metadata`, `checkpoint`, and `last_sync_date`. It does not expose CLI `--validate` or `--save`; compile first, then dryrun, and do not expect mock files to be recorded.

## Dryrun examples

Use the `NANGO_SECRET_KEY` for the target environment; the environment is inferred from that key.

```bash
# Dryrun an action
curl -sS -X POST "$NANGO_SERVER_URL/remote-function/dryrun" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "slack",
    "function_name": "post-message",
    "function_type": "action",
    "code": "...TypeScript source...",
    "connection_id": "conn-1",
    "input": { "channel_id": "C123", "text": "Hello" }
  }'

# Dryrun a no-input action
curl -sS -X POST "$NANGO_SERVER_URL/remote-function/dryrun" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "github",
    "function_name": "get-viewer",
    "function_type": "action",
    "code": "...TypeScript source...",
    "connection_id": "conn-1",
    "input": {}
  }'

# Dryrun a sync from a checkpoint
curl -sS -X POST "$NANGO_SERVER_URL/remote-function/dryrun" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "salesforce",
    "function_name": "fetch-contacts",
    "function_type": "sync",
    "code": "...TypeScript source...",
    "connection_id": "conn-1",
    "checkpoint": { "updated_after": "2024-01-15T00:00:00Z" }
  }'

# Dryrun with metadata
curl -sS -X POST "$NANGO_SERVER_URL/remote-function/dryrun" \
  -H "Authorization: Bearer $NANGO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "slack",
    "function_name": "fetch-channel-members",
    "function_type": "sync",
    "code": "...TypeScript source...",
    "connection_id": "conn-1",
    "metadata": { "team_id": "T123" }
  }'
```

Because these endpoints are evolving, trust the server's validation errors and any existing caller code over stale examples. If the API rejects a field, remove or rename it based on the returned error instead of inventing new parameters.
