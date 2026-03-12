import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deal_id: z.string().describe('The ID of the deal to update. Example: "12345"'),
    dealname: z.string().optional().describe('The name of the deal. Example: "Acme Corp Annual Deal"'),
    amount: z.number().optional().describe('The deal amount in the currency. Example: 50000'),
    closedate: z.string().optional().describe('The expected close date (ISO 8601 format). Example: "2026-06-30"'),
    dealstage: z.string().optional().describe('The stage of the deal (internal stage ID). Example: "qualifiedtobuy"'),
    pipeline: z.string().optional().describe('The pipeline ID for the deal. Example: "default"')
});

const OutputSchema = z.object({
    id: z.string(),
    dealname: z.union([z.string(), z.null()]),
    amount: z.union([z.number(), z.null()]),
    closedate: z.union([z.string(), z.null()]),
    dealstage: z.union([z.string(), z.null()]),
    pipeline: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Update a deal record in HubSpot CRM',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-deal',
        group: 'Deals'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.deals.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api/crm/deals
        const properties: Record<string, string | number> = {};

        if (input.dealname) properties['dealname'] = input.dealname;
        if (input.amount !== undefined) properties['amount'] = input.amount;
        if (input.closedate) properties['closedate'] = input.closedate;
        if (input.dealstage) properties['dealstage'] = input.dealstage;
        if (input.pipeline) properties['pipeline'] = input.pipeline;

        const response = await nango.patch({
            endpoint: `/crm/v3/objects/deals/${input.deal_id}`,
            data: { properties },
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            dealname: data.properties?.['dealname'] ?? null,
            amount: data.properties?.['amount'] ? Number(data.properties['amount']) : null,
            closedate: data.properties?.['closedate'] ?? null,
            dealstage: data.properties?.['dealstage'] ?? null,
            pipeline: data.properties?.['pipeline'] ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
