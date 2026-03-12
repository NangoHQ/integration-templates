import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().email().describe('The email address of the user to create. Example: "user@example.com"'),
    first_name: z.string().optional().describe('The first name of the user. Example: "John"'),
    last_name: z.string().optional().describe('The last name of the user. Example: "Doe"'),
    role_id: z.string().optional().describe('The ID of the role/permission set to assign to the user. Example: "12345"'),
    team_id: z.string().optional().describe('The ID of the primary team to assign the user to. Example: "67890"'),
    send_welcome_email: z.boolean().optional().describe('Whether to send a welcome email to the user. Defaults to true if not specified.')
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.union([z.string(), z.null()]),
    last_name: z.union([z.string(), z.null()]),
    role_id: z.union([z.string(), z.null()]),
    team_id: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Provision a HubSpot user with email, role, and team assignments',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/create-user',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings.users.write', 'settings.users.teams.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/settings-user-provisioning-v3/users/post-settings-v3-users-
        const requestBody: Record<string, any> = {
            email: input.email,
            sendWelcomeEmail: input.send_welcome_email ?? true
        };

        if (input.first_name) {
            requestBody['firstName'] = input.first_name;
        }

        if (input.last_name) {
            requestBody['lastName'] = input.last_name;
        }

        if (input.role_id) {
            requestBody['roleId'] = input.role_id;
        }

        if (input.team_id) {
            requestBody['teamId'] = input.team_id;
        }

        const response = await nango.post({
            endpoint: '/settings/v3/users/',
            data: requestBody,
            retries: 10
        });

        const data = response.data;

        return {
            id: data.id,
            email: data.email,
            first_name: data['firstName'] ?? null,
            last_name: data['lastName'] ?? null,
            role_id: data['roleId'] ?? null,
            team_id: data['teamId'] ?? null,
            created_at: data['createdAt'] ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
