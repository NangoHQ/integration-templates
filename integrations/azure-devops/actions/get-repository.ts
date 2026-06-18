import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project ID or name. Example: "nangoapi"'),
    repositoryId: z.string().describe('Repository ID or name. Example: "my-repo"')
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional().nullable(),
    url: z.string().optional(),
    state: z.string().optional(),
    revision: z.number().optional(),
    visibility: z.string().optional(),
    lastUpdateTime: z.string().optional().nullable()
});

const ProviderRepositorySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    project: ProviderProjectSchema.optional().nullable(),
    defaultBranch: z.string().optional().nullable(),
    remoteUrl: z.string().optional().nullable(),
    sshUrl: z.string().optional().nullable(),
    webUrl: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    url: z.string().optional(),
    project: ProviderProjectSchema.optional(),
    defaultBranch: z.string().optional(),
    remoteUrl: z.string().optional(),
    sshUrl: z.string().optional(),
    webUrl: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single Git repository by ID or name.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-repository',
        group: 'Git'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.code'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories/get?view=azure-devops-rest-7.2
        const response = await nango.get({
            endpoint: `/${encodeURIComponent(input.project)}/_apis/git/repositories/${encodeURIComponent(input.repositoryId)}`,
            params: {
                'api-version': '7.2-preview.1'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Repository not found',
                project: input.project,
                repositoryId: input.repositoryId
            });
        }

        const providerRepo = ProviderRepositorySchema.parse(response.data);

        return {
            id: providerRepo.id,
            ...(providerRepo.name !== undefined && { name: providerRepo.name }),
            ...(providerRepo.url !== undefined && { url: providerRepo.url }),
            ...(providerRepo.project != null && { project: providerRepo.project }),
            ...(providerRepo.defaultBranch != null && { defaultBranch: providerRepo.defaultBranch }),
            ...(providerRepo.remoteUrl != null && { remoteUrl: providerRepo.remoteUrl }),
            ...(providerRepo.sshUrl != null && { sshUrl: providerRepo.sshUrl }),
            ...(providerRepo.webUrl != null && { webUrl: providerRepo.webUrl })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
