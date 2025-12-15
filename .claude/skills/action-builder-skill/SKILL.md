---
name: action-builder-skill
description: Use when creating or refactoring Nango integration actions to be thin API wrappers - provides patterns for minimal transformation logic, direct proxy calls, and standardized structure
---

# Nango Action Builder

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

Actions are **thin API wrappers** using `createAction()`. This skill covers action-specific patterns only.

## When to Use

- Adding new API endpoint support
- Building CRUD operations (create, read, update, delete, list)
- **NOT for:** Complex business logic or multi-step workflows (use syncs)

## createAction() Structure

```typescript
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Schemas defined inline (see integration-patterns-skill)
const InputSchema = z.object({...});
const OutputSchema = z.object({...});

const action = createAction({
    description: 'Brief single sentence',  // No input params here
    version: '1.0.0',

    endpoint: {
        method: 'POST',           // GET, POST, PATCH, DELETE
        path: '/resource',        // Static path, NO :params or {params}
        group: 'ResourceGroup'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['required.scope'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api-docs-url
            endpoint: 'api/v1/resource',
            data: {...},          // For POST/PATCH
            params: {...},        // For GET
            retries: 3            // REQUIRED
        };

        const response = await nango.post(config);  // or .get, .patch, .delete

        return {
            // Transform response to match OutputSchema
            // Use ?? null for optional fields (see integration-patterns-skill)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
```

## CRUD Methods

| Operation | Method | Config Pattern |
|-----------|--------|----------------|
| Create | `nango.post(config)` | `data: { properties: {...} }` |
| Read | `nango.get(config)` | `endpoint: 'resource/${id}'`, `params: {...}` |
| Update | `nango.patch(config)` | `endpoint: 'resource/${id}'`, `data: {...}` |
| Delete | `nango.delete(config)` | `endpoint: 'resource/${id}'` |
| List | `nango.get(config)` | `params: {...}` with pagination |

**Required in all configs:**
- `retries: 3`
- API doc link as comment above endpoint

**Optional fields pattern:**
```typescript
data: {
    required_field: input.required,
    ...(input.optional && { optional_field: input.optional })
}
```

## Standard Pagination Interface

All list actions **MUST** use standardized `cursor`/`next_cursor` regardless of provider's native style.

### Schema Pattern

```typescript
const ListInput = z.object({
    cursor: z.string().optional()
        .describe('Pagination cursor from previous response. Omit for first page.')
});

const ListOutput = z.object({
    items: z.array(ItemSchema),
    next_cursor: z.union([z.string(), z.null()])  // null = no more pages
});
```

### Provider Mapping

| Provider | Native Input | Native Output | Map To |
|----------|--------------|---------------|--------|
| Slack | `cursor` | `response_metadata.next_cursor` | `cursor` → `next_cursor` |
| Notion | `start_cursor` | `next_cursor` | `cursor` → `next_cursor` |
| HubSpot | `after` | `paging.next.after` | `cursor` → `next_cursor` |
| GitHub | `page` | `Link` header | `cursor` → `next_cursor` |
| Google | `pageToken` | `nextPageToken` | `cursor` → `next_cursor` |

### Example

```typescript
exec: async (nango, input): Promise<z.infer<typeof ListOutput>> => {
    const config: ProxyConfiguration = {
        endpoint: 'api/items',
        params: {
            ...(input.cursor && { cursor: input.cursor })
        },
        retries: 3
    };

    const response = await nango.get(config);

    return {
        items: response.data.items.map((item: { id: string; name: string }) => ({
            id: item.id,
            name: item.name
        })),
        next_cursor: response.data.next_cursor || null
    };
}
```

## Dryrun Command Syntax

**Exact syntax for action dryrun:**

```
npx nango dryrun <action-name> <connection-id> --input '<json>' --integration-id <provider>
                 ↑             ↑                ↑               ↑
                 │             │                │               └── Provider name (slack, hubspot, etc.)
                 │             │                └── JSON string with input params
                 │             └── Connection ID (positional, NOT a flag)
                 └── Action name (positional)
```

**Arguments breakdown:**
| Position/Flag | Example | Description |
|---------------|---------|-------------|
| 1st positional | `get-channel-info` | Action name (kebab-case) |
| 2nd positional | `action-builder` | Connection ID from user |
| `--input` | `'{"channel_id":"C123"}'` | JSON input (single quotes outside) |
| `--integration-id` | `slack` | Provider/integration name |

**Optional flags:**
- `--save-responses` - Save API response as mock
- `--validation` - Show detailed validation errors
- `--auto-confirm` - Skip confirmation prompts

## After Creating an Action

**Always output the dryrun command** using user-provided values:

```bash
# Template
npx nango dryrun <action-name> <connection-id> --input '{"param":"value"}' --integration-id <provider>

# Example: user provided connectionId: action-builder, channel: C02MB5ZABA7
npx nango dryrun get-channel-info action-builder --input '{"channel_id":"C02MB5ZABA7"}' --integration-id slack
```

## Using User-Provided Values

When the user provides test values (connection ID, IDs, etc.), use them:

1. **Connection ID** → Use in dryrun command
2. **Test input values** (channel ID, user ID, etc.) → Use in:
   - `input.json` mock file
   - `--input` flag for dryrun
3. **API reference URL** → Fetch for schema details

## When API Docs Don't Render

If WebFetch returns incomplete API docs (JavaScript-rendered content):

1. **Use common API patterns** - Most REST APIs return similar structures
2. **Ask the user** - "Can you provide a sample API response?"
3. **Run dryrun first** - Use `--save-responses` to capture real response, then build schema from it
4. **Check existing actions** - Look at similar actions in the codebase for patterns

## Mock Directory Structure

```
{integrationId}/mocks/
├── meta.json                    # {"connection_id": "my-connection"}
├── <action-name>/
│   ├── input.json               # Test input
│   ├── output.json              # Expected output
│   └── meta.json                # Action-level override (optional)
└── nango/<method>/proxy/<path>/
    └── <hash>.json              # API response from --save-responses
```

## Action-Specific Checklist

**Structure:**
- [ ] `createAction()` with description, version, endpoint, input/output, scopes
- [ ] Return type is `Promise<z.infer<typeof OutputSchema>>`
- [ ] `export type NangoActionLocal` and `export default action`

**ProxyConfiguration:**
- [ ] `retries: 3` configured
- [ ] API doc link comment above endpoint
- [ ] Uses `input` directly (no `zodValidateInput`)

**Pagination (list actions only):**
- [ ] Input uses `cursor: z.string().optional()`
- [ ] Output uses `next_cursor: z.union([z.string(), z.null()])`

**See `integration-patterns-skill` for:** schema, naming, typing, path, and **index.ts registration** checklist items.

## Action-Specific Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Missing `retries: 3` | Flaky network calls fail | Add to ProxyConfiguration |
| Wrong return type | Type mismatch errors | Use `Promise<z.infer<typeof OutputSchema>>` |
| Using `zodValidateInput` | Returns undefined, already validated | Use `input` directly |
| Provider-specific pagination | Inconsistent API | Use `cursor`/`next_cursor` standard |
| Importing mapper functions | Not self-contained | Inline transformations in exec |

**For schema, naming, typing, registration mistakes → invoke `integration-patterns-skill`**
