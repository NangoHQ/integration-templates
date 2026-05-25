import { createSync } from 'nango';
import { z } from 'zod';

// https://platform.openai.com/docs/api-reference/batches/list
const BatchSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    endpoint: z.string().optional(),
    errors: z
        .object({
            object: z.string().optional(),
            data: z
                .array(
                    z.object({
                        code: z.string().optional(),
                        message: z.string().optional(),
                        param: z.string().nullable().optional(),
                        line: z.number().nullable().optional()
                    })
                )
                .optional()
        })
        .nullable()
        .optional(),
    input_file_id: z.string().optional(),
    completion_window: z.string().optional(),
    status: z.string().optional(),
    output_file_id: z.string().nullable().optional(),
    error_file_id: z.string().nullable().optional(),
    created_at: z.number().optional(),
    in_progress_at: z.number().nullable().optional(),
    expires_at: z.number().nullable().optional(),
    finalizing_at: z.number().nullable().optional(),
    completed_at: z.number().nullable().optional(),
    failed_at: z.number().nullable().optional(),
    expired_at: z.number().nullable().optional(),
    cancelling_at: z.number().nullable().optional(),
    cancelled_at: z.number().nullable().optional(),
    request_counts: z
        .object({
            total: z.number().optional(),
            completed: z.number().optional(),
            failed: z.number().optional()
        })
        .optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const CheckpointSchema = z.object({
    after: z.string()
});

const ListBatchesResponseSchema = z.object({
    object: z.string().optional(),
    data: z.array(BatchSchema),
    has_more: z.boolean(),
    first_id: z.string().nullable().optional(),
    last_id: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync batches from OpenAI',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/batches' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Batch: BatchSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // The batches API only exposes cursor pagination. We use the cursor checkpoint
        // to resume a full refresh if a run is interrupted, then clear it when complete.
        await nango.trackDeletesStart('Batch');

        let after = checkpoint?.after;
        let hasMore = true;

        while (hasMore) {
            // https://platform.openai.com/docs/api-reference/batches/list
            const response = await nango.get({
                endpoint: '/v1/batches',
                params: {
                    limit: 100,
                    ...(after ? { after } : {})
                },
                retries: 3
            });

            const parsedPage = ListBatchesResponseSchema.safeParse(response.data);

            if (!parsedPage.success) {
                throw new Error(`Failed to parse batches page: ${parsedPage.error.message}`);
            }

            const batches = parsedPage.data.data;
            const lastId = parsedPage.data.last_id ?? batches[batches.length - 1]?.id;

            if (batches.length === 0) {
                hasMore = parsedPage.data.has_more;

                if (hasMore) {
                    throw new Error('OpenAI batches pagination returned has_more=true without a cursor');
                }

                break;
            }

            await nango.batchSave(batches, 'Batch');

            if (lastId) {
                await nango.saveCheckpoint({
                    after: lastId
                });

                after = lastId;
            }

            hasMore = parsedPage.data.has_more;

            if (hasMore && !lastId) {
                throw new Error('OpenAI batches pagination returned has_more=true without a cursor');
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Batch');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
