---
name: building-nango-functions-locally
description: Builds Nango Functions in a checked-out Zero YAML TypeScript Nango project using local files, index.ts registration, nango dryrun, generated tests, and optional nango deploy. Use when creating or updating Nango actions or syncs locally.
---

# Build Nango Functions Locally
Build deployable Nango actions and syncs in a checked-out Nango project with the local CLI validation and test workflow.

## When to use
- User wants to build or modify a Nango function
- User wants to build an action in Nango
- User wants to build a sync in Nango

## Sync Strategy Gate (required before writing code)

If the task is a sync, read `references/syncs.md` before writing code and state one of these paths first:

- Checkpoint plan:
  - change source (`updated_at`, `modified_since`, changed-records endpoint, cursor, page token, offset/page, `since_id`, or webhook)
  - checkpoint schema
  - how the checkpoint changes the provider request or resume state
  - whether the request still walks the full dataset or returns changed rows only
  - delete strategy
- Full refresh blocker:
  - exact provider limitation from the docs or sample payloads
  - why checkpoints cannot work here

Invalid sync implementations:
- full refresh because it is simpler
- `saveCheckpoint()` without `getCheckpoint()`
- reading or saving a checkpoint without using it in request params or pagination state
- using `syncType: 'incremental'` or `nango.lastSyncDate` in a new sync
- using `trackDeletesStart()` / `trackDeletesEnd()` with a changed-only checkpoint (`modified_after`, `updated_after`, changed-records endpoint). Those requests omit unchanged rows, so `trackDeletesEnd()` will falsely delete them.
- using `trackDeletesStart()` / `trackDeletesEnd()` in an incremental sync that already has explicit deleted-record events

## Choose the Path

Action:
- One-time request, user-triggered, built with `createAction()`
- Read `references/actions.md` before writing code

Sync:
- Scheduled or webhook-driven cache updates built with `createSync()`
- Complete the Sync Strategy Gate first
- Read `references/syncs.md` before writing code

## Required Inputs (Ask User if Missing)

Always:
- Integration ID (provider name)
- Connection ID (for validation or dryrun)
- Script/function name (kebab-case)
- API reference URL or sample response

Action-specific:
- Use case summary
- Input parameters
- Output fields
- Metadata JSON if required
- Test input JSON for validation/dryrun (required; use `{}` for no-input actions)

Sync-specific:
- Model name (singular, PascalCase)
- Frequency (every hour, every 5 minutes, etc.)
- Checkpoint schema (timestamp, cursor, page token, offset/page, `since_id`, or composite)
- How the checkpoint changes the provider request or resume state
- Delete strategy (deleted-record endpoint/webhook, or why full refresh is required)
- If proposing a full refresh, the exact provider limitation that blocks checkpoints from the docs/sample response
- Metadata JSON if required (team_id, workspace_id)

If any required external values are missing, ask a targeted question after checking the repo and provider docs. For syncs, choose a checkpoint plus deletion strategy whenever the provider supports one. If you cannot find a viable checkpoint strategy, state exactly why before writing a full refresh.

## Non-Negotiable Rules

### Shared platform constraints

- Nango functions use `createAction()` / `createSync()`.
- You cannot add arbitrary packages. Use relative imports only when the chosen workflow supports them; built-ins include `zod`, `crypto`/`node:crypto`, and `url`/`node:url`.
- Use the Nango HTTP API for connection lookup, credentials, and proxy calls outside function code. Do not invent CLI token or connection commands.
- Add an API doc link comment above each provider call.
- Action outputs cannot exceed 2MB.
- File uploads and downloads cannot be implemented as actions (sandboxed runtime: no `fs`, no `axios`, 2 MB output limit). Use a proxy script in `{integration}/proxy/` with `@nangohq/node` instead — see `references/actions.md`.
- HTTP retries default to `0`; set `retries` deliberately. Treat `3` as the normal maximum; for sync provider calls, values above `3` are effectively forbidden unless docs prove they are safe and necessary. Avoid retries for non-idempotent writes unless the API supports idempotency.

### Sync rules

- Sync records need a stable string `id`.
- New syncs should define a `checkpoint` schema, call `nango.getCheckpoint()` first, and `nango.saveCheckpoint()` after each page or batch.
- A checkpoint is valid only if it changes the request or resume state (`since`, `updated_after`, `cursor`, `page_token`, `offset`, `page`, `since_id`, etc.). Saving one without using it is not incremental sync.
- New syncs must not use `syncType: 'incremental'` or `nango.lastSyncDate`.
- Default to `nango.paginate(...)` + `nango.batchSave(...)`. Avoid manual `while (true)` loops when `cursor`, `link`, or `offset` pagination fits.
- Prefer `batchDelete()` when the provider returns deletions, tombstones, or delete webhooks.
- Use full refresh only if the provider cannot return changes, deletions, or resume state, or if the dataset is tiny.
- For full refresh, cite the exact provider limitation from docs or payloads. "It is easier" is not enough.
- `deleteRecordsFromPreviousExecutions()` is deprecated. For full refresh, call `trackDeletesStart()` before fetch/save and `trackDeletesEnd()` only after a successful full fetch/save.
- Never combine `trackDeletesStart()` / `trackDeletesEnd()` with changed-only checkpoints (`modified_after`, `updated_after`, changed-records endpoints, etc.). They omit unchanged rows, so `trackDeletesEnd()` would delete them.
- Checkpointed full refreshes are still full refreshes. Call `trackDeletesEnd()` only in the run that finishes the full window.
- If a sync requires metadata (e.g. `team_id`, `workspace_id`, `guild_id`), set `autoStart: false`. The sync cannot run until the caller has set the metadata, so starting it automatically would fail.

### Conventions

- Match field casing to the external API. Passthrough fields keep provider casing; non-passthrough fields should use the majority casing of that API.
- Prefer explicit field names.
- Add `.describe()` examples for IDs, timestamps, enums, and URLs.
- Avoid `any`; use inline mapping types.
- Prefer static Nango endpoint paths (avoid `:id` / `{id}` in the exposed endpoint); pass IDs in input or params.
- List actions should expose `cursor` plus a next-cursor field in the majority casing of that API (`next_cursor`, `nextCursor`, etc.).
- Use `nango.zodValidateInput()` only when you need custom validation or logging; otherwise rely on schemas plus the chosen validation workflow.

### Schema Semantics

- Default non-required inputs to `.optional()`.
- Use `.nullable()` only when `null` has meaning, usually clear-on-update; add `.optional()` when callers may omit the field too.
- Raw provider schemas should match the provider: `.optional()` for omitted fields, `.nullable()` for explicit `null`, `.nullish()` only when the provider truly does both.
- Final action outputs and normalized sync models should prefer `.optional()` and normalize upstream `null` to omission unless `null` matters.
- Default generated schemas to `.optional()` for non-required inputs and normalized outputs; widen only when the upstream contract justifies it.
- Prefer `.nullable()` over `z.union([z.null(), T])` or `z.union([T, z.null()])`.
- Return `null` only when the output schema allows it.
- `z.object()` strips unknown keys by default. For provider pass-through use `z.object({}).passthrough()`, `z.record(z.unknown())`, or `z.unknown()` with minimal refinements.

### Field Naming and Casing Rules

- Use explicit suffixes in the API's majority casing: IDs (`user_id`, `userId`), names (`channel_name`, `channelName`), emails (`user_email`, `userEmail`), URLs (`callback_url`, `callbackUrl`), and timestamps (`created_at`, `createdAt`).

Mapping example (API expects a different parameter name):

```typescript
const InputSchema = z.object({
    userId: z.string()
});

const config: ProxyConfiguration = {
    endpoint: 'users.info',
    params: {
        user: input.userId
    },
    retries: 3
};
```

If the API is snake_case, use `user_id` instead. The goal is API consistency.

## References

- Action patterns, CRUD examples, metadata usage, and ActionError examples: `references/actions.md`
- Sync patterns, concrete checkpoint examples, delete strategies, and full refresh fallback: `references/syncs.md`

## Useful Nango docs (quick links)
- Functions runtime SDK reference: https://nango.dev/docs/reference/functions
- Implement an action: https://nango.dev/docs/implementation-guides/use-cases/actions/implement-an-action
- Implement a sync: https://nango.dev/docs/implementation-guides/use-cases/syncs/implement-a-sync
- Checkpoints: https://nango.dev/docs/implementation-guides/use-cases/syncs/checkpoints
- Deletion detection (full vs incremental): https://nango.dev/docs/implementation-guides/use-cases/syncs/deletion-detection
- Testing integrations (dryrun, `--save`, Vitest): https://nango.dev/docs/implementation-guides/platform/functions/testing
- Nango HTTP API reference: https://nango.dev/docs/reference/api

## When API Docs Do Not Render

If web fetching returns incomplete docs (JS-rendered):
- Ask the user for a sample response
- Use existing Nango actions or syncs in the workspace as a pattern when they exist
- Use the skill-specific validation or dryrun workflow until it passes

## Workflow (required)
1. Decide whether this is an action or a sync.
2. Read the matching reference file: `references/actions.md` or `references/syncs.md`.
3. For syncs, inspect provider docs or payloads for checkpoints and deletes, decide whether the endpoint returns full data or changed rows, and complete the Sync Strategy Gate.
4. Gather required inputs and external values. For connection lookup, credentials, or discovery, use the Nango HTTP API.
5. Confirm this is a Zero YAML TypeScript project (`no nango.yaml`) and that you are in the Nango root (`.nango/` exists).
6. Create or update the function under `{integrationId}/actions/` or `{integrationId}/syncs/`, apply the shared schema and casing rules, then register it in `index.ts`.
7. Validate with `nango dryrun ... --validate -e dev --no-interactive --auto-confirm`.
8. If validation cannot pass, stop and report the missing external state or inputs.
9. After validation passes, run `nango dryrun ... --save`, then `nango generate:tests`, then `npm test`.
10. Deploy with `nango deploy dev` only when requested.

## Preconditions (Do Before Writing Code)

### Confirm TypeScript Project (No `nango.yaml`)

This skill only supports TypeScript projects using `createAction()` / `createSync()`.

```bash
ls nango.yaml 2>/dev/null && echo "YAML PROJECT DETECTED" || echo "OK - No nango.yaml"
```

If you see `YAML PROJECT DETECTED`:
- Stop immediately.
- Tell the user to upgrade to the TypeScript format first.
- Do not attempt to mix YAML and TypeScript.

Reference: https://nango.dev/docs/implementation-guides/platform/migrations/migrate-to-zero-yaml

### Verify Nango Project Root

Do not create files until you confirm the Nango root:

```bash
ls -la .nango/ 2>/dev/null && pwd && echo "IN NANGO PROJECT ROOT" || echo "NOT in Nango root"
```

If you see `NOT in Nango root`:
- `cd` into the directory that contains `.nango/`
- Re-run the check
- Do not use absolute paths as a workaround

All file paths must be relative to the Nango root. Creating files with extra prefixes while already in the Nango root will create nested directories that break the build.

## Project Structure and Naming

```text
./
|-- .nango/
|-- index.ts
|-- hubspot/
|   |-- actions/
|   |   `-- create-contact.ts
|   `-- syncs/
|       `-- fetch-contacts.ts
`-- slack/
    `-- actions/
        `-- post-message.ts
```

- Provider directories: lowercase (`hubspot`, `slack`)
- Action files: kebab-case (`create-contact.ts`)
- Sync files: kebab-case (many teams use a `fetch-` prefix, but it is optional)
- One function per file
- All actions and syncs must be imported in `index.ts`

### Register scripts in `index.ts` (required)

Use side-effect imports only. Include the `.js` extension.

```typescript
// index.ts
import './github/actions/get-top-contributor.js';
import './github/syncs/fetch-issues.js';
```

Symptom of incorrect registration: the file compiles but you see `No entry points found in index.ts...` or the function never appears.

## Dryrun, Mocks, and Tests (required)

Required loop:
1. Run `nango dryrun ... --validate -e dev --no-interactive --auto-confirm` until it passes.
2. Actions: always pass `--input '{...}'` (use `--input '{}'` for no-input actions).
3. Syncs: use `--checkpoint '{...}'` when you need to simulate a resumed run.
4. If validation cannot pass, stop and state the missing external state or inputs required.
5. After validation passes, run `nango dryrun ... --save -e dev --no-interactive --auto-confirm` to generate `<script-name>.test.json`.
6. Run `nango generate:tests`, then `npm test`.

Examples:

```bash
# Validate an action
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{"key":"value"}'

# Validate a no-input action
nango dryrun <action-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --input '{}'

# Validate a sync
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm

# Validate a resumed sync with a checkpoint
nango dryrun <sync-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --checkpoint '{"updated_after":"2024-01-15T00:00:00Z"}'

# Record action mocks after validation passes
nango dryrun <action-name> <connection-id> --save -e dev --no-interactive --auto-confirm --input '{"key":"value"}'

# Record sync mocks after validation passes
nango dryrun <sync-name> <connection-id> --save -e dev --no-interactive --auto-confirm

# Stub metadata when needed
nango dryrun <script-name> <connection-id> --validate -e dev --no-interactive --auto-confirm --metadata '{"team_id":"123"}'
```

Hard rules:
- Treat `<script-name>.test.json` as generated output. Never create, edit, rename, or move it.
- If mocks are wrong or stale, fix the code and re-record with `--save`.
- Do not hard-code error payloads in `*.test.json`; use a Vitest test with `vi.spyOn(...)` for 404, 401, 429, or timeout cases.
- Connection ID is the second positional argument; do not use `--connection-id`.
- Use `--integration-id <integration-id>` when script names overlap across integrations.
- Prefer `--checkpoint` for new incremental syncs; `--lastSyncDate` is a legacy pattern.
- If `nango` is not on `PATH`, use `npx nango ...`.
- CLI upgrade prompts can block automation; set `NANGO_CLI_UPGRADE_MODE=ignore` if needed.

Reference: https://nango.dev/docs/implementation-guides/platform/functions/testing

## Deploy (Optional)

Deploy functions to an environment in your Nango account:

```bash
nango deploy dev

# Deploy only one function
nango deploy --action <action-name> dev
nango deploy --sync <sync-name> dev
```

Reference: https://nango.dev/docs/implementation-guides/use-cases/actions/implement-an-action

## Final Checklists

Action:
- [ ] Nango root verified
- [ ] `references/actions.md` was used for the action pattern
- [ ] Schemas and types are clear, and missing-value rules match the provider versus normalized contract
- [ ] `createAction()` includes endpoint, input, output, and scopes when required
- [ ] Fields use passthrough casing or the API's majority casing
- [ ] Provider call includes an API doc link comment and intentional retries
- [ ] `nango.ActionError` is used for expected failures
- [ ] Registered in `index.ts`
- [ ] Dryrun succeeds with `--validate -e dev --no-interactive --auto-confirm --input '{...}'`
- [ ] `<action-name>.test.json` was generated by `nango dryrun ... --save` after `--validate`
- [ ] `nango generate:tests` ran and `npm test` passes

Sync:
- [ ] Nango root verified
- [ ] `references/syncs.md` was used for the sync pattern
- [ ] Models map is defined, ids are stable strings, and normalized models prefer `.optional()` unless `null` matters
- [ ] Incremental was chosen first, with a checkpoint schema unless full refresh is explicitly justified from docs or payloads
- [ ] `nango.getCheckpoint()` is read at the start and `nango.saveCheckpoint()` runs after each page or batch
- [ ] Checkpoint data changes the provider request or resume state (`since`, `updated_after`, `cursor`, `page_token`, `offset`, `page`, `since_id`, etc.)
- [ ] Changed-only checkpoint syncs (`modified_after`, `updated_after`, changed-records endpoint) do not use `trackDeletesStart()` / `trackDeletesEnd()`
- [ ] If checkpoints were not used, the response explains exactly why no viable checkpoint strategy exists
- [ ] Raw provider schemas model omitted versus `null` correctly, and fields use passthrough casing or the API's majority casing
- [ ] `nango.paginate()` is used unless the API truly cannot fit Nango's paginator
- [ ] Provider API calls use `retries: 3`; no sync retry value exceeds `3` without a documented exception
- [ ] Deletion strategy matches the sync type: `batchDelete()` for incremental only when the provider returns explicit deletions; otherwise full-refresh fallback uses `trackDeletesStart()` before fetch/save and `trackDeletesEnd()` only after a successful full fetch plus save
- [ ] Metadata handled if required
- [ ] Registered in `index.ts`
- [ ] Dryrun succeeds with `--validate -e dev --no-interactive --auto-confirm`
- [ ] `<sync-name>.test.json` was generated by `nango dryrun ... --save` after `--validate`
- [ ] `nango generate:tests` ran and `npm test` passes
