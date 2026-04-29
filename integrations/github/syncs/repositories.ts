import { createSync } from 'nango';
import { z } from 'zod';

// https://docs.github.com/en/rest/repos/repos#list-repositories-for-the-authenticated-user
const ProviderRepositorySchema = z.object({
    id: z.number().int(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    owner: z.object({
        login: z.string(),
        id: z.number().int(),
        node_id: z.string(),
        avatar_url: z.string(),
        gravatar_id: z.string().nullable(),
        url: z.string(),
        html_url: z.string(),
        type: z.string()
    }),
    private: z.boolean(),
    html_url: z.string(),
    description: z.string().nullable(),
    fork: z.boolean(),
    url: z.string(),
    created_at: z.string().nullable(),
    updated_at: z.string().nullable(),
    pushed_at: z.string().nullable(),
    homepage: z.string().nullable(),
    size: z.number().int(),
    stargazers_count: z.number().int(),
    watchers_count: z.number().int(),
    language: z.string().nullable(),
    forks_count: z.number().int(),
    open_issues_count: z.number().int(),
    default_branch: z.string(),
    visibility: z.string().optional(),
    archived: z.boolean().optional(),
    disabled: z.boolean().optional()
});

const RepositorySchema = z.object({
    id: z.string(),
    name: z.string(),
    full_name: z.string(),
    owner_login: z.string(),
    owner_id: z.string(),
    owner_type: z.string(),
    private: z.boolean(),
    visibility: z.string().optional(),
    html_url: z.string(),
    description: z.string().optional(),
    fork: z.boolean(),
    default_branch: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    pushed_at: z.string().optional(),
    homepage: z.string().optional(),
    language: z.string().optional(),
    size: z.number().int(),
    forks_count: z.number().int(),
    stargazers_count: z.number().int(),
    open_issues_count: z.number().int(),
    archived: z.boolean().optional(),
    disabled: z.boolean().optional()
});

const sync = createSync({
    description: 'Sync repositories visible to the authenticated GitHub user or installation.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/repositories',
            method: 'POST'
        }
    ],
    models: {
        Repository: RepositorySchema
    },

    exec: async (nango) => {
        // Blocker: GitHub's list repositories endpoint does not support modified_since
        // filtering. We must fetch all repositories and use delete tracking.
        await nango.trackDeletesStart('Repository');

        // https://docs.github.com/en/rest/apps/apps#list-repositories-accessible-to-the-app-installation
        for await (const pageResults of nango.paginate({
            endpoint: '/installation/repositories',
            params: {
                sort: 'updated',
                direction: 'desc',
                per_page: '10'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 10,
                response_path: 'repositories'
            },
            retries: 3
        })) {
            const repos = pageResults.map((repo) => {
                const parsed = ProviderRepositorySchema.safeParse(repo);
                if (!parsed.success) {
                    throw new Error(`Failed to parse repository: ${parsed.error.message}`);
                }
                const data = parsed.data;
                return {
                    id: data.id.toString(),
                    name: data.name,
                    full_name: data.full_name,
                    owner_login: data.owner.login,
                    owner_id: data.owner.id.toString(),
                    owner_type: data.owner.type,
                    private: data.private,
                    visibility: data.visibility,
                    html_url: data.html_url,
                    description: data.description ?? undefined,
                    fork: data.fork,
                    default_branch: data.default_branch,
                    created_at: data.created_at ?? undefined,
                    updated_at: data.updated_at ?? undefined,
                    pushed_at: data.pushed_at ?? undefined,
                    homepage: data.homepage ?? undefined,
                    language: data.language ?? undefined,
                    size: data.size,
                    forks_count: data.forks_count,
                    stargazers_count: data.stargazers_count,
                    open_issues_count: data.open_issues_count,
                    archived: data.archived,
                    disabled: data.disabled
                };
            });

            if (repos.length > 0) {
                await nango.batchSave(repos, 'Repository');
            }
        }

        await nango.trackDeletesEnd('Repository');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
