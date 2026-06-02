import { z } from 'zod';
import { createAction } from 'nango';

const PermissionSchema = z.object({
    resource_server_identifier: z.string(),
    permission_name: z.string()
});

const InputSchema = z.object({
    user_id: z.string().describe('Auth0 user ID. Example: "auth0|123456789"'),
    permissions: z.array(PermissionSchema).min(1).describe('Array of permission objects to assign')
});

const OutputSchema = z.object({
    success: z.boolean(),
    user_id: z.string(),
    permissions_assigned: z.number()
});

const action = createAction({
    description: 'Assign permissions directly to a user in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/assign-permissions-to-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/users/post-permissions
        await nango.post({
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/permissions`,
            data: {
                permissions: input.permissions
            },
            retries: 3
        });

        return {
            success: true,
            user_id: input.user_id,
            permissions_assigned: input.permissions.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
