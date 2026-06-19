import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    vector_store_id: z.string().describe('The ID of the vector store to list files from. Example: "vs_abc123"'),
    after: z.string().optional().describe('Cursor for pagination. The ID of the file to start after.'),
    limit: z.number().min(1).max(100).optional().describe('Number of files to return (1-100, default 20).'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order by created_at.'),
    filter: z.enum(['in_progress', 'completed', 'failed', 'cancelled']).optional().describe('Filter by file status.')
});

const VectorStoreFileSchema = z.object({
    id: z.string(),
    object: z.string(),
    vector_store_id: z.string(),
    status: z.enum(['in_progress', 'completed', 'failed', 'cancelled']),
    created_at: z.number(),
    usage_bytes: z.number()
});

const OutputSchema = z.object({
    data: z.array(VectorStoreFileSchema),
    has_more: z.boolean(),
    first_id: z.string().optional(),
    last_id: z.string().optional()
});

const action = createAction({
    description: 'List files attached to a vector store',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vector_stores.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.after !== undefined) {
            params['after'] = input.after;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.order !== undefined) {
            params['order'] = input.order;
        }
        if (input.filter !== undefined) {
            params['filter'] = input.filter;
        }

        // https://platform.openai.com/docs/api-reference/vector-stores-files/listFiles
        const response = await nango.get({
            endpoint: `/v1/vector_stores/${encodeURIComponent(input.vector_store_id)}/files`,
            params,
            retries: 3
        });

        const rawData = response.data;

        return {
            data: rawData.data || [],
            has_more: rawData.has_more || false,
            ...(rawData.first_id != null && { first_id: rawData.first_id }),
            ...(rawData.last_id != null && { last_id: rawData.last_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
