import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    group_key: z.string().describe('Group key. Example: "Company"'),
    group_id: z.string().describe('Group ID. Example: "Mixpanel"'),
    token: z
        .string()
        .optional()
        .describe(
            'Mixpanel project token or API secret. If omitted, falls back to the token stored in connection metadata under the key "token", then to the connection Basic Auth password.'
        )
});

const OutputSchema = z.object({
    success: z.boolean(),
    error: z.string().optional()
});

const ProviderResponseSchema = z.union([
    z.number(),
    z.object({
        status: z.number(),
        error: z.string().nullable().optional()
    })
]);

const action = createAction({
    description: 'Delete a group profile.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let token = input.token;

        if (!token) {
            const metadata = await nango.getMetadata();
            if (metadata && typeof metadata === 'object' && 'token' in metadata) {
                const metaToken = metadata['token'];
                if (typeof metaToken === 'string') {
                    token = metaToken;
                }
            }
        }

        if (!token) {
            const connection = await nango.getConnection();
            if (connection && typeof connection === 'object' && 'credentials' in connection) {
                const credentials = connection.credentials;
                if (credentials && typeof credentials === 'object' && 'password' in credentials) {
                    const password = credentials.password;
                    if (typeof password === 'string') {
                        token = password;
                    }
                }
            }
        }

        if (!token) {
            throw new nango.ActionError({
                type: 'missing_token',
                message: 'Missing Mixpanel project token. Provide it as input, in connection metadata, or ensure connection credentials include a password.'
            });
        }

        const config: ProxyConfiguration = {
            // https://developer.mixpanel.com/reference/delete-group
            endpoint: '/groups',
            params: {
                verbose: 1
            },
            data: [
                {
                    $token: token,
                    $group_key: input.group_key,
                    $group_id: input.group_id,
                    $delete: ''
                }
            ],
            retries: 3,
            baseUrlOverride: 'https://api.mixpanel.com'
        };

        const response = await nango.post(config);

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Received an unexpected response format from Mixpanel.',
                response: response.data
            });
        }

        const responseData = parsed.data;
        if (typeof responseData === 'number') {
            return {
                success: responseData === 1
            };
        }

        return {
            success: responseData.status === 1,
            ...(responseData.error != null && { error: responseData.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
