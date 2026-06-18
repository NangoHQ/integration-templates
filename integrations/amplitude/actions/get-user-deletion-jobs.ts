import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_day: z.string().describe('First day included in the query range, formatted YYYY-MM-DD. Example: "2024-01-01"'),
    end_day: z.string().describe('Last day included in the query range, formatted YYYY-MM-DD. Example: "2024-01-31"')
});

const AmplitudeIdSchema = z.object({
    amplitude_id: z.number(),
    requested_on_day: z.string().optional(),
    requester: z.string().optional(),
    user_id: z.string().optional()
});

const DeletionJobSchema = z.object({
    day: z.string(),
    status: z.string(),
    amplitude_ids: z.array(AmplitudeIdSchema).optional(),
    user_ids: z.array(z.string()).optional(),
    invalid_ids: z.array(z.string()).optional(),
    app: z.union([z.string(), z.number()]).optional(),
    active_scrub_done_date: z.string().optional()
});

const OutputSchema = z.array(DeletionJobSchema);

const action = createAction({
    description: 'List user privacy deletion jobs in a date range.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deletion_jobs:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/user-privacy
        const response = await nango.get({
            endpoint: '/api/2/deletions/users',
            params: {
                start_day: input.start_day,
                end_day: input.end_day
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of deletion jobs from the Amplitude API.'
            });
        }

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse deletion jobs response.',
                details: parsed.error.message
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
