import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    displayName: z.string().describe('The display name for the group. Example: "Engineering Team"'),
    description: z.string().optional().describe('An optional description for the group. Example: "Team collaboration space"'),
    mailNickname: z.string().optional().describe('The mail alias for the group. If omitted, a default will be generated. Example: "engineeringteam"'),
    mailEnabled: z.boolean().optional().describe('Whether the group is mail-enabled. Default: false for security groups'),
    securityEnabled: z.boolean().optional().describe('Whether the group is a security group. Default: true'),
    groupTypes: z.array(z.string()).optional().describe('Group type classification. Use ["Unified"] for Microsoft 365 groups, leave empty for security groups.')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    mailNickname: z.string().nullable().optional(),
    mailEnabled: z.boolean().nullable().optional(),
    securityEnabled: z.boolean().nullable().optional(),
    groupTypes: z.array(z.string()).nullable().optional(),
    createdDateTime: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The unique identifier of the created group'),
    displayName: z.string().optional().describe('The display name of the group'),
    description: z.string().optional().describe('The description of the group'),
    mailNickname: z.string().optional().describe('The mail alias of the group'),
    mailEnabled: z.boolean().optional().describe('Whether the group is mail-enabled'),
    securityEnabled: z.boolean().optional().describe('Whether the group is a security group'),
    groupTypes: z.array(z.string()).optional().describe('Group type classification'),
    createdDateTime: z.string().optional().describe('The date and time the group was created')
});

const action = createAction({
    description: 'Create a group in Microsoft',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Group.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            displayName: input.displayName,
            mailEnabled: input.mailEnabled ?? false,
            securityEnabled: input.securityEnabled ?? true
        };

        if (input.mailNickname !== undefined) {
            requestBody['mailNickname'] = input.mailNickname;
        }

        if (input.description !== undefined) {
            requestBody['description'] = input.description;
        }

        if (input.groupTypes !== undefined) {
            requestBody['groupTypes'] = input.groupTypes;
        }

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/graph/api/group-post-groups
            endpoint: '/v1.0/groups',
            data: requestBody,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Failed to create group - no response data received'
            });
        }

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            ...(providerGroup.displayName != null && { displayName: providerGroup.displayName }),
            ...(providerGroup.description != null && { description: providerGroup.description }),
            ...(providerGroup.mailNickname != null && { mailNickname: providerGroup.mailNickname }),
            ...(providerGroup.mailEnabled != null && { mailEnabled: providerGroup.mailEnabled }),
            ...(providerGroup.securityEnabled != null && { securityEnabled: providerGroup.securityEnabled }),
            ...(providerGroup.groupTypes != null && { groupTypes: providerGroup.groupTypes }),
            ...(providerGroup.createdDateTime != null && { createdDateTime: providerGroup.createdDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
