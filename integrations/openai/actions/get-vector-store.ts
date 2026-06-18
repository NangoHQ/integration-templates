import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    vector_store_id: z.string().describe('The ID of the vector store to retrieve. Example: "vs_abc123"')
});

const FileCountsSchema = z.object({
    in_progress: z.number().optional(),
    completed: z.number().optional(),
    failed: z.number().optional(),
    cancelled: z.number().optional(),
    total: z.number().optional()
});

const ProviderVectorStoreSchema = z.object({
    id: z.string(),
    object: z.string(),
    name: z.string().optional(),
    status: z.string(),
    file_counts: FileCountsSchema.optional(),
    usage_bytes: z.number().optional(),
    created_at: z.number().optional(),
    last_active_at: z.number().optional(),
    expires_at: z.number().nullish(),
    metadata: z.object({}).loose().nullish()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string(),
    file_counts: FileCountsSchema.optional(),
    usage_bytes: z.number().optional(),
    created_at: z.number().optional(),
    last_active_at: z.number().optional(),
    expires_at: z.number().optional(),
    metadata: z.object({}).loose().optional()
});

const action = createAction({
    description: 'Retrieve a single vector store from OpenAI',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vector_stores.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/vector-stores/retrieve
        const response = await nango.get({
            endpoint: `/v1/vector_stores/${encodeURIComponent(input.vector_store_id)}`,
            retries: 3
        });

        const providerData = ProviderVectorStoreSchema.parse(response.data);

        return {
            id: providerData.id,
            ...(providerData.name !== undefined && { name: providerData.name }),
            status: providerData.status,
            ...(providerData.file_counts !== undefined && { file_counts: providerData.file_counts }),
            ...(providerData.usage_bytes !== undefined && { usage_bytes: providerData.usage_bytes }),
            ...(providerData.created_at !== undefined && { created_at: providerData.created_at }),
            ...(providerData.last_active_at !== undefined && { last_active_at: providerData.last_active_at }),
            ...(providerData.expires_at !== undefined && providerData.expires_at !== null && { expires_at: providerData.expires_at }),
            ...(providerData.metadata !== undefined && providerData.metadata !== null && { metadata: providerData.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
