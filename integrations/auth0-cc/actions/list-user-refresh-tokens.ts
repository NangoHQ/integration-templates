import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    user_id: z.string().describe('User ID. Example: "auth0|507f1f77bcf86cd799439020"')
});

const RefreshTokenDateSchema = z.union([z.string(), z.object({}).passthrough(), z.null()]);

const RefreshTokenDeviceSchema = z
    .object({
        initial_ip: z.string().optional(),
        initial_asn: z.string().optional(),
        initial_user_agent: z.string().optional(),
        last_ip: z.string().optional(),
        last_asn: z.string().optional(),
        last_user_agent: z.string().optional()
    })
    .passthrough();

const RefreshTokenResourceServerSchema = z
    .object({
        audience: z.string(),
        scopes: z.string()
    })
    .passthrough();

const ProviderRefreshTokenSchema = z
    .object({
        id: z.string(),
        user_id: z.string(),
        created_at: RefreshTokenDateSchema.optional(),
        idle_expires_at: RefreshTokenDateSchema.optional(),
        expires_at: RefreshTokenDateSchema.optional(),
        device: z.union([RefreshTokenDeviceSchema, z.null()]).optional(),
        client_id: z.string().optional(),
        session_id: z.union([z.string(), z.null()]).optional(),
        rotating: z.boolean().optional(),
        resource_servers: z.array(RefreshTokenResourceServerSchema).optional(),
        refresh_token_metadata: z.union([z.record(z.string(), z.string()), z.null()]).optional(),
        last_exchanged_at: RefreshTokenDateSchema.optional()
    })
    .passthrough();

const RefreshTokenSchema = z.object({
    id: z.string(),
    user_id: z.string(),
    created_at: z.union([z.string(), z.object({}).passthrough()]).optional(),
    idle_expires_at: z.union([z.string(), z.object({}).passthrough()]).optional(),
    expires_at: z.union([z.string(), z.object({}).passthrough()]).optional(),
    device: RefreshTokenDeviceSchema.optional(),
    client_id: z.string().optional(),
    session_id: z.string().optional(),
    rotating: z.boolean().optional(),
    resource_servers: z.array(RefreshTokenResourceServerSchema).optional(),
    refresh_token_metadata: z.record(z.string(), z.string()).optional(),
    last_exchanged_at: z.union([z.string(), z.object({}).passthrough()]).optional()
});

const OutputSchema = z.object({
    tokens: z.array(RefreshTokenSchema)
});

const PaginatedResponseSchema = z.object({
    tokens: z.array(z.unknown()),
    next: z.string().optional()
});

const action = createAction({
    description: 'List refresh tokens issued to a user in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:refresh_tokens'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tokens: Array<z.infer<typeof RefreshTokenSchema>> = [];
        let cursor: string | undefined;

        do {
            const config: ProxyConfiguration = {
                // https://auth0.com/docs/api/management/v2/users/get-refresh-tokens-for-user
                endpoint: `/api/v2/users/${encodeURIComponent(input.user_id)}/refresh-tokens`,
                params: {
                    take: '100',
                    ...(cursor && { from: cursor })
                },
                retries: 3
            };

            const response = await nango.get(config);

            if (Array.isArray(response.data)) {
                for (const item of response.data) {
                    const providerToken = ProviderRefreshTokenSchema.parse(item);
                    tokens.push(mapRefreshToken(providerToken));
                }
                break;
            }

            const pageData = PaginatedResponseSchema.parse(response.data);

            for (const item of pageData.tokens) {
                const providerToken = ProviderRefreshTokenSchema.parse(item);
                tokens.push(mapRefreshToken(providerToken));
            }

            cursor = pageData.next;
        } while (cursor);

        return {
            tokens
        };
    }
});

function mapRefreshToken(providerToken: z.infer<typeof ProviderRefreshTokenSchema>): z.infer<typeof RefreshTokenSchema> {
    return {
        id: providerToken.id,
        user_id: providerToken.user_id,
        ...(providerToken.created_at != null && { created_at: providerToken.created_at }),
        ...(providerToken.idle_expires_at != null && { idle_expires_at: providerToken.idle_expires_at }),
        ...(providerToken.expires_at != null && { expires_at: providerToken.expires_at }),
        ...(providerToken.device != null && { device: providerToken.device }),
        ...(providerToken.client_id !== undefined && { client_id: providerToken.client_id }),
        ...(providerToken.session_id != null && { session_id: providerToken.session_id }),
        ...(providerToken.rotating !== undefined && { rotating: providerToken.rotating }),
        ...(providerToken.resource_servers !== undefined && { resource_servers: providerToken.resource_servers }),
        ...(providerToken.refresh_token_metadata != null && { refresh_token_metadata: providerToken.refresh_token_metadata }),
        ...(providerToken.last_exchanged_at != null && { last_exchanged_at: providerToken.last_exchanged_at })
    };
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
