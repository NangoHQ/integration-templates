import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    group_key: z.string().describe('Group key. Example: "company"'),
    group_id: z.string().describe('Group ID. Example: "acme"'),
    property_name: z.string().describe('Name of the list property to union into. Example: "features"'),
    values: z.array(z.union([z.string(), z.number()])).describe('Values to union into the list property. Example: ["feature-a", "feature-b"]'),
    project_token: z.string().optional().describe('Mixpanel project token. If omitted, the connection credentials will be used.')
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.string().nullable()
});

const ConnectionSchema = z.object({
    credentials: z.object({
        type: z.literal('BASIC'),
        username: z.string(),
        password: z.string()
    })
});

const OutputSchema = z.object({
    status: z.number(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Union values into a group profile list property.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        let token = input.project_token;

        if (!token) {
            const connection = ConnectionSchema.parse(await nango.getConnection());
            token = connection.credentials.password;
        }

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/group-union
            baseUrlOverride: 'https://api.mixpanel.com',
            endpoint: '/groups',
            params: {
                ip: 0,
                verbose: 1
            },
            data: [
                {
                    $token: token,
                    $group_key: input.group_key,
                    $group_id: input.group_id,
                    $union: {
                        [input.property_name]: input.values
                    }
                }
            ],
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status !== 1) {
            throw new nango.ActionError({
                type: 'mixpanel_error',
                message: providerResponse.error || 'Mixpanel group union failed',
                status: providerResponse.status
            });
        }

        return {
            status: providerResponse.status,
            ...(providerResponse.error != null && { error: providerResponse.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
