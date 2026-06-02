import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('Auth0 user ID to retrieve blocks for. Example: "auth0|1234567890"')
});

const UserBlockIdentifierSchema = z.object({
    identifier: z.string().optional(),
    ip: z.string().optional(),
    connection: z.string().optional()
});

const ProviderResponseSchema = z.object({
    blocked_for: z.array(UserBlockIdentifierSchema).optional()
});

const OutputSchema = z.object({
    blocked_for: z
        .array(
            z.object({
                identifier: z.string().optional(),
                ip: z.string().optional(),
                connection: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Get blocked-for IPs for a user in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-user-blocks',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:users'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://auth0.com/docs/api/management/v2/user-blocks/get-user-blocks-by-id
        const response = await nango.get({
            endpoint: `/api/v2/user-blocks/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            ...(parsed.blocked_for !== undefined && { blocked_for: parsed.blocked_for })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
