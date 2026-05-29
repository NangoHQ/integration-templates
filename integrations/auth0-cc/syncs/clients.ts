import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderClientSchema = z.object({
    client_id: z.string(),
    tenant: z.string().nullish(),
    name: z.string().nullish(),
    description: z.string().nullish(),
    global: z.boolean().nullish(),
    app_type: z.string().nullish(),
    logo_uri: z.string().nullish(),
    is_first_party: z.boolean().nullish(),
    oidc_conformant: z.boolean().nullish(),
    callbacks: z.array(z.string()).nullish(),
    allowed_origins: z.array(z.string()).nullish(),
    web_origins: z.array(z.string()).nullish(),
    allowed_logout_urls: z.array(z.string()).nullish(),
    grant_types: z.array(z.string()).nullish(),
    is_token_endpoint_ip_header_trusted: z.boolean().nullish(),
    initiate_login_uri: z.string().nullish(),
    organization_usage: z.string().nullish(),
    organization_require_behavior: z.string().nullish(),
    require_pushed_authorization_requests: z.boolean().nullish(),
    require_proof_of_possession: z.boolean().nullish(),
    sso_disabled: z.boolean().nullish(),
    cross_origin_authentication: z.boolean().nullish(),
    custom_login_page_on: z.boolean().nullish(),
    custom_login_page: z.string().nullish(),
    client_metadata: z.record(z.string(), z.string()).nullish()
});

const ClientSchema = z.object({
    id: z.string(),
    client_id: z.string().optional(),
    tenant: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    global: z.boolean().optional(),
    app_type: z.string().optional(),
    logo_uri: z.string().optional(),
    is_first_party: z.boolean().optional(),
    oidc_conformant: z.boolean().optional(),
    callbacks: z.array(z.string()).optional(),
    allowed_origins: z.array(z.string()).optional(),
    web_origins: z.array(z.string()).optional(),
    allowed_logout_urls: z.array(z.string()).optional(),
    grant_types: z.array(z.string()).optional(),
    is_token_endpoint_ip_header_trusted: z.boolean().optional(),
    initiate_login_uri: z.string().optional(),
    organization_usage: z.string().optional(),
    organization_require_behavior: z.string().optional(),
    require_pushed_authorization_requests: z.boolean().optional(),
    require_proof_of_possession: z.boolean().optional(),
    sso_disabled: z.boolean().optional(),
    cross_origin_authentication: z.boolean().optional(),
    custom_login_page_on: z.boolean().optional(),
    custom_login_page: z.string().optional(),
    client_metadata: z.record(z.string(), z.string()).optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync clients from Auth0',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Client: ClientSchema
    },
    endpoints: [
        {
            path: '/syncs/clients',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        // Auth0 GET /api/v2/clients does not support filtering by updated timestamp,
        // cursors, or since_id. It only provides offset pagination, so this is a
        // checkpointed full refresh that resumes from the last page on failure.
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = checkpoint?.page ?? 0;

        await nango.trackDeletesStart('Client');

        const proxyConfig: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/clients/get-clients
            endpoint: '/api/v2/clients',
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
            const records = z.array(ProviderClientSchema).safeParse(batch);
            if (!records.success) {
                throw new Error('Failed to parse clients page');
            }

            const clients = records.data.map((record) => ({
                id: record.client_id,
                ...(record.tenant != null && { tenant: record.tenant }),
                ...(record.name != null && { name: record.name }),
                ...(record.description != null && { description: record.description }),
                ...(record.global != null && { global: record.global }),
                ...(record.app_type != null && { app_type: record.app_type }),
                ...(record.logo_uri != null && { logo_uri: record.logo_uri }),
                ...(record.is_first_party != null && { is_first_party: record.is_first_party }),
                ...(record.oidc_conformant != null && { oidc_conformant: record.oidc_conformant }),
                ...(record.callbacks != null && { callbacks: record.callbacks }),
                ...(record.allowed_origins != null && { allowed_origins: record.allowed_origins }),
                ...(record.web_origins != null && { web_origins: record.web_origins }),
                ...(record.allowed_logout_urls != null && { allowed_logout_urls: record.allowed_logout_urls }),
                ...(record.grant_types != null && { grant_types: record.grant_types }),
                ...(record.is_token_endpoint_ip_header_trusted != null && { is_token_endpoint_ip_header_trusted: record.is_token_endpoint_ip_header_trusted }),
                ...(record.initiate_login_uri != null && { initiate_login_uri: record.initiate_login_uri }),
                ...(record.organization_usage != null && { organization_usage: record.organization_usage }),
                ...(record.organization_require_behavior != null && { organization_require_behavior: record.organization_require_behavior }),
                ...(record.require_pushed_authorization_requests != null && {
                    require_pushed_authorization_requests: record.require_pushed_authorization_requests
                }),
                ...(record.require_proof_of_possession != null && { require_proof_of_possession: record.require_proof_of_possession }),
                ...(record.sso_disabled != null && { sso_disabled: record.sso_disabled }),
                ...(record.cross_origin_authentication != null && { cross_origin_authentication: record.cross_origin_authentication }),
                ...(record.custom_login_page_on != null && { custom_login_page_on: record.custom_login_page_on }),
                ...(record.custom_login_page != null && { custom_login_page: record.custom_login_page }),
                ...(record.client_metadata != null && { client_metadata: record.client_metadata })
            }));

            if (clients.length > 0) {
                await nango.batchSave(clients, 'Client');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Client');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
