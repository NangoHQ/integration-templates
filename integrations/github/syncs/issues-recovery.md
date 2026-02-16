<!-- BEGIN GENERATED CONTENT -->
# Issues Recovery

## General Information

- **Description:** Demonstrates long-running sync recovery by persisting offset, sync window and run start timestamp.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `public_repo`
- **Endpoint Type:** Sync
- **Model:** `GithubIssue`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/github/syncs/issues-recovery.ts)

## Endpoint Reference

### Request Endpoint

`GET /github/issues-recovery`

## Why This Example Exists

This sync is meant to be a teaching template for resilient long-running syncs, not a GitHub-specific best implementation.

If your sync can:

- process a lot of pages/records,
- crash mid-run, or
- approach Nango's 24h execution limit,

you can copy this exact recovery pattern.

## Recovery State Model

The pattern uses three metadata fields under `_nango_internal`:

- `lastOffset`: the next chunk index to process (resume pointer)
- `lastSyncDate`: a frozen incremental window start (`nango.lastSyncDate` snapshot)
- `runStartTime`: when the current long-running execution started

### Expected Metadata

```json
{
  "max_repositories_per_execution": 50,
  "_nango_internal": {
    "lastOffset": 0,
    "lastSyncDate": "2026-02-16T12:00:00.000Z",
    "runStartTime": "2026-02-16T12:00:00.000Z"
  }
}
```

## Step-by-Step Tutorial

### Step 1: Read persisted state

- Read `metadata._nango_internal` at the start of `exec`.
- Resume from `lastOffset` (or `0` when empty).

### Step 2: Freeze the incremental window

- Set `frozenLastSyncDate = persistedLastSyncDate ?? nango.lastSyncDate`.
- Persist it immediately.
- Do **not** recompute this value during resume; keep the same time window until completion.

Why: if the sync crashes and restarts, recomputing `nango.lastSyncDate` can shift your window and cause gaps or duplicates.

### Step 3: Set `runStartTime` once

- If metadata already has `runStartTime`, keep it.
- Otherwise set it to `new Date().toISOString()` and persist it.

Why: all timeout checks should be measured from the same long-running execution start.

### Step 4: Process deterministic chunks

- In this example, each repository is a chunk.
- Your integration can use page number, cursor, offset, account ID, etc.
- Chunk ordering must be deterministic so resume is predictable.

### Step 5: Check 24h guardrail before each chunk

- Compute elapsed runtime from `runStartTime`.
- If elapsed time is near 24h (example uses 23.5h buffer):
  - persist `lastOffset` and `lastSyncDate`,
  - set `runStartTime` to `null`,
  - return cleanly.

Why clear `runStartTime`? The next scheduled run should start a fresh execution window while continuing from the same `lastOffset`.

### Step 6: Persist checkpoint after each chunk

- After each chunk completes, set:
  - `lastOffset = next chunk index`
  - `lastSyncDate = frozenLastSyncDate`
  - `runStartTime = existing runStartTime`

Why: if a process crashes unexpectedly, worst-case replay is only one chunk.

### Step 7: Clear state when fully complete

- When all chunks are done, reset:
  - `lastOffset: null`
  - `lastSyncDate: null`
  - `runStartTime: null`

This tells the next run to start with a fresh incremental window.

## Failure Scenarios This Handles

- Crash in the middle of execution: resumes from the last persisted offset.
- Timeout near 24h: exits cleanly and resumes on next run without losing window boundaries.
- Multiple retries/restarts: all continue using the same frozen `lastSyncDate`.

## How To Adapt This Pattern To Any Integration

1. Keep `_nango_internal` fields exactly (or equivalent names).
2. Replace chunk source:
   - repositories, pages, entities, cursor buckets, etc.
3. Persist checkpoint after each chunk.
4. Keep timeout guardrail and clean exit behavior.
5. Clear state only on successful full completion.

## Important Notes

- `_nango_internal` is reserved for execution state. Keep your business metadata separate.
- This is best for incremental syncs where stable windowing matters.
- If your API is cursor-only, store the cursor instead of numeric `lastOffset`.

## Test Command

```bash
npx nango dryrun issues-recovery <connection-id> --integration-id github --auto-confirm
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/syncs/issues-recovery.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/github/syncs/issues-recovery.md)

<!-- END GENERATED CONTENT -->
