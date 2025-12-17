---
description: Complete workflow for building Nango functions (actions or syncs) - discovers connections, generates code, creates tests, and validates with TDD
argument-hint: [action|sync] [integration-name] [function-name] [instructions]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Skill, Task, AskUserQuestion
---

# Build Function Workflow

## 🚨 STEP 0: Verify Directory

**Run this check BEFORE creating any files:**
```bash
ls -la .nango/ 2>/dev/null && pwd && echo "✓ IN NANGO PROJECT ROOT" || echo "✗ NOT in Nango root"
```

**If you see `✗`:** You MUST `cd` into the directory containing `.nango/`.

**Do NOT use absolute paths as a workaround.** All file operations must use relative paths from the Nango root.

**DO NOT proceed until you see `✓ IN NANGO PROJECT ROOT`.**

---

## Critical Errors to Avoid

| Error | Impact |
|-------|--------|
| Creating files with absolute paths or extra prefixes while in Nango root | Build breaks, nested directories |
| Forgetting index.ts import | Function silently doesn't load |
| Skipping dryrun | Not validated against real API |

---

## Step 1: Determine Function Type

**Arguments:** $1 = `action` or `sync` | $2 = integration-name | $3 = function-name | $4 = instructions

**If $1 is `action`:** Skip prompt, proceed to Action Workflow
**If $1 is `sync`:** Skip prompt, proceed to Sync Workflow
**If $1 is empty or invalid:** Ask the user:

"What would you like to build?

**1. Action** - One-time operations (create, update, delete, get)
**2. Sync** - Continuous data synchronization (fetch records periodically)

Reply with **1** or **2**."

---

# ACTION WORKFLOW

## Load Skills

Load these skills NOW (in order):
1. `integration-patterns-skill` - working directory check, schemas, naming, type safety
2. `action-builder-skill` - createAction patterns, dryrun syntax, CRUD methods

## Interactive Mode (if $2 is empty)

Ask the user:

"Please provide:

**Integration ID** (required): e.g., hubspot, salesforce, slack
**Connection ID** (required): e.g., my-hubspot-connection

**Action Details** (optional but recommended):
- **Use Case Summary** - What the action does
- **Action Inputs** - Input parameters
- **Action Outputs** - Return values
- **Action Name** - Suggested name
- **API Reference** - Link to docs
- **Test Input** - Sample JSON for testing

Example:
```
Integration ID: slack
Connection ID: action-builder
Use Case: Gets channel information
Inputs: channel_id
Outputs: id, name, is_private
Action Name: get-channel-info
API Reference: https://api.slack.com/methods/conversations.info
Test Input: {"channel_id": "C02MB5ZABA7"}
```"

**Store these values** - you'll use them throughout the workflow, especially:
- Connection ID → dryrun commands
- Test Input → input.json mock and --input flag

## Action TDD Workflow

### 1. Create Input Mock

```bash
mkdir -p {integrationId}/mocks/<action-name>
```

Create `{integrationId}/mocks/<action-name>/input.json` using user-provided test input.

### 2. Implement Action

File: `{integrationId}/actions/<action-name>.ts`

**Follow `action-builder-skill` for:**
- createAction() structure
- Schema definitions
- CRUD method patterns
- Checklist items

**Add import to index.ts:**
```typescript
import './{integrationId}/actions/<action-name>.js';
```

### 3. Compile

```bash
yes n | npx nango compile
```

### 4. Generate Test

```bash
yes n | npx nango generate:tests -i {integrationId} -a <action-name>
```

Verify: `ls -la {integrationId}/tests/{integrationId}-<action-name>.test.ts`

### 5. Dryrun (MANDATORY)

**See `action-builder-skill` for exact dryrun syntax.**

Use:
- User-provided **connection ID**
- User-provided **test input** in --input flag

```bash
yes n | npx nango dryrun <action-name> <connection-id> --input '<json>' --save-responses --integration-id {integrationId}
```

### 6. Run Test

```bash
npx vitest run {integrationId}/tests/{integrationId}-<action-name>.test.ts
```

### 7. Output Dryrun Command

**Always output the final dryrun command** so user can re-test.

## Action Checklist

- [ ] Skills loaded (integration-patterns-skill, action-builder-skill)
- [ ] Working directory verified (.nango/ exists)
- [ ] Input mock created with user-provided test values
- [ ] Action implemented (follow skill patterns)
- [ ] Added to index.ts
- [ ] Compiles successfully
- [ ] Test generated and passes
- [ ] Dryrun passes with real API
- [ ] Dryrun command outputted for user

---

# SYNC WORKFLOW

## Load Skills

Load these skills NOW (in order):
1. `integration-patterns-skill` - working directory check, schemas, naming, type safety
2. `sync-builder-skill` - createSync patterns, pagination, batchSave, deletion detection

## Interactive Mode (if $2 is empty)

Ask the user:

"Please provide:

**Integration ID** (required): e.g., hubspot, figma, github
**Connection ID** (required): e.g., my-hubspot-connection

**Sync Details** (optional but recommended):
- **Model Name** - What records sync fetches (e.g., Contact, Project)
- **Endpoint Path** - API path exposed (e.g., /hubspot/contacts)
- **Frequency** - How often to sync (e.g., 'every hour', 'every 5 minutes')
- **Sync Type** - 'full' or 'incremental'
- **Metadata** - JSON object with required inputs (e.g., `{"team_id": "12345"}`)
- **API Reference** - Link to docs

Example:
```
Integration ID: figma
Connection ID: action-builder
Model Name: Project
Endpoint Path: /figma/projects
Frequency: every hour
Sync Type: full
Metadata: {"team_id": "1234567890"}
API Reference: https://www.figma.com/developers/api#projects-endpoints
```"

**Store these values** - you'll use them throughout the workflow, especially:
- Connection ID → dryrun commands
- Metadata → metadata.json mock and -m flag

## Sync TDD Workflow

### 1. Create Output Mock

```bash
mkdir -p {integrationId}/mocks/<sync-name>
```

Create `{integrationId}/mocks/<sync-name>/output.json` with expected record shape.

If sync requires metadata, also create `{integrationId}/mocks/<sync-name>/metadata.json`.

### 2. Implement Sync

File: `{integrationId}/syncs/<sync-name>.ts`

**Follow `sync-builder-skill` for:**
- createSync() structure
- Pagination with nango.paginate()
- batchSave() for each batch
- Full syncs: deleteRecordsFromPreviousExecutions() at END
- Incremental syncs: use lastSyncDate
- Checklist items

**Add import to index.ts:**
```typescript
import './{integrationId}/syncs/<sync-name>.js';
```

### 3. Compile

```bash
yes n | npx nango compile
```

### 4. Generate Test

```bash
yes n | npx nango generate:tests -i {integrationId} -s <sync-name>
```

Verify: `ls -la {integrationId}/tests/{integrationId}-<sync-name>.test.ts`

### 5. Dryrun (MANDATORY)

**See `sync-builder-skill` for exact dryrun syntax.**

Use:
- User-provided **connection ID**
- User-provided **metadata** in -m flag (if sync requires)

```bash
# Without metadata
yes n | npx nango dryrun <sync-name> <connection-id> --integration-id {integrationId}

# With metadata
yes n | npx nango dryrun <sync-name> <connection-id> --integration-id {integrationId} -m '{"team_id":"123"}'
```

### 6. Run Test

```bash
npx vitest run {integrationId}/tests/{integrationId}-<sync-name>.test.ts
```

### 7. Output Dryrun Command

**Always output the final dryrun command** so user can re-test.

## Sync Checklist

- [ ] Skills loaded (integration-patterns-skill, sync-builder-skill)
- [ ] Working directory verified (.nango/ exists)
- [ ] Output mock created with expected record shape
- [ ] Metadata mock created (if sync requires metadata)
- [ ] Sync implemented (follow skill patterns)
- [ ] Added to index.ts
- [ ] Compiles successfully
- [ ] Test generated and passes
- [ ] Dryrun passes with real API
- [ ] Dryrun command outputted for user

---

## CLI Notes

- Use `yes n | npx nango <command>` to skip upgrade prompts
- No `npx nango test` - use `npx vitest` directly

## AI Cannot Edit Generated Functions

Once generated, the AI cannot modify action/sync files. User must manually edit or request regeneration.
