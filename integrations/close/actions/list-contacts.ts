import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    lead_id: z.string().optional().describe('Filter contacts by lead ID. Example: "lead_xxx"'),
    cursor: z.string().optional().describe('Pagination cursor (skip value) from the previous response. Omit for the first page.'),
    limit: z.number().min(1).max(200).optional().describe('Number of contacts to return per page. Max 200.')
});

const ContactSchema = z
    .object({
        id: z.string(),
        lead_id: z.string(),
        name: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        emails: z
            .array(z.object({ email: z.string(), type: z.string().nullable().optional() }).passthrough())
            .nullable()
            .optional(),
        phones: z
            .array(z.object({ phone: z.string(), type: z.string().nullable().optional() }).passthrough())
            .nullable()
            .optional(),
        organization_name: z.string().nullable().optional(),
        date_created: z.string().nullable().optional(),
        date_updated: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ContactSchema),
    next_cursor: z.string().optional(),
    has_more: z.boolean()
});

const action = createAction({
    description: 'List contacts, optionally filtered by lead.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 200;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://developer.close.com/
            endpoint: '/v1/contact/',
            params: {
                _limit: String(limit),
                _skip: String(skip),
                ...(input.lead_id !== undefined && { lead_id: input.lead_id })
            },
            retries: 3
        });

        const listResponse = z
            .object({
                data: z.array(z.unknown()),
                has_more: z.boolean()
            })
            .parse(response.data);

        const items = listResponse.data.map((item) => ContactSchema.parse(item));
        const hasMore = listResponse.has_more;
        const nextCursor = hasMore ? String(skip + items.length) : undefined;

        return {
            items,
            has_more: hasMore,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
