import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderResourceServerScopeSchema = z.object({
    value: z.string(),
    description: z.string().nullable().optional()
});

const ProviderResourceServerSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    is_system: z.boolean().nullable().optional(),
    identifier: z.string().nullable().optional(),
    scopes: z.array(ProviderResourceServerScopeSchema).nullable().optional(),
    signing_alg: z.string().nullable().optional(),
    signing_secret: z.string().nullable().optional(),
    allow_offline_access: z.boolean().nullable().optional(),
    allow_online_access: z.boolean().nullable().optional(),
    allow_online_access_with_ephemeral_sessions: z.boolean().nullable().optional(),
    skip_consent_for_verifiable_first_party_clients: z.boolean().nullable().optional(),
    token_lifetime: z.number().nullable().optional(),
    token_lifetime_for_web: z.number().nullable().optional(),
    enforce_policies: z.boolean().nullable().optional(),
    token_dialect: z.string().nullable().optional(),
    consent_policy: z.string().nullable().optional(),
    client_id: z.string().nullable().optional()
});

const ResourceServerSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    is_system: z.boolean().optional(),
    identifier: z.string().optional(),
    scopes: z.array(ProviderResourceServerScopeSchema).optional(),
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
    consent_policy: z.string().optional(),
    client_id: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync API resource servers from Auth0',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ResourceServer: ResourceServerSchema
    },
    // https://auth0.com/docs/api/management/v2/resource-servers/get-resource-servers
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/resource-servers'
        }
    ],

    exec: async (nango) => {
        // Auth0 GET /api/v2/resource-servers does not support filtering by updated timestamp,
        // cursors, or since_id. It only provides offset pagination, so this is a
        // checkpointed full refresh that resumes from the last page on failure.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint?.page ?? 0;

        await nango.trackDeletesStart('ResourceServer');

        const proxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/resource-servers/get-resource-servers
            endpoint: '/api/v2/resource-servers',
            params: {
                include_totals: 'false'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 50,
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const resourceServers = batch.map((record: unknown) => {
                const parsed = ProviderResourceServerSchema.parse(record);
                return {
                    id: parsed.id,
                    ...(parsed.name != null && { name: parsed.name }),
                    ...(parsed.is_system != null && { is_system: parsed.is_system }),
                    ...(parsed.identifier != null && { identifier: parsed.identifier }),
                    ...(parsed.scopes != null && { scopes: parsed.scopes }),
                    ...(parsed.signing_alg != null && { signing_alg: parsed.signing_alg }),
                    ...(parsed.signing_secret != null && { signing_secret: parsed.signing_secret }),
                    ...(parsed.allow_offline_access != null && { allow_offline_access: parsed.allow_offline_access }),
                    ...(parsed.allow_online_access != null && { allow_online_access: parsed.allow_online_access }),
                    ...(parsed.allow_online_access_with_ephemeral_sessions != null && {
                        allow_online_access_with_ephemeral_sessions: parsed.allow_online_access_with_ephemeral_sessions
                    }),
                    ...(parsed.skip_consent_for_verifiable_first_party_clients != null && {
                        skip_consent_for_verifiable_first_party_clients: parsed.skip_consent_for_verifiable_first_party_clients
                    }),
                    ...(parsed.token_lifetime != null && { token_lifetime: parsed.token_lifetime }),
                    ...(parsed.token_lifetime_for_web != null && { token_lifetime_for_web: parsed.token_lifetime_for_web }),
                    ...(parsed.enforce_policies != null && { enforce_policies: parsed.enforce_policies }),
                    ...(parsed.token_dialect != null && { token_dialect: parsed.token_dialect }),
                    ...(parsed.consent_policy != null && { consent_policy: parsed.consent_policy }),
                    ...(parsed.client_id != null && { client_id: parsed.client_id })
                };
            });

            if (resourceServers.length > 0) {
                await nango.batchSave(resourceServers, 'ResourceServer');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ResourceServer');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
