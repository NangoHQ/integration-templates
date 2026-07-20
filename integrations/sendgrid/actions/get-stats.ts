import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_date: z.string().describe('The starting date of the statistics to retrieve. Must follow format YYYY-MM-DD. Example: "2026-07-01"'),
    end_date: z
        .string()
        .optional()
        .describe('The end date of the statistics to retrieve. Defaults to today. Must follow format YYYY-MM-DD. Example: "2026-07-15"'),
    aggregated_by: z.enum(['day', 'week', 'month']).optional().describe('How to group the statistics. Must be either "day", "week", or "month".')
});

const MetricsSchema = z.object({
    blocks: z.number().optional(),
    bounce_drops: z.number().optional(),
    bounces: z.number().optional(),
    clicks: z.number().optional(),
    deferred: z.number().optional(),
    delivered: z.number().optional(),
    invalid_emails: z.number().optional(),
    opens: z.number().optional(),
    processed: z.number().optional(),
    requests: z.number().optional(),
    spam_report_drops: z.number().optional(),
    spam_reports: z.number().optional(),
    unique_clicks: z.number().optional(),
    unique_opens: z.number().optional(),
    unsubscribe_drops: z.number().optional(),
    unsubscribes: z.number().optional()
});

const StatItemSchema = z.object({
    metrics: MetricsSchema
});

const StatsEntrySchema = z.object({
    date: z.string().optional(),
    stats: z.array(StatItemSchema).optional()
});

const OutputSchema = z.array(StatsEntrySchema);

const action = createAction({
    description: 'Get email statistics.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['stats.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/sendgrid/api-reference/stats/retrieve-global-email-statistics
            endpoint: '/v3/stats',
            params: {
                start_date: input.start_date,
                ...(input.end_date !== undefined && { end_date: input.end_date }),
                ...(input.aggregated_by !== undefined && { aggregated_by: input.aggregated_by })
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
