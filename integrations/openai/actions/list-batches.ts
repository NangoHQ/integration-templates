import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    after: z.string().optional().describe('A cursor for use in pagination. `after` is an object ID that defines your place in the list.')
});

const BatchSchema = z.object({
    id: z.string(),
    object: z.literal('batch'),
    endpoint: z.string(),
    errors: z.object({}).nullable(),
    input_file_id: z.string(),
    completion_window: z.string(),
    status: z.enum(['validating', 'failed', 'in_progress', 'finalizing', 'completed', 'expired', 'cancelling', 'cancelled']),
    output_file_id: z.string().nullable(),
    error_file_id: z.string().nullable(),
    created_at: z.number(),
    in_progress_at: z.number().nullable(),
    expires_at: z.number().nullable(),
    finalizing_at: z.number().nullable(),
    completed_at: z.number().nullable(),
    failed_at: z.number().nullable(),
    expired_at: z.number().nullable(),
    cancelling_at: z.number().nullable(),
    cancelled_at: z.number().nullable(),
    request_counts: z.object({
        total: z.number(),
        completed: z.number(),
        failed: z.number()
    })
});

const ProviderResponseSchema = z.object({
    object: z.literal('list'),
    data: z.array(BatchSchema),
    first_id: z.string().nullable(),
    last_id: z.string().nullable(),
    has_more: z.boolean()
});

const OutputSchema = z.object({
    batches: z.array(BatchSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List batches from OpenAI',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-batches',
        group: 'Batches'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['batch.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/batches/list
        const response = await nango.get({
            endpoint: '/v1/batches',
            params: {
                ...(input.after !== undefined && { after: input.after })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            batches: providerData.data,
            has_more: providerData.has_more,
            ...(providerData.last_id != null && { next_cursor: providerData.last_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
