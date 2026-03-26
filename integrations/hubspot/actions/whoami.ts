import { z } from 'zod';
import { createAction } from 'nango';

// No input needed for whoami
const InputSchema = z.object({});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string(),
    hubId: z.number(),
    hubDomain: z.string().optional()
});

const action = createAction({
    description: "Retrieve the current authenticated HubSpot user's ID and email",
    version: '3.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/whoami',
        group: 'Users'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['oauth'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/legacy/oauth-v1/get-oauth-v1-access-tokens-token
        // First, get the connection to access the access token
        const connection = await nango.getConnection();

        if (!connection.credentials || typeof connection.credentials !== 'object') {
            throw new nango.ActionError({
                type: 'missing_credentials',
                message: 'Connection credentials are missing or invalid'
            });
        }

        let accessToken: string;
        if ('access_token' in connection.credentials && typeof connection.credentials.access_token === 'string') {
            accessToken = connection.credentials.access_token;
        } else {
            throw new nango.ActionError({
                type: 'missing_token',
                message: 'Access token not found in connection'
            });
        }

        const response = await nango.get({
            endpoint: `/oauth/v1/access-tokens/${accessToken}`,
            retries: 3
        });

        const data = response.data;

        return {
            id: String(data.user_id),
            email: data.user,
            hubId: data.hub_id,
            hubDomain: data.hub_domain ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
