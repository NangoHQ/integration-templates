import { z } from 'zod';
import { createAction } from 'nango';

const PermissionSchema = z.object({
    permission_name: z.string().describe('Name of the permission. Example: "read:test"'),
    resource_server_identifier: z.string().describe('Resource server (API) identifier. Example: "https://test-api.example.com"')
});

const InputSchema = z.object({
    user_id: z.string().describe('ID of the user to remove permissions from. Example: "auth0|123"'),
    permissions: z.array(PermissionSchema).min(1).describe('Array of permissions to remove from the user.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove permissions from a user in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-permissions-from-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://auth0.com/docs/api/management/v2/users/delete-permissions
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/permissions`,
            data: {
                permissions: input.permissions
            },
            retries: 1
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 204 No Content but received ${response.status}`,
                status: response.status
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
