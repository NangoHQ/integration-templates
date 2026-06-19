import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().min(1).describe('The unique identifier for the group. Example: "51d82e22-a356-4506-afa1-2c3992bed3d7"'),
    description: z.string().optional().describe('An optional description for the group.'),
    displayName: z.string().optional().describe('The display name for the group.'),
    mailNickname: z.string().optional().describe('The mail alias for the group.'),
    securityEnabled: z.boolean().optional().describe('Specifies whether the group is a security group.'),
    visibility: z.enum(['Private', 'Public']).optional().describe('Specifies the visibility of a Microsoft 365 group.'),
    allowExternalSenders: z.boolean().optional().describe('Indicates whether people external to the organization can send messages to the group.'),
    autoSubscribeNewMembers: z
        .boolean()
        .optional()
        .describe('Indicates whether new members added to the group will be auto-subscribed to receive email notifications.'),
    preferredDataLocation: z.string().optional().describe('The preferred data location for the Microsoft 365 group.'),
    uniqueName: z.string().optional().describe('The unique identifier that can be assigned to a group.')
});

const OutputSchema = z.object({
    success: z.boolean(),
    groupId: z.string()
});

const action = createAction({
    description: 'Update a group in Microsoft.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Group.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, string | boolean> = {};

        if (input.description !== undefined) {
            updateData['description'] = input.description;
        }
        if (input.displayName !== undefined) {
            updateData['displayName'] = input.displayName;
        }
        if (input.mailNickname !== undefined) {
            updateData['mailNickname'] = input.mailNickname;
        }
        if (input.securityEnabled !== undefined) {
            updateData['securityEnabled'] = input.securityEnabled;
        }
        if (input.visibility !== undefined) {
            updateData['visibility'] = input.visibility;
        }
        if (input.allowExternalSenders !== undefined) {
            updateData['allowExternalSenders'] = input.allowExternalSenders;
        }
        if (input.autoSubscribeNewMembers !== undefined) {
            updateData['autoSubscribeNewMembers'] = input.autoSubscribeNewMembers;
        }
        if (input.preferredDataLocation !== undefined) {
            updateData['preferredDataLocation'] = input.preferredDataLocation;
        }
        if (input.uniqueName !== undefined) {
            updateData['uniqueName'] = input.uniqueName;
        }

        if (Object.keys(updateData).length === 0) {
            throw new nango.ActionError({
                type: 'no_update_fields',
                message: 'At least one field to update must be provided.'
            });
        }

        // https://learn.microsoft.com/en-us/graph/api/group-update
        const response = await nango.patch({
            endpoint: `/v1.0/groups/${encodeURIComponent(input.groupId)}`,
            data: updateData,
            retries: 10
        });

        if (response.status !== 200 && response.status !== 204) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: `Failed to update group. Status: ${response.status}`,
                status: response.status
            });
        }

        return {
            success: true,
            groupId: input.groupId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
