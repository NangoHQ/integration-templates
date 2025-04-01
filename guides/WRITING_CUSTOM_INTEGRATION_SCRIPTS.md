## Integration Directory Structure

Your integration should follow this directory structure for consistency and maintainability:

```
nango-integrations/
├── nango.yaml              # Main configuration file
├── models.ts               # Auto-generated models from nango.yaml
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
   - `nango.yaml`: Main configuration file for all integrations
   - `models.ts`: Auto-generated models from nango.yaml
   - `schema.zod.ts`: Generated validation schemas

2. **Integration Level Files**:
   - `types.ts`: Third-party API response types specific to the integration

3. **Actions Directory**:
   - One file per action
   - Named after the action (e.g., `create-user.ts`, `update-user.ts`)
   - Each file exports a default `runAction` function

4. **Syncs Directory**:
   - One file per sync
   - Named after the sync (e.g., `users.ts`, `teams.ts`)
   - Each file exports a default `fetchData` function

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
-   `npx nango generate` -- when adding an integration or updating the nango.yaml this command should be run to update the models.ts file and also the schema auto-generated files
-   `npx nango sync:config.check` -- ensure the nango.yaml is valid and could compile successfully 

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

`nango-integrations/nango.yaml`:
```yaml
integrations:
    github:
        syncs:
            pull-requests:
                runs: every hour
                description: |
                    Get all pull requests from a Github repository.
                sync_type: incremental
                endpoint:
                    method: GET
                    path: /pull-requests
                    group: Pull Requests
                input: GithubMetadata
                output: PullRequest
                auto_start: false
                scopes:
                    - repo
                    - repo:status
        actions:
            create-pull-request:
                description: Create a new pull request
                endpoint:
                    method: POST
                    path: /pull-requests
                    group: Pull Requests
                input: CreatePullRequest
                output: PullRequest
                scopes:
                    - repo
                    - repo:status

models:
    GithubMetadata:
        owner: string
        repo: string
    CreatePullRequest:
        owner: string
        repo: string
        title: string
        head: string
        base: string
        body?: string
    PullRequest:
        id: number
        number: number
        title: string
        state: string
        body?: string
        created_at: string
        updated_at: string
        closed_at?: string
        merged_at?: string
        head:
            ref: string
            sha: string
        base:
            ref: string
            sha: string
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
import type { PullRequest } from '../../models';
import type { GithubPullRequestResponse } from '../types';

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
import type { NangoSync } from '@nangohq/node';
import type { GithubMetadata } from '../../models';
import type { GithubPullRequestResponse } from '../types';
import { toPullRequest } from '../mappers/to-pull-request.js';

export default async function fetchData(
    nango: NangoSync
): Promise<void> {
    // Get metadata containing repository information
    const metadata = await nango.getMetadata<GithubMetadata>();
    
    const proxyConfig = {
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
        await nango.batchSave(mappedPRs);
    }
}
```

`nango-integrations/github/actions/create-pull-request.ts`:
```typescript
import type { NangoAction, PullRequest, CreatePullRequest } from '../../models';
import type { GithubPullRequestResponse } from '../types';
import { toPullRequest } from '../mappers/to-pull-request.js';

export default async function runAction(
    nango: NangoAction,
    input: CreatePullRequest
): Promise<PullRequest> {
    // https://docs.github.com/en/rest/pulls/pulls#create-a-pull-request
    const proxyConfig = {
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
```

This example demonstrates:
1. A well-structured `nango.yaml` with models, sync, and action definitions
2. Proper type definitions for the GitHub API responses
3. A reusable mapper function for data transformation
4. An incremental sync that handles pagination and uses `getMetadata()`
5. An action that creates new pull requests
6. Following all best practices for file organization and code structure

