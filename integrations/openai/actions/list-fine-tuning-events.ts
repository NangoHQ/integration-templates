import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    fine_tuning_job_id: z.string().describe('Fine-tuning job ID. Example: "ft-1234567890"'),
    after: z.string().optional().describe('Pagination cursor. Use the ID of the last event from the previous page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of events to return (1-100, default 20).')
});

const EventLevelSchema = z.enum(['info', 'warn', 'error']);

const FineTuningEventSchema = z.object({
    id: z.string(),
    object: z.literal('fine_tuning.job.event'),
    created_at: z.number(),
    level: EventLevelSchema,
    message: z.string(),
    type: z.string()
});

const ProviderResponseSchema = z.object({
    object: z.literal('list'),
    data: z.array(FineTuningEventSchema),
    has_more: z.boolean()
});

const OutputSchema = z.object({
    events: z.array(FineTuningEventSchema),
    has_more: z.boolean(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List events for a fine-tuning job, including training metrics and status transitions.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-fine-tuning-events',
        group: 'Fine-Tuning'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['fine_tuning.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limitValue = input.limit ?? 20;

        const params: { after?: string; limit: number } = {
            limit: limitValue
        };

        if (input.after !== undefined) {
            params.after = input.after;
        }

        const response = await nango.get({
            // https://platform.openai.com/docs/api-reference/fine-tuning/list-paginated-events
            endpoint: `/v1/fine_tuning/jobs/${encodeURIComponent(input.fine_tuning_job_id)}/events`,
            params: params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (parsed.has_more && parsed.data.length > 0) {
            const lastEvent = parsed.data[parsed.data.length - 1];
            if (lastEvent && lastEvent.id) {
                nextCursor = lastEvent.id;
            }
        }

        return {
            events: parsed.data,
            has_more: parsed.has_more,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
