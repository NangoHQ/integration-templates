import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RepositorySchema = z.object({
    id: z.string().describe('The repository ID'),
    name: z.string().describe('The repository name'),
    project_id: z.string().optional().describe('The project ID'),
    project_name: z.string().optional().describe('The project name'),
    default_branch: z.string().optional().describe('The default branch'),
    remote_url: z.string().optional().describe('The remote URL'),
    web_url: z.string().optional().describe('The web URL'),
    ssh_url: z.string().optional().describe('The SSH URL'),
    size: z.number().optional().describe('The repository size in bytes'),
    is_fork: z.boolean().optional().describe('Whether the repository is a fork')
});

const MetadataSchema = z.object({
    projects: z.array(z.string()).describe('List of project IDs or names to sync repositories from')
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderRepositorySchema = z.object({
    id: z.string(),
    name: z.string(),
    project: ProviderProjectSchema.nullish(),
    defaultBranch: z.string().nullish(),
    remoteUrl: z.string().nullish(),
    webUrl: z.string().nullish(),
    sshUrl: z.string().nullish(),
    size: z.number().nullish(),
    isFork: z.boolean().nullish()
});

const ProviderRepositoriesResponseSchema = z.object({
    value: z.array(ProviderRepositorySchema).optional()
});

const sync = createSync({
    description: 'Sync Git repositories across all projects',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Repository: RepositorySchema
    },
    endpoints: [
        {
            path: '/syncs/repositories',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.projects || metadata.projects.length === 0) {
            throw new Error('metadata.projects is required');
        }

        await nango.trackDeletesStart('Repository');

        for (const project of metadata.projects) {
            let continuationToken: string | undefined;

            do {
                const config: ProxyConfiguration = {
                    // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories/list?view=azure-devops-rest-7.2
                    endpoint: `/${encodeURIComponent(project)}/_apis/git/repositories`,
                    params: {
                        'api-version': '7.2-preview.1',
                        ...(continuationToken && { continuationToken })
                    },
                    retries: 3
                };

                const response = await nango.get(config);

                const parsed = ProviderRepositoriesResponseSchema.parse(response.data);
                const repos = parsed.value ?? [];

                const mapped = repos.map((repo) => ({
                    id: repo.id,
                    name: repo.name,
                    ...(repo.project && {
                        project_id: repo.project.id,
                        project_name: repo.project.name
                    }),
                    ...(repo.defaultBranch && { default_branch: repo.defaultBranch }),
                    ...(repo.remoteUrl && { remote_url: repo.remoteUrl }),
                    ...(repo.webUrl && { web_url: repo.webUrl }),
                    ...(repo.sshUrl && { ssh_url: repo.sshUrl }),
                    ...(repo.size != null && { size: repo.size }),
                    ...(repo.isFork != null && { is_fork: repo.isFork })
                }));

                if (mapped.length > 0) {
                    await nango.batchSave(mapped, 'Repository');
                }

                const rawToken = response.headers['x-ms-continuationtoken'];
                continuationToken = Array.isArray(rawToken) ? rawToken[0] : typeof rawToken === 'string' ? rawToken : undefined;
            } while (continuationToken);
        }

        await nango.trackDeletesEnd('Repository');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
