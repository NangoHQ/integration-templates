import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results to return per page. Default: 20, Max: 100.'),
    name_filter: z.string().optional().describe('Filter lists by name.'),
    order: z.enum(['ASC', 'DESC']).optional().describe('Sort order by list name.')
});

const ListSchema = z.object({
    id: z.string(),
    stringid: z.string().optional(),
    userid: z.string().optional(),
    name: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().nullable().optional(),
    private: z.string().optional(),
    require_name: z.string().optional(),
    to_name: z.string().optional(),
    sender_name: z.string().optional(),
    sender_addr1: z.string().optional(),
    sender_addr2: z.string().optional(),
    sender_city: z.string().optional(),
    sender_state: z.string().optional(),
    sender_zip: z.string().optional(),
    sender_country: z.string().optional(),
    sender_phone: z.string().optional(),
    sender_url: z.string().nullable().optional(),
    sender_reminder: z.string().nullable().optional(),
    optinoptout: z.string().optional(),
    deletestamp: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    lists: z.array(z.unknown()),
    meta: z.object({
        total: z.string()
    })
});

const OutputSchema = z.object({
    items: z.array(ListSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List lists from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-lists',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid numeric offset.'
            });
        }

        const limit = input.limit ?? 20;

        const response = await nango.get({
            // https://developers.activecampaign.com/reference/retrieve-all-lists
            endpoint: '/3/lists',
            params: {
                limit: String(limit),
                offset: String(offset),
                ...(input.name_filter && { 'filters[name]': input.name_filter }),
                ...(input.order && { 'orders[name]': input.order })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const items = providerData.lists.map((raw: unknown) => {
            const parsed = ListSchema.safeParse(raw);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_provider_response',
                    message: 'Provider returned an unexpected list item shape.'
                });
            }
            return parsed.data;
        });

        const total = parseInt(providerData.meta.total, 10);
        const nextOffset = offset + items.length;
        const next_cursor = nextOffset < total ? String(nextOffset) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
