import { createSync } from 'nango';
import { z } from 'zod';

// GitHub API uses snake_case
const GitHubCommitSchema = z.object({
    sha: z.string(),
    node_id: z.string().optional(),
    url: z.string().optional(),
    html_url: z.string().optional(),
    commit: z.object({
        url: z.string().optional(),
        author: z
            .object({
                name: z.string(),
                email: z.string(),
                date: z.string()
            })
            .nullable()
            .optional(),
        committer: z
            .object({
                name: z.string(),
                email: z.string(),
                date: z.string()
            })
            .nullable()
            .optional(),
        message: z.string(),
        comment_count: z.number().optional(),
        tree: z
            .object({
                sha: z.string(),
                url: z.string().optional()
            })
            .optional(),
        verification: z
            .object({
                verified: z.boolean(),
                reason: z.string(),
                signature: z.string().nullable().optional(),
                payload: z.string().nullable().optional(),
                verified_at: z.string().nullable().optional()
            })
            .optional()
    }),
    author: z
        .object({
            login: z.string(),
            id: z.number(),
            node_id: z.string(),
            avatar_url: z.string(),
            url: z.string(),
            html_url: z.string()
        })
        .nullable()
        .optional(),
    committer: z
        .object({
            login: z.string(),
            id: z.number(),
            node_id: z.string(),
            avatar_url: z.string(),
            url: z.string(),
            html_url: z.string()
        })
        .nullable()
        .optional(),
    parents: z
        .array(
            z.object({
                sha: z.string(),
                url: z.string().optional(),
                html_url: z.string().optional()
            })
        )
        .optional()
});

const CommitSchema = z.object({
    id: z.string(),
    sha: z.string(),
    message: z.string(),
    author_name: z.string().optional(),
    author_email: z.string().optional(),
    author_date: z.string().optional(),
    author_login: z.string().optional(),
    committer_name: z.string().optional(),
    committer_email: z.string().optional(),
    committer_date: z.string().optional(),
    committer_login: z.string().optional(),
    url: z.string().optional(),
    html_url: z.string().optional(),
    repository_owner: z.string(),
    repository_name: z.string(),
    branch: z.string(),
    parent_shas: z.array(z.string()).optional(),
    verified: z.boolean().optional(),
    verification_reason: z.string().optional()
});

const CheckpointSchema = z.object({
    since: z.string()
});

const RepositoryMetadataSchema = z.object({
    repositories: z
        .array(
            z.object({
                owner: z.string(),
                name: z.string(),
                branches: z.array(z.string())
            })
        )
        .optional()
});

const InstallationRepositorySchema = z.object({
    name: z.string(),
    default_branch: z.string(),
    owner: z.object({
        login: z.string()
    })
});

type GitHubCommit = z.infer<typeof GitHubCommitSchema>;
type Checkpoint = z.infer<typeof CheckpointSchema>;

type ScopedRepository = {
    owner: string;
    name: string;
    branches: string[];
};

type RepositoryScopeNango = {
    getConnection(): Promise<{ metadata: unknown }>;
    paginate<T>(config: unknown): AsyncIterable<T[]>;
};

const getCommitTimestamp = (commit: GitHubCommit): string | undefined => {
    return commit.commit.committer?.date ?? commit.commit.author?.date ?? undefined;
};

const getLaterTimestamp = (current: string | undefined, candidate: string | undefined): string | undefined => {
    if (!candidate) {
        return current;
    }

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
    const metadataResult = RepositoryMetadataSchema.safeParse(connection.metadata);
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
                name: parsed.data.name,
                branches: [parsed.data.default_branch]
            });
        }
    }

    return repositories;
};

const sync = createSync<
    {
        Commit: typeof CommitSchema;
    },
    undefined,
    typeof CheckpointSchema
>({
    description: 'Sync commits for repositories and branches in scope',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Commit: CommitSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/commits'
        }
    ],

    exec: async (nango) => {
        const repositories = await getRepositoriesInScope(nango);

        if (repositories.length === 0) {
            return;
        }

        const checkpoint = await nango.getCheckpoint();

        const since = checkpoint?.since;
        let latestCommitTimestamp: string | undefined;

        for (const repo of repositories) {
            if (!repo || !repo.branches || repo.branches.length === 0) {
                continue;
            }

            for (const branch of repo.branches) {
                // https://docs.github.com/en/rest/commits/commits#list-commits
                for await (const rawData of nango.paginate<unknown>({
                    endpoint: `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/commits`,
                    params: {
                        sha: branch,
                        ...(since ? { since } : {})
                    },
                    paginate: {
                        limit_name_in_request: 'per_page',
                        limit: 100
                    },
                    retries: 3
                })) {
                    const parsedCommits: GitHubCommit[] = [];
                    for (const item of rawData) {
                        const parsed = GitHubCommitSchema.safeParse(item);
                        if (parsed.success) {
                            parsedCommits.push(parsed.data);
                        }
                    }

                    if (parsedCommits.length === 0) {
                        continue;
                    }

                    const commits = parsedCommits.map((commit) => {
                        latestCommitTimestamp = getLaterTimestamp(latestCommitTimestamp, getCommitTimestamp(commit));

                        return {
                            id: `${repo.owner}/${repo.name}/${branch}/${commit.sha}`,
                            sha: commit.sha,
                            message: commit.commit.message,
                            author_name: commit.commit.author?.name ?? undefined,
                            author_email: commit.commit.author?.email ?? undefined,
                            author_date: commit.commit.author?.date ?? undefined,
                            author_login: commit.author?.login ?? undefined,
                            committer_name: commit.commit.committer?.name ?? undefined,
                            committer_email: commit.commit.committer?.email ?? undefined,
                            committer_date: commit.commit.committer?.date ?? undefined,
                            committer_login: commit.committer?.login ?? undefined,
                            url: commit.url ?? undefined,
                            html_url: commit.html_url ?? undefined,
                            repository_owner: repo.owner,
                            repository_name: repo.name,
                            branch: branch,
                            parent_shas: commit.parents?.map((p) => p.sha) ?? [],
                            verified: commit.commit.verification?.verified ?? undefined,
                            verification_reason: commit.commit.verification?.reason ?? undefined
                        };
                    });

                    if (commits.length > 0) {
                        await nango.batchSave(commits, 'Commit');
                    }
                }
            }
        }

        if (latestCommitTimestamp) {
            const nextCheckpoint: Checkpoint = {
                since: toOverlappingCheckpoint(latestCommitTimestamp)
            };

            await nango.saveCheckpoint(nextCheckpoint);
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
