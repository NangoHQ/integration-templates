import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_time: z.number().optional().describe('The start of the time range when a spam report was created (inclusive). This is a unix timestamp.'),
    end_time: z.number().optional().describe('The end of the time range when a spam report was created (inclusive). This is a unix timestamp.'),
    limit: z.number().min(1).max(500).optional().describe('The number of items to return per page. Maximum is 500.'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.')
});

const SpamReportSchema = z.object({
    created: z.number(),
    email: z.string(),
    ip: z.string()
});

const OutputSchema = z.object({
    items: z.array(SpamReportSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List email addresses that reported spam.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 500;
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        const params: Record<string, string | number> = {
            limit,
            offset
        };

        if (input.start_time !== undefined) {
            params['start_time'] = input.start_time;
        }

        if (input.end_time !== undefined) {
            params['end_time'] = input.end_time;
        }

        const response = await nango.get({
            // https://www.twilio.com/docs/sendgrid/api-reference/spam-reports-api/retrieve-all-spam-reports
            endpoint: '/v3/suppression/spam_reports',
            params,
            retries: 3
        });

        const providerItems = z.array(SpamReportSchema).parse(response.data);

        const result: z.infer<typeof OutputSchema> = {
            items: providerItems
        };

        if (providerItems.length === limit) {
            result.next_cursor = String(offset + limit);
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
