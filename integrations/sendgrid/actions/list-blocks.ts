import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().regex(/^\d+$/).optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    start_time: z.number().int().optional().describe('Start of the time range in unix timestamp when a block was created (inclusive).'),
    end_time: z.number().int().optional().describe('End of the time range in unix timestamp when a block was created (inclusive).'),
    limit: z.number().int().min(1).max(500).optional().describe('Maximum number of items to return per page. Min 1, max 500.'),
    email: z.string().optional().describe('Filter results by email address. Supports % wildcard.')
});

const BlockSchema = z.object({
    created: z.number(),
    email: z.string(),
    reason: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(BlockSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List blocked email addresses.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://www.twilio.com/docs/sendgrid/api-reference/blocks-api/retrieve-all-blocks
        const response = await nango.get({
            endpoint: '/v3/suppression/blocks',
            params: {
                ...(input.start_time !== undefined && { start_time: String(input.start_time) }),
                ...(input.end_time !== undefined && { end_time: String(input.end_time) }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.email !== undefined && { email: input.email }),
                offset: String(offset)
            },
            retries: 3
        });

        const items = z.array(BlockSchema).parse(response.data);

        const nextCursor = items.length > 0 ? String(offset + items.length) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
