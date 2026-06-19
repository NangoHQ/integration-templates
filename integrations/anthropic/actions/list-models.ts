import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Number of items to return per page. Defaults to 20. Ranges from 1 to 1000.')
});

const ProviderModelSchema = z
    .object({
        id: z.string(),
        capabilities: z.object({}).passthrough(),
        created_at: z.string(),
        display_name: z.string(),
        max_input_tokens: z.number(),
        max_tokens: z.number(),
        type: z.literal('model')
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        data: z.array(ProviderModelSchema),
        first_id: z.string().nullable().optional(),
        has_more: z.boolean(),
        last_id: z.string().nullable().optional()
    })
    .passthrough();

const OutputItemSchema = z.object({
    id: z.string(),
    capabilities: z.object({}).passthrough(),
    created_at: z.string(),
    display_name: z.string(),
    max_input_tokens: z.number(),
    max_tokens: z.number(),
    type: z.literal('model')
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List models from Anthropic.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.anthropic.com/en/api/models-list
            endpoint: '/v1/models',
            params: {
                ...(input.cursor !== undefined ? { after_id: input.cursor } : {}),
                ...(input.limit !== undefined ? { limit: String(input.limit) } : {})
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.data,
            ...(providerResponse.has_more && providerResponse.last_id != null ? { next_cursor: providerResponse.last_id } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
