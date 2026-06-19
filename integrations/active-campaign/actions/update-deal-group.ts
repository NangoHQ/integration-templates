import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Pipeline ID. Example: "1"'),
    title: z.string().optional().describe('Pipeline title'),
    currency: z.string().optional().describe('Default currency in 3-digit ISO format, lowercased. Example: "usd"'),
    autoassign: z.number().optional().describe('Auto-assign option: 0=disabled, 1=Round Robin, 2=distribute by value'),
    allusers: z.number().optional().describe('Whether new deals auto-assign to all users: 0 or 1'),
    allgroups: z.number().optional().describe('Whether all user groups can manage pipeline: 0 or 1')
});

const ProviderDealGroupSchema = z.object({
    id: z.string(),
    title: z.string(),
    currency: z.string().optional(),
    autoassign: z.string().optional(),
    allusers: z.string().optional(),
    allgroups: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional()
});

const ProviderResponseSchema = z.object({
    dealGroup: ProviderDealGroupSchema
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    currency: z.string().optional(),
    autoassign: z.number().optional(),
    allusers: z.number().optional(),
    allgroups: z.number().optional()
});

const action = createAction({
    description: 'Update a deal group (pipeline) in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deal_group_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};

        if (input.title !== undefined) {
            payload['title'] = input.title;
        }
        if (input.currency !== undefined) {
            payload['currency'] = input.currency;
        }
        if (input.autoassign !== undefined) {
            payload['autoassign'] = input.autoassign;
        }
        if (input.allusers !== undefined) {
            payload['allusers'] = input.allusers;
        }
        if (input.allgroups !== undefined) {
            payload['allgroups'] = input.allgroups;
        }

        // https://developers.activecampaign.com/reference/update-a-pipeline
        const response = await nango.put({
            endpoint: `/3/dealGroups/${encodeURIComponent(input.id)}`,
            data: {
                dealGroup: payload
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const dealGroup = providerData.dealGroup;

        return {
            id: dealGroup.id,
            title: dealGroup.title,
            ...(dealGroup.currency !== undefined && { currency: dealGroup.currency }),
            ...(dealGroup.autoassign !== undefined && { autoassign: Number(dealGroup.autoassign) }),
            ...(dealGroup.allusers !== undefined && { allusers: Number(dealGroup.allusers) }),
            ...(dealGroup.allgroups !== undefined && { allgroups: Number(dealGroup.allgroups) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
