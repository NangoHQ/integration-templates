import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of this client (min length: 1 character, does not allow `<` or `>`).'),
    description: z.string().optional().describe('Free text description of this client (max length: 140 characters).'),
    app_type: z
        .enum(['native', 'spa', 'regular_web', 'non_interactive', 'resource_server', 'sso_integration'])
        .optional()
        .describe('The type of application this client represents.'),
    callbacks: z
        .array(z.string())
        .optional()
        .describe('Comma-separated list of URLs whitelisted for Auth0 to use as a callback to the client after authentication.'),
    allowed_origins: z
        .array(z.string())
        .optional()
        .describe('Comma-separated list of URLs allowed to make requests from JavaScript to Auth0 API (typically used with CORS).'),
    web_origins: z
        .array(z.string())
        .optional()
        .describe('Comma-separated list of allowed origins for use with Cross-Origin Authentication, Device Flow, and web message response mode.'),
    logo_uri: z.string().optional().describe('URL of the logo to display for this client. Recommended size is 150x150 pixels.'),
    grant_types: z.array(z.string()).optional().describe('List of grant types supported for this application.'),
    oidc_conformant: z.boolean().optional().describe('Whether this client conforms to strict OIDC specifications.'),
    is_first_party: z.boolean().optional().describe('Whether this client a first party client or not.'),
    cross_origin_authentication: z.boolean().optional().describe('Whether this client can be used to make cross-origin authentication requests.'),
    sso_disabled: z.boolean().optional().describe('true to disable Single Sign On, false otherwise.'),
    custom_login_page_on: z.boolean().optional().describe('true if the custom login page is to be used, false otherwise.'),
    initiate_login_uri: z.string().optional().describe('Initiate login uri, must be https.'),
    client_metadata: z.record(z.string(), z.string()).optional().describe('Metadata associated with the client.'),
    token_endpoint_auth_method: z
        .enum(['none', 'client_secret_post', 'client_secret_basic'])
        .optional()
        .describe('Defines the requested authentication method for the token endpoint.'),
    jwt_configuration: z
        .object({
            lifetime_in_seconds: z.number().optional(),
            secret_encoded: z.boolean().optional(),
            scopes: z.object({}).passthrough().optional(),
            alg: z.string().optional()
        })
        .optional()
        .describe('Configuration related to JWTs for the client.'),
    refresh_token: z
        .object({
            rotation_type: z.enum(['rotating', 'non_rotating']).optional(),
            expiration_type: z.enum(['expiring', 'non_expiring']).optional(),
            leeway: z.number().optional(),
            token_lifetime: z.number().optional(),
            infinite_token_lifetime: z.boolean().optional(),
            idle_token_lifetime: z.number().optional(),
            infinite_idle_token_lifetime: z.boolean().optional()
        })
        .optional()
        .describe('Refresh token configuration.'),
    addons: z.record(z.string(), z.unknown()).optional().describe('Addons enabled for this client and their associated configurations.'),
    mobile: z
        .object({
            android: z.object({}).passthrough().optional(),
            ios: z.object({}).passthrough().optional()
        })
        .optional()
        .describe('Additional configuration for native mobile apps.')
});

const ProviderClientSchema = z.object({
    client_id: z.string(),
    tenant: z.string().nullish(),
    name: z.string(),
    description: z.string().nullish(),
    global: z.boolean().nullish(),
    client_secret: z.string().nullish(),
    app_type: z.string().nullish(),
    logo_uri: z.string().nullish(),
    is_first_party: z.boolean().nullish(),
    oidc_conformant: z.boolean().nullish(),
    callbacks: z.array(z.string()).nullish(),
    allowed_origins: z.array(z.string()).nullish(),
    web_origins: z.array(z.string()).nullish(),
    client_aliases: z.array(z.string()).nullish(),
    allowed_clients: z.array(z.string()).nullish(),
    allowed_logout_urls: z.array(z.string()).nullish(),
    grant_types: z.array(z.string()).nullish(),
    sso: z.boolean().nullish(),
    sso_disabled: z.boolean().nullish(),
    cross_origin_authentication: z.boolean().nullish(),
    cross_origin_loc: z.string().nullish(),
    custom_login_page_on: z.boolean().nullish(),
    custom_login_page: z.string().nullish(),
    custom_login_page_preview: z.string().nullish(),
    form_template: z.string().nullish(),
    initiate_login_uri: z.string().nullish(),
    token_endpoint_auth_method: z.string().nullish(),
    is_token_endpoint_ip_header_trusted: z.boolean().nullish(),
    client_metadata: z.record(z.string(), z.string()).nullish(),
    require_pushed_authorization_requests: z.boolean().nullish(),
    require_proof_of_possession: z.boolean().nullish(),
    par_request_expiry: z.number().nullish(),
    resource_server_identifier: z.string().nullish(),
    jwt_configuration: z.object({}).passthrough().nullish(),
    encryption_key: z.object({}).passthrough().nullish(),
    addons: z.record(z.string(), z.unknown()).nullish(),
    mobile: z.object({}).passthrough().nullish(),
    refresh_token: z.object({}).passthrough().nullish(),
    default_organization: z.object({}).passthrough().nullish(),
    organization_usage: z.string().nullish(),
    organization_require_behavior: z.string().nullish(),
    organization_discovery_methods: z.array(z.string()).nullish(),
    client_authentication_methods: z.object({}).passthrough().nullish(),
    signed_request_object: z.object({}).passthrough().nullish(),
    compliance_level: z.string().nullish(),
    token_exchange: z.object({}).passthrough().nullish(),
    express_configuration: z.object({}).passthrough().nullish(),
    my_organization_configuration: z.object({}).passthrough().nullish(),
    third_party_security_mode: z.string().nullish(),
    redirection_policy: z.string().nullish(),
    external_metadata_type: z.string().nullish(),
    external_metadata_created_by: z.string().nullish(),
    external_client_id: z.string().nullish(),
    jwks_uri: z.string().nullish(),
    session_transfer: z.object({}).passthrough().nullish(),
    oidc_logout: z.object({}).passthrough().nullish(),
    native_social_login: z.object({}).passthrough().nullish(),
    fedcm_login: z.object({}).passthrough().nullish(),
    signing_keys: z.array(z.unknown()).nullish()
});

const OutputSchema = z.object({
    client_id: z.string(),
    tenant: z.string().optional(),
    name: z.string(),
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
    initiate_login_uri: z.string().optional(),
    token_endpoint_auth_method: z.string().optional(),
    is_token_endpoint_ip_header_trusted: z.boolean().optional(),
    client_metadata: z.record(z.string(), z.string()).optional(),
    require_pushed_authorization_requests: z.boolean().optional(),
    require_proof_of_possession: z.boolean().optional(),
    par_request_expiry: z.number().optional(),
    resource_server_identifier: z.string().optional(),
    jwt_configuration: z.object({}).passthrough().optional(),
    encryption_key: z.object({}).passthrough().optional(),
    addons: z.record(z.string(), z.unknown()).optional(),
    mobile: z.object({}).passthrough().optional(),
    refresh_token: z.object({}).passthrough().optional(),
    default_organization: z.object({}).passthrough().optional(),
    organization_usage: z.string().optional(),
    organization_require_behavior: z.string().optional(),
    organization_discovery_methods: z.array(z.string()).optional(),
    client_authentication_methods: z.object({}).passthrough().optional(),
    signed_request_object: z.object({}).passthrough().optional(),
    compliance_level: z.string().optional(),
    token_exchange: z.object({}).passthrough().optional(),
    express_configuration: z.object({}).passthrough().optional(),
    my_organization_configuration: z.object({}).passthrough().optional(),
    third_party_security_mode: z.string().optional(),
    redirection_policy: z.string().optional(),
    external_metadata_type: z.string().optional(),
    external_metadata_created_by: z.string().optional(),
    external_client_id: z.string().optional(),
    jwks_uri: z.string().optional(),
    session_transfer: z.object({}).passthrough().optional(),
    oidc_logout: z.object({}).passthrough().optional(),
    native_social_login: z.object({}).passthrough().optional(),
    fedcm_login: z.object({}).passthrough().optional(),
    signing_keys: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Create a client in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-client',
        group: 'Clients'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['create:clients'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://auth0.com/docs/api/management/v2/clients/post-clients
            endpoint: '/api/v2/clients',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.app_type !== undefined && { app_type: input.app_type }),
                ...(input.callbacks !== undefined && { callbacks: input.callbacks }),
                ...(input.allowed_origins !== undefined && { allowed_origins: input.allowed_origins }),
                ...(input.web_origins !== undefined && { web_origins: input.web_origins }),
                ...(input.logo_uri !== undefined && { logo_uri: input.logo_uri }),
                ...(input.grant_types !== undefined && { grant_types: input.grant_types }),
                ...(input.oidc_conformant !== undefined && { oidc_conformant: input.oidc_conformant }),
                ...(input.is_first_party !== undefined && { is_first_party: input.is_first_party }),
                ...(input.cross_origin_authentication !== undefined && { cross_origin_authentication: input.cross_origin_authentication }),
                ...(input.sso_disabled !== undefined && { sso_disabled: input.sso_disabled }),
                ...(input.custom_login_page_on !== undefined && { custom_login_page_on: input.custom_login_page_on }),
                ...(input.initiate_login_uri !== undefined && { initiate_login_uri: input.initiate_login_uri }),
                ...(input.client_metadata !== undefined && { client_metadata: input.client_metadata }),
                ...(input.token_endpoint_auth_method !== undefined && { token_endpoint_auth_method: input.token_endpoint_auth_method }),
                ...(input.jwt_configuration !== undefined && { jwt_configuration: input.jwt_configuration }),
                ...(input.refresh_token !== undefined && { refresh_token: input.refresh_token }),
                ...(input.addons !== undefined && { addons: input.addons }),
                ...(input.mobile !== undefined && { mobile: input.mobile })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Auth0 API when creating client'
            });
        }

        const providerClient = ProviderClientSchema.parse(response.data);

        return {
            client_id: providerClient.client_id,
            name: providerClient.name,
            ...(providerClient.tenant != null && { tenant: providerClient.tenant }),
            ...(providerClient.description != null && { description: providerClient.description }),
            ...(providerClient.global != null && { global: providerClient.global }),
            ...(providerClient.client_secret != null && { client_secret: providerClient.client_secret }),
            ...(providerClient.app_type != null && { app_type: providerClient.app_type }),
            ...(providerClient.logo_uri != null && { logo_uri: providerClient.logo_uri }),
            ...(providerClient.is_first_party != null && { is_first_party: providerClient.is_first_party }),
            ...(providerClient.oidc_conformant != null && { oidc_conformant: providerClient.oidc_conformant }),
            ...(providerClient.callbacks != null && { callbacks: providerClient.callbacks }),
            ...(providerClient.allowed_origins != null && { allowed_origins: providerClient.allowed_origins }),
            ...(providerClient.web_origins != null && { web_origins: providerClient.web_origins }),
            ...(providerClient.client_aliases != null && { client_aliases: providerClient.client_aliases }),
            ...(providerClient.allowed_clients != null && { allowed_clients: providerClient.allowed_clients }),
            ...(providerClient.allowed_logout_urls != null && { allowed_logout_urls: providerClient.allowed_logout_urls }),
            ...(providerClient.grant_types != null && { grant_types: providerClient.grant_types }),
            ...(providerClient.sso != null && { sso: providerClient.sso }),
            ...(providerClient.sso_disabled != null && { sso_disabled: providerClient.sso_disabled }),
            ...(providerClient.cross_origin_authentication != null && { cross_origin_authentication: providerClient.cross_origin_authentication }),
            ...(providerClient.cross_origin_loc != null && { cross_origin_loc: providerClient.cross_origin_loc }),
            ...(providerClient.custom_login_page_on != null && { custom_login_page_on: providerClient.custom_login_page_on }),
            ...(providerClient.custom_login_page != null && { custom_login_page: providerClient.custom_login_page }),
            ...(providerClient.custom_login_page_preview != null && { custom_login_page_preview: providerClient.custom_login_page_preview }),
            ...(providerClient.form_template != null && { form_template: providerClient.form_template }),
            ...(providerClient.initiate_login_uri != null && { initiate_login_uri: providerClient.initiate_login_uri }),
            ...(providerClient.token_endpoint_auth_method != null && { token_endpoint_auth_method: providerClient.token_endpoint_auth_method }),
            ...(providerClient.is_token_endpoint_ip_header_trusted != null && {
                is_token_endpoint_ip_header_trusted: providerClient.is_token_endpoint_ip_header_trusted
            }),
            ...(providerClient.client_metadata != null && { client_metadata: providerClient.client_metadata }),
            ...(providerClient.require_pushed_authorization_requests != null && {
                require_pushed_authorization_requests: providerClient.require_pushed_authorization_requests
            }),
            ...(providerClient.require_proof_of_possession != null && { require_proof_of_possession: providerClient.require_proof_of_possession }),
            ...(providerClient.par_request_expiry != null && { par_request_expiry: providerClient.par_request_expiry }),
            ...(providerClient.resource_server_identifier != null && { resource_server_identifier: providerClient.resource_server_identifier }),
            ...(providerClient.jwt_configuration != null && { jwt_configuration: providerClient.jwt_configuration }),
            ...(providerClient.encryption_key != null && { encryption_key: providerClient.encryption_key }),
            ...(providerClient.addons != null && { addons: providerClient.addons }),
            ...(providerClient.mobile != null && { mobile: providerClient.mobile }),
            ...(providerClient.refresh_token != null && { refresh_token: providerClient.refresh_token }),
            ...(providerClient.default_organization != null && { default_organization: providerClient.default_organization }),
            ...(providerClient.organization_usage != null && { organization_usage: providerClient.organization_usage }),
            ...(providerClient.organization_require_behavior != null && { organization_require_behavior: providerClient.organization_require_behavior }),
            ...(providerClient.organization_discovery_methods != null && { organization_discovery_methods: providerClient.organization_discovery_methods }),
            ...(providerClient.client_authentication_methods != null && { client_authentication_methods: providerClient.client_authentication_methods }),
            ...(providerClient.signed_request_object != null && { signed_request_object: providerClient.signed_request_object }),
            ...(providerClient.compliance_level != null && { compliance_level: providerClient.compliance_level }),
            ...(providerClient.token_exchange != null && { token_exchange: providerClient.token_exchange }),
            ...(providerClient.express_configuration != null && { express_configuration: providerClient.express_configuration }),
            ...(providerClient.my_organization_configuration != null && { my_organization_configuration: providerClient.my_organization_configuration }),
            ...(providerClient.third_party_security_mode != null && { third_party_security_mode: providerClient.third_party_security_mode }),
            ...(providerClient.redirection_policy != null && { redirection_policy: providerClient.redirection_policy }),
            ...(providerClient.external_metadata_type != null && { external_metadata_type: providerClient.external_metadata_type }),
            ...(providerClient.external_metadata_created_by != null && { external_metadata_created_by: providerClient.external_metadata_created_by }),
            ...(providerClient.external_client_id != null && { external_client_id: providerClient.external_client_id }),
            ...(providerClient.jwks_uri != null && { jwks_uri: providerClient.jwks_uri }),
            ...(providerClient.session_transfer != null && { session_transfer: providerClient.session_transfer }),
            ...(providerClient.oidc_logout != null && { oidc_logout: providerClient.oidc_logout }),
            ...(providerClient.native_social_login != null && { native_social_login: providerClient.native_social_login }),
            ...(providerClient.fedcm_login != null && { fedcm_login: providerClient.fedcm_login }),
            ...(providerClient.signing_keys != null && { signing_keys: providerClient.signing_keys })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
