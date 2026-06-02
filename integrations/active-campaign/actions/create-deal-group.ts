import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Pipeline title. Example: "Sales Pipeline"'),
    currency: z.string().describe('Default currency for new deals in this pipeline. Example: "usd"'),
    allgroups: z
        .union([z.literal(0), z.literal(1)])
        .optional()
        .describe('Whether all user groups can manage this pipeline. 1 = yes, 0 = no. Default: 1'),
    allusers: z
        .union([z.literal(0), z.literal(1)])
        .optional()
        .describe('Whether new deals are auto-assigned to all users. 1 = yes, 0 = no. Default: 0'),
    autoassign: z
        .union([z.literal(0), z.literal(1), z.literal(2)])
        .optional()
        .describe('Deal auto-assign mode. 0 = disabled, 1 = round robin, 2 = by value. Default: 1'),
    users: z.array(z.string()).optional().describe('List of user IDs to auto-assign new deals to when auto-assign is enabled.'),
    groups: z.array(z.string()).optional().describe('List of user group IDs allowed to manage this pipeline when allgroups is 0.')
});

const ProviderResponseSchema = z.object({
    dealGroup: z.object({
        allgroups: z
            .union([z.number().int(), z.string()])
            .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
            .optional(),
        allusers: z
            .union([z.number().int(), z.string()])
            .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
            .optional(),
        autoassign: z
            .union([z.number().int(), z.string()])
            .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
            .optional(),
        cdate: z.string().optional(),
        currency: z.string(),
        dealGroupGroups: z.array(z.unknown()).optional(),
        dealGroupUsers: z.array(z.string()).optional(),
        id: z.string(),
        links: z
            .object({
                dealGroupGroups: z.string().optional(),
                dealGroupUsers: z.string().optional(),
                stages: z.string().optional()
            })
            .optional(),
        stages: z.array(z.string()).optional(),
        title: z.string(),
        udate: z.string().optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    currency: z.string(),
    allgroups: z.number().int().optional(),
    allusers: z.number().int().optional(),
    autoassign: z.number().int().optional(),
    stages: z.array(z.string()).optional(),
    cdate: z.string().optional(),
    udate: z.string().optional()
});

const action = createAction({
    description: 'Create a deal group (pipeline) in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-deal-group',
        group: 'Deals'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.activecampaign.com/reference/create-a-pipeline
        const response = await nango.post({
            endpoint: '/3/dealGroups',
            data: {
                dealGroup: {
                    title: input.title,
                    currency: input.currency,
                    ...(input.allgroups !== undefined && { allgroups: input.allgroups }),
                    ...(input.allusers !== undefined && { allusers: input.allusers }),
                    ...(input.autoassign !== undefined && { autoassign: input.autoassign }),
                    ...(input.users !== undefined && { users: input.users }),
                    ...(input.groups !== undefined && { groups: input.groups })
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from ActiveCampaign: missing or invalid response body'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from ActiveCampaign: invalid dealGroup shape',
                details: parsed.error.issues
            });
        }

        const providerDealGroup = parsed.data.dealGroup;

        return {
            id: providerDealGroup.id,
            title: providerDealGroup.title,
            currency: providerDealGroup.currency,
            ...(providerDealGroup.allgroups !== undefined && { allgroups: providerDealGroup.allgroups }),
            ...(providerDealGroup.allusers !== undefined && { allusers: providerDealGroup.allusers }),
            ...(providerDealGroup.autoassign !== undefined && { autoassign: providerDealGroup.autoassign }),
            ...(providerDealGroup.stages !== undefined && { stages: providerDealGroup.stages }),
            ...(providerDealGroup.cdate !== undefined && { cdate: providerDealGroup.cdate }),
            ...(providerDealGroup.udate !== undefined && { udate: providerDealGroup.udate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
