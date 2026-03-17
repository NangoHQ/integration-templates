import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID or email. Example: "12345" or "user@example.com"'),
    idProperty: z
        .enum(['EMAIL', 'USER_ID'])
        .optional()
        .describe('Property type for the user_id. Use EMAIL if user_id is an email, USER_ID if it is a user ID.'),
    roleId: z.string().optional().describe('Role ID to assign to the user. Example: "1234"'),
    primaryTeamId: z.string().optional().describe('Primary team ID to assign to the user. Example: "5678"'),
    secondaryTeamIds: z.array(z.string()).optional().describe('Array of secondary team IDs to assign to the user. Example: ["9101", "1121"]')
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    roleIds: z.array(z.string()),
    primaryTeamId: z.string().optional(),
    secondaryTeamIds: z.array(z.string()),
    superAdmin: z.boolean()
});

const action = createAction({
    description: "Update a HubSpot user's role and team assignments",
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/change-user-role',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings.users.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.roleId) {
            updateData['roleId'] = input.roleId;
        }

        if (input.primaryTeamId) {
            updateData['primaryTeamId'] = input.primaryTeamId;
        }

        if (input.secondaryTeamIds && input.secondaryTeamIds.length > 0) {
            updateData['secondaryTeamIds'] = input.secondaryTeamIds;
        }

        const params: Record<string, string> = {};
        if (input.idProperty) {
            params['idProperty'] = input.idProperty;
        }

        // https://developers.hubspot.com/docs/api-reference/settings-user-provisioning-v3/users/put-settings-v3-users-userId
        const response = await nango.put({
            endpoint: `/settings/v3/users/${input.userId}`,
            params,
            data: updateData,
            retries: 3
        });

        const data = response.data;

        return {
            id: data.id,
            email: data.email,
            firstName: data.firstName ?? undefined,
            lastName: data.lastName ?? undefined,
            roleIds: data.roleIds ?? [],
            primaryTeamId: data.primaryTeamId ?? undefined,
            secondaryTeamIds: data.secondaryTeamIds ?? [],
            superAdmin: data.superAdmin ?? false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
