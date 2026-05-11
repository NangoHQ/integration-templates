import { createSync } from 'nango';
import { z } from 'zod';

// https://docs.github.com/en/rest/pulls/pulls#list-pull-requests
const GitHubPullRequestSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    number: z.number(),
    state: z.string(),
    locked: z.boolean(),
    title: z.string(),
    body: z.string().nullable(),
    user: z
        .object({
            login: z.string(),
            id: z.number(),
            avatar_url: z.string().optional(),
            html_url: z.string().optional()
        })
        .nullable(),
    labels: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            color: z.string(),
            description: z.string().nullable()
        })
    ),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable(),
    merged_at: z.string().nullable(),
    merge_commit_sha: z.string().nullable(),
    assignees: z.array(
        z.object({
            login: z.string(),
            id: z.number(),
            avatar_url: z.string().optional(),
            html_url: z.string().optional()
        })
    ),
    requested_reviewers: z.array(
        z.object({
            login: z.string(),
            id: z.number(),
            avatar_url: z.string().optional(),
            html_url: z.string().optional()
        })
    ),
    head: z.object({
        ref: z.string(),
        sha: z.string(),
        label: z.string(),
        repo: z
            .object({
                id: z.number(),
                name: z.string(),
                full_name: z.string()
            })
            .nullable()
    }),
    base: z.object({
        ref: z.string(),
        sha: z.string(),
        label: z.string(),
        repo: z
            .object({
                id: z.number(),
                name: z.string(),
                full_name: z.string()
            })
            .nullable()
    }),
    draft: z.boolean().optional(),
    html_url: z.string(),
    url: z.string()
});

const PullRequestSchema = z.object({
    id: z.string().describe('The unique identifier of the pull request (e.g., "12345")'),
    number: z.number().describe('The pull request number within the repository'),
    state: z.string().describe('The state of the pull request: "open", "closed"'),
    title: z.string().describe('The title of the pull request'),
    body: z.string().optional().describe('The description/body of the pull request'),
    user_login: z.string().optional().describe('The login/username of the PR author'),
    user_id: z.number().optional().describe('The ID of the PR author'),
    created_at: z.string().describe('The ISO 8601 timestamp when the PR was created'),
    updated_at: z.string().describe('The ISO 8601 timestamp when the PR was last updated'),
    closed_at: z.string().optional().describe('The ISO 8601 timestamp when the PR was closed'),
    merged_at: z.string().optional().describe('The ISO 8601 timestamp when the PR was merged'),
    merge_commit_sha: z.string().optional().describe('The SHA of the merge commit'),
    head_ref: z.string().describe('The name of the head branch'),
    head_sha: z.string().describe('The SHA of the head branch commit'),
    base_ref: z.string().describe('The name of the base branch'),
    base_sha: z.string().describe('The SHA of the base branch commit'),
    draft: z.boolean().describe('Whether the pull request is a draft'),
    html_url: z.string().describe('The URL to view the pull request on GitHub'),
    repo_full_name: z.string().describe('The full name of the repository (e.g., "owner/repo")'),
    labels: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                color: z.string(),
                description: z.string().optional()
            })
        )
        .describe('Labels attached to the pull request'),
    assignees: z
        .array(
            z.object({
                login: z.string(),
                id: z.number()
            })
        )
        .describe('Users assigned to the pull request'),
    requested_reviewers: z
        .array(
            z.object({
                login: z.string(),
                id: z.number()
            })
        )
        .describe('Users requested to review the pull request')
});

// Define schemas without type assertions - let TypeScript infer the types
// The constraints are satisfied by using z.string() and z.string().array() directly
const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MetadataSchema = z.object({
    repos: z.string().array()
});

const InstallationRepositorySchema = z.object({
    name: z.string(),
    owner: z.object({
        login: z.string()
    })
});

type RepositoryScopeNango = {
    getConnection(): Promise<{ metadata: unknown }>;
    paginate<T>(config: unknown): AsyncIterable<T[]>;
};

const getLaterTimestamp = (current: string | undefined, candidate: string): string => {
    if (!current) {
        return candidate;
    }

    return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
};

const isNewerThanCheckpoint = (timestamp: string, checkpoint: string | undefined): boolean => {
    if (!checkpoint) {
        return true;
    }

    return new Date(timestamp).getTime() > new Date(checkpoint).getTime();
};

const toOverlappingCheckpoint = (timestamp: string): string => {
    return new Date(new Date(timestamp).getTime() - 1000).toISOString();
};

const getRepositoriesInScope = async (nango: RepositoryScopeNango): Promise<string[]> => {
    const connection = await nango.getConnection();
    const connectionMetadataResult = MetadataSchema.safeParse(connection.metadata);
    if (connectionMetadataResult.success && connectionMetadataResult.data.repos.length > 0) {
        return connectionMetadataResult.data.repos;
    }

    const repos: string[] = [];

    // https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user
    for await (const page of nango.paginate<unknown>({
        endpoint: '/user/repos',
        params: { per_page: 100 },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'per_page',
            limit: 100
        },
        retries: 3
    })) {
        for (const repository of page) {
            const parsed = InstallationRepositorySchema.safeParse(repository);
            if (!parsed.success) {
                continue;
            }

            repos.push(`${parsed.data.owner.login}/${parsed.data.name}`);
        }
    }

    return repos;
};

const sync = createSync({
    description: 'Sync pull requests for one or more GitHub repositories, including status, branches, and merge state.',
    version: '1.0.1',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        PullRequest: PullRequestSchema
    },
    scopes: ['repo'],
    endpoints: [{ path: '/syncs/pull-requests', method: 'POST' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;
        let latestPullRequestUpdate: string | undefined;
        const repos = await getRepositoriesInScope(nango);

        if (repos.length === 0) {
            await nango.log('No repositories configured in metadata, connection metadata, or installation scope, skipping sync');
            return;
        }

        for (const repoFullName of repos) {
            const [owner, repo] = repoFullName.split('/');
            if (!owner || !repo) {
                throw new nango.ActionError({
                    message: `Invalid repository format: ${repoFullName}. Expected format: owner/repo`
                });
            }

            // https://docs.github.com/en/rest/pulls/pulls#list-pull-requests
            const params: Record<string, string | number> = {
                state: 'all',
                sort: 'updated',
                direction: 'desc'
            };

            const proxyConfig = {
                endpoint: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
                params,
                paginate: {
                    limit: 100,
                    limit_name_in_request: 'per_page'
                },
                retries: 3
            };

            let reachedCheckpointWindow = false;

            for await (const page of nango.paginate<unknown>(proxyConfig)) {
                const pullRequests: Array<z.infer<typeof PullRequestSchema>> = [];

                for (const pr of page) {
                    const validated = GitHubPullRequestSchema.parse(pr);

                    if (!isNewerThanCheckpoint(validated.updated_at, updatedAfter)) {
                        reachedCheckpointWindow = true;
                        break;
                    }

                    latestPullRequestUpdate = getLaterTimestamp(latestPullRequestUpdate, validated.updated_at);
                    pullRequests.push({
                        id: String(validated.id),
                        number: validated.number,
                        state: validated.state,
                        title: validated.title,
                        ...(validated.body != null && { body: validated.body }),
                        ...(validated.user != null && {
                            user_login: validated.user.login,
                            user_id: validated.user.id
                        }),
                        created_at: validated.created_at,
                        updated_at: validated.updated_at,
                        ...(validated.closed_at != null && { closed_at: validated.closed_at }),
                        ...(validated.merged_at != null && { merged_at: validated.merged_at }),
                        ...(validated.merge_commit_sha != null && { merge_commit_sha: validated.merge_commit_sha }),
                        head_ref: validated.head.ref,
                        head_sha: validated.head.sha,
                        base_ref: validated.base.ref,
                        base_sha: validated.base.sha,
                        draft: validated.draft ?? false,
                        html_url: validated.html_url,
                        repo_full_name: repoFullName,
                        labels: validated.labels.map((label) => ({
                            id: label.id,
                            name: label.name,
                            color: label.color,
                            ...(label.description != null && { description: label.description })
                        })),
                        assignees: validated.assignees.map((assignee) => ({
                            login: assignee.login,
                            id: assignee.id
                        })),
                        requested_reviewers: validated.requested_reviewers.map((reviewer) => ({
                            login: reviewer.login,
                            id: reviewer.id
                        }))
                    });
                }

                if (pullRequests.length > 0) {
                    await nango.batchSave(pullRequests, 'PullRequest');
                }

                if (reachedCheckpointWindow) {
                    break;
                }
            }
        }

        if (latestPullRequestUpdate) {
            await nango.saveCheckpoint({
                updated_after: toOverlappingCheckpoint(latestPullRequestUpdate)
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
