import { createSync } from 'nango';
import { z } from 'zod';

const MessageBatchRequestCountsSchema = z.object({
    canceled: z.number().int(),
    errored: z.number().int(),
    expired: z.number().int(),
    processing: z.number().int(),
    succeeded: z.number().int()
});

const MessageBatchSchema = z.object({
    id: z.string(),
    archived_at: z.string().optional(),
    cancel_initiated_at: z.string().optional(),
    created_at: z.string(),
    ended_at: z.string().optional(),
    expires_at: z.string(),
    processing_status: z.enum(['in_progress', 'canceling', 'ended']),
    request_counts: MessageBatchRequestCountsSchema,
    results_url: z.string().nullable().optional(),
    type: z.literal('message_batch')
});

const MessageBatchListResponseSchema = z.object({
    data: z.array(MessageBatchSchema),
    first_id: z.string().nullable().optional(),
    has_more: z.boolean(),
    last_id: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    full_refresh: z.boolean(),
    after_id: z.string()
});

const LegacyCheckpointSchema = z.object({
    created_after: z.string()
});

const sync = createSync({
    description: 'Sync message batches from Anthropic.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/message-batches'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        MessageBatch: MessageBatchSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let afterId: string | undefined;

        if (rawCheckpoint !== null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(rawCheckpoint);
            if (parsedCheckpoint.success) {
                if (parsedCheckpoint.data.full_refresh) {
                    afterId = parsedCheckpoint.data.after_id;
                }
            } else {
                const parsedLegacyCheckpoint = LegacyCheckpointSchema.safeParse(rawCheckpoint);
                if (!parsedLegacyCheckpoint.success) {
                    throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
                }

                // Ignore the legacy created_at watermark because batches keep changing
                // after creation and the next run must perform a full refresh.
            }
        }

        while (true) {
            const response = await nango.get({
                // https://docs.anthropic.com/en/api/message-batches
                endpoint: '/v1/messages/batches',
                params: {
                    ...(afterId !== undefined ? { after_id: afterId } : {}),
                    limit: 100
                },
                retries: 3
            });

            const parsedResponse = MessageBatchListResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Invalid response from Anthropic message batches API: ${parsedResponse.error.message}`);
            }

            const page = parsedResponse.data;

            if (page.data.length > 0) {
                await nango.batchSave(page.data, 'MessageBatch');
            }

            if (!page.has_more || !page.last_id) {
                break;
            }

            afterId = page.last_id;
            await nango.saveCheckpoint({
                full_refresh: true,
                after_id: afterId
            });
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
