import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dealId: z.string().describe('The ID of the deal to retrieve. Example: "12345678"')
});

const OutputSchema = z.object({
    id: z.string(),
    dealName: z.string().optional(),
    dealStage: z.string().optional(),
    pipeline: z.string().optional(),
    amount: z.string().optional(),
    closeDate: z.string().optional(),
    createDate: z.string().optional(),
    hubspot_owner_id: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Get a deal by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-deal',
        group: 'Deals'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.deals.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api/crm/deals
        const response = await nango.get({
            endpoint: `/crm/v3/objects/deals/${input.dealId}`,
            params: {
                properties: 'dealname,dealstage,pipeline,amount,closedate,createdate,hubspot_owner_id,hs_lastmodifieddate'
            },
            retries: 3
        });

        const data = response.data;

        if (!data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Deal not found',
                dealId: input.dealId
            });
        }

        return {
            id: data.id,
            dealName: data.properties?.['dealname'] ?? undefined,
            dealStage: data.properties?.['dealstage'] ?? undefined,
            pipeline: data.properties?.['pipeline'] ?? undefined,
            amount: data.properties?.['amount'] ?? undefined,
            closeDate: data.properties?.['closedate'] ?? undefined,
            createDate: data.properties?.['createdate'] ?? undefined,
            hubspot_owner_id: data.properties?.['hubspot_owner_id'] ?? undefined,
            updatedAt: data.properties?.['hs_lastmodifieddate'] ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
