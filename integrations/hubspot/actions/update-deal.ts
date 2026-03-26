import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dealId: z.string().describe('The ID of the deal to update. Example: "12345"'),
    dealname: z.string().optional().describe('The name of the deal. Example: "Acme Corp Annual Deal"'),
    amount: z.number().optional().describe('The deal amount in the currency. Example: 50000'),
    closedate: z.string().optional().describe('The expected close date (ISO 8601 format). Example: "2026-06-30"'),
    dealstage: z.string().optional().describe('The stage of the deal (internal stage ID). Example: "qualifiedtobuy"'),
    pipeline: z.string().optional().describe('The pipeline ID for the deal. Example: "default"')
});

const OutputSchema = z.object({
    id: z.string(),
    dealname: z.string().optional(),
    amount: z.number().optional(),
    closedate: z.string().optional(),
    dealstage: z.string().optional(),
    pipeline: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Update a deal record in HubSpot CRM',
    version: '3.0.0',

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
            endpoint: `/crm/v3/objects/deals/${input.dealId}`,
            data: { properties },
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            dealname: data.properties?.['dealname'] ?? undefined,
            amount: data.properties?.['amount'] ? Number(data.properties['amount']) : undefined,
            closedate: data.properties?.['closedate'] ?? undefined,
            dealstage: data.properties?.['dealstage'] ?? undefined,
            pipeline: data.properties?.['pipeline'] ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
