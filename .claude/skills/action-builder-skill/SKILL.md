---
name: nango-action-builder
description: Use when creating or refactoring Nango integration actions to be thin API wrappers - provides patterns for minimal transformation logic, direct proxy calls, and standardized structure
---

# Nango Action Builder

## Overview

Actions should be **self-contained thin wrappers** using `createAction()` with:
- Schemas defined inline at top of file (NOT imported from models.ts)
- Transformations inline in the exec function (NO separate mapper files)
- `?? null` for optional fields (NOT `?? undefined`)

## When to Use

**Create thin wrapper actions when:**
- Adding new API endpoint support
- Refactoring existing complex actions
- Building CRUD operations
- Simplifying integration maintenance

**When NOT to use:**
- Complex business logic required (consider separate service layer)
- Multi-step workflows (use syncs or orchestrations)

## Directory Structure

Nango integrations follow a standardized directory structure:

```
nango-integrations/                  # Root directory
├── hubspot/                         # Provider directory (lowercase)
│   ├── actions/                     # Actions folder
│   │   ├── create-contact.ts        # Action files (kebab-case)
│   │   ├── update-contact.ts
│   │   └── delete-contact.ts
│   ├── syncs/                       # Syncs folder (optional)
│   └── on-events/                   # Event handlers (optional)
├── salesforce/                      # Another provider
│   └── actions/
│       └── create-contact.ts
├── index.ts                         # Entry point - imports all actions
├── package.json
└── tsconfig.json
```

**Naming conventions:**
- Provider directories: lowercase (e.g., `hubspot/`, `salesforce/`)
- Action files: kebab-case (e.g., `create-contact.ts`)
- One action per file
- Actions must be imported in `index.ts` to be loaded

**Note:** There is NO `nango.yaml` configuration file in this setup.

## Thin Wrapper Principles

### ✅ DO: Self-Contained Action Pattern

```typescript
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const CreateNoteInput = z.object({
    time_stamp: z.string(),
    body: z.string(),
    attachment_ids: z.string().optional(),
    owner: z.string().optional()
});

const NoteOutput = z.object({
    id: z.string(),
    time_stamp: z.string(),
    body: z.union([z.string(), z.null()]),
    attachment_ids: z.union([z.string(), z.null()]),
    owner: z.union([z.string(), z.null()]),
    created_date: z.string()
});

const action = createAction({
    description: 'Creates a single note in Hubspot',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/note',
        group: 'Notes'
    },

    input: CreateNoteInput,
    output: NoteOutput,
    scopes: ['crm.objects.contacts.write', 'oauth'],

    exec: async (nango, input): Promise<z.infer<typeof NoteOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/notes
            endpoint: 'crm/v3/objects/notes',
            data: {
                properties: {
                    hs_timestamp: input.time_stamp,
                    hs_note_body: input.body,
                    ...(input.attachment_ids && { hs_attachment_ids: input.attachment_ids }),
                    ...(input.owner && { hubspot_owner_id: input.owner })
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        // Inline transformation: API response -> output schema
        return {
            id: response.data.id,
            time_stamp: response.data.properties.hs_timestamp,
            body: response.data.properties.hs_note_body ?? null,
            attachment_ids: response.data.properties.hs_attachment_ids ?? null,
            owner: response.data.properties.hubspot_owner_id ?? null,
            created_date: response.data.createdAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
```

**Why this is good:**
- Self-contained: schemas inline, no external files
- No external mapper functions
- Inline transformation with clear comments
- Uses `?? null` for optional fields (not `?? undefined`)
- Direct API call with minimal abstraction
- Clear, readable structure

### ❌ DON'T: Separate Mapper Files

```typescript
import { createAction } from 'nango';
import { toNote, toHubspotNote } from '../mappers/toNote.js';  // ❌ External mappers

const action = createAction({
    // ... config ...
    exec: async (nango, input): Promise<Note> => {
        const hubSpotNote = toHubspotNote(input);  // ❌ Unnecessary abstraction
        const config: ProxyConfiguration = {
            endpoint: 'crm/v3/objects/notes',
            data: hubSpotNote,
            retries: 3
        };
        const response = await nango.post(config);
        return toNote(response.data);  // ❌ External transformation
    }
});
```

**Why this is bad:**
- Not self-contained: requires external mapper files
- Harder to trace data flow
- More files to maintain
- Hides the actual API structure
- May use `?? undefined` instead of `?? null`

### ❌ DON'T: Import Schemas from models.ts

```typescript
import { CreateNoteInput, Note } from '../models.js';  // ❌ External schemas

const action = createAction({
    input: CreateNoteInput,  // ❌ From models.ts
    output: Note,  // ❌ From models.ts
    // ...
});
```

**Why this is bad:**
- Not self-contained: requires external model files
- Schemas shared across actions can cause coupling
- Harder to understand action in isolation

## Standard Pagination Interface

All actions that return lists **MUST** use a standardized pagination interface. This provides a consistent experience across all providers regardless of their native pagination style.

### Standard Schema Pattern

```typescript
// Input: Always use `cursor` for pagination
const ListItemsInput = z.object({
    // ... other filters ...
    cursor: z.string().optional()  // Standardized cursor field
});

// Output: Always return `next_cursor` for pagination
const ListItemsOutput = z.object({
    items: z.array(ItemSchema),
    next_cursor: z.union([z.string(), z.null()])  // null when no more pages
});
```

### Complete Pagination Example

```typescript
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ListChannelsInput = z.object({
    types: z.string().optional(),
    limit: z.number().optional(),
    cursor: z.string().optional()  // ✅ Standard pagination input
});

const Channel = z.object({
    id: z.string(),
    name: z.string(),
    is_private: z.boolean()
});

const ListChannelsOutput = z.object({
    channels: z.array(Channel),
    next_cursor: z.union([z.string(), z.null()])  // ✅ Standard pagination output
});

const action = createAction({
    description: 'Lists all channels in a Slack workspace',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/channels',
        group: 'Channels'
    },

    input: ListChannelsInput,
    output: ListChannelsOutput,
    scopes: ['channels:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListChannelsOutput>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/conversations.list
            endpoint: 'conversations.list',
            params: {
                ...(input.types && { types: input.types }),
                ...(input.limit && { limit: input.limit.toString() }),
                ...(input.cursor && { cursor: input.cursor })  // Map to provider's param
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            channels: response.data.channels.map((ch: any) => ({
                id: ch.id,
                name: ch.name,
                is_private: ch.is_private
            })),
            // ✅ Normalize provider's pagination to standard format
            next_cursor: response.data.response_metadata?.next_cursor || null
        };
    }
});
```

### Provider Pagination Mapping

Different providers use different pagination styles. **Always normalize to `cursor`/`next_cursor`:**

| Provider | Native Input | Native Output | Map To |
|----------|--------------|---------------|--------|
| Slack | `cursor` | `response_metadata.next_cursor` | `cursor` → `next_cursor` |
| Notion | `start_cursor` | `next_cursor` | `cursor` → `next_cursor` |
| HubSpot | `after` | `paging.next.after` | `cursor` → `next_cursor` |
| GitHub | `page` | `Link` header | `cursor` → `next_cursor` (encode page) |
| Google | `pageToken` | `nextPageToken` | `cursor` → `next_cursor` |

### Pagination Rules

1. **Input field**: Always use `cursor: z.string().optional()`
2. **Output field**: Always use `next_cursor: z.union([z.string(), z.null()])`
3. **Empty cursor**: Return `null` (not `undefined` or empty string) when no more pages
4. **Map provider params**: Transform `cursor` to provider's native param name in the request
5. **Normalize response**: Extract provider's pagination token into `next_cursor`

### ❌ DON'T: Use Provider-Specific Pagination

```typescript
// ❌ BAD: Exposes Slack-specific pagination
const ListChannelsInput = z.object({
    slack_cursor: z.string().optional()  // ❌ Provider-specific name
});

const ListChannelsOutput = z.object({
    channels: z.array(Channel),
    response_metadata: z.object({        // ❌ Provider-specific structure
        next_cursor: z.string()
    }).optional()
});
```

### ✅ DO: Use Standard Interface

```typescript
// ✅ GOOD: Standard pagination interface
const ListChannelsInput = z.object({
    cursor: z.string().optional()  // ✅ Standard
});

const ListChannelsOutput = z.object({
    channels: z.array(Channel),
    next_cursor: z.union([z.string(), z.null()])  // ✅ Standard
});
```

## Quick Reference

| Operation | Method | Config Pattern |
|-----------|--------|----------------|
| Create | `nango.post(config)` | `data: { properties: {...} }` |
| Read | `nango.get(config)` | `endpoint: 'resource/${id}'`, `params: {...}` |
| Update | `nango.patch(config)` | `endpoint: 'resource/${id}'`, `data: {...}` |
| Delete | `nango.delete(config)` | `endpoint: 'resource/${id}'` |
| List | `nango.get(config)` | `params: { cursor: input.cursor }` → `next_cursor` |

**Common patterns:**
- Optional fields: `...(input.field && { field: input.field })`
- Always include: `retries: 3`
- Add API doc link as comment: `// https://api-docs-url`
- Pagination: Use `cursor`/`next_cursor` standard interface

## Schema Definitions

**Define schemas inline at the top of action file:**

```typescript
import { z } from 'zod';
import { createAction } from 'nango';

// Inline schemas - self-contained
const CreateNoteInput = z.object({
    time_stamp: z.string(),
    body: z.string(),
    attachment_ids: z.string().optional(),
    owner: z.string().optional()
});

const NoteOutput = z.object({
    id: z.string(),
    time_stamp: z.string(),
    created_date: z.string(),
    body: z.union([z.string(), z.null()]),
    attachment_ids: z.union([z.string(), z.null()]),
    owner: z.union([z.string(), z.null()])
});

const action = createAction({
    input: CreateNoteInput,
    output: NoteOutput,
    exec: async (nango, input): Promise<z.infer<typeof NoteOutput>> => {
        // Transform inline with ?? null
    }
});
```

**Key points:**
- Define schemas inline in action file
- Use `z.infer<typeof Schema>` for return type
- Transform inline in exec function
- Use `?? null` for optional fields
- **NEVER use `.default()` on Zod schemas** - Nango compiler doesn't support it. Handle defaults in exec function instead.

**Example of handling defaults:**

```typescript
// ❌ DON'T: Use .default() in schema
const Input = z.object({
    limit: z.number().optional().default(10)  // ❌ Compilation error!
});

// ✅ DO: Handle defaults in exec function
const Input = z.object({
    limit: z.number().optional()
});

const action = createAction({
    input: Input,
    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            endpoint: 'api/items',
            params: {
                limit: (input.limit || 10).toString()  // ✅ Handle default here
            },
            retries: 3
        };
        // ...
    }
});
```

## Explicit Parameter Naming

Parameter names must be **explicit and unambiguous**. A developer reading the schema should immediately understand what value to provide without consulting documentation.

### ✅ DO: Use Explicit Names with Type Suffix

```typescript
// ✅ GOOD: Clear that these are IDs
const GetUserInfoInput = z.object({
    user_id: z.string()  // Explicit: expects a user ID string
});

const RemoveFromChannelInput = z.object({
    channel_id: z.string(),  // Explicit: expects a channel ID
    user_id: z.string()      // Explicit: expects a user ID
});

const CreateNoteInput = z.object({
    contact_id: z.string(),  // Explicit: expects a contact ID
    owner_id: z.string().optional()  // Explicit: expects an owner ID
});
```

### ❌ DON'T: Use Ambiguous Names

```typescript
// ❌ BAD: Ambiguous - is this an ID, email, name, or object?
const GetUserInfoInput = z.object({
    user: z.string()  // ❌ Unclear what value to provide
});

// ❌ BAD: Could be channel name, ID, or object
const RemoveFromChannelInput = z.object({
    channel: z.string(),  // ❌ Ambiguous
    user: z.string()      // ❌ Ambiguous
});
```

### Naming Rules

1. **IDs**: Always suffix with `_id` (e.g., `user_id`, `channel_id`, `message_id`, `team_id`)
2. **Timestamps**: Use descriptive names (e.g., `created_at`, `scheduled_time`, `timestamp`)
3. **Names**: Suffix with `_name` when expecting a name (e.g., `channel_name`, `file_name`)
4. **Emails**: Suffix with `_email` (e.g., `user_email`)
5. **URLs**: Suffix with `_url` (e.g., `callback_url`, `redirect_url`)

### Mapping to API Parameters

When the API uses a different parameter name, map explicitly in the exec function:

```typescript
const GetUserInfoInput = z.object({
    user_id: z.string()  // Our explicit name
});

const action = createAction({
    // ...
    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            endpoint: 'users.info',
            params: {
                user: input.user_id  // Map to API's expected param name
            },
            retries: 3
        };
        // ...
    }
});
```

## Parameter Descriptions and Examples

Use Zod's `.describe()` method to add descriptions and examples to parameters. This helps LLMs understand the expected format and provides documentation for API consumers.

### ✅ DO: Add Descriptions with Examples

```typescript
const AddReactionInput = z.object({
    channel_id: z.string()
        .describe('The channel containing the message. Example: "C02MB5ZABA7"'),
    message_ts: z.string()
        .describe('Timestamp of the message to react to. Example: "1763887648.424429"'),
    reaction_name: z.string()
        .describe('Emoji name without colons. Example: "thumbsup", "heart", "eyes"')
});

const ScheduleMessageInput = z.object({
    channel_id: z.string()
        .describe('Channel to post to. Example: "C02MB5ZABA7"'),
    text: z.string()
        .describe('Message content. Example: "Hello team!"'),
    post_at: z.number()
        .describe('Unix timestamp for when to send. Example: 1734567890')
});
```

### Description Guidelines

1. **Always include an example** - especially for:
   - IDs (channel, user, message, file)
   - Timestamps (Unix, Slack ts format)
   - Enums or constrained values
   - Format-specific strings (URLs, emails)

2. **Format pattern**: `"Brief description. Example: \"value\""`

3. **For complex formats, show the pattern**:
```typescript
message_ts: z.string()
    .describe('Slack message timestamp in "seconds.microseconds" format. Example: "1763887648.424429"'),
scheduled_time: z.number()
    .describe('Unix timestamp in seconds (not milliseconds). Example: 1734567890'),
user_ids: z.string()
    .describe('Comma-separated user IDs. Example: "U123,U456,U789"')
```

4. **For optional params, explain when to use**:
```typescript
thread_ts: z.string().optional()
    .describe('Thread parent timestamp to reply in thread. Omit for top-level message. Example: "1763887648.424429"'),
cursor: z.string().optional()
    .describe('Pagination cursor from previous response. Omit for first page.')
```

### Complete Example with Descriptions

```typescript
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const PostMessageInput = z.object({
    channel_id: z.string()
        .describe('Channel, DM, or group to post to. Example: "C02MB5ZABA7"'),
    text: z.string()
        .describe('Message text content. Supports Slack markdown. Example: "Hello *world*!"'),
    thread_ts: z.string().optional()
        .describe('Parent message timestamp to reply in thread. Example: "1763887648.424429"'),
    blocks: z.array(z.any()).optional()
        .describe('Slack Block Kit blocks for rich formatting. See: https://api.slack.com/block-kit')
});

const PostMessageOutput = z.object({
    ok: z.boolean()
        .describe('Whether the operation succeeded'),
    ts: z.string()
        .describe('Timestamp of the posted message. Example: "1763887648.424429"'),
    channel: z.string()
        .describe('Channel where message was posted. Example: "C02MB5ZABA7"'),
    message: z.object({
        text: z.string().describe('The message text as stored'),
        type: z.string().describe('Always "message"'),
        user: z.string().describe('User ID who posted. Example: "U07E8G7J57T"')
    })
});

const action = createAction({
    description: 'Posts a message to a channel, DM, or group.',
    version: '1.0.0',
    // ...
});
```

### Action Description Format

The `description` field should be a **concise single sentence** describing what the action does. Do NOT include input parameters in the description - these are already documented in the Zod schema via `.describe()` calls.

```typescript
const action = createAction({
    description: 'Brief summary of what the action does.',
    // ...
});
```

Input documentation belongs in the Zod schema's `.describe()` method, not duplicated in the action description.

### Getting Examples from Test Mocks

Test input files (`mocks/<action>/input.json`) contain real examples:

```bash
# View example input for an action
cat slack/mocks/add-reaction/input.json
# Output: {"channel_id": "C02MB5ZABA7", "message_ts": "1763887648.424429", "reaction_name": "thumbsup"}
```

Use these values in your `.describe()` calls to ensure examples are realistic.

### Mock Directory Structure

```
nango-integrations/slack/mocks/
├── meta.json                    # Integration-level config: {"connection_id": "action-builder"}
├── add-reaction/
│   ├── input.json               # Test input data
│   └── output.json              # Expected output
├── search-messages/
│   ├── input.json
│   ├── output.json
│   └── meta.json                # Action-level override: {"connection_id": "user-token-conn"}
```

**Connection ID resolution:**
1. Check for action-level `mocks/<action>/meta.json`
2. Fall back to integration-level `mocks/meta.json`

Use action-level overrides when an action requires a different connection (e.g., user token vs bot token).

## Code Quality Checklist

**Structure:**
- [ ] Uses `createAction()` with description, version, endpoint, input/output, scopes
- [ ] Schemas defined inline at top of file (NOT from models.ts)
- [ ] Transformations are inline (NO mapper imports)
- [ ] Return type is `Promise<z.infer<typeof OutputSchema>>`
- [ ] Includes `export type NangoActionLocal`
- [ ] Includes `export default action`

**Documentation:**
- [ ] Action `description` is a concise single sentence (no input parameters listed)
- [ ] Parameters have `.describe()` with examples for IDs, timestamps, and constrained values
- [ ] API documentation link in comment above the endpoint property

**Implementation:**
- [ ] Uses `?? null` for optional fields (NOT `?? undefined`)
- [ ] `retries: 3` configured
- [ ] Uses `input` directly (input is already validated by Nango - no `zodValidateInput`)
- [ ] No `.default()` on Zod schemas (handle defaults in exec function)
- [ ] Parameter names are explicit (e.g., `user_id` not `user`, `channel_id` not `channel`)
- [ ] No `any` types or object casts - use proper typing

**Endpoint Path Rules:**
- [ ] Path has NO dynamic segments (`:param` or `{param}` patterns are INVALID)
- [ ] Method + path combination is unique across all actions in the integration

**Pagination (for list actions):**
- [ ] Input uses `cursor: z.string().optional()`
- [ ] Output uses `next_cursor: z.union([z.string(), z.null()])`
- [ ] Maps `cursor` to provider's native pagination param
- [ ] Returns `null` for `next_cursor` when no more pages (not `undefined`)

## Endpoint Path Rules

1. **No dynamic segments**: `/channels/:channel/purpose` ❌ → `/channel/purpose` ✅
2. **Unique method + path per integration**: No duplicate `GET /user` across actions

## Common Code Mistakes

**Schema & Type Errors:**

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Importing schemas from models.ts | Not self-contained, creates coupling | Define schemas inline at top of file |
| Using `?? undefined` | Zod expects `null` for optional fields | Use `?? null` |
| Using `.default()` on Zod schemas | Nango compiler doesn't support it | Handle defaults in exec function: `input.field \|\| defaultValue` |
| Wrong return type | Type mismatch errors | Use `Promise<z.infer<typeof OutputSchema>>` |

**Transformation & Logic Errors:**

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Importing mapper functions | Not self-contained, harder to debug | Inline transformations in exec function |
| Using `zodValidateInput` | Returns undefined, input already validated | Use `input` directly (e.g., `input.id`) |
| Complex business logic in action | Actions should be thin wrappers | Move complex logic to service layer |

**Configuration Errors:**

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Missing retries | Flaky network calls fail unnecessarily | Add `retries: 3` to ProxyConfiguration |
| Missing API doc links | Hard to verify implementation correctness | Add comment with docs URL above endpoint |
| Inconsistent data transformation | Output doesn't match schema | Transform API response to match output schema exactly |

**Naming Errors:**

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| `user: z.string()` | Ambiguous - could be ID, email, name, or object | Use `user_id: z.string()` |
| `channel: z.string()` | Ambiguous - could be ID or name | Use `channel_id: z.string()` |
| `owner: z.string()` | Ambiguous - what kind of identifier? | Use `owner_id: z.string()` |
| `message: z.string()` | Ambiguous - could be content or ID | Use `message_id` or `message_content` |

**Endpoint Path Errors:**

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| `path: '/channels/:channel/purpose'` | Dynamic segments are invalid | Use static path: `path: '/channel/purpose'` + input param |
| `path: '/users/{id}'` | Dynamic segments are invalid | Use static path: `path: '/user'` + `user_id` in input |
| Duplicate `GET /user` in two actions | Method + path must be unique per integration | Use specific paths: `/user/info`, `/user/profile` |

**Type Safety Errors:**

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| `(item: any) => ...` | Loses type safety | Define interface or use `z.infer<typeof Schema>` |
| `response.data as SomeType` | Unsafe cast hides errors | Let Zod validate or type the API response properly |

## Real-World Impact

Self-contained actions with inline transformations are:
- **Easier to understand**: All logic in one place
- **Easier to debug**: No jumping between mapper files
- **Easier to test**: Clear input/output without hidden transformations
- **More maintainable**: Single source of truth per action

**Remember:**
- Define schemas inline (NOT from models.ts)
- Inline transformations (NO mapper files)
- Use `?? null` (NOT `?? undefined`)
- Keep actions fully self-contained
