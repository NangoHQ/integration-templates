import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const IdentitySchema = z.object({
    user_id: z.string().describe('User ID of the identity to be verified.'),
    provider: z.string().describe('Identity provider name (e.g. google-oauth2).'),
    connection_id: z.string().optional().describe('Connection ID of the identity.')
});

const InputSchema = z.object({
    user_id: z.string().describe('User ID of the user to send the verification email to. Example: auth0|123456789'),
    client_id: z.string().optional().describe('Client ID of the application. If omitted, the global Client ID is used.'),
    identity: IdentitySchema.optional().describe('Identity object for social, enterprise, or passwordless email verification.')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    created_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    status: z.string(),
    created_at: z.string().optional()
});

const action = createAction({
    description: 'Send a verification email to a user in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/send-verification-email',
        group: 'Users'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:users'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/jobs/post-verification-email
            endpoint: '/api/v2/jobs/verification-email',
            data: {
                user_id: input.user_id,
                ...(input.client_id !== undefined && { client_id: input.client_id }),
                ...(input.identity !== undefined && { identity: input.identity })
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            type: providerResponse.type,
            status: providerResponse.status,
            ...(providerResponse.created_at !== undefined && { created_at: providerResponse.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
