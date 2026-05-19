import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    batch_id: z.string().describe('The ID of the batch to cancel. Example: "batch_abc123"')
});

const ProviderBatchSchema = z.object({
    id: z.string(),
    object: z.literal('batch'),
    endpoint: z.string(),
    errors: z.object({}).passthrough().nullable().optional(),
    input_file_id: z.string(),
    completion_window: z.string(),
    status: z.enum(['validating', 'failed', 'in_progress', 'finalizing', 'completed', 'expired', 'cancelling', 'cancelled']),
    output_file_id: z.string().nullable().optional(),
    error_file_id: z.string().nullable().optional(),
    created_at: z.number(),
    in_progress_at: z.number().nullable().optional(),
    expires_at: z.number(),
    finalizing_at: z.number().nullable().optional(),
    completed_at: z.number().nullable().optional(),
    failed_at: z.number().nullable().optional(),
    expired_at: z.number().nullable().optional(),
    cancelling_at: z.number().nullable().optional(),
    cancelled_at: z.number().nullable().optional(),
    request_counts: z
        .object({
            total: z.number(),
            completed: z.number(),
            failed: z.number()
        })
        .optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The batch ID'),
    object: z.literal('batch').describe('The object type'),
    endpoint: z.string().describe('The endpoint used for the batch'),
    input_file_id: z.string().describe('The ID of the input file'),
    completion_window: z.string().describe('The completion window for the batch'),
    status: z
        .enum(['validating', 'failed', 'in_progress', 'finalizing', 'completed', 'expired', 'cancelling', 'cancelled'])
        .describe('The status of the batch'),
    output_file_id: z.string().optional().describe('The ID of the output file'),
    error_file_id: z.string().optional().describe('The ID of the error file'),
    created_at: z.number().describe('Unix timestamp when the batch was created'),
    in_progress_at: z.number().optional().describe('Unix timestamp when the batch started processing'),
    expires_at: z.number().describe('Unix timestamp when the batch expires'),
    finalizing_at: z.number().optional().describe('Unix timestamp when the batch started finalizing'),
    completed_at: z.number().optional().describe('Unix timestamp when the batch completed'),
    failed_at: z.number().optional().describe('Unix timestamp when the batch failed'),
    expired_at: z.number().optional().describe('Unix timestamp when the batch expired'),
    cancelling_at: z.number().optional().describe('Unix timestamp when the batch started cancelling'),
    cancelled_at: z.number().optional().describe('Unix timestamp when the batch was cancelled'),
    request_counts: z
        .object({
            total: z.number().describe('Total number of requests'),
            completed: z.number().describe('Number of completed requests'),
            failed: z.number().describe('Number of failed requests')
        })
        .optional()
        .describe('Request count statistics'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Optional metadata')
});

const action = createAction({
    description: 'Cancel an in-progress OpenAI batch',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/cancel-batch',
        group: 'Batches'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['batch.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/batches/cancel
        const response = await nango.post({
            endpoint: `/v1/batches/${encodeURIComponent(input.batch_id)}/cancel`,
            retries: 3
        });

        const batch = ProviderBatchSchema.parse(response.data);

        return {
            id: batch.id,
            object: batch.object,
            endpoint: batch.endpoint,
            input_file_id: batch.input_file_id,
            completion_window: batch.completion_window,
            status: batch.status,
            ...(batch.output_file_id != null && { output_file_id: batch.output_file_id }),
            ...(batch.error_file_id != null && { error_file_id: batch.error_file_id }),
            created_at: batch.created_at,
            ...(batch.in_progress_at != null && { in_progress_at: batch.in_progress_at }),
            expires_at: batch.expires_at,
            ...(batch.finalizing_at != null && { finalizing_at: batch.finalizing_at }),
            ...(batch.completed_at != null && { completed_at: batch.completed_at }),
            ...(batch.failed_at != null && { failed_at: batch.failed_at }),
            ...(batch.expired_at != null && { expired_at: batch.expired_at }),
            ...(batch.cancelling_at != null && { cancelling_at: batch.cancelling_at }),
            ...(batch.cancelled_at != null && { cancelled_at: batch.cancelled_at }),
            ...(batch.request_counts !== undefined && { request_counts: batch.request_counts }),
            ...(batch.metadata != null && { metadata: batch.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
