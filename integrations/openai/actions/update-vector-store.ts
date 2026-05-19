import { z } from 'zod';
import { createAction } from 'nango';

const ExpiresAfterSchema = z.object({
    anchor: z.literal('last_active_at'),
    days: z.number().int().min(1)
});

const InputSchema = z.object({
    vector_store_id: z.string(),
    name: z.string().optional(),
    expires_after: z.any().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const ProviderFileCountsSchema = z.object({
    total: z.number().int(),
    in_progress: z.number().int(),
    completed: z.number().int(),
    failed: z.number().int(),
    cancelled: z.number().int()
});

const ProviderVectorStoreSchema = z.object({
    id: z.string(),
    object: z.literal('vector_store'),
    created_at: z.number().int(),
    name: z.string(),
    bytes: z.number().int().optional(),
    file_counts: ProviderFileCountsSchema,
    expires_after: z.any().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_at: z.number().int(),
    name: z.string(),
    bytes: z.number().int().optional(),
    file_counts: ProviderFileCountsSchema,
    expires_after: z.any().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

interface ExpiresAfter {
    anchor: 'last_active_at';
    days: number;
}

interface UpdateVectorStoreRequest {
    name?: string;
    expires_after?: ExpiresAfter | null;
    metadata?: Record<string, unknown>;
}

const action = createAction({
    description: 'Update a vector store in OpenAI',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-vector-store',
        group: 'Vector Stores'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vector_stores.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestData: UpdateVectorStoreRequest = {};

        if (input.name !== undefined) {
            requestData.name = input.name;
        }

        if (input.expires_after !== undefined) {
            if (input.expires_after === null) {
                requestData.expires_after = null;
            } else {
                const parsed = ExpiresAfterSchema.safeParse(input.expires_after);
                if (parsed.success) {
                    requestData.expires_after = parsed.data;
                }
            }
        }

        if (input.metadata !== undefined) {
            requestData.metadata = input.metadata;
        }

        // https://platform.openai.com/docs/api-reference/vector-stores/modify
        const response = await nango.post({
            endpoint: `/v1/vector_stores/${encodeURIComponent(input.vector_store_id)}`,
            data: requestData,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Vector store not found',
                vector_store_id: input.vector_store_id
            });
        }

        const providerVectorStore = ProviderVectorStoreSchema.parse(response.data);

        return {
            id: providerVectorStore.id,
            object: providerVectorStore.object,
            created_at: providerVectorStore.created_at,
            name: providerVectorStore.name,
            bytes: providerVectorStore.bytes,
            file_counts: providerVectorStore.file_counts,
            ...(providerVectorStore.expires_after !== undefined && { expires_after: providerVectorStore.expires_after }),
            ...(providerVectorStore.metadata !== undefined && { metadata: providerVectorStore.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
