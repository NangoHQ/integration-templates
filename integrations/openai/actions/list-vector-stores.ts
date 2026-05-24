import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    after: z.string().optional().describe('Cursor for pagination. Use the `last_id` from the previous response to get the next page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of vector stores to return. Default: 20, Max: 100.'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order by created_at. Options: asc, desc. Default: desc.')
});

const VectorStoreSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_at: z.number(),
    name: z.string(),
    bytes: z.number().optional(),
    file_counts: z
        .object({
            in_progress: z.number(),
            completed: z.number(),
            failed: z.number(),
            cancelled: z.number(),
            total: z.number()
        })
        .optional(),
    metadata: z.any().nullable().optional(),
    expires_after: z
        .object({
            anchor: z.string(),
            days: z.number()
        })
        .nullable()
        .optional(),
    expires_at: z.number().nullable().optional(),
    last_active_at: z.number().nullable().optional()
});

const ProviderListSchema = z.object({
    object: z.string(),
    data: z.array(VectorStoreSchema),
    first_id: z.string().optional(),
    last_id: z.string().optional(),
    has_more: z.boolean()
});

const OutputItemSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_at: z.number(),
    name: z.string(),
    bytes: z.number().optional(),
    file_counts: z
        .object({
            in_progress: z.number(),
            completed: z.number(),
            failed: z.number(),
            cancelled: z.number(),
            total: z.number()
        })
        .optional(),
    metadata: z.any().optional(),
    expires_after: z
        .object({
            anchor: z.string(),
            days: z.number()
        })
        .optional(),
    expires_at: z.number().optional(),
    last_active_at: z.number().optional()
});

const OutputSchema = z.object({
    data: z.array(OutputItemSchema),
    has_more: z.boolean(),
    first_id: z.string().optional(),
    last_id: z.string().optional()
});

const action = createAction({
    description: 'List vector stores from OpenAI.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-vector-stores'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vector_stores.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { after?: string; limit?: number; order?: string } = {};

        if (input.after !== undefined) {
            params['after'] = input.after;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.order !== undefined) {
            params['order'] = input.order;
        }

        // https://platform.openai.com/docs/api-reference/vector-stores/list
        const response = await nango.get({
            endpoint: '/v1/vector_stores',
            params,
            retries: 3
        });

        const providerData = ProviderListSchema.parse(response.data);

        return {
            data: providerData.data.map((item) => {
                const result: z.infer<typeof OutputItemSchema> = {
                    id: item.id,
                    object: item.object,
                    created_at: item.created_at,
                    name: item.name
                };

                if (item.bytes !== undefined) {
                    result.bytes = item.bytes;
                }
                if (item.file_counts !== undefined) {
                    result.file_counts = item.file_counts;
                }
                if (item.metadata !== null && item.metadata !== undefined) {
                    result.metadata = item.metadata;
                }
                if (item.expires_after !== null && item.expires_after !== undefined) {
                    result.expires_after = item.expires_after;
                }
                if (item.expires_at !== null && item.expires_at !== undefined) {
                    result.expires_at = item.expires_at;
                }
                if (item.last_active_at !== null && item.last_active_at !== undefined) {
                    result.last_active_at = item.last_active_at;
                }

                return result;
            }),
            has_more: providerData.has_more,
            ...(providerData.first_id !== undefined && { first_id: providerData.first_id }),
            ...(providerData.last_id !== undefined && { last_id: providerData.last_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
