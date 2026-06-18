import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Auth0 user ID. Example: "auth0|123456789"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    id: z.string()
});

const action = createAction({
    description: 'Delete or archive a user in Auth0',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/users/delete-users-by-id
        await nango.delete({
            endpoint: `/api/v2/users/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            success: true,
            id: input.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
