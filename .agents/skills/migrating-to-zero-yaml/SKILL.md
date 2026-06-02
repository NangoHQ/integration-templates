---
name: migrating-to-zero-yaml
description: Manually migrates legacy `nango.yaml` Nango projects to Zero YAML TypeScript by generating `models.ts`, `index.ts`, package/tsconfig scaffolding, and wrapping legacy scripts in `createSync()`, `createAction()`, or `createOnEvent()`. Use when a Nango repo still has `nango.yaml` and needs manual Zero YAML migration.
---

# Migrating to Zero YAML
This skill replaces the old CLI migrator with an LLM-driven mechanical migration. Keep behavior as close as possible to the existing YAML project, then validate and stop. Do not turn this into a broader cleanup unless the user asks.

## Critical rule

- Do not tell the user to run `nango migrate-to-zero-yaml`.
- Perform the migration manually in code.
- Preserve existing behavior first.
- Do not opportunistically migrate `lastSyncDate`, `syncType`, `trackDeletes`, or validation patterns unless the user asks or compilation forces you to touch them.
- If the repo is already Zero YAML, stop and switch to a regular Zero YAML refactor workflow instead of forcing a migration.

## Preconditions

1. Confirm you are in the Nango project root and `nango.yaml` exists.
2. Make sure there is a rollback path before destructive edits (git branch/commit or external backup).
3. Read `nango.yaml` and inventory:
   - integrations
   - syncs
   - actions
   - on-event handlers
   - models
4. Inspect the existing TypeScript files that those YAML entries point to.
5. Keep the migration mechanical. Avoid redesigning APIs, renaming scripts, or changing business logic.

## End state you are aiming for

The migrated project should have:

- `package.json`
- `tsconfig.json`
- root `models.ts`
- root `index.ts`
- integration files exporting `createSync()`, `createAction()`, or `createOnEvent()`
- helper files importing Nango runtime types from `nango`
- no `nango.yaml` in the final migrated state

## Migration workflow

1. Read `nango.yaml` and build a migration inventory.
2. Create or update Zero YAML scaffolding:
   - `package.json`
   - `tsconfig.json`
3. Generate `models.ts` from the YAML models.
4. Rewrite each sync file into `createSync(...)`.
5. Rewrite each action file into `createAction(...)`.
6. Rewrite each lifecycle handler into `createOnEvent(...)`.
7. Generate `index.ts` side-effect imports for every migrated script.
8. Fix helper-file imports and small TypeScript breakages.
9. Compile and validate.
10. Remove `nango.yaml` only after the replacement project is in place and there is still a rollback path outside the file.

## Scaffolding rules

### `package.json`

If the project does not have a package file, create one. If it already exists, preserve existing fields and add the Zero YAML essentials:

- `type: "module"`
- `engines.node: ">=20.0"`
- scripts:
  - `compile: "nango compile"`
  - `dev: "nango dev"`
- `devDependencies.nango`
- `devDependencies.zod`

Prefer preserving the repo's package manager and existing workspace fields.

### `tsconfig.json`

Use the standard Zero YAML TypeScript config shape:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "include": ["index.ts", "**/*.ts"],
  "exclude": ["node_modules", "dist", "build", ".nango"],
  "compilerOptions": {
    "module": "node16",
    "target": "esnext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node16",
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "sourceMap": true,
    "noEmit": true
  }
}
```

## Generate `models.ts`

Create a root `models.ts` file that turns YAML model definitions into Zod schemas plus exported inferred types.

Use this pattern:

```ts
import * as z from 'zod';

export const Ticket = z.object({
    id: z.string(),
    title: z.string()
});

export type Ticket = z.infer<typeof Ticket>;

export const models = {
    Ticket
};
```

Conversion rules:

- `string` -> `z.string()`
- `number` -> `z.number()`
- `boolean` -> `z.boolean()`
- `Date` -> `z.date()`
- `any` -> `z.any()` or `z.unknown()` if you need a safer fallback
- optional field -> `.optional()`
- array -> `z.array(...)`
- nested object -> nested `z.object(...)`
- union -> `z.union([...])`
- model reference -> reuse the referenced schema
- dynamic object fields -> `z.record(...)` or `.catchall(...)`

Practical rule: if the old YAML model is hard to express exactly, preserve migration momentum with the broadest safe schema that still lets the project compile. Tighten later only if needed.

Define models in dependency order. If you hit circular references, use `z.lazy(() => ModelName)`.

## Rewrite syncs

For each YAML sync, keep the existing file path when possible and wrap the current default-exported function in `createSync(...)`.

Map YAML config to Zero YAML config like this:

- `description` -> `description`
- `version` -> `version` (default to `0.0.1` if missing)
- `runs` -> `frequency`
- `auto_start` -> `autoStart`
- `sync_type` -> `syncType`
- `track_deletes` -> `trackDeletes`
- `endpoints` -> `endpoints`
- `scopes` -> `scopes`
- webhook subscriptions -> `webhookSubscriptions`
- YAML `input` model -> `metadata`
- YAML `output` models -> `models`
- existing default export function body -> `exec`

If no YAML input model exists for the sync, default `metadata` to `z.object({})` for migration parity.

If the file exports `onWebhookPayloadReceived`, move that function into the `createSync(...)` config as `onWebhook`.

Use this shape:

```ts
import { createSync } from 'nango';
import * as z from 'zod';
import { Metadata, Ticket } from '../../models.js';

const sync = createSync({
    description: 'Sync tickets',
    version: '0.0.1',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: false,
    endpoints: [{ method: 'GET', path: '/tickets', group: 'Tickets' }],
    metadata: Metadata,
    models: { Ticket },
    exec: async (nango) => {
        // keep existing logic
    }
});

export type NangoSyncLocal = Parameters<typeof sync['exec']>[0];
export default sync;
```

## Rewrite actions

For each YAML action, wrap the existing default-exported function in `createAction(...)`.

Map YAML config like this:

- `description` -> `description`
- `version` -> `version` (default `0.0.1`)
- `endpoint` -> `endpoint`
- `input` -> `input`
- `output` -> `output`
- `scopes` -> `scopes`
- existing default export function body -> `exec`

If the action has no input or output schema, use `z.void()`.

Use this shape:

```ts
import { createAction } from 'nango';
import * as z from 'zod';
import { CreateTicketInput, CreateTicketOutput } from '../../models.js';

const action = createAction({
    description: 'Create ticket',
    version: '0.0.1',
    endpoint: { method: 'POST', path: '/tickets', group: 'Tickets' },
    input: CreateTicketInput,
    output: CreateTicketOutput,
    exec: async (nango, input) => {
        // keep existing logic
    }
});

export type NangoActionLocal = Parameters<typeof action['exec']>[0];
export default action;
```

## Rewrite on-event handlers

For each YAML lifecycle handler, wrap the existing default export in `createOnEvent(...)`.

Map like this:

- event name -> `event`
- description -> preserve an existing description if one exists; otherwise use `<event> event handler`
- existing default export function body -> `exec`

Use this shape:

```ts
import { createOnEvent } from 'nango';

export default createOnEvent({
    event: 'post-connection-creation',
    description: 'post-connection-creation event handler',
    exec: async (nango) => {
        // keep existing logic
    }
});
```

## Import and typing fixes

The old migrator also cleaned up imports. Do the same manually.

- Remove `NangoSync`, `NangoAction`, `ProxyConfiguration`, and `ActionError` imports from old `models` imports.
- Import runtime types from `nango` instead.
- Keep generated model imports pointing to `../../models.js` or the correct relative path.
- Use side-effect imports with `.js` in `index.ts`.

Important mechanical fixes:

- Replace local `NangoSync` parameter annotations with `NangoSyncLocal` after wrapping the file.
- Replace local `NangoAction` parameter annotations with `NangoActionLocal` after wrapping the file.
- Remove type arguments from:
  - `nango.batchSave<T>(...)`
  - `nango.batchUpdate<T>(...)`
  - `nango.batchDelete<T>(...)`
  - `nango.getMetadata<T>()`

Those generic arguments often compile in the old format but become noisy or unnecessary after migration.

## Generate `index.ts`

Create a root `index.ts` with side-effect imports for every migrated script. Include the `.js` extension.

Example:

```ts
import './github/syncs/fetch-issues.js';
import './github/actions/create-issue.js';
import './github/on-events/post-connection-creation.js';
```

Do not use named or default imports here.

## Helper-file cleanup

Search the rest of the repo for TypeScript helper files outside the migrated integration entrypoints.

If they import Nango runtime types from old model files, move those imports to `nango` and leave model imports in place only for actual model schemas/types.

Do not rewrite unrelated business logic in helper files.

## Keep the migration parity-first

The manual migration should behave like the old CLI migrator:

- preserve script names
- preserve file locations when possible
- preserve function bodies
- preserve `syncType`
- preserve `trackDeletes`
- preserve `nango.lastSyncDate` usage if it already exists

Only do a second modernization pass if the user explicitly asks.

## Validation loop

After the mechanical migration:

- run `nango compile`
- fix straightforward TypeScript/import/schema issues
- run `nango dryrun <script-name> <connection-id> --validate -e dev --no-interactive --auto-confirm`
- for actions, add `--input '{...}'` or `--input '{}'`
- if validation passes, run `nango dryrun <script-name> <connection-id> --save -e dev --no-interactive --auto-confirm`
- run `nango generate:tests && npm test`
- never hand-edit generated `*.test.json`

If a migrated sync/action still needs a true behavioral refactor after this point, stop and treat that as a separate task.

## Useful docs

- Zero YAML migration doc: https://www.nango.dev/docs/implementation-guides/platform/migrations/migrate-to-zero-yaml
- Testing: https://www.nango.dev/docs/implementation-guides/platform/functions/testing
- Functions SDK: https://www.nango.dev/docs/reference/functions
- Checkpoints migration: https://www.nango.dev/docs/implementation-guides/platform/migrations/migrate-to-checkpoints
- Deletion detection: https://www.nango.dev/docs/implementation-guides/use-cases/syncs/deletion-detection
