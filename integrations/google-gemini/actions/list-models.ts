import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageSize: z.number().optional().describe('Maximum number of models to return per page. Example: 10'),
    pageToken: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderModelSchema = z
    .object({
        name: z.string(),
        version: z.string().optional(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        inputTokenLimit: z.number().optional(),
        outputTokenLimit: z.number().optional(),
        supportedGenerationMethods: z.array(z.string()).optional(),
        temperature: z.number().optional(),
        topP: z.number().optional(),
        topK: z.number().optional(),
        maxTemperature: z.number().optional()
    })
    .passthrough();

const ProviderListModelsResponseSchema = z.object({
    models: z.array(ProviderModelSchema).optional(),
    nextPageToken: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderModelSchema),
    next_page_token: z.string().optional()
});

const action = createAction({
    description: 'List available Gemini models with pagination.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://ai.google.dev/api/models#method:-models.list
        const response = await nango.get({
            endpoint: '/v1beta/models',
            params: {
                ...(input.pageSize !== undefined && { pageSize: input.pageSize }),
                ...(input.pageToken !== undefined && { pageToken: input.pageToken })
            },
            retries: 3
        });

        const parsed = ProviderListModelsResponseSchema.parse(response.data);

        return {
            items: parsed.models || [],
            ...(parsed.nextPageToken != null && { next_page_token: parsed.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
