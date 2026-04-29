import { createSync } from 'nango';
import { z } from 'zod';

// GitHub REST API: https://docs.github.com/en/rest/issues/issues#list-repository-issues
const _GitHubIssueSchema = z.object({
    id: z.number(),
    node_id: z.string(),
    url: z.string(),
    repository_url: z.string(),
    labels_url: z.string(),
    comments_url: z.string(),
    events_url: z.string(),
    html_url: z.string(),
    number: z.number(),
    state: z.enum(['open', 'closed']),
    state_reason: z.string().nullable().optional(),
    title: z.string(),
    body: z.string().nullable().optional(),
    user: z
        .object({
            id: z.number(),
            login: z.string(),
            avatar_url: z.string().optional(),
            html_url: z.string().optional()
        })
        .optional(),
    labels: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                color: z.string(),
                description: z.string().nullable().optional()
            })
        )
        .optional(),
    assignee: z
        .object({
            id: z.number(),
            login: z.string()
        })
        .nullable()
        .optional(),
    assignees: z
        .array(
            z.object({
                id: z.number(),
                login: z.string()
            })
        )
        .optional(),
    milestone: z
        .object({
            id: z.number(),
            number: z.number(),
            title: z.string(),
            state: z.string()
        })
        .nullable()
        .optional(),
    locked: z.boolean().optional(),
    comments: z.number().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().nullable().optional(),
    closed_by: z
        .object({
            id: z.number(),
            login: z.string()
        })
        .nullable()
        .optional()
});

const IssueSchema = z.object({
    id: z.string(),
    node_id: z.string(),
    number: z.number(),
    state: z.enum(['open', 'closed']),
    state_reason: z.string().optional(),
    title: z.string(),
    body: z.string().optional(),
    html_url: z.string(),
    repository_url: z.string(),
    user_id: z.number().optional(),
    user_login: z.string().optional(),
    labels: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                color: z.string(),
                description: z.string().optional()
            })
        )
        .optional(),
    assignee_id: z.number().optional(),
    assignee_login: z.string().optional(),
    assignees: z
        .array(
            z.object({
                id: z.number(),
                login: z.string()
            })
        )
        .optional(),
    milestone_id: z.number().optional(),
    milestone_number: z.number().optional(),
    milestone_title: z.string().optional(),
    milestone_state: z.string().optional(),
    comments_count: z.number().optional(),
    locked: z.boolean().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    closed_at: z.string().optional(),
    closed_by_id: z.number().optional(),
    closed_by_login: z.string().optional()
});

const MetadataSchema = z.object({
    repositories: z
        .array(
            z.object({
                owner: z.string(),
                repo: z.string()
            })
        )
        .optional()
});

const InstallationRepositorySchema = z.object({
    name: z.string(),
    owner: z.object({
        login: z.string()
    })
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type ScopedRepository = {
    owner: string;
    repo: string;
};

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

const toOverlappingCheckpoint = (timestamp: string): string => {
    return new Date(new Date(timestamp).getTime() - 1000).toISOString();
};

const getRepositoriesInScope = async (nango: RepositoryScopeNango): Promise<ScopedRepository[]> => {
    const connection = await nango.getConnection();
    const metadataResult = MetadataSchema.safeParse(connection.metadata);
    const metadataRepositories = metadataResult.success ? (metadataResult.data.repositories ?? []) : [];

    if (metadataRepositories.length > 0) {
        return metadataRepositories;
    }

    const repositories: ScopedRepository[] = [];

    // https://docs.github.com/en/rest/apps/apps#list-repositories-accessible-to-the-app-installation
    for await (const page of nango.paginate<unknown>({
        endpoint: '/installation/repositories',
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'per_page',
            limit: 100,
            response_path: 'repositories'
        },
        retries: 3
    })) {
        for (const repository of page) {
            const parsed = InstallationRepositorySchema.safeParse(repository);
            if (!parsed.success) {
                continue;
            }

            repositories.push({
                owner: parsed.data.owner.login,
                repo: parsed.data.name
            });
        }
    }

    return repositories;
};

const sync = createSync({
    description: 'Sync issues for one or more GitHub repositories with incremental updates based on issue activity',
    version: '3.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/issues' }],
    checkpoint: CheckpointSchema,
    metadata: MetadataSchema,
    models: {
        Issue: IssueSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();

        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const repositories = await getRepositoriesInScope(nango);
        if (repositories.length === 0) {
            await nango.log('No repositories configured in metadata, skipping sync');
            return;
        }

        const lastUpdatedAt = checkpoint?.updated_after;
        let latestIssueUpdate: string | undefined;

        for (const repo of repositories) {
            // https://docs.github.com/en/rest/issues/issues#list-repository-issues
            const proxyConfig = {
                endpoint: `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/issues`,
                params: {
                    state: 'all',
                    sort: 'updated',
                    direction: 'asc',
                    ...(lastUpdatedAt ? { since: lastUpdatedAt } : {})
                },
                paginate: {
                    limit_name_in_request: 'per_page',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate<z.infer<typeof _GitHubIssueSchema>>(proxyConfig)) {
                const issues = page
                    .filter((issue) => !('pull_request' in issue))
                    .map((issue) => {
                        const mapped = {
                            id: String(issue.id),
                            node_id: issue.node_id,
                            number: issue.number,
                            state: issue.state,
                            ...(issue.state_reason != null && {
                                state_reason: issue.state_reason
                            }),
                            title: issue.title,
                            ...(issue.body != null && { body: issue.body }),
                            html_url: issue.html_url,
                            repository_url: issue.repository_url,
                            ...(issue.user && {
                                user_id: issue.user.id,
                                user_login: issue.user.login
                            }),
                            ...(issue.labels && {
                                labels: issue.labels.map((label) => ({
                                    id: label.id,
                                    name: label.name,
                                    color: label.color,
                                    ...(label.description != null && {
                                        description: label.description
                                    })
                                }))
                            }),
                            ...(issue.assignee && {
                                assignee_id: issue.assignee.id,
                                assignee_login: issue.assignee.login
                            }),
                            ...(issue.assignees && {
                                assignees: issue.assignees.map((assignee) => ({
                                    id: assignee.id,
                                    login: assignee.login
                                }))
                            }),
                            ...(issue.milestone && {
                                milestone_id: issue.milestone.id,
                                milestone_number: issue.milestone.number,
                                milestone_title: issue.milestone.title,
                                milestone_state: issue.milestone.state
                            }),
                            ...(issue.comments !== undefined && {
                                comments_count: issue.comments
                            }),
                            ...(issue.locked !== undefined && { locked: issue.locked }),
                            created_at: issue.created_at,
                            updated_at: issue.updated_at,
                            ...(issue.closed_at != null && { closed_at: issue.closed_at }),
                            ...(issue.closed_by && {
                                closed_by_id: issue.closed_by.id,
                                closed_by_login: issue.closed_by.login
                            })
                        };
                        return mapped;
                    });

                if (issues.length === 0) {
                    continue;
                }

                await nango.batchSave(issues, 'Issue');

                for (const issue of issues) {
                    latestIssueUpdate = getLaterTimestamp(latestIssueUpdate, issue.updated_at);
                }
            }
        }

        if (latestIssueUpdate) {
            await nango.saveCheckpoint({
                updated_after: toOverlappingCheckpoint(latestIssueUpdate)
            });
        }
    }
});

export default sync;
