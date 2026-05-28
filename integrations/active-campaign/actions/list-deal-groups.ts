import { createAction, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({
    title: z.string().optional().describe('Filter by pipeline title (partial match)'),
    have_stages: z.number().int().optional().describe('Filter by whether pipelines have deal stages (1 or 0)'),
    limit: z.number().int().optional().describe('Number of results per page (max 100)'),
    offset: z.number().int().optional().describe('Starting index for pagination'),
    orders_title: z.enum(['ASC', 'DESC']).optional().describe('Order by pipeline title'),
    orders_popular: z.enum(['ASC', 'DESC']).optional().describe('Order by number of deals')
});

const DealGroupSchema = z.object({
    id: z.string(),
    title: z.string(),
    currency: z.string().optional(),
    autoassign: z.string().optional(),
    allgroups: z.string().optional(),
    allusers: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    stages: z.array(z.string()).optional(),
    links: z.record(z.string(), z.string()).optional()
});

const DealStageSchema = z.object({
    id: z.string(),
    title: z.string(),
    color: z.string().optional(),
    group: z.string().optional(),
    order: z.string().optional(),
    width: z.string().optional(),
    cardRegion1: z.string().optional(),
    cardRegion2: z.string().optional(),
    cardRegion3: z.string().optional(),
    cardRegion4: z.string().optional(),
    cardRegion5: z.string().optional(),
    dealOrder: z.string().optional(),
    cdate: z.string().nullable().optional(),
    udate: z.string().nullable().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const OutputSchema = z.object({
    dealGroups: z.array(DealGroupSchema),
    dealStages: z.array(DealStageSchema).optional(),
    meta: z
        .object({
            total: z.number().optional()
        })
        .optional()
});

export default createAction({
    description: 'List deal groups (pipelines) from ActiveCampaign',
    endpoint: {
        method: 'GET',
        path: '/actions/list-deal-groups'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input) => {
        const params: Record<string, string | number> = {};
        if (input.title !== undefined) {
            params['filters[title]'] = input.title;
        }
        if (input.have_stages !== undefined) {
            params['filters[have_stages]'] = input.have_stages;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }
        if (input.orders_title !== undefined) {
            params['orders[title]'] = input.orders_title;
        }
        if (input.orders_popular !== undefined) {
            params['orders[popular]'] = input.orders_popular;
        }

        const config: ProxyConfiguration = {
            // https://developers.activecampaign.com/reference/list-all-pipelines
            endpoint: '/3/dealGroups',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            await nango.log('Failed to parse deal groups response');
            throw new nango.ActionError({
                message: 'Invalid response from ActiveCampaign API'
            });
        }

        return parsed.data;
    }
});
