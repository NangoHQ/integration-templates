import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_time: z.number().optional().describe('Start of the time range in unix timestamp when an unsubscribe email was created (inclusive).'),
    end_time: z.number().optional().describe('End of the time range in unix timestamp when an unsubscribe email was created (inclusive).'),
    limit: z.number().min(1).max(500).optional().describe('Maximum number of items to return per page. Defaults to 500.'),
    cursor: z.string().optional().describe('Pagination cursor (offset value) from the previous response. Omit for the first page.')
});

const SuppressionSchema = z.object({
    created: z.number(),
    email: z.string()
});

const OutputSchema = z.object({
    items: z.array(SuppressionSchema),
    next_cursor: z.string().optional().describe('Pagination cursor to use for the next page, if more results may be available.')
});

const action = createAction({
    description: 'List globally unsubscribed email addresses.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['suppressions.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 500;
        const offset = input.cursor ? Number(input.cursor) : 0;

        const response = await nango.get({
            // https://www.twilio.com/docs/sendgrid/api-reference/suppressions-global-suppressions/retrieve-all-global-suppressions
            endpoint: '/v3/suppression/unsubscribes',
            params: {
                ...(input.start_time !== undefined && { start_time: String(input.start_time) }),
                ...(input.end_time !== undefined && { end_time: String(input.end_time) }),
                limit: String(limit),
                offset: String(offset)
            },
            retries: 3
        });

        const items = z.array(SuppressionSchema).parse(response.data);
        const nextOffset = items.length === limit ? offset + limit : undefined;

        return {
            items,
            ...(nextOffset !== undefined && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
