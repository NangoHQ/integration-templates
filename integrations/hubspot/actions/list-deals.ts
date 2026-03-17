import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Maps to HubSpot "after" parameter.')
});

const DealSchema = z.object({
    id: z.string(),
    dealname: z.string().optional(),
    dealstage: z.string().optional(),
    pipeline: z.string().optional(),
    amount: z.number().optional(),
    closedate: z.string().optional(),
    createdate: z.string().optional(),
    hs_lastmodifieddate: z.string().optional()
});

const OutputSchema = z.object({
    deals: z.array(DealSchema),
    nextCursor: z.string().optional()
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
            dealname: deal.properties?.['dealname'] ?? undefined,
            dealstage: deal.properties?.['dealstage'] ?? undefined,
            pipeline: deal.properties?.['pipeline'] ?? undefined,
            amount: deal.properties?.['amount'] ? parseFloat(deal.properties['amount']) : undefined,
            closedate: deal.properties?.['closedate'] ?? undefined,
            createdate: deal.properties?.['createdate'] ?? undefined,
            hs_lastmodifieddate: deal.properties?.['hs_lastmodifieddate'] ?? undefined
        }));

        return {
            deals,
            nextCursor: data.paging?.next?.after || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
