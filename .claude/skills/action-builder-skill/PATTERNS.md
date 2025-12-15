# Nango Integration Patterns (Shared)

This file contains patterns shared by both actions and syncs. For specific guidance:
- **Actions:** Use `action-builder-skill`
- **Syncs:** Use `sync-builder-skill`

## Working Directory Requirements

### STOP - Run This Check First

**DO NOT create any files until you have run this command and verified the output:**

```bash
ls -la .nango/ 2>/dev/null && pwd && echo "IN NANGO PROJECT ROOT" || echo "NOT in Nango root"
```

**Expected output:** You should see `.nango/` contents, the current path, and `IN NANGO PROJECT ROOT`

**If you see `NOT in Nango root`:** You MUST `cd` into the directory containing `.nango/` (usually `cd nango-integrations/`) and re-run the check.

**Do NOT use absolute paths as a workaround.** All file operations must use relative paths from the Nango root.

**This is not optional.** Skipping this check or using absolute paths as a workaround causes nested directory errors that break the build.

---

**Why this matters:** The git root is NOT the Nango root:

```
/my-project/              <- Git root (.git/ here) - NOT HERE
├── .git/
├── .claude/
└── nango-integrations/   <- Nango root (.nango/ here) - YOU MUST BE HERE
    ├── .nango/
    ├── package.json
    ├── tsconfig.json
    └── slack/
```

**Path rules once in Nango root:**
- Use relative paths from Nango root: `slack/actions/create-message.ts`
- NEVER prefix with `nango-integrations/` when already inside it

**Common mistake that WILL break the build:** Creating files with a `nango-integrations/` prefix while already inside the `nango-integrations/` directory. This creates:
```
nango-integrations/nango-integrations/slack/...  <- WRONG - nested structure
```
Instead of:
```
nango-integrations/slack/...  <- CORRECT
```

## Directory Structure

```
./                                   # Project root (contains .nango/, package.json)
├── hubspot/                         # Provider directory (lowercase)
│   ├── actions/                     # Actions folder
│   │   └── create-contact.ts        # Action files (kebab-case)
│   └── syncs/                       # Syncs folder
│       └── fetch-contacts.ts        # Sync files (kebab-case, fetch- prefix)
├── salesforce/                      # Another provider
│   └── actions/
├── .nango/                          # Nango configuration directory
├── index.ts                         # Entry point - imports all actions/syncs
├── package.json
└── tsconfig.json
```

**Naming conventions:**
- Provider directories: lowercase (e.g., `hubspot/`, `salesforce/`)
- Action files: kebab-case (e.g., `create-contact.ts`)
- Sync files: kebab-case with `fetch-` prefix (e.g., `fetch-contacts.ts`)
- One action/sync per file
- **All actions/syncs must be imported in `index.ts` to be loaded**

**Note:** There is NO `nango.yaml` configuration file in this setup.

## Inline Schema Pattern

**CRITICAL: Define schemas inline at the top of action/sync file. NEVER import from models.ts.**

```typescript
import { z } from 'zod';

// GOOD: Inline schema definitions
const ContactInput = z.object({
    email: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional()
});

const ContactOutput = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.union([z.string(), z.null()]),
    last_name: z.union([z.string(), z.null()]),
    created_at: z.string()
});
```

```typescript
// BAD: Importing from models.ts
import { ContactInput, ContactOutput } from '../models.js';
```

**Why inline schemas:**
- Self-contained: All logic in one place
- Easier to debug: No jumping between files
- No coupling: Changes don't affect other actions/syncs
- Clear data flow: Input -> transformation -> output visible in one file

## Optional Fields: `?? null` Not `?? undefined`

**CRITICAL: Always use `?? null` for optional fields, never `?? undefined`.**

```typescript
// GOOD
return {
    id: response.data.id,
    email: response.data.email,
    first_name: response.data.first_name ?? null,
    last_name: response.data.last_name ?? null
};
```

```typescript
// BAD
return {
    id: response.data.id,
    first_name: response.data.first_name ?? undefined,  // Wrong
    last_name: response.data.last_name  // Could be undefined
};
```

**Why:** Zod schemas expect `null` for optional fields. Using `undefined` causes validation failures.

## No `.default()` on Zod Schemas

**CRITICAL: Nango compiler doesn't support `.default()`. Handle defaults in exec function.**

```typescript
// DON'T: Use .default() in schema
const Input = z.object({
    limit: z.number().optional().default(10)  // Compilation error!
});

// DO: Handle defaults in exec function
const Input = z.object({
    limit: z.number().optional()
});

// In exec function:
const limit = input.limit || 10;  // Handle default here
```

## Explicit Parameter Naming

Parameter names must be **explicit and unambiguous**. A developer should immediately understand what value to provide.

### Naming Rules

1. **IDs**: Always suffix with `_id` (e.g., `user_id`, `channel_id`, `contact_id`)
2. **Timestamps**: Use descriptive names (e.g., `created_at`, `scheduled_time`)
3. **Names**: Suffix with `_name` when expecting a name (e.g., `channel_name`)
4. **Emails**: Suffix with `_email` (e.g., `user_email`)
5. **URLs**: Suffix with `_url` (e.g., `callback_url`)

### Examples

```typescript
// GOOD: Explicit names
const GetUserInput = z.object({
    user_id: z.string()      // Clear: expects a user ID
});

const RemoveFromChannelInput = z.object({
    channel_id: z.string(),  // Clear: expects a channel ID
    user_id: z.string()      // Clear: expects a user ID
});
```

```typescript
// BAD: Ambiguous names
const GetUserInput = z.object({
    user: z.string()         // Is this ID, email, name, or object?
});

const RemoveFromChannelInput = z.object({
    channel: z.string(),     // Could be channel name or ID
    user: z.string()         // Ambiguous
});
```

### Mapping to API Parameters

When the API uses a different parameter name, map explicitly:

```typescript
const GetUserInput = z.object({
    user_id: z.string()  // Our explicit name
});

// In exec function:
const config = {
    endpoint: 'users.info',
    params: {
        user: input.user_id  // Map to API's expected param name
    }
};
```

## Parameter Descriptions with `.describe()`

Use `.describe()` to add documentation and examples. This helps LLMs and API consumers.

### Format Pattern

`"Brief description. Example: \"value\""`

```typescript
const AddReactionInput = z.object({
    channel_id: z.string()
        .describe('The channel containing the message. Example: "C02MB5ZABA7"'),
    message_ts: z.string()
        .describe('Timestamp of the message. Example: "1763887648.424429"'),
    reaction_name: z.string()
        .describe('Emoji name without colons. Example: "thumbsup", "heart"')
});
```

### When to Add Examples

Always include examples for:
- IDs (channel, user, message, file)
- Timestamps (Unix, Slack ts format)
- Enums or constrained values
- Format-specific strings (URLs, emails)

### Optional Parameters

Explain when to use:

```typescript
thread_ts: z.string().optional()
    .describe('Thread parent timestamp. Omit for top-level message. Example: "1763887648.424429"'),
cursor: z.string().optional()
    .describe('Pagination cursor from previous response. Omit for first page.')
```

## Type Safety for API Response Mapping

**Use inline types for API response items. Avoid `any`.**

```typescript
// GOOD: Inline type for API response
return {
    channels: response.data.channels.map((ch: { id: string; name: string; is_private: boolean }) => ({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private
    }))
};
```

```typescript
// BAD: Using any loses type safety
return {
    channels: response.data.channels.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        is_private: ch.is_private
    }))
};
```

## Endpoint Path Rules

1. **No dynamic segments**: Paths like `/channels/:channel` or `/users/{id}` are INVALID
2. **Use static paths**: Put dynamic values in input schema, not path
3. **Unique method + path**: No duplicate `GET /user` across actions in same integration

```typescript
// BAD: Dynamic segment in path
endpoint: { method: 'GET', path: '/channels/:channel/info' }

// GOOD: Static path with input param
endpoint: { method: 'GET', path: '/channel/info' }
// Use channel_id from input in the API call
```

## API Documentation Links

Always include API doc link as a comment above the endpoint in the exec function:

```typescript
exec: async (nango, input) => {
    const config = {
        // https://developers.hubspot.com/docs/api/crm/contacts
        endpoint: 'crm/v3/objects/contacts',
        // ...
    };
}
```

## index.ts Import Requirement

**All actions and syncs MUST be imported in `index.ts` to be loaded by Nango.**

```typescript
// index.ts
import './hubspot/actions/create-contact.js';
import './hubspot/actions/update-contact.js';
import './hubspot/syncs/fetch-contacts.js';
import './slack/actions/post-message.js';
```

Forgetting this import is a common mistake - the action/sync will compile but won't be available.

## Common Mistakes (Shared)

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Importing schemas from models.ts | Not self-contained, creates coupling | Define schemas inline at top of file |
| Using `?? undefined` | Zod expects `null` for optional fields | Use `?? null` |
| Using `.default()` on Zod schemas | Nango compiler doesn't support it | Handle defaults in exec function |
| Ambiguous param names (`user`, `channel`) | Unclear what value to provide | Use explicit names (`user_id`, `channel_id`) |
| `(item: any) => ...` | Loses type safety | Use inline type: `(item: { id: string }) => ...` |
| Dynamic segments in endpoint path | Invalid path format | Use static path + input params |
| Missing index.ts import | Action/sync won't be loaded | Add import to index.ts |
| Missing API doc link | Hard to verify implementation | Add comment with docs URL |
| Creating files in wrong directory | Nested paths break CLI | Verify working directory first |
