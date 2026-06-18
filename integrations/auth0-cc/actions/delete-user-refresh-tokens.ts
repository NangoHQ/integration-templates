import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('Auth0 user ID. Example: "auth0|1234567890"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Revoke all refresh tokens for a user in Auth0',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:refresh_tokens'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/users/delete-refresh-tokens-for-user
        await nango.delete({
            endpoint: `/api/v2/users/${encodeURIComponent(input.userId)}/refresh-tokens`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
