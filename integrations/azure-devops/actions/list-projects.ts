import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderProjectSchema = z.object({
    id: z.string().describe('Project ID. Example: "6b6e62c7-9a5d-4c6c-8c8b-1234567890ab"'),
    name: z.string().describe('Project name. Example: "nangoapi"'),
    description: z.string().optional().nullable().describe('Project description'),
    url: z.string().optional().describe('Project URL'),
    state: z.string().optional().describe('Project state. Example: "wellFormed"'),
    revision: z.number().optional().describe('Project revision'),
    visibility: z.string().optional().describe('Project visibility. Example: "private"'),
    lastUpdateTime: z.string().optional().describe('Last update time. Example: "2024-01-01T00:00:00Z"')
});

const ProviderResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(ProviderProjectSchema)
});

const OutputSchema = z.object({
    items: z.array(ProviderProjectSchema),
    nextCursor: z.string().optional().describe('Pagination cursor for the next page.')
});

const action = createAction({
    description: 'List Azure DevOps projects in the organization.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-projects',
        group: 'Projects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.project'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/core/projects/list?view=azure-devops-rest-7.2
            endpoint: '/_apis/projects',
            params: {
                'api-version': '7.2-preview.4',
                ...(input.cursor !== undefined && { continuationToken: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.parse(response.data);

        const nextCursor = typeof response.headers?.['x-ms-continuationtoken'] === 'string' ? response.headers['x-ms-continuationtoken'] : undefined;

        return {
            items: parsed.value,
            nextCursor: nextCursor
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
