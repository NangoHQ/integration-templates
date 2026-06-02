import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    client_id: z.string().describe('The ID of the client to retrieve. Example: "AaiyAPdpYdesoKnqjj8HJqRn4T5titww"')
});

const OutputSchema = z
    .object({
        client_id: z.string(),
        tenant: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        global: z.boolean().nullable().optional(),
        client_secret: z.string().nullable().optional(),
        app_type: z.string().nullable().optional(),
        logo_uri: z.string().nullable().optional(),
        is_first_party: z.boolean().nullable().optional(),
        oidc_conformant: z.boolean().nullable().optional(),
        callbacks: z.array(z.string()).nullable().optional(),
        allowed_origins: z.array(z.string()).nullable().optional(),
        web_origins: z.array(z.string()).nullable().optional(),
        client_aliases: z.array(z.string()).nullable().optional(),
        allowed_clients: z.array(z.string()).nullable().optional(),
        allowed_logout_urls: z.array(z.string()).nullable().optional(),
        grant_types: z.array(z.string()).nullable().optional(),
        sso: z.boolean().nullable().optional(),
        sso_disabled: z.boolean().nullable().optional(),
        cross_origin_authentication: z.boolean().nullable().optional(),
        cross_origin_loc: z.string().nullable().optional(),
        custom_login_page_on: z.boolean().nullable().optional(),
        custom_login_page: z.string().nullable().optional(),
        custom_login_page_preview: z.string().nullable().optional(),
        form_template: z.string().nullable().optional(),
        token_endpoint_auth_method: z.string().nullable().optional(),
        is_token_endpoint_ip_header_trusted: z.boolean().nullable().optional(),
        initiate_login_uri: z.string().nullable().optional(),
        require_pushed_authorization_requests: z.boolean().nullable().optional(),
        require_proof_of_possession: z.boolean().nullable().optional(),
        jwks_uri: z.string().nullable().optional(),
        external_client_id: z.string().nullable().optional(),
        external_metadata_type: z.string().nullable().optional(),
        external_metadata_created_by: z.string().nullable().optional(),
        resource_server_identifier: z.string().nullable().optional(),
        compliance_level: z.string().nullable().optional(),
        client_metadata: z.record(z.string(), z.string()).nullable().optional(),
        addons: z.record(z.string(), z.unknown()).nullable().optional(),
        jwt_configuration: z.record(z.string(), z.unknown()).nullable().optional(),
        encryption_key: z.record(z.string(), z.unknown()).nullable().optional(),
        mobile: z.record(z.string(), z.unknown()).nullable().optional(),
        refresh_token: z.record(z.string(), z.unknown()).nullable().optional(),
        default_organization: z.record(z.string(), z.unknown()).nullable().optional(),
        organization_usage: z.string().nullable().optional(),
        organization_require_behavior: z.string().nullable().optional(),
        organization_discovery_methods: z.array(z.string()).nullable().optional(),
        client_authentication_methods: z.record(z.string(), z.unknown()).nullable().optional(),
        signed_request_object: z.record(z.string(), z.unknown()).nullable().optional(),
        token_exchange: z.record(z.string(), z.unknown()).nullable().optional(),
        session_transfer: z.record(z.string(), z.unknown()).nullable().optional(),
        oidc_logout: z.record(z.string(), z.unknown()).nullable().optional(),
        signing_keys: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        native_social_login: z.record(z.string(), z.unknown()).nullable().optional(),
        fedcm_login: z.record(z.string(), z.unknown()).nullable().optional(),
        token_quota: z.record(z.string(), z.unknown()).nullable().optional(),
        express_configuration: z.record(z.string(), z.unknown()).nullable().optional(),
        my_organization_configuration: z.record(z.string(), z.unknown()).nullable().optional(),
        async_approval_notification_channels: z.array(z.string()).nullable().optional(),
        par_request_expiry: z.number().nullable().optional(),
        skip_non_verifiable_callback_uri_confirmation_prompt: z.boolean().nullable().optional(),
        third_party_security_mode: z.string().nullable().optional(),
        redirection_policy: z.string().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single client from Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-client',
        group: 'Clients'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:clients'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://auth0.com/docs/api/management/v2/clients/get-clients-by-id
            endpoint: `/api/v2/clients/${encodeURIComponent(input.client_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Client not found',
                client_id: input.client_id
            });
        }

        const providerClient = OutputSchema.parse(response.data);
        return providerClient;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
