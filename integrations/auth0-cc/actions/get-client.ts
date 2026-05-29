import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    client_id: z.string().describe('The ID of the client to retrieve. Example: "AaiyAPdpYdesoKnqjj8HJqRn4T5titww"')
});

const OutputSchema = z
    .object({
        client_id: z.string(),
        tenant: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        global: z.boolean().optional(),
        client_secret: z.string().optional(),
        app_type: z.string().optional(),
        logo_uri: z.string().optional(),
        is_first_party: z.boolean().optional(),
        oidc_conformant: z.boolean().optional(),
        callbacks: z.array(z.string()).optional(),
        allowed_origins: z.array(z.string()).optional(),
        web_origins: z.array(z.string()).optional(),
        client_aliases: z.array(z.string()).optional(),
        allowed_clients: z.array(z.string()).optional(),
        allowed_logout_urls: z.array(z.string()).optional(),
        grant_types: z.array(z.string()).optional(),
        sso: z.boolean().optional(),
        sso_disabled: z.boolean().optional(),
        cross_origin_authentication: z.boolean().optional(),
        cross_origin_loc: z.string().optional(),
        custom_login_page_on: z.boolean().optional(),
        custom_login_page: z.string().optional(),
        custom_login_page_preview: z.string().optional(),
        form_template: z.string().optional(),
        token_endpoint_auth_method: z.string().optional(),
        is_token_endpoint_ip_header_trusted: z.boolean().optional(),
        initiate_login_uri: z.string().optional(),
        require_pushed_authorization_requests: z.boolean().optional(),
        require_proof_of_possession: z.boolean().optional(),
        jwks_uri: z.string().optional(),
        external_client_id: z.string().optional(),
        external_metadata_type: z.string().optional(),
        external_metadata_created_by: z.string().optional(),
        resource_server_identifier: z.string().optional(),
        compliance_level: z.string().nullable().optional(),
        client_metadata: z.record(z.string(), z.string()).optional(),
        addons: z.record(z.string(), z.unknown()).optional(),
        jwt_configuration: z.record(z.string(), z.unknown()).optional(),
        encryption_key: z.record(z.string(), z.unknown()).optional(),
        mobile: z.record(z.string(), z.unknown()).optional(),
        refresh_token: z.record(z.string(), z.unknown()).optional(),
        default_organization: z.record(z.string(), z.unknown()).optional(),
        organization_usage: z.string().optional(),
        organization_require_behavior: z.string().optional(),
        organization_discovery_methods: z.array(z.string()).optional(),
        client_authentication_methods: z.record(z.string(), z.unknown()).optional(),
        signed_request_object: z.record(z.string(), z.unknown()).optional(),
        token_exchange: z.record(z.string(), z.unknown()).optional(),
        session_transfer: z.record(z.string(), z.unknown()).optional(),
        oidc_logout: z.record(z.string(), z.unknown()).optional(),
        signing_keys: z.array(z.record(z.string(), z.unknown())).optional(),
        native_social_login: z.record(z.string(), z.unknown()).optional(),
        fedcm_login: z.record(z.string(), z.unknown()).optional(),
        token_quota: z.record(z.string(), z.unknown()).optional(),
        express_configuration: z.record(z.string(), z.unknown()).optional(),
        my_organization_configuration: z.record(z.string(), z.unknown()).optional(),
        async_approval_notification_channels: z.array(z.string()).optional(),
        par_request_expiry: z.number().nullable().optional(),
        skip_non_verifiable_callback_uri_confirmation_prompt: z.boolean().optional(),
        third_party_security_mode: z.string().optional(),
        redirection_policy: z.string().optional()
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
