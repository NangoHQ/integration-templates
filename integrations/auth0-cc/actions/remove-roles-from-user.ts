import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('Auth0 user ID. Example: "auth0|123"'),
    roles: z.array(z.string().min(1)).min(1).describe('List of role IDs to remove from the user.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Remove Auth0 roles from a user.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/remove-roles-from-user',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:users', 'delete:role_members'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/users/delete-user-roles
        await nango.delete({
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/roles`,
            data: {
                roles: input.roles
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
