import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    start_date: z.string().describe('Start date in YYYY-MM-DD format. Example: "2024-01-01"'),
    end_date: z.string().describe('End date in YYYY-MM-DD format. Example: "2024-01-31"'),
    columns: z.string().describe('Comma-separated list of metric names. Example: "IMPRESSION"'),
    granularity: z.enum(['TOTAL', 'DAY', 'HOUR', 'WEEK', 'MONTH']).describe('Granularity of the data. Example: "TOTAL"')
});

const AnalyticsItemSchema = z
    .object({
        date_string: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.array(AnalyticsItemSchema);

const action = createAction({
    description: 'Get account-level analytics',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.pinterest.com/docs/api/v5/#operation/ad_accounts/analytics
        const response = await nango.get({
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/analytics`,
            params: {
                start_date: input.start_date,
                end_date: input.end_date,
                columns: input.columns,
                granularity: input.granularity
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
