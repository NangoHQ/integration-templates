import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Maps to HubSpot "after" parameter.')
});

const DealSchema = z.object({
    id: z.string(),
    dealname: z.union([z.string(), z.null()]),
    dealstage: z.union([z.string(), z.null()]),
    pipeline: z.union([z.string(), z.null()]),
    amount: z.union([z.number(), z.null()]),
    closedate: z.union([z.string(), z.null()]),
    createdate: z.union([z.string(), z.null()]),
    hs_lastmodifieddate: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    deals: z.array(DealSchema),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'List deal records from HubSpot CRM',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/list-deals',
        group: 'Deals'
    },

    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api/crm/deals
        const response = await nango.get({
            endpoint: '/crm/v3/objects/deals',
            params: {
                properties: 'dealname,dealstage,pipeline,amount,closedate,createdate,hs_lastmodifieddate',
                limit: '100',
                ...(input.cursor && { after: input.cursor })
            },
            retries: 3
        });

        const data = response.data;
        const deals = data.results.map((deal: any) => ({
            id: deal.id,
            dealname: deal.properties?.['dealname'] ?? null,
            dealstage: deal.properties?.['dealstage'] ?? null,
            pipeline: deal.properties?.['pipeline'] ?? null,
            amount: deal.properties?.['amount'] ? parseFloat(deal.properties['amount']) : null,
            closedate: deal.properties?.['closedate'] ?? null,
            createdate: deal.properties?.['createdate'] ?? null,
            hs_lastmodifieddate: deal.properties?.['hs_lastmodifieddate'] ?? null
        }));

        return {
            deals,
            next_cursor: data.paging?.next?.after || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
