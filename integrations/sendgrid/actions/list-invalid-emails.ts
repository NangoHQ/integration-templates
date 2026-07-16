import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    start_time: z
        .number()
        .int()
        .optional()
        .describe('Start of the time range in unix timestamp when an invalid email was created (inclusive). Example: 1443651141'),
    end_time: z
        .number()
        .int()
        .optional()
        .describe('End of the time range in unix timestamp when an invalid email was created (inclusive). Example: 1443651154'),
    limit: z.number().int().min(1).max(500).optional().describe('Maximum number of items to return for a single API request. Min 1, max 500. Example: 10'),
    cursor: z.string().regex(/^\d+$/).optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.')
});

const InvalidEmailSchema = z.object({
    created: z.number(),
    email: z.string(),
    reason: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(InvalidEmailSchema),
    next_offset: z.string().optional()
});

const action = createAction({
    description: 'List invalid email addresses.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        // https://www.twilio.com/docs/sendgrid/api-reference/invalid-emails-api/retrieve-all-invalid-emails
        const response = await nango.get({
            endpoint: '/v3/suppression/invalid_emails',
            params: {
                ...(input.start_time !== undefined && { start_time: String(input.start_time) }),
                ...(input.end_time !== undefined && { end_time: String(input.end_time) }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                offset: String(offset)
            },
            retries: 3
        });

        const rawItems = z.array(z.unknown()).parse(response.data);
        const items = rawItems.map((item: unknown) => InvalidEmailSchema.parse(item));

        const nextOffset = items.length > 0 ? String(offset + items.length) : undefined;

        return {
            items,
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
