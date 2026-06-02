import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    message_batch_id: z.string().describe('The ID of the message batch to retrieve. Example: "msgbatch_01Ab2cDe3Fg4hIj5Kl6mNo7Pq8r"')
});

const RequestCountsSchema = z.object({
    canceled: z.number().int(),
    errored: z.number().int(),
    expired: z.number().int(),
    processing: z.number().int(),
    succeeded: z.number().int()
});

const OutputSchema = z.object({
    id: z.string(),
    archived_at: z.string().nullable().optional(),
    cancel_initiated_at: z.string().nullable().optional(),
    created_at: z.string(),
    ended_at: z.string().nullable().optional(),
    expires_at: z.string(),
    processing_status: z.enum(['in_progress', 'canceling', 'ended']),
    request_counts: RequestCountsSchema,
    results_url: z.string().nullable().optional(),
    type: z.literal('message_batch')
});

const action = createAction({
    description: 'Retrieve a single message batch from Anthropic.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-message-batch',
        group: 'Message Batches'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.anthropic.com/en/api/message-batches
            endpoint: `/v1/messages/batches/${encodeURIComponent(input.message_batch_id)}`,
            retries: 3
        });

        const batch = OutputSchema.parse(response.data);
        return batch;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
