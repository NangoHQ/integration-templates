import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dealName: z.string().optional().describe('Deal name. Example: "Acme Corp Deal"'),
    amount: z.number().optional().describe('Deal amount in company currency. Example: 50000'),
    dealstage: z.string().optional().describe('Deal stage ID. Example: "appointmentscheduled"'),
    pipeline: z.string().optional().describe('Pipeline ID. Example: "default"'),
    closedate: z.string().optional().describe('Expected close date. ISO 8601 format. Example: "2025-12-31T23:59:59Z"'),
    hubspot_owner_id: z.string().optional().describe('Owner ID to assign the deal to. Example: "12345678"')
});

const OutputSchema = z.object({
    id: z.string(),
    dealName: z.string().optional(),
    amount: z.number().optional(),
    dealstage: z.string().optional(),
    pipeline: z.string().optional(),
    closedate: z.string().optional(),
    hubspot_owner_id: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const action = createAction({
    description: 'Create a deal record in HubSpot',
    version: '3.0.0',

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

        if (input.dealName) properties['dealname'] = input.dealName;
        if (input.amount !== undefined) properties['amount'] = input.amount;
        if (input.dealstage) properties['dealstage'] = input.dealstage;
        if (input.pipeline) properties['pipeline'] = input.pipeline;
        if (input.closedate) properties['closedate'] = input.closedate;
        if (input.hubspot_owner_id) properties['hubspot_owner_id'] = input.hubspot_owner_id;

        const response = await nango.post({
            // https://developers.hubspot.com/docs/api-reference/crm-api/deals
            endpoint: '/crm/v3/objects/deals',
            data: { properties },
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            dealName: data.properties?.['dealname'] ?? undefined,
            amount: data.properties?.['amount'] ? Number(data.properties['amount']) : undefined,
            dealstage: data.properties?.['dealstage'] ?? undefined,
            pipeline: data.properties?.['pipeline'] ?? undefined,
            closedate: data.properties?.['closedate'] ?? undefined,
            hubspot_owner_id: data.properties?.['hubspot_owner_id'] ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
