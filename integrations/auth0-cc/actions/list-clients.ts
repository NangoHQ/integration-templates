import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const ClientSchema = z
    .object({
        client_id: z.string(),
        name: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        app_type: z.string().nullable().optional(),
        tenant: z.string().nullable().optional(),
        global: z.boolean().nullable().optional(),
        is_first_party: z.boolean().nullable().optional(),
        oidc_conformant: z.boolean().nullable().optional(),
        callbacks: z.array(z.string()).nullable().optional(),
        allowed_origins: z.array(z.string()).nullable().optional(),
        web_origins: z.array(z.string()).nullable().optional(),
        grant_types: z.array(z.string()).nullable().optional(),
        logo_uri: z.string().nullable().optional(),
        initiate_login_uri: z.string().nullable().optional(),
        custom_login_page_on: z.boolean().nullable().optional(),
        sso: z.boolean().nullable().optional(),
        cross_origin_authentication: z.boolean().nullable().optional(),
        token_endpoint_auth_method: z.string().nullable().optional(),
        client_secret: z.string().nullable().optional(),
        allowed_logout_urls: z.array(z.string()).nullable().optional(),
        client_metadata: z.record(z.string(), z.string()).nullable().optional(),
        refresh_token: z.unknown().optional(),
        organization_usage: z.string().nullable().optional(),
        organization_require_behavior: z.string().nullable().optional(),
        mobile: z.unknown().optional(),
        addons: z.unknown().optional(),
        jwt_configuration: z.unknown().optional(),
        signing_keys: z.array(z.unknown()).nullable().optional(),
        encryption_key: z.unknown().optional(),
        client_authentication_methods: z.unknown().optional(),
        require_pushed_authorization_requests: z.boolean().nullable().optional(),
        require_proof_of_possession: z.boolean().nullable().optional(),
        signed_request_object: z.unknown().optional(),
        compliance_level: z.string().nullable().optional(),
        skip_non_verifiable_callback_uri_confirmation_prompt: z.boolean().nullable().optional(),
        token_exchange: z.unknown().optional(),
        par_request_expiry: z.number().nullable().optional(),
        token_quota: z.unknown().optional(),
        express_configuration: z.unknown().optional(),
        my_organization_configuration: z.unknown().optional(),
        third_party_security_mode: z.string().nullable().optional(),
        redirection_policy: z.string().nullable().optional(),
        resource_server_identifier: z.string().nullable().optional(),
        async_approval_notification_channels: z.unknown().optional(),
        external_metadata_type: z.string().nullable().optional(),
        external_metadata_created_by: z.string().nullable().optional(),
        external_client_id: z.string().nullable().optional(),
        jwks_uri: z.string().nullable().optional()
    })
    .passthrough();

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    per_page: z.number().min(1).max(100).int().optional().describe('Number of results per page. Default is 50, maximum is 100.'),
    fields: z.string().optional().describe('Comma-separated list of fields to include or exclude.'),
    include_fields: z.boolean().optional().describe('Whether specified fields are to be included (true) or excluded (false).'),
    is_global: z.boolean().optional().describe('Filter on the global client parameter.'),
    is_first_party: z.boolean().optional().describe('Filter on whether or not a client is a first-party client.'),
    app_type: z.string().optional().describe('Filter by a comma-separated list of application types.'),
    external_client_id: z.string().optional().describe('Filter by the Client ID Metadata Document URI for CIMD-registered clients.')
});

const PaginatedResponseSchema = z.object({
    start: z.number(),
    limit: z.number(),
    total: z.number(),
    clients: z.array(ClientSchema)
});

const OutputSchema = z.object({
    items: z.array(ClientSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List clients from Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:clients'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const perPage = input.per_page ?? 50;
        let page = 0;
        if (input.cursor) {
            const parsed = parseInt(input.cursor, 10);
            if (Number.isNaN(parsed) || parsed < 0) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string.'
                });
            }
            page = parsed;
        }

        const config: ProxyConfiguration = {
            // https://auth0.com/docs/api/management/v2/clients/get-clients
            endpoint: '/api/v2/clients',
            params: {
                page: String(page),
                per_page: String(perPage),
                include_totals: 'true',
                ...(input.fields !== undefined && { fields: input.fields }),
                ...(input.include_fields !== undefined && { include_fields: String(input.include_fields) }),
                ...(input.is_global !== undefined && { is_global: String(input.is_global) }),
                ...(input.is_first_party !== undefined && { is_first_party: String(input.is_first_party) }),
                ...(input.app_type !== undefined && { app_type: input.app_type }),
                ...(input.external_client_id !== undefined && { external_client_id: input.external_client_id })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const data = PaginatedResponseSchema.parse(response.data);

        const hasMore = data.start + data.clients.length < data.total;
        const nextCursor = hasMore ? String(Math.floor(data.start / data.limit) + 1) : undefined;

        return {
            items: data.clients,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
