import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project: z.string().describe('Project name or ID. Example: "nangoapi"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PipelineSchema = z.object({
    id: z.number(),
    name: z.string(),
    folder: z.string().optional(),
    url: z.string().optional(),
    revision: z.number().optional()
});

const ProviderResponseSchema = z.object({
    count: z.number().optional(),
    value: z.array(PipelineSchema)
});

const OutputSchema = z.object({
    items: z.array(PipelineSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List YAML pipeline definitions in a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vso.build'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/pipelines/list?view=azure-devops-rest-7.2
            endpoint: `/${encodeURIComponent(input.project)}/_apis/pipelines`,
            params: {
                'api-version': '7.2-preview.1',
                ...(input.cursor !== undefined && { continuationToken: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new Error('Invalid pipeline list response from Azure DevOps');
        }

        const continuationToken = response.headers?.['x-ms-continuationtoken'];
        const nextCursor = typeof continuationToken === 'string' ? continuationToken : undefined;

        return {
            items: providerResponse.data.value,
            ...(nextCursor !== undefined && { nextCursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
