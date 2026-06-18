import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('Auth0 user ID. Example: "auth0|123456789"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Revoke all active sessions for a user in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:sessions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://auth0.com/docs/api/management/v2/users/delete-sessions-for-user
            endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/sessions`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
