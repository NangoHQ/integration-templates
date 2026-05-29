import { createAction } from 'nango';
import * as z from 'zod';

const InputSchema = z.object({
    user_id: z.string().describe('The Auth0 user ID to assign roles to.'),
    roles: z.array(z.string().min(1)).min(1).describe('List of role IDs to assign to the user.')
});

const action = createAction({
    description: 'Assign Auth0 roles to a user.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/assign-roles-to-user' },
    input: InputSchema,
    output: z.null(),
    scopes: ['update:users', 'create:role_members'],
    exec: async (nango, input) => {
        // https://auth0.com/docs/api/management/v2/users/post-user-roles
        const response = await nango.post({
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/roles`,
            data: {
                roles: input.roles
            },
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                message: `Unexpected status code: ${response.status}`
            });
        }

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
