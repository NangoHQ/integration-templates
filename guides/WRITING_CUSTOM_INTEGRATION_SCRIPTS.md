## Integration Directory Structure

Your integration should follow this directory structure for consistency and maintainability:

```
nango-integrations/
├── index.ts                # Main entry point that imports all scripts
├── models.ts               # Zod models for input/output validation
├── schema.zod.ts          # Generated zod schemas for validation
└── ${integrationName}/
    ├── types.ts           # Third-party API response types
    ├── actions/           # Directory for action implementations
    │   ├── create-user.ts
    │   ├── update-user.ts
    │   └── delete-user.ts
    ├── syncs/             # Directory for sync implementations
    │   ├── users.ts
    │   └── teams.ts
    └── mappers/          # Shared data transformation functions
        ├── to-user.ts
        └── to-team.ts
```

### Key Components

1. **Root Level Files**:
   - `index.ts`: Main entry point that imports all sync and action scripts
   - `models.ts`: Zod models for input/output validation and type safety
   - `schema.zod.ts`: Generated validation schemas

2. **Integration Level Files**:
   - `types.ts`: Third-party API response types specific to the integration

3. **Actions Directory**:
   - One file per action
   - Named after the action (e.g., `create-user.ts`, `update-user.ts`)
   - Each file exports a default action created with `createAction()`

4. **Syncs Directory**:
   - One file per sync
   - Named after the sync (e.g., `users.ts`, `teams.ts`)
   - Each file exports a default sync created with `createSync()`

5. **Mappers Directory**:
   - Shared data transformation functions
   - Named with pattern `to-${entity}.ts`
   - Used by both actions and syncs

### Running Tests

Test scripts directly against the third-party API using dryrun:

```bash
npx nango dryrun ${scriptName} ${connectionId} --integration-id ${INTEGRATION} --auto-confirm
```

Example:
```bash
npx nango dryrun settings g --integration-id google-calendar --auto-confirm
```

### Dryrun Options

- `--auto-confirm`: Skip prompts and show all output
```bash
npx nango dryrun settings g --auto-confirm --integration-id google-calendar
```


## Script Helpers

-   `npx nango dryrun ${scriptName} ${connectionId} -e ${Optional environment}` --integration-id ${INTEGRATION}
-   `npx nango compile` -- ensure all integrations compile
-   `npx nango generate` -- when adding an integration or updating models this command should be run to update the schema auto-generated files
-   `npx nango sync:config.check` -- ensure the integration configuration is valid and could compile successfully 

## Deploying Integrations

Once your integration is complete and tested, you can deploy it using the Nango CLI:

```bash
npx nango deploy <environment>
```

### Deployment Options

- `--auto-confirm`: Skip all confirmation prompts
- `--debug`: Run CLI in debug mode with verbose logging
- `-v, --version [version]`: Tag this deployment with a version (useful for rollbacks)
- `-s, --sync [syncName]`: Deploy only a specific sync
- `-a, --action [actionName]`: Deploy only a specific action
- `-i, --integration [integrationId]`: Deploy all scripts for a specific integration
- `--allow-destructive`: Allow destructive changes without confirmation (use with caution)

### Examples

Deploy everything to production:
```bash
npx nango deploy production
```

Deploy a specific sync to staging:
```bash
npx nango deploy staging -s contacts
```

Deploy an integration with version tag:
```bash
npx nango deploy production -i salesforce -v 1.0.0
```

Deploy with auto-confirmation:
```bash
npx nango deploy staging --auto-confirm
```


## Full Example of a sync and action in nango

Here's a complete example of a GitHub integration that syncs pull requests and has an action to create a pull request:

`nango-integrations/github/index.ts`:
```typescript
// -- Integration: github
import './github/syncs/pull-requests.js';
import './github/actions/create-pull-request.js';
```

`nango-integrations/github/models.ts`:
```typescript
import { z } from 'zod';

export const GithubMetadata = z.object({
    owner: z.string(),
    repo: z.string()
});

export type GithubMetadata = z.infer<typeof GithubMetadata>;

export const CreatePullRequest = z.object({
    owner: z.string(),
    repo: z.string(),
    title: z.string(),
    head: z.string(),
    base: z.string(),
    body: z.string().optional()
});

export type CreatePullRequest = z.infer<typeof CreatePullRequest>;

export const PullRequest = z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    state: z.string(),
    body: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().optional(),
    merged_at: z.string().optional(),
    head: z.object({
        ref: z.string(),
        sha: z.string()
    }),
    base: z.object({
        ref: z.string(),
        sha: z.string()
    })
});

export type PullRequest = z.infer<typeof PullRequest>;
```

`nango-integrations/github/types.ts`:
```typescript
export interface GithubPullRequestResponse {
    id: number;
    number: number;
    title: string;
    state: string;
    body: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    head: {
        ref: string;
        sha: string;
    };
    base: {
        ref: string;
        sha: string;
    };
}
```

`nango-integrations/github/mappers/to-pull-request.ts`:
```typescript
import type { PullRequest } from '../models.js';
import type { GithubPullRequestResponse } from '../types.js';

export function toPullRequest(response: GithubPullRequestResponse): PullRequest {
    return {
        id: response.id,
        number: response.number,
        title: response.title,
        state: response.state,
        body: response.body || undefined,
        created_at: response.created_at,
        updated_at: response.updated_at,
        closed_at: response.closed_at || undefined,
        merged_at: response.merged_at || undefined,
        head: {
            ref: response.head.ref,
            sha: response.head.sha
        },
        base: {
            ref: response.base.ref,
            sha: response.base.sha
        }
    };
}
```

`nango-integrations/github/syncs/pull-requests.ts`:
```typescript
import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import type { GithubMetadata, PullRequest } from '../models.js';
import type { GithubPullRequestResponse } from '../types.js';
import { toPullRequest } from '../mappers/to-pull-request.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Get all pull requests from a Github repository.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/pull-requests',
            group: 'Pull Requests'
        }
    ],

    scopes: ['repo', 'repo:status'],

    models: {
        PullRequest: PullRequest
    },

    metadata: GithubMetadata,

    exec: async (nango) => {
        // Get metadata containing repository information
        const metadata = await nango.getMetadata<GithubMetadata>();
        
        const proxyConfig: ProxyConfiguration = {
            // https://docs.github.com/en/rest/pulls/pulls#list-pull-requests
            endpoint: `/repos/${metadata.owner}/${metadata.repo}/pulls`,
            params: {
                state: 'all',
                sort: 'updated',
                direction: 'desc'
            },
            retries: 10
        };

        // Use paginate to handle GitHub's pagination
        for await (const pullRequests of nango.paginate<GithubPullRequestResponse[]>(proxyConfig)) {
            const mappedPRs = pullRequests.map(toPullRequest);
            await nango.batchSave(mappedPRs, 'PullRequest');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
```

`nango-integrations/github/actions/create-pull-request.ts`:
```typescript
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import type { PullRequest, CreatePullRequest } from '../models.js';
import type { GithubPullRequestResponse } from '../types.js';
import { toPullRequest } from '../mappers/to-pull-request.js';

const action = createAction({
    description: 'Create a new pull request',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/pull-requests',
        group: 'Pull Requests'
    },

    input: CreatePullRequest,
    output: PullRequest,

    scopes: ['repo', 'repo:status'],

    exec: async (nango, input: CreatePullRequest): Promise<PullRequest> => {
        // https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request
        const proxyConfig: ProxyConfiguration = {
            endpoint: `/repos/${input.owner}/${input.repo}/pulls`,
            data: {
                title: input.title,
                head: input.head,
                base: input.base,
                body: input.body
            },
            retries: 3
        };

        const { data } = await nango.post<GithubPullRequestResponse>(proxyConfig);
        return toPullRequest(data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
```

This example demonstrates:
1. A well-structured integration with inline configuration using `createSync()` and `createAction()`
2. Proper Zod model definitions for input/output validation
3. Type definitions for the GitHub API responses
4. A reusable mapper function for data transformation
5. An incremental sync that handles pagination and uses `getMetadata()`
6. An action that creates new pull requests
7. Following all best practices for file organization and code structure