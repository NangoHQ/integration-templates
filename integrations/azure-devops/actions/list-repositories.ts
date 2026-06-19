import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project ID or name. Example: "MyProject"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderRepositorySchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    project: z.record(z.string(), z.unknown()).optional(),
    defaultBranch: z.string().optional(),
    size: z.number().optional(),
    remoteUrl: z.string().optional(),
    sshUrl: z.string().optional(),
    webUrl: z.string().optional()
});

const RepositorySchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().optional(),
    project: z.record(z.string(), z.unknown()).optional(),
    defaultBranch: z.string().optional(),
    size: z.number().optional(),
    remoteUrl: z.string().optional(),
    sshUrl: z.string().optional(),
    webUrl: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(RepositorySchema),
    continuationToken: z.string().optional()
});

const action = createAction({
    description: 'List Git repositories in a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/git/repositories`,
            params: {
                'api-version': '7.2-preview.1',
                ...(input.cursor !== undefined && { continuationToken: input.cursor })
            },
            retries: 3
        });

        const data = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const items = data.value.map((item: unknown) => {
            const repo = ProviderRepositorySchema.parse(item);
            return {
                id: repo.id,
                name: repo.name,
                ...(repo.url !== undefined && { url: repo.url }),
                ...(repo.project !== undefined && { project: repo.project }),
                ...(repo.defaultBranch !== undefined && { defaultBranch: repo.defaultBranch }),
                ...(repo.size !== undefined && { size: repo.size }),
                ...(repo.remoteUrl !== undefined && { remoteUrl: repo.remoteUrl }),
                ...(repo.sshUrl !== undefined && { sshUrl: repo.sshUrl }),
                ...(repo.webUrl !== undefined && { webUrl: repo.webUrl })
            };
        });

        const continuationToken = response.headers['x-ms-continuationtoken'];
        const nextCursor = typeof continuationToken === 'string' ? continuationToken : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { continuationToken: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
