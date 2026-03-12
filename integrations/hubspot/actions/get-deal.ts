import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deal_id: z.string().describe('The ID of the deal to retrieve. Example: "12345678"')
});

const OutputSchema = z.object({
    id: z.string(),
    deal_name: z.union([z.string(), z.null()]),
    deal_stage: z.union([z.string(), z.null()]),
    pipeline: z.union([z.string(), z.null()]),
    amount: z.union([z.string(), z.null()]),
    close_date: z.union([z.string(), z.null()]),
    create_date: z.union([z.string(), z.null()]),
    hubspot_owner_id: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
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
            endpoint: `/crm/v3/objects/deals/${input.deal_id}`,
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
                deal_id: input.deal_id
            });
        }

        return {
            id: data.id,
            deal_name: data.properties?.['dealname'] ?? null,
            deal_stage: data.properties?.['dealstage'] ?? null,
            pipeline: data.properties?.['pipeline'] ?? null,
            amount: data.properties?.['amount'] ?? null,
            close_date: data.properties?.['closedate'] ?? null,
            create_date: data.properties?.['createdate'] ?? null,
            hubspot_owner_id: data.properties?.['hubspot_owner_id'] ?? null,
            updated_at: data.properties?.['hs_lastmodifieddate'] ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
