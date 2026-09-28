import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const GitHubRepositorySchema = z.object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
    owner: z.object({
        login: z.string(),
        id: z.number(),
        type: z.string()
    }),
    description: z.string().nullable().optional(),
    fork: z.boolean(),
    html_url: z.string(),
    url: z.string(),
    default_branch: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    pushed_at: z.string().nullable().optional(),
    homepage: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    archived: z.boolean(),
    disabled: z.boolean(),
    visibility: z.string().optional()
});

const RepositorySchema = z
    .object({
        id: z.string().describe('The unique numeric identifier of the repository as a stable string'),
        node_id: z.string().describe('The global node ID for the repository'),
        name: z.string().describe('The repository name'),
        full_name: z.string().describe('The full repository name including the owner prefix (e.g., owner/repo)'),
        owner_login: z.string().describe('The login name of the repository owner'),
        owner_id: z.string().describe('The unique numeric identifier of the repository owner as a stable string'),
        owner_type: z.string().describe('The type of the repository owner (e.g., User or Organization)'),
        private: z.boolean().describe('Whether the repository is private'),
        visibility: z.string().optional().describe('The repository visibility level (public, private, or internal)'),
        description: z.string().optional().describe('A short description of the repository'),
        fork: z.boolean().describe('Whether the repository is a fork of another repository'),
        default_branch: z.string().describe('The name of the default branch (e.g., main or master)'),
        html_url: z.string().describe('The URL to view the repository in a browser'),
        url: z.string().describe('The REST API URL for the repository'),
        created_at: z.string().describe('The ISO 8601 timestamp when the repository was created'),
        updated_at: z.string().describe('The ISO 8601 timestamp when the repository was last updated'),
        pushed_at: z.string().optional().describe('The ISO 8601 timestamp of the most recent push to the repository'),
        language: z.string().optional().describe('The primary programming language used in the repository'),
        archived: z.boolean().describe('Whether the repository is archived and read-only'),
        disabled: z.boolean().describe('Whether the repository is disabled')
    })
    .describe('A GitHub repository visible to the authenticated app installation');

const sync = createSync({
    description: 'Sync repositories visible to the authenticated GitHub app installation',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Repository: RepositorySchema
    },
    scopes: [],
    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { page: 1 });

        // For this GitHub App OAuth connection (CUSTOM auth mode), /installation/repositories
        // is the more appropriate endpoint than /user/repos because it returns the exact set
        // of repositories accessible to the app installation using the installation token.
        await nango.trackDeletesStart('Repository');

        const page = checkpoint.page ?? 1;
        let nextPage = page;

        const proxyConfig: ProxyConfiguration = {
            // https://docs.github.com/en/rest/apps/apps?apiVersion=2022-11-28#list-repositories-accessible-to-the-app-installation
            endpoint: '/installation/repositories',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'repositories'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const batchArray = z.array(z.unknown()).parse(batch);

            const records = [];
            for (const item of batchArray) {
                const parsed = GitHubRepositorySchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse repository: ${parsed.error.message}`);
                }

                const repo = parsed.data;
                records.push({
                    id: String(repo.id),
                    node_id: repo.node_id,
                    name: repo.name,
                    full_name: repo.full_name,
                    owner_login: repo.owner.login,
                    owner_id: String(repo.owner.id),
                    owner_type: repo.owner.type,
                    private: repo.private,
                    visibility: repo.visibility,
                    ...(repo.description != null && { description: repo.description }),
                    fork: repo.fork,
                    default_branch: repo.default_branch,
                    html_url: repo.html_url,
                    url: repo.url,
                    created_at: repo.created_at,
                    updated_at: repo.updated_at,
                    ...(repo.pushed_at != null && { pushed_at: repo.pushed_at }),
                    ...(repo.language != null && { language: repo.language }),
                    archived: repo.archived,
                    disabled: repo.disabled
                });
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'Repository');
            }

            nextPage = nextPage + 1;
            await nango.saveCheckpoint({ page: nextPage });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Repository');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
