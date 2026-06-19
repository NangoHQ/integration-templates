import { z } from 'zod';
import { createAction } from 'nango';

const ScopeSchema = z.object({
    value: z.string(),
    description: z.string().optional()
});

const InputSchema = z.object({
    identifier: z.string().describe('Unique identifier for the resource server. Example: "https://api.example.com"'),
    name: z.string().optional().describe('Friendly name for the resource server.'),
    scopes: z.array(ScopeSchema).optional().describe('List of permission scopes.'),
    token_lifetime: z.number().optional().describe('Token lifetime in seconds.'),
    token_lifetime_for_web: z.number().optional().describe('Token lifetime for web in seconds.'),
    allow_offline_access: z.boolean().optional().describe('Whether refresh tokens can be issued.'),
    signing_alg: z.string().optional().describe('Signing algorithm for tokens.')
});

const ProviderResourceServerSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    name: z.string().optional(),
    scopes: z.array(ScopeSchema).optional(),
    token_lifetime: z.number().optional(),
    token_lifetime_for_web: z.number().optional(),
    allow_offline_access: z.boolean().optional(),
    signing_alg: z.string().optional(),
    is_system: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    name: z.string().optional(),
    scopes: z.array(ScopeSchema).optional(),
    token_lifetime: z.number().optional(),
    token_lifetime_for_web: z.number().optional(),
    allow_offline_access: z.boolean().optional(),
    signing_alg: z.string().optional(),
    is_system: z.boolean().optional()
});

const action = createAction({
    description: 'Create an API resource server in Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:resource_servers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/resource-servers/post-resource-servers
            endpoint: '/api/v2/resource-servers',
            data: {
                identifier: input.identifier,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.scopes !== undefined && { scopes: input.scopes }),
                ...(input.token_lifetime !== undefined && { token_lifetime: input.token_lifetime }),
                ...(input.token_lifetime_for_web !== undefined && { token_lifetime_for_web: input.token_lifetime_for_web }),
                ...(input.allow_offline_access !== undefined && { allow_offline_access: input.allow_offline_access }),
                ...(input.signing_alg !== undefined && { signing_alg: input.signing_alg })
            },
            retries: 3
        });

        const providerResourceServer = ProviderResourceServerSchema.parse(response.data);

        return {
            id: providerResourceServer.id,
            identifier: providerResourceServer.identifier,
            ...(providerResourceServer.name !== undefined && { name: providerResourceServer.name }),
            ...(providerResourceServer.scopes !== undefined && { scopes: providerResourceServer.scopes }),
            ...(providerResourceServer.token_lifetime !== undefined && { token_lifetime: providerResourceServer.token_lifetime }),
            ...(providerResourceServer.token_lifetime_for_web !== undefined && { token_lifetime_for_web: providerResourceServer.token_lifetime_for_web }),
            ...(providerResourceServer.allow_offline_access !== undefined && { allow_offline_access: providerResourceServer.allow_offline_access }),
            ...(providerResourceServer.signing_alg !== undefined && { signing_alg: providerResourceServer.signing_alg }),
            ...(providerResourceServer.is_system !== undefined && { is_system: providerResourceServer.is_system })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
