import { z } from 'zod';
import { createAction } from 'nango';

const ResourceServerScopeSchema = z.object({
    value: z.string().min(1).max(280).describe('Value of this scope.'),
    description: z.string().max(500).optional().describe('User-friendly description of this scope.')
});

const InputSchema = z.object({
    id: z.string().describe('ID or audience of the resource server to update.'),
    name: z
        .string()
        .max(200)
        .regex(/^[^<>]+$/)
        .optional()
        .describe('Friendly name for this resource server. Can not contain `<` or `>` characters.'),
    scopes: z.array(ResourceServerScopeSchema).optional().describe('List of permissions (scopes) that this API uses.'),
    signing_alg: z.enum(['HS256', 'RS256', 'RS512', 'PS256']).optional().describe('Algorithm used to sign JWTs.'),
    signing_secret: z.string().min(16).optional().describe('Secret used to sign tokens when using symmetric algorithms (HS256).'),
    skip_consent_for_verifiable_first_party_clients: z
        .boolean()
        .optional()
        .describe('Whether to skip user consent for applications flagged as first party (true) or not (false).'),
    allow_offline_access: z.boolean().optional().describe('Whether refresh tokens can be issued for this API (true) or not (false).'),
    allow_online_access: z.boolean().optional().describe('Whether Online Refresh Tokens can be issued for this API (true) or not (false).'),
    allow_online_access_with_ephemeral_sessions: z
        .boolean()
        .optional()
        .describe('Whether Online Refresh Tokens can be issued even when sessions are configured as ephemeral (true) or not (false).'),
    token_lifetime: z
        .number()
        .int()
        .min(0)
        .max(2592000)
        .optional()
        .describe('Expiration value (in seconds) for access tokens issued for this API from the token endpoint.'),
    token_dialect: z
        .enum(['access_token', 'access_token_authz', 'rfc9068_profile', 'rfc9068_profile_authz'])
        .optional()
        .describe('Dialect of issued access token.'),
    enforce_policies: z.boolean().optional().describe('Whether authorization policies are enforced (true) or not enforced (false).')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    is_system: z.boolean().optional(),
    identifier: z.string().optional(),
    scopes: z.array(ResourceServerScopeSchema).optional(),
    signing_alg: z.string().optional(),
    signing_secret: z.string().optional(),
    allow_offline_access: z.boolean().optional(),
    allow_online_access: z.boolean().optional(),
    allow_online_access_with_ephemeral_sessions: z.boolean().optional(),
    skip_consent_for_verifiable_first_party_clients: z.boolean().optional(),
    token_lifetime: z.number().optional(),
    token_lifetime_for_web: z.number().optional(),
    enforce_policies: z.boolean().optional(),
    token_dialect: z.string().optional(),
    client_id: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    is_system: z.boolean().optional(),
    identifier: z.string().optional(),
    scopes: z.array(ResourceServerScopeSchema).optional(),
    signing_alg: z.string().optional(),
    signing_secret: z.string().optional(),
    allow_offline_access: z.boolean().optional(),
    allow_online_access: z.boolean().optional(),
    allow_online_access_with_ephemeral_sessions: z.boolean().optional(),
    skip_consent_for_verifiable_first_party_clients: z.boolean().optional(),
    token_lifetime: z.number().optional(),
    token_lifetime_for_web: z.number().optional(),
    enforce_policies: z.boolean().optional(),
    token_dialect: z.string().optional(),
    client_id: z.string().optional()
});

const action = createAction({
    description: 'Update an API resource server in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-resource-server',
        group: 'Resource Servers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:resource_servers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};

        if (input.name !== undefined) {
            payload['name'] = input.name;
        }
        if (input.scopes !== undefined) {
            payload['scopes'] = input.scopes;
        }
        if (input.signing_alg !== undefined) {
            payload['signing_alg'] = input.signing_alg;
        }
        if (input.signing_secret !== undefined) {
            payload['signing_secret'] = input.signing_secret;
        }
        if (input.skip_consent_for_verifiable_first_party_clients !== undefined) {
            payload['skip_consent_for_verifiable_first_party_clients'] = input.skip_consent_for_verifiable_first_party_clients;
        }
        if (input.allow_offline_access !== undefined) {
            payload['allow_offline_access'] = input.allow_offline_access;
        }
        if (input.allow_online_access !== undefined) {
            payload['allow_online_access'] = input.allow_online_access;
        }
        if (input.allow_online_access_with_ephemeral_sessions !== undefined) {
            payload['allow_online_access_with_ephemeral_sessions'] = input.allow_online_access_with_ephemeral_sessions;
        }
        if (input.token_lifetime !== undefined) {
            payload['token_lifetime'] = input.token_lifetime;
        }
        if (input.token_dialect !== undefined) {
            payload['token_dialect'] = input.token_dialect;
        }
        if (input.enforce_policies !== undefined) {
            payload['enforce_policies'] = input.enforce_policies;
        }

        const response = await nango.patch({
            // https://auth0.com/docs/api/management/v2/resource-servers/patch-resource-servers-by-id
            endpoint: `/api/v2/resource-servers/${encodeURIComponent(input.id)}`,
            data: payload,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Resource server with ID ${input.id} not found.`
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            ...(providerData.name !== undefined && { name: providerData.name }),
            ...(providerData.is_system !== undefined && { is_system: providerData.is_system }),
            ...(providerData.identifier !== undefined && { identifier: providerData.identifier }),
            ...(providerData.scopes !== undefined && { scopes: providerData.scopes }),
            ...(providerData.signing_alg !== undefined && { signing_alg: providerData.signing_alg }),
            ...(providerData.signing_secret !== undefined && { signing_secret: providerData.signing_secret }),
            ...(providerData.allow_offline_access !== undefined && { allow_offline_access: providerData.allow_offline_access }),
            ...(providerData.allow_online_access !== undefined && { allow_online_access: providerData.allow_online_access }),
            ...(providerData.allow_online_access_with_ephemeral_sessions !== undefined && {
                allow_online_access_with_ephemeral_sessions: providerData.allow_online_access_with_ephemeral_sessions
            }),
            ...(providerData.skip_consent_for_verifiable_first_party_clients !== undefined && {
                skip_consent_for_verifiable_first_party_clients: providerData.skip_consent_for_verifiable_first_party_clients
            }),
            ...(providerData.token_lifetime !== undefined && { token_lifetime: providerData.token_lifetime }),
            ...(providerData.token_lifetime_for_web !== undefined && { token_lifetime_for_web: providerData.token_lifetime_for_web }),
            ...(providerData.enforce_policies !== undefined && { enforce_policies: providerData.enforce_policies }),
            ...(providerData.token_dialect !== undefined && { token_dialect: providerData.token_dialect }),
            ...(providerData.client_id !== undefined && { client_id: providerData.client_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
