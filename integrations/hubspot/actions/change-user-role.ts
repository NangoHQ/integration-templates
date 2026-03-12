import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID or email. Example: "12345" or "user@example.com"'),
    id_property: z
        .enum(['EMAIL', 'USER_ID'])
        .optional()
        .describe('Property type for the user_id. Use EMAIL if user_id is an email, USER_ID if it is a user ID.'),
    role_id: z.string().optional().describe('Role ID to assign to the user. Example: "1234"'),
    primary_team_id: z.string().optional().describe('Primary team ID to assign to the user. Example: "5678"'),
    secondary_team_ids: z.array(z.string()).optional().describe('Array of secondary team IDs to assign to the user. Example: ["9101", "1121"]')
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.union([z.string(), z.null()]),
    last_name: z.union([z.string(), z.null()]),
    role_ids: z.array(z.string()),
    primary_team_id: z.union([z.string(), z.null()]),
    secondary_team_ids: z.array(z.string()),
    super_admin: z.boolean()
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

        if (input.role_id) {
            updateData['roleId'] = input.role_id;
        }

        if (input.primary_team_id) {
            updateData['primaryTeamId'] = input.primary_team_id;
        }

        if (input.secondary_team_ids && input.secondary_team_ids.length > 0) {
            updateData['secondaryTeamIds'] = input.secondary_team_ids;
        }

        const params: Record<string, string> = {};
        if (input.id_property) {
            params['idProperty'] = input.id_property;
        }

        // https://developers.hubspot.com/docs/api-reference/settings-user-provisioning-v3/users/put-settings-v3-users-userId
        const response = await nango.put({
            endpoint: `/settings/v3/users/${input.user_id}`,
            params,
            data: updateData,
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            email: data.email,
            first_name: data.firstName ?? null,
            last_name: data.lastName ?? null,
            role_ids: data.roleIds ?? [],
            primary_team_id: data.primaryTeamId ?? null,
            secondary_team_ids: data.secondaryTeamIds ?? [],
            super_admin: data.superAdmin ?? false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
