import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    crmProspectsIds: z.array(z.string()).optional().describe('CRM IDs of the prospects to list assigned flows for. Example: ["a5V1Q00A120DP4CVAW"]'),
    flowInstanceIds: z.array(z.string()).optional().describe('Assigned flow instance IDs to filter by. Example: ["234599484848423"]')
});

const ProviderProspectSchema = z.object({
    flowId: z.string().optional(),
    flowName: z.string().optional(),
    crmProspectId: z.string().optional(),
    flowInstanceId: z.string().optional(),
    flowInstanceOwnerEmail: z.string().optional(),
    flowInstanceOwnerFullName: z.string().optional(),
    flowInstanceCreateDate: z.string().optional(),
    flowInstanceStatus: z.string().optional(),
    workspaceId: z.string().optional(),
    exclusive: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    prospectsAssigned: z.array(ProviderProspectSchema).optional()
});

const ProspectOutputSchema = z.object({
    flowId: z.string().optional(),
    flowName: z.string().optional(),
    crmProspectId: z.string().optional(),
    flowInstanceId: z.string().optional(),
    flowInstanceOwnerEmail: z.string().optional(),
    flowInstanceOwnerFullName: z.string().optional(),
    flowInstanceCreateDate: z.string().optional(),
    flowInstanceStatus: z.string().optional(),
    workspaceId: z.string().optional(),
    exclusive: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(ProspectOutputSchema)
});

const action = createAction({
    description: 'List prospects and their current flow assignment status.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-flow-prospects',
        group: 'Flows'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:flows:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.crmProspectsIds && !input.flowInstanceIds) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Either crmProspectsIds or flowInstanceIds must be provided.'
            });
        }

        const body: Record<string, unknown> = {};
        if (input.crmProspectsIds !== undefined) {
            body['crmProspectsIds'] = input.crmProspectsIds;
        }
        if (input.flowInstanceIds !== undefined) {
            body['flowInstanceIds'] = input.flowInstanceIds;
        }

        // https://gong.app.gong.io/settings/api/documentation#post-/v2/flows/prospects
        const response = await nango.post({
            endpoint: '/v2/flows/prospects',
            data: body,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const prospectsAssigned = providerData.prospectsAssigned ?? [];

        return {
            items: prospectsAssigned.map((prospect) => ({
                ...(prospect.flowId !== undefined && { flowId: prospect.flowId }),
                ...(prospect.flowName !== undefined && { flowName: prospect.flowName }),
                ...(prospect.crmProspectId !== undefined && { crmProspectId: prospect.crmProspectId }),
                ...(prospect.flowInstanceId !== undefined && { flowInstanceId: prospect.flowInstanceId }),
                ...(prospect.flowInstanceOwnerEmail !== undefined && { flowInstanceOwnerEmail: prospect.flowInstanceOwnerEmail }),
                ...(prospect.flowInstanceOwnerFullName !== undefined && { flowInstanceOwnerFullName: prospect.flowInstanceOwnerFullName }),
                ...(prospect.flowInstanceCreateDate !== undefined && { flowInstanceCreateDate: prospect.flowInstanceCreateDate }),
                ...(prospect.flowInstanceStatus !== undefined && { flowInstanceStatus: prospect.flowInstanceStatus }),
                ...(prospect.workspaceId !== undefined && { workspaceId: prospect.workspaceId }),
                ...(prospect.exclusive !== undefined && { exclusive: prospect.exclusive })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
