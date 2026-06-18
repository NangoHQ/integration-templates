import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset). Omit for the first page.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of results per page (max 100).'),
    seriesid: z.number().optional().describe('Filter to return campaigns from the targeted automation/series.'),
    orders_sdate: z.enum(['ASC', 'DESC']).optional().describe('Order campaigns by send date.'),
    orders_ldate: z.enum(['ASC', 'DESC']).optional().describe('Order campaigns by last send date.')
});

const CampaignSchema = z
    .object({
        id: z.string(),
        type: z.string().optional(),
        userid: z.string().optional(),
        name: z.string().optional(),
        cdate: z.string().optional(),
        mdate: z.string().optional(),
        sdate: z.string().nullable().optional(),
        ldate: z.string().nullable().optional(),
        send_amt: z.string().optional(),
        total_amt: z.string().optional(),
        status: z.string().optional(),
        public: z.string().optional(),
        tracklinks: z.string().optional(),
        trackreads: z.string().optional()
    })
    .passthrough();

const MetaSchema = z.object({
    total: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(CampaignSchema),
    next_offset: z.string().optional()
});

const action = createAction({
    description: 'List campaigns from ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && (Number.isNaN(offset) || offset < 0 || String(offset) !== input.cursor)) {
            throw new nango.ActionError({ type: 'invalid_input', message: 'cursor must be a valid non-negative integer string.' });
        }
        const limit = input.limit ?? 20;

        const response = await nango.get({
            // https://developers.activecampaign.com/reference/list-all-campaigns
            endpoint: '/3/campaigns',
            params: {
                limit: String(limit),
                offset: String(offset),
                ...(input.seriesid !== undefined && { 'filters[seriesid]': String(input.seriesid) }),
                ...(input.orders_sdate !== undefined && { 'orders[sdate]': input.orders_sdate }),
                ...(input.orders_ldate !== undefined && { 'orders[ldate]': input.orders_ldate })
            },
            retries: 3
        });

        const data = z
            .object({
                campaigns: z.array(z.unknown()),
                meta: MetaSchema.optional()
            })
            .parse(response.data);

        const campaigns = data.campaigns.map((item: unknown) => CampaignSchema.parse(item));
        const total = parseInt(data.meta?.total ?? '0', 10);
        const nextOffset = offset + campaigns.length < total ? String(offset + limit) : undefined;

        return {
            items: campaigns,
            ...(nextOffset !== undefined && { next_offset: nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
