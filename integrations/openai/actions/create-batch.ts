import { z } from 'zod';
import { createAction } from 'nango';

const EndpointEnum = z.union([
    z.literal('/v1/responses'),
    z.literal('/v1/chat/completions'),
    z.literal('/v1/embeddings'),
    z.literal('/v1/completions'),
    z.literal('/v1/moderations'),
    z.literal('/v1/images/generations'),
    z.literal('/v1/images/edits'),
    z.literal('/v1/videos')
]);

const StatusEnum = z.union([
    z.literal('validating'),
    z.literal('failed'),
    z.literal('in_progress'),
    z.literal('finalizing'),
    z.literal('completed'),
    z.literal('expired'),
    z.literal('cancelling'),
    z.literal('cancelled')
]);

const InputSchema = z.object({
    input_file_id: z
        .string()
        .describe('The ID of an uploaded file that contains requests for the new batch. Must be formatted as a JSONL file and uploaded with purpose=batch.'),
    endpoint: EndpointEnum.describe('The endpoint to be used for all requests in the batch.'),
    completion_window: z.literal('24h').describe('The time frame within which the batch should be processed. Currently only 24h is supported.'),
    metadata: z.record(z.string(), z.unknown(), {}).optional().describe('Optional set of key-value pairs that can be attached to the batch object.')
});

const BatchErrorItemSchema = z.object({
    code: z.string().optional(),
    line: z.number().optional(),
    message: z.string().optional(),
    param: z.string().optional()
});

const BatchErrorsSchema = z.object({
    data: z.array(BatchErrorItemSchema, {}).optional(),
    object: z.string().optional()
});

const BatchRequestCountsSchema = z.object({
    completed: z.number(),
    failed: z.number(),
    total: z.number()
});

const ProviderBatchSchema = z.object({
    id: z.string(),
    object: z.literal('batch'),
    completion_window: z.string(),
    created_at: z.number(),
    endpoint: z.string(),
    input_file_id: z.string(),
    status: StatusEnum,
    cancelled_at: z.number().nullable().optional(),
    cancelling_at: z.number().nullable().optional(),
    completed_at: z.number().nullable().optional(),
    error_file_id: z.string().nullable().optional(),
    errors: BatchErrorsSchema.nullable().optional(),
    expired_at: z.number().nullable().optional(),
    expires_at: z.number().nullable().optional(),
    failed_at: z.number().nullable().optional(),
    finalizing_at: z.number().nullable().optional(),
    in_progress_at: z.number().nullable().optional(),
    metadata: z.record(z.string(), z.unknown(), {}).nullable().optional(),
    output_file_id: z.string().nullable().optional(),
    request_counts: BatchRequestCountsSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    completion_window: z.string(),
    created_at: z.number(),
    endpoint: z.string(),
    input_file_id: z.string(),
    status: z.string(),
    cancelled_at: z.number().optional(),
    cancelling_at: z.number().optional(),
    completed_at: z.number().optional(),
    error_file_id: z.string().optional(),
    errors: BatchErrorsSchema.optional(),
    expired_at: z.number().optional(),
    expires_at: z.number().optional(),
    failed_at: z.number().optional(),
    finalizing_at: z.number().optional(),
    in_progress_at: z.number().optional(),
    metadata: z.record(z.string(), z.unknown(), {}).optional(),
    output_file_id: z.string().optional(),
    request_counts: BatchRequestCountsSchema.optional()
});

const action = createAction({
    description: 'Create a batch in OpenAI for asynchronous processing of multiple API requests.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-batch',
        group: 'Batches'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['batch.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            input_file_id: string;
            endpoint: string;
            completion_window: string;
            metadata?: Record<string, unknown>;
        } = {
            input_file_id: input.input_file_id,
            endpoint: input.endpoint,
            completion_window: input.completion_window
        };

        if (input.metadata !== undefined) {
            requestBody.metadata = input.metadata;
        }

        // https://platform.openai.com/docs/api-reference/batches/create
        const response = await nango.post({
            endpoint: '/v1/batches',
            data: requestBody,
            retries: 3
        });

        const providerBatch = ProviderBatchSchema.parse(response.data);

        return {
            id: providerBatch.id,
            object: providerBatch.object,
            completion_window: providerBatch.completion_window,
            created_at: providerBatch.created_at,
            endpoint: providerBatch.endpoint,
            input_file_id: providerBatch.input_file_id,
            status: providerBatch.status,
            ...(providerBatch.cancelled_at != null && { cancelled_at: providerBatch.cancelled_at }),
            ...(providerBatch.cancelling_at != null && { cancelling_at: providerBatch.cancelling_at }),
            ...(providerBatch.completed_at != null && { completed_at: providerBatch.completed_at }),
            ...(providerBatch.error_file_id != null && { error_file_id: providerBatch.error_file_id }),
            ...(providerBatch.errors != null && { errors: providerBatch.errors }),
            ...(providerBatch.expired_at != null && { expired_at: providerBatch.expired_at }),
            ...(providerBatch.expires_at != null && { expires_at: providerBatch.expires_at }),
            ...(providerBatch.failed_at != null && { failed_at: providerBatch.failed_at }),
            ...(providerBatch.finalizing_at != null && { finalizing_at: providerBatch.finalizing_at }),
            ...(providerBatch.in_progress_at != null && { in_progress_at: providerBatch.in_progress_at }),
            ...(providerBatch.metadata != null && { metadata: providerBatch.metadata }),
            ...(providerBatch.output_file_id != null && { output_file_id: providerBatch.output_file_id }),
            ...(providerBatch.request_counts != null && { request_counts: providerBatch.request_counts })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
