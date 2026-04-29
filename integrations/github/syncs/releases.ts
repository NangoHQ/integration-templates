import { createSync } from 'nango';
import { z } from 'zod';

type GitHubRelease = {
    id: number;
    node_id: string;
    tag_name: string;
    target_commitish: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    created_at: string;
    published_at: string | null;
    author: {
        login: string;
        id: number;
    };
};

const ReleaseSchema = z.object({
    id: z.string(),
    repo_owner: z.string(),
    repo_name: z.string(),
    release_id: z.number(),
    node_id: z.string(),
    tag_name: z.string(),
    target_commitish: z.string(),
    name: z.string().optional(),
    body: z.string().optional(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    created_at: z.string(),
    published_at: z.string().optional(),
    author_login: z.string(),
    author_id: z.number()
});

type Release = z.infer<typeof ReleaseSchema>;

const MetadataSchema = z.object({
    repos: z
        .array(
            z.object({
                owner: z.string(),
                name: z.string()
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
    repo_index: z.number(),
    page: z.number()
});

type ScopedRepository = {
    owner: string;
    name: string;
};

type RepositoryScopeNango = {
    getConnection(): Promise<{ metadata: unknown }>;
    paginate<T>(config: unknown): AsyncIterable<T[]>;
};

const getRepositoriesInScope = async (nango: RepositoryScopeNango): Promise<ScopedRepository[]> => {
    const connection = await nango.getConnection();
    const metadataResult = MetadataSchema.safeParse(connection.metadata);
    const metadataRepositories = metadataResult.success ? (metadataResult.data.repos ?? []) : [];

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
                name: parsed.data.name
            });
        }
    }

    return repositories;
};

const sync = createSync<
    {
        Release: typeof ReleaseSchema;
    },
    typeof MetadataSchema,
    typeof CheckpointSchema
>({
    description: 'Sync releases for one or more GitHub repositories.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/releases' }],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Release: ReleaseSchema
    },

    exec: async (nango) => {
        const repos = await getRepositoriesInScope(nango);

        if (repos.length === 0) {
            await nango.log('No repositories configured in metadata');
            return;
        }

        const checkpoint = await nango.getCheckpoint();
        const startRepoIndex = checkpoint?.repo_index ?? 0;
        let currentPage = checkpoint?.page ?? 1;

        // Start tracking deletes for full refresh
        // @allowTryCatch - resumed checkpointed full refreshes may already have delete tracking open
        try {
            await nango.trackDeletesStart('Release');
        } catch {
            // Delete tracking already started in a prior partial run.
        }

        for (let repoIndex = startRepoIndex; repoIndex < repos.length; repoIndex++) {
            const repo = repos[repoIndex];
            if (!repo) {
                continue;
            }
            const repoFullName = `${repo.owner}/${repo.name}`;

            await nango.log(`Fetching releases for ${repoFullName}`);

            // https://docs.github.com/en/rest/releases/releases#list-releases
            const proxyConfig: {
                endpoint: string;
                paginate: {
                    type: 'offset';
                    offset_name_in_request: string;
                    offset_start_value: number;
                    offset_calculation_method: 'per-page';
                    limit_name_in_request: string;
                    limit: number;
                    response_path: string;
                };
                retries: number;
            } = {
                endpoint: `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}/releases`,
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'page',
                    offset_start_value: currentPage,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'per_page',
                    limit: 100,
                    response_path: ''
                },
                retries: 3
            };

            for await (const releases of nango.paginate<GitHubRelease>(proxyConfig)) {
                const mappedReleases: Release[] = releases.map((release) => ({
                    id: `${repo.owner}/${repo.name}/${release.id}`,
                    repo_owner: repo.owner,
                    repo_name: repo.name,
                    release_id: release.id,
                    node_id: release.node_id,
                    tag_name: release.tag_name,
                    target_commitish: release.target_commitish,
                    ...(release.name !== null && { name: release.name }),
                    ...(release.body !== null && { body: release.body }),
                    draft: release.draft,
                    prerelease: release.prerelease,
                    created_at: release.created_at,
                    ...(release.published_at !== null && { published_at: release.published_at }),
                    author_login: release.author.login,
                    author_id: release.author.id
                }));

                if (mappedReleases.length > 0) {
                    await nango.batchSave(mappedReleases, 'Release');
                    await nango.log(`Saved ${mappedReleases.length} releases from ${repoFullName}`);
                }

                // Save checkpoint after each page
                currentPage = currentPage + 1;
                await nango.saveCheckpoint({
                    repo_index: repoIndex,
                    page: currentPage
                });
            }

            // Reset page for next repo
            currentPage = 1;
        }

        await nango.trackDeletesEnd('Release');
        await nango.saveCheckpoint({
            repo_index: 0,
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
