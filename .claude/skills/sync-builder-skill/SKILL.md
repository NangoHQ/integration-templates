---
name: sync-builder-skill
description: Use when creating Nango syncs for continuous data synchronization - provides patterns for pagination, batch saving, deletion detection, and incremental updates
---

# Nango Sync Builder

## 🚨 REQUIRED: Invoke integration-patterns-skill First

**Before using this skill, you MUST invoke the `integration-patterns-skill` using the Skill tool.**

This dependency skill contains critical shared patterns for:
- Working directory detection (git root ≠ Nango root)
- Inline schema requirements (NOT from models.ts)
- `?? null` for optional fields
- Explicit parameter naming (`user_id` not `user`)
- Type safety (inline types, not `any`)
- No `.default()` on Zod schemas
- **index.ts registration requirement**
- Common mistakes table

**If you skip invoking it, you WILL miss critical checklist items and make mistakes.**

```
Use Skill tool: integration-patterns-skill
```

---

## Overview

Syncs are **continuous data synchronization scripts** using `createSync()`. This skill covers sync-specific patterns only.

## When to Use

- Fetching all records of a type periodically (contacts, issues, deals)
- Data should stay synchronized with external system
- **NOT for:** One-time operations or user-triggered requests (use actions)

## createSync() Structure

```typescript
import { createSync } from 'nango';
import { z } from 'zod';

// Schemas defined inline (see integration-patterns-skill)
const RecordSchema = z.object({...});

const sync = createSync({
    description: 'Brief single sentence',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/provider/records', group: 'Records' }],
    frequency: 'every hour',      // or 'every 5 minutes', 'every day'
    autoStart: true,
    syncType: 'full',             // or 'incremental'
    // NOTE: Do NOT use trackDeletes - it's deprecated (see warning below)

    models: {
        Record: RecordSchema      // Model name → Schema
    },

    exec: async (nango) => {
        // Sync logic here
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
```

## ⚠️ trackDeletes is Deprecated

**Do NOT use `trackDeletes: true` in createSync().** This option is deprecated and will be removed in future versions.

Instead, call `nango.deleteRecordsFromPreviousExecutions()` at the END of your sync's exec function (after all `batchSave()` calls). This is the recommended approach for automatic deletion detection in full syncs.

```typescript
// ❌ WRONG - deprecated
const sync = createSync({
    trackDeletes: true,  // Don't use this!
    // ...
});

// ✅ CORRECT - call at end of exec
exec: async (nango) => {
    // ... fetch and batchSave all records ...

    await nango.deleteRecordsFromPreviousExecutions('ModelName');
}
```

## Full Refresh Sync (Recommended)

Downloads all records each run. Automatic deletion detection.

```typescript
exec: async (nango) => {
    const proxyConfig = {
        // https://api-docs-url
        endpoint: 'api/v1/records',
        paginate: { limit: 100 }
    };

    for await (const batch of nango.paginate(proxyConfig)) {
        const records = batch.map((r: { id: string; name: string }) => ({
            id: r.id,
            name: r.name
            // Use ?? null for optional fields (see integration-patterns-skill)
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'Record');
        }
    }

    // MUST be called at END after ALL batches saved
    await nango.deleteRecordsFromPreviousExecutions('Record');
}
```

## Incremental Sync

Only fetches new/updated records since last sync. Use when API supports filtering by modified date.

```typescript
const sync = createSync({
    syncType: 'incremental',
    frequency: 'every 5 minutes',
    // ...

    exec: async (nango) => {
        const lastSync = nango.lastSyncDate;

        const proxyConfig = {
            endpoint: '/api/records',
            params: {
                sort: 'updated',
                ...(lastSync && { since: lastSync.toISOString() })
            },
            paginate: { limit: 100 }
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            await nango.batchSave(mappedRecords, 'Record');
        }

        // Manual deletion handling if API supports it
        if (lastSync) {
            const deleted = await nango.get({
                endpoint: '/api/records/deleted',
                params: { since: lastSync.toISOString() }
            });
            if (deleted.data.length > 0) {
                await nango.batchDelete(
                    deleted.data.map((d: { id: string }) => ({ id: d.id })),
                    'Record'
                );
            }
        }
    }
});
```

## Key SDK Methods

| Method | Purpose |
|--------|---------|
| `nango.paginate(config)` | Iterate through paginated responses |
| `nango.batchSave(records, model)` | Save records to cache |
| `nango.batchDelete(records, model)` | Mark as deleted (incremental) |
| `nango.deleteRecordsFromPreviousExecutions(model)` | Auto-detect deletions (full) |
| `nango.lastSyncDate` | Last sync timestamp (incremental) |

## Pagination Patterns

**Standard (use `nango.paginate`):**
```typescript
for await (const batch of nango.paginate({ endpoint: '/api', paginate: { limit: 100 } })) {
    await nango.batchSave(mapped, 'Model');
}
```

**Manual cursor-based:**
```typescript
let cursor: string | undefined;
while (true) {
    const res = await nango.get({ endpoint: '/api', params: { cursor } });
    await nango.batchSave(res.data.items, 'Model');
    cursor = res.data.next_cursor;
    if (!cursor) break;
}
```

## Syncs Requiring Metadata

Some APIs require IDs that can't be discovered programmatically (e.g., Figma team_id).

```typescript
const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    metadata: MetadataSchema,  // Declare metadata requirement
    // ...

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const teamId = metadata?.team_id;

        if (!teamId) {
            throw new Error('team_id is required in metadata.');
        }

        // Use in API calls
        const response = await nango.get({
            endpoint: `/v1/teams/${teamId}/projects`
        });
    }
});
```

## Dryrun Command Syntax

**Exact syntax for sync dryrun:**

```
npx nango dryrun <sync-name> <connection-id> --integration-id <provider> -m '<metadata-json>'
                 ↑           ↑               ↑                          ↑
                 │           │               │                          └── Metadata JSON (if sync requires)
                 │           │               └── Provider name (slack, hubspot, etc.)
                 │           └── Connection ID (positional, NOT a flag)
                 └── Sync name (positional)
```

**Arguments breakdown:**
| Position/Flag | Example | Description |
|---------------|---------|-------------|
| 1st positional | `fetch-contacts` | Sync name (kebab-case) |
| 2nd positional | `action-builder` | Connection ID from user |
| `--integration-id` | `hubspot` | Provider/integration name |
| `-m` | `'{"team_id":"123"}'` | Metadata JSON (if sync requires) |

**Optional flags:**
- `--save-responses` - Save API response as mock
- `--auto-confirm` - Skip confirmation prompts

## After Creating a Sync

**Always output the dryrun command** using user-provided values:

```bash
# Template (without metadata)
npx nango dryrun <sync-name> <connection-id> --integration-id <provider>

# Template (with metadata)
npx nango dryrun <sync-name> <connection-id> --integration-id <provider> -m '{"key":"value"}'

# Example: user provided connectionId: action-builder
npx nango dryrun fetch-contacts action-builder --integration-id hubspot
```

## Using User-Provided Values

When the user provides test values, use them:

1. **Connection ID** → Use in dryrun command
2. **Metadata values** (team_id, workspace_id) → Use in:
   - `metadata.json` mock file
   - `-m` flag for dryrun
3. **API reference URL** → Fetch for schema details

## Mock Directory Structure

```
{integrationId}/mocks/
├── meta.json                    # {"connection_id": "my-connection"}
├── fetch-records/
│   ├── output.json              # Expected output per record
│   └── metadata.json            # Metadata inputs (if sync requires)
└── nango/<method>/proxy/<path>/
    └── <hash>.json              # API response from --save-responses
```

**metadata.json** is analogous to input.json for actions - provides metadata inputs for testing.

## Sync-Specific Checklist

**Structure:**
- [ ] `createSync()` with description, version, endpoints, frequency, syncType
- [ ] `models` object maps model names to schemas
- [ ] `export type NangoSyncLocal` and `export default sync`

**Sync Logic:**
- [ ] `nango.paginate()` or manual pagination loop
- [ ] `batchSave()` called for each batch
- [ ] Full syncs: `deleteRecordsFromPreviousExecutions()` at END
- [ ] Incremental syncs: filter using `lastSyncDate`

**Mocks:**
- [ ] `output.json` with expected record shape
- [ ] `metadata.json` (if sync requires metadata)

**See `integration-patterns-skill` for:** schema, naming, typing, path, and **index.ts registration** checklist items.

## Sync-Specific Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Using `trackDeletes: true` | Deprecated, causes compiler warning | Use `deleteRecordsFromPreviousExecutions()` instead |
| Forgetting `deleteRecordsFromPreviousExecutions()` | Deleted records remain | Add at end for full syncs |
| Calling deletion before all batches saved | Deletes current batch | Call only AFTER all batches |
| Not using `lastSyncDate` in incremental | Re-syncs everything | Filter by it in API params |
| Missing `batchSave()` call | Records not persisted | Call for each batch |
| Missing metadata.json | Test fails to find metadata | Create `mocks/<sync>/metadata.json` |

**For schema, naming, typing, registration mistakes → invoke `integration-patterns-skill`**
