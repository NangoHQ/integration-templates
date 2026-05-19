import { createSync } from 'nango';
import { z } from 'zod';

// Provider API docs: https://platform.openai.com/docs/api-reference/vector-stores/list

const VectorStoreSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_at: z.number(),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    usage_bytes: z.number(),
    file_counts: z.object({
        in_progress: z.number(),
        completed: z.number(),
        failed: z.number(),
        cancelled: z.number(),
        total: z.number()
    }),
    status: z.enum(['in_progress', 'completed', 'cancelled', 'failed']),
    expires_after: z
        .object({
            anchor: z.string(),
            days: z.number()
        })
        .nullable()
        .optional(),
    expires_at: z.number().nullable().optional(),
    last_active_at: z.number().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const CheckpointSchema = z.object({
    after: z.string()
});

const ListVectorStoresResponseSchema = z.object({
    object: z.string().optional(),
    data: z.array(VectorStoreSchema),
    first_id: z.string().nullable().optional(),
    last_id: z.string().nullable().optional(),
    has_more: z.boolean()
});

const sync = createSync<{ VectorStore: typeof VectorStoreSchema }, undefined, typeof CheckpointSchema>({
    description: 'Sync vector stores from OpenAI',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/vector-stores',
            method: 'POST'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        VectorStore: VectorStoreSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // The vector store list is a full refresh sync, but the cursor lets us resume
        // pagination safely if a long run is interrupted before completion.
        await nango.trackDeletesStart('VectorStore');

        let after = checkpoint?.after;
        let hasMore = true;

        while (hasMore) {
            // https://platform.openai.com/docs/api-reference/vector-stores/list
            const response = await nango.get({
                endpoint: '/v1/vector_stores',
                params: {
                    order: 'asc',
                    limit: 100,
                    ...(after && { after })
                },
                retries: 3
            });

            const parsedResponse = ListVectorStoresResponseSchema.safeParse(response.data);

            if (!parsedResponse.success) {
                throw new Error(`Failed to parse vector stores page: ${parsedResponse.error.message}`);
            }

            const vectorStores = parsedResponse.data.data;
            const lastId = parsedResponse.data.last_id ?? vectorStores[vectorStores.length - 1]?.id;

            if (vectorStores.length > 0) {
                await nango.batchSave(vectorStores, 'VectorStore');

                if (lastId) {
                    await nango.saveCheckpoint({ after: lastId });
                    after = lastId;
                }
            }

            hasMore = parsedResponse.data.has_more;

            if (hasMore && !lastId) {
                throw new Error('OpenAI vector stores pagination returned has_more=true without a cursor');
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('VectorStore');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
