import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const ResourceServerScopeSchema = z.object({
    value: z.string(),
    description: z.string().optional()
});

const ResourceServerSubjectTypeAuthorizationUserSchema = z
    .object({
        policy: z.string().optional()
    })
    .passthrough();

const ResourceServerSubjectTypeAuthorizationClientSchema = z
    .object({
        policy: z.string().optional()
    })
    .passthrough();

const ResourceServerSubjectTypeAuthorizationSchema = z.object({
    user: ResourceServerSubjectTypeAuthorizationUserSchema.optional(),
    client: ResourceServerSubjectTypeAuthorizationClientSchema.optional()
});

const ResourceServerProofOfPossessionSchema = z
    .object({
        mechanism: z.string().optional(),
        required: z.boolean().optional(),
        required_for: z.string().optional()
    })
    .nullable()
    .optional();

const ResourceServerTokenEncryptionKeySchema = z
    .object({
        name: z.string().optional(),
        alg: z.string().optional(),
        kid: z.string().optional(),
        pem: z.string().optional()
    })
    .passthrough();

const ResourceServerTokenEncryptionSchema = z
    .object({
        format: z.string().optional(),
        encryption_key: ResourceServerTokenEncryptionKeySchema.optional()
    })
    .nullable()
    .optional();

const ResourceServerAuthorizationPolicySchema = z
    .object({
        policy_id: z.string()
    })
    .nullable()
    .optional();

const ProviderResourceServerSchema = z.object({
    id: z.string().optional(),
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
    token_encryption: ResourceServerTokenEncryptionSchema,
    consent_policy: z.string().nullable().optional(),
    authorization_details: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
    proof_of_possession: ResourceServerProofOfPossessionSchema,
    subject_type_authorization: ResourceServerSubjectTypeAuthorizationSchema.optional(),
    authorization_policy: ResourceServerAuthorizationPolicySchema,
    client_id: z.string().optional()
});

const InputSchema = z.object({
    id: z.string().describe('ID or audience of the resource server to retrieve.')
});

const action = createAction({
    description: 'Retrieve a single API resource server from Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-resource-server'
    },
    input: InputSchema,
    output: ProviderResourceServerSchema,
    scopes: ['read:resource_servers'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/resource-servers/get-resource-servers-by-id
            endpoint: `api/v2/resource-servers/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Resource server not found',
                id: input.id
            });
        }

        const resourceServer = ProviderResourceServerSchema.parse(response.data);

        return resourceServer;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
