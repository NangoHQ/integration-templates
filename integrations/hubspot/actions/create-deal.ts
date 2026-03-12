import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    deal_name: z.string().optional().describe('Deal name. Example: "Acme Corp Deal"'),
    amount: z.number().optional().describe('Deal amount in company currency. Example: 50000'),
    dealstage: z.string().optional().describe('Deal stage ID. Example: "appointmentscheduled"'),
    pipeline: z.string().optional().describe('Pipeline ID. Example: "default"'),
    closedate: z.string().optional().describe('Expected close date. ISO 8601 format. Example: "2025-12-31T23:59:59Z"'),
    hubspot_owner_id: z.string().optional().describe('Owner ID to assign the deal to. Example: "12345678"')
});

const OutputSchema = z.object({
    id: z.string(),
    deal_name: z.union([z.string(), z.null()]),
    amount: z.union([z.number(), z.null()]),
    dealstage: z.union([z.string(), z.null()]),
    pipeline: z.union([z.string(), z.null()]),
    closedate: z.union([z.string(), z.null()]),
    hubspot_owner_id: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Create a deal record in HubSpot',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-deal',
        group: 'Deals'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.deals.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const properties: Record<string, any> = {};

        if (input.deal_name) properties['dealname'] = input.deal_name;
        if (input.amount !== undefined) properties['amount'] = input.amount;
        if (input.dealstage) properties['dealstage'] = input.dealstage;
        if (input.pipeline) properties['pipeline'] = input.pipeline;
        if (input.closedate) properties['closedate'] = input.closedate;
        if (input.hubspot_owner_id) properties['hubspot_owner_id'] = input.hubspot_owner_id;

        const response = await nango.post({
            // https://developers.hubspot.com/docs/api-reference/crm-api/deals
            endpoint: '/crm/v3/objects/deals',
            data: { properties },
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            deal_name: data.properties?.['dealname'] ?? null,
            amount: data.properties?.['amount'] ? Number(data.properties['amount']) : null,
            dealstage: data.properties?.['dealstage'] ?? null,
            pipeline: data.properties?.['pipeline'] ?? null,
            closedate: data.properties?.['closedate'] ?? null,
            hubspot_owner_id: data.properties?.['hubspot_owner_id'] ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
