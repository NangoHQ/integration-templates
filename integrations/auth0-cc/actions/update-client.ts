import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    client_id: z.string().describe('ID of the client to update. Example: "AaiyAPdpYdesoKnqjj8HJqRn4T5titww"'),
    name: z.string().optional().describe("The name of the client. Must contain at least one character. Does not allow '<' or '>'."),
    description: z.string().max(140).optional().describe('Free text description of the purpose of the Client. (Max character length: 140)'),
    logo_uri: z.string().optional().describe('The URL of the client logo (recommended size: 150x150)'),
    callbacks: z.array(z.string()).optional().describe('A set of URLs that are valid to call back from Auth0 when authenticating users'),
    allowed_origins: z.array(z.string()).optional().describe('A set of URLs that represents valid origins for CORS'),
    web_origins: z.array(z.string()).optional().describe('A set of URLs that represents valid web origins for use with web message response mode'),
    grant_types: z.array(z.string()).optional().describe('A set of grant types that the client is authorized to use'),
    allowed_logout_urls: z.array(z.string()).optional().describe('URLs that are valid to redirect to after logout from Auth0'),
    app_type: z.string().optional().describe('The type of application this client represents'),
    is_first_party: z.boolean().optional().describe('Whether this client a first party client or not'),
    oidc_conformant: z.boolean().optional().describe('Whether this client will conform to strict OIDC specifications'),
    initiate_login_uri: z.string().optional().describe('Initiate login uri, must be https'),
    token_endpoint_auth_method: z.string().nullable().optional().describe('Defines the requested authentication method for the token endpoint'),
    custom_login_page: z.string().optional().describe('The content (HTML, CSS, JS) of the custom login page'),
    custom_login_page_on: z.boolean().optional().describe('Whether a custom login page is to be used'),
    sso: z.boolean().optional().describe('Whether to use Auth0 instead of the IdP to do Single Sign On'),
    sso_disabled: z.boolean().optional().describe('Whether to disable Single Sign On'),
    cross_origin_authentication: z.boolean().optional().describe('Whether this client can be used to make cross-origin authentication requests'),
    client_metadata: z.record(z.string(), z.string()).optional().describe('Metadata associated with the client'),
    mobile: z.object({}).passthrough().optional().describe('Configuration related to native mobile apps'),
    refresh_token: z.object({}).passthrough().optional().describe('Refresh token configuration'),
    jwt_configuration: z.object({}).passthrough().optional().describe('An object that holds settings related to how JWTs are created'),
    organization_usage: z.string().nullable().optional().describe('Defines how to proceed during an authentication transaction with regards an organization'),
    organization_require_behavior: z
        .string()
        .nullable()
        .optional()
        .describe('Defines how to proceed during an authentication transaction when organization_usage is require')
});

const ProviderClientSchema = z
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
        initiate_login_uri: z.string().optional(),
        token_endpoint_auth_method: z.string().optional(),
        is_token_endpoint_ip_header_trusted: z.boolean().optional(),
        client_metadata: z.record(z.string(), z.string()).optional(),
        mobile: z.object({}).passthrough().optional(),
        refresh_token: z.object({}).passthrough().optional(),
        jwt_configuration: z.object({}).passthrough().optional(),
        organization_usage: z.string().optional(),
        organization_require_behavior: z.string().optional(),
        organization_discovery_methods: z.array(z.string()).optional(),
        require_pushed_authorization_requests: z.boolean().optional(),
        require_proof_of_possession: z.boolean().optional(),
        compliance_level: z.string().optional(),
        skip_non_verifiable_callback_uri_confirmation_prompt: z.boolean().optional(),
        par_request_expiry: z.number().nullable().optional(),
        resource_server_identifier: z.string().optional(),
        external_client_id: z.string().optional(),
        jwks_uri: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    client_id: z.string(),
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
    sso: z.boolean().optional(),
    sso_disabled: z.boolean().optional(),
    cross_origin_authentication: z.boolean().optional(),
    custom_login_page_on: z.boolean().optional(),
    initiate_login_uri: z.string().optional(),
    token_endpoint_auth_method: z.string().optional(),
    client_metadata: z.record(z.string(), z.string()).optional(),
    mobile: z.record(z.string(), z.unknown()).optional(),
    refresh_token: z.record(z.string(), z.unknown()).optional(),
    jwt_configuration: z.record(z.string(), z.unknown()).optional(),
    organization_usage: z.string().optional(),
    organization_require_behavior: z.string().optional(),
    organization_discovery_methods: z.array(z.string()).optional(),
    require_pushed_authorization_requests: z.boolean().optional(),
    require_proof_of_possession: z.boolean().optional(),
    compliance_level: z.string().optional(),
    par_request_expiry: z.number().optional()
});

const action = createAction({
    description: 'Update a client in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-client'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['update:clients'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const clientId = input.client_id;

        const patchBody: Record<string, unknown> = {};
        if (input.name !== undefined) patchBody['name'] = input.name;
        if (input.description !== undefined) patchBody['description'] = input.description;
        if (input.logo_uri !== undefined) patchBody['logo_uri'] = input.logo_uri;
        if (input.callbacks !== undefined) patchBody['callbacks'] = input.callbacks;
        if (input.allowed_origins !== undefined) patchBody['allowed_origins'] = input.allowed_origins;
        if (input.web_origins !== undefined) patchBody['web_origins'] = input.web_origins;
        if (input.grant_types !== undefined) patchBody['grant_types'] = input.grant_types;
        if (input.allowed_logout_urls !== undefined) patchBody['allowed_logout_urls'] = input.allowed_logout_urls;
        if (input.app_type !== undefined) patchBody['app_type'] = input.app_type;
        if (input.is_first_party !== undefined) patchBody['is_first_party'] = input.is_first_party;
        if (input.oidc_conformant !== undefined) patchBody['oidc_conformant'] = input.oidc_conformant;
        if (input.initiate_login_uri !== undefined) patchBody['initiate_login_uri'] = input.initiate_login_uri;
        if (input.token_endpoint_auth_method !== undefined) patchBody['token_endpoint_auth_method'] = input.token_endpoint_auth_method;
        if (input.custom_login_page !== undefined) patchBody['custom_login_page'] = input.custom_login_page;
        if (input.custom_login_page_on !== undefined) patchBody['custom_login_page_on'] = input.custom_login_page_on;
        if (input.sso !== undefined) patchBody['sso'] = input.sso;
        if (input.sso_disabled !== undefined) patchBody['sso_disabled'] = input.sso_disabled;
        if (input.cross_origin_authentication !== undefined) patchBody['cross_origin_authentication'] = input.cross_origin_authentication;
        if (input.client_metadata !== undefined) patchBody['client_metadata'] = input.client_metadata;
        if (input.mobile !== undefined) patchBody['mobile'] = input.mobile;
        if (input.refresh_token !== undefined) patchBody['refresh_token'] = input.refresh_token;
        if (input.jwt_configuration !== undefined) patchBody['jwt_configuration'] = input.jwt_configuration;
        if (input.organization_usage !== undefined) patchBody['organization_usage'] = input.organization_usage;
        if (input.organization_require_behavior !== undefined) patchBody['organization_require_behavior'] = input.organization_require_behavior;

        if (Object.keys(patchBody).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update must be provided.'
            });
        }

        // https://auth0.com/docs/api/management/v2/clients/patch-clients-by-id
        const response = await nango.patch({
            endpoint: `/api/v2/clients/${encodeURIComponent(clientId)}`,
            data: patchBody,
            retries: 3
        });

        const providerClient = ProviderClientSchema.parse(response.data);

        return {
            client_id: providerClient.client_id,
            ...(providerClient.tenant !== undefined && { tenant: providerClient.tenant }),
            ...(providerClient.name !== undefined && { name: providerClient.name }),
            ...(providerClient.description !== undefined && { description: providerClient.description }),
            ...(providerClient.global !== undefined && { global: providerClient.global }),
            ...(providerClient.app_type !== undefined && { app_type: providerClient.app_type }),
            ...(providerClient.logo_uri !== undefined && { logo_uri: providerClient.logo_uri }),
            ...(providerClient.is_first_party !== undefined && { is_first_party: providerClient.is_first_party }),
            ...(providerClient.oidc_conformant !== undefined && { oidc_conformant: providerClient.oidc_conformant }),
            ...(providerClient.callbacks !== undefined && { callbacks: providerClient.callbacks }),
            ...(providerClient.allowed_origins !== undefined && { allowed_origins: providerClient.allowed_origins }),
            ...(providerClient.web_origins !== undefined && { web_origins: providerClient.web_origins }),
            ...(providerClient.allowed_logout_urls !== undefined && { allowed_logout_urls: providerClient.allowed_logout_urls }),
            ...(providerClient.grant_types !== undefined && { grant_types: providerClient.grant_types }),
            ...(providerClient.sso !== undefined && { sso: providerClient.sso }),
            ...(providerClient.sso_disabled !== undefined && { sso_disabled: providerClient.sso_disabled }),
            ...(providerClient.cross_origin_authentication !== undefined && { cross_origin_authentication: providerClient.cross_origin_authentication }),
            ...(providerClient.custom_login_page_on !== undefined && { custom_login_page_on: providerClient.custom_login_page_on }),
            ...(providerClient.initiate_login_uri !== undefined && { initiate_login_uri: providerClient.initiate_login_uri }),
            ...(providerClient.token_endpoint_auth_method !== undefined && { token_endpoint_auth_method: providerClient.token_endpoint_auth_method }),
            ...(providerClient.client_metadata !== undefined && { client_metadata: providerClient.client_metadata }),
            ...(providerClient.mobile !== undefined && { mobile: providerClient.mobile }),
            ...(providerClient.refresh_token !== undefined && { refresh_token: providerClient.refresh_token }),
            ...(providerClient.jwt_configuration !== undefined && { jwt_configuration: providerClient.jwt_configuration }),
            ...(providerClient.organization_usage !== undefined && { organization_usage: providerClient.organization_usage }),
            ...(providerClient.organization_require_behavior !== undefined && { organization_require_behavior: providerClient.organization_require_behavior }),
            ...(providerClient.organization_discovery_methods !== undefined && {
                organization_discovery_methods: providerClient.organization_discovery_methods
            }),
            ...(providerClient.require_pushed_authorization_requests !== undefined && {
                require_pushed_authorization_requests: providerClient.require_pushed_authorization_requests
            }),
            ...(providerClient.require_proof_of_possession !== undefined && { require_proof_of_possession: providerClient.require_proof_of_possession }),
            ...(providerClient.compliance_level !== undefined && { compliance_level: providerClient.compliance_level }),
            ...(providerClient.par_request_expiry != null && { par_request_expiry: providerClient.par_request_expiry })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
