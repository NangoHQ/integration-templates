import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    requests: z
        .array(
            z.object({
                custom_id: z.string().describe('Unique identifier for the request within the batch. Must be unique. Example: "my-request-1"'),
                params: z
                    .object({})
                    .passthrough()
                    .describe('Messages API creation parameters for the individual request. See https://docs.anthropic.com/en/api/messages')
            })
        )
        .describe('List of requests for prompt completion. Each is an individual request to create a Message.')
});

const RequestCountsSchema = z.object({
    processing: z.number(),
    succeeded: z.number(),
    errored: z.number(),
    canceled: z.number(),
    expired: z.number()
});

const ProviderMessageBatchSchema = z.object({
    id: z.string(),
    type: z.string(),
    processing_status: z.string(),
    request_counts: RequestCountsSchema,
    ended_at: z.string().nullable().optional(),
    created_at: z.string(),
    expires_at: z.string(),
    cancel_initiated_at: z.string().nullable().optional(),
    results_url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    processing_status: z.string(),
    request_counts: RequestCountsSchema,
    created_at: z.string(),
    expires_at: z.string(),
    ended_at: z.string().optional(),
    cancel_initiated_at: z.string().optional(),
    results_url: z.string().optional()
});

const action = createAction({
    description: 'Create a message batch in Anthropic.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.anthropic.com/en/api/message-batches
            endpoint: '/v1/messages/batches',
            data: {
                requests: input.requests
            },
            retries: 3
        });

        const providerBatch = ProviderMessageBatchSchema.parse(response.data);

        return {
            id: providerBatch.id,
            type: providerBatch.type,
            processing_status: providerBatch.processing_status,
            request_counts: providerBatch.request_counts,
            created_at: providerBatch.created_at,
            expires_at: providerBatch.expires_at,
            ...(providerBatch.ended_at != null && { ended_at: providerBatch.ended_at }),
            ...(providerBatch.cancel_initiated_at != null && { cancel_initiated_at: providerBatch.cancel_initiated_at }),
            ...(providerBatch.results_url != null && { results_url: providerBatch.results_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
